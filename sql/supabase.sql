-- Installation ou mise à jour non destructive. À exécuter dans SQL Editor.
begin;
create table if not exists public.baby_shower_responses (
 id uuid primary key default gen_random_uuid(), submission_token uuid not null unique,
 full_name text not null check (char_length(trim(full_name)) between 2 and 120),
 attending boolean not null, companion boolean not null default false,
 wants_gift boolean not null default false, selected_gifts text[] not null default '{}',
 gift_proposal text not null default '' check (char_length(gift_proposal)<=500),
 created_at timestamptz not null default now(), check(not companion or attending)
);
alter table public.baby_shower_responses add column if not exists selected_gifts text[] not null default '{}';
alter table public.baby_shower_responses enable row level security;
revoke all on public.baby_shower_responses from anon, authenticated;
create table if not exists public.baby_shower_gifts(name text primary key, position integer not null);
create table if not exists public.baby_shower_gift_reservations(
 gift_name text primary key references public.baby_shower_gifts(name),
 response_id uuid not null references public.baby_shower_responses(id) on delete cascade,
 reserved_at timestamptz not null default now()
);
alter table public.baby_shower_gifts enable row level security;
alter table public.baby_shower_gift_reservations enable row level security;
revoke all on public.baby_shower_gifts, public.baby_shower_gift_reservations from anon, authenticated;
insert into public.baby_shower_gifts(name,position) values
('Bodies et pyjamas (tailles 0–3 et 3–6 mois)',1),
('Chaussettes et moufles',2),
('Bonnets pour nouveau-né',3),
('Bavoirs',4),
('Tenues de sortie',5),
('Serviettes à capuche',6),
('Débarbouillette',7),
('Gel lavant doux pour bébé',8),
('Lotion hydratante adaptée aux nourrissons',9),
('Lingettes adaptées',10),
('Couches',11),
('Crème protectrice pour couche',12),
('Parc',13),
('Matelas pour parc',14),
('Serviette de bain',15),
('Peigne ou brosse',16),
('Panier à vêtements',17),
('Tire-lait',18),
('Moustiquaire',19),
('Savon pour bébé',20),
('Shampoing pour bébé',21),
('Sac à langer',22),
('Brosse pour biberon',23),
('Biberon',24),
('Porte-bébé',25),
('Coussinets',26)
on conflict(name) do update set position=excluded.position;
-- Reprendre les choix de l'ancienne liste lorsqu'ils ont un équivalent.
-- Si plusieurs anciennes réponses revendiquent la même idée, la migration s'arrête
-- sans modifier la base : les organisateurs doivent d'abord résoudre le doublon.
insert into public.baby_shower_gift_reservations(gift_name,response_id)
select distinct g.name,r.id from public.baby_shower_responses r
cross join lateral unnest(r.selected_gifts) as choice(name)
join public.baby_shower_gifts g on g.name=case choice.name
 when 'Biberons' then 'Biberon'
 when 'Petits bodies' then 'Bodies et pyjamas (tailles 0–3 et 3–6 mois)'
 when 'Chaussettes' then 'Chaussettes et moufles'
 when 'Petits bonnets' then 'Bonnets pour nouveau-né'
 when 'Débarbouillettes' then 'Débarbouillette'
 when 'Petite serviette de bain' then 'Serviette de bain'
 else choice.name end
where not exists(select 1 from public.baby_shower_gift_reservations x where x.gift_name=g.name and x.response_id=r.id);
drop function if exists public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text);
create or replace function public.list_baby_shower_gifts()
returns table(name text,reserved boolean)
language sql stable security definer set search_path='' as $$
 select g.name,exists(select 1 from public.baby_shower_gift_reservations r where r.gift_name=g.name)
 from public.baby_shower_gifts g order by g.position;
$$;
revoke all on function public.list_baby_shower_gifts() from public, anon, authenticated;
grant execute on function public.list_baby_shower_gifts() to anon;
create or replace function public.submit_baby_shower_rsvp(
 p_token uuid,p_full_name text,p_attending boolean,p_companion boolean,
 p_wants_gift boolean,p_proposal text,p_selected_gifts text[] default '{}'
) returns void language plpgsql security definer set search_path='' as $$
declare v_response_id uuid; v_gifts text[];
begin
 if p_token is null or p_full_name is null or char_length(trim(p_full_name)) not between 2 and 120
 or p_attending is null or p_companion is null or p_wants_gift is null
 or p_proposal is null or char_length(p_proposal)>500 or p_selected_gifts is null
 or cardinality(p_selected_gifts)>26 or array_position(p_selected_gifts,null) is not null then
 raise exception 'invalid_response'; end if;
 -- Sérialiser aussi les nouvelles tentatives d'un même envoi.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_token::text,0));
 if exists(select 1 from public.baby_shower_responses where submission_token=p_token) then return; end if;
 select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_gifts from unnest(p_selected_gifts) x;
 if exists(select 1 from unnest(v_gifts) x where not exists(select 1 from public.baby_shower_gifts g where g.name=x)) then
 raise exception 'invalid_gift'; end if;
 -- Verrouiller les cadeaux dans le même ordre pour les requêtes concurrentes.
 perform g.name from public.baby_shower_gifts g where g.name=any(v_gifts) order by g.name for update;
 if exists(select 1 from public.baby_shower_gift_reservations where gift_name=any(v_gifts)) then
 raise exception using message='gift_unavailable',errcode='P0001'; end if;
 insert into public.baby_shower_responses(submission_token,full_name,attending,companion,wants_gift,gift_proposal,selected_gifts)
 values(p_token,trim(p_full_name),p_attending,p_attending and p_companion,
 p_wants_gift or cardinality(v_gifts)>0 or char_length(trim(p_proposal))>0,trim(p_proposal),v_gifts)
 returning id into v_response_id;
 insert into public.baby_shower_gift_reservations(gift_name,response_id)
 select unnest(v_gifts),v_response_id;
 -- Toute erreur annule la réponse et tous ses cadeaux : aucune réservation partielle.
end;
$$;
revoke all on function public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text,text[]) from public, anon, authenticated;
grant execute on function public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text,text[]) to anon;
commit;

-- Après supabase-migration-reservations.sql. Aucun compte n'est autorisé par défaut.
begin;
create table if not exists public.baby_shower_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.baby_shower_admins enable row level security;
revoke all on public.baby_shower_admins from anon, authenticated;
-- L'autorisation est vérifiée dans la base, pas avec un mot de passe dans le HTML.
create or replace function public.admin_baby_shower_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.baby_shower_admins a where a.user_id=auth.uid()
 ) then
   raise exception using message='admin_required', errcode='42501';
 end if;
 return jsonb_build_object(
   'responses',coalesce((select jsonb_agg(jsonb_build_object(
     'id',r.id,'full_name',r.full_name,'attending',r.attending,
     'companion',r.companion,'wants_gift',r.wants_gift,
     'selected_gifts',r.selected_gifts,'gift_proposal',r.gift_proposal,
     'created_at',r.created_at
   ) order by r.created_at desc,r.id) from public.baby_shower_responses r),'[]'::jsonb),
   'gifts',coalesce((select jsonb_agg(jsonb_build_object(
     'name',g.name,'response_id',x.response_id,'reserved_by',r.full_name,
     'reserved_at',x.reserved_at
   ) order by g.position) from public.baby_shower_gifts g
     left join public.baby_shower_gift_reservations x on x.gift_name=g.name
     left join public.baby_shower_responses r on r.id=x.response_id),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.admin_baby_shower_dashboard() from public, anon, authenticated;
grant execute on function public.admin_baby_shower_dashboard() to authenticated;
commit;

-- À exécuter SÉPARÉMENT après avoir créé votre compte dans Authentication > Users :
-- insert into public.baby_shower_admins(user_id)
-- select id from auth.users where lower(email)=lower('VOTRE_EMAIL_ICI')
-- on conflict(user_id) do nothing;

-- À exécuter dans SQL Editor avant d'utiliser le nouveau formulaire.
begin;
alter table public.baby_shower_responses add column if not exists phone text not null default '';
alter table public.baby_shower_responses add column if not exists address text not null default '';
create or replace function public.submit_baby_shower_contact(
 p_token uuid,p_full_name text,p_attending boolean,p_companion boolean,p_wants_gift boolean,
 p_proposal text,p_selected_gifts text[],p_phone text,p_address text
) returns void language plpgsql security definer set search_path='' as $$
declare v_digits text;
begin
 v_digits:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if p_token is null or p_phone is null or char_length(p_phone)>40
 or p_phone !~ '^[+0-9[:space:]().-]+$' or char_length(v_digits) not between 7 and 15
 or p_address is null or char_length(trim(p_address)) not between 5 and 500 then
 raise exception 'invalid_contact'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_token::text,0));
 if exists(select 1 from public.baby_shower_responses where submission_token=p_token) then return; end if;
 perform public.submit_baby_shower_rsvp(p_token,p_full_name,p_attending,p_companion,p_wants_gift,p_proposal,p_selected_gifts);
 update public.baby_shower_responses set phone=trim(p_phone),address=trim(p_address) where submission_token=p_token;
end;
$$;
revoke all on function public.submit_baby_shower_contact(uuid,text,boolean,boolean,boolean,text,text[],text,text) from public,anon,authenticated;
grant execute on function public.submit_baby_shower_contact(uuid,text,boolean,boolean,boolean,text,text[],text,text) to anon;
create or replace function public.admin_baby_shower_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.baby_shower_admins a where a.user_id=auth.uid()
 ) then
   raise exception using message='admin_required', errcode='42501';
 end if;
 return jsonb_build_object(
   'responses',coalesce((select jsonb_agg(jsonb_build_object(
     'id',r.id,'full_name',r.full_name,'phone',r.phone,'address',r.address,'attending',r.attending,
     'companion',r.companion,'wants_gift',r.wants_gift,
     'selected_gifts',r.selected_gifts,'gift_proposal',r.gift_proposal,
     'created_at',r.created_at
   ) order by r.created_at desc,r.id) from public.baby_shower_responses r),'[]'::jsonb),
   'gifts',coalesce((select jsonb_agg(jsonb_build_object(
     'name',g.name,'response_id',x.response_id,'reserved_by',r.full_name,
     'reserved_at',x.reserved_at
   ) order by g.position) from public.baby_shower_gifts g
     left join public.baby_shower_gift_reservations x on x.gift_name=g.name
     left join public.baby_shower_responses r on r.id=x.response_id),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.admin_baby_shower_dashboard() from public, anon, authenticated;
grant execute on function public.admin_baby_shower_dashboard() to authenticated;
commit;

-- MISE À JOUR UNIQUE : contacts + parcours de résidence.
-- À exécuter sur la base existante, même si la migration contact n'a pas été faite.
begin;
alter table public.baby_shower_responses add column if not exists phone text not null default '';
alter table public.baby_shower_responses add column if not exists address text not null default '';
alter table public.baby_shower_responses add column if not exists residence_zone text not null default 'unspecified';
alter table public.baby_shower_responses add column if not exists country text not null default '';
create or replace function public.submit_baby_shower_route(
 p_token uuid,p_full_name text,p_attending boolean,p_companion boolean,p_wants_gift boolean,
 p_proposal text,p_selected_gifts text[],p_phone text,p_address text,p_residence_zone text,p_country text
) returns void language plpgsql security definer set search_path='' as $$
declare v_digits text; v_country text;
begin
 v_digits:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if p_token is null or p_phone is null or char_length(p_phone)>40
 or p_phone !~ '^[+0-9[:space:]().-]+$' or char_length(v_digits) not between 7 and 15
 or p_address is null or char_length(trim(p_address)) not between 5 and 500
 or p_residence_zone is null or p_residence_zone not in ('metro','haiti_other','abroad')
 or p_country is null or char_length(trim(p_country)) not between 2 and 80 then
 raise exception 'invalid_contact'; end if;
 v_country:=case when p_residence_zone='abroad' then trim(p_country) else 'Haïti' end;
 if p_residence_zone='abroad' and lower(v_country) in ('haiti','haïti') then
 raise exception 'invalid_country'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_token::text,0));
 if exists(select 1 from public.baby_shower_responses where submission_token=p_token) then return; end if;
 -- Même si un client essaie de déclarer une présence étrangère, la base la force à faux.
 perform public.submit_baby_shower_rsvp(p_token,p_full_name,
 case when p_residence_zone='abroad' then false else p_attending end,
 case when p_residence_zone='abroad' then false else p_companion end,
 p_wants_gift,p_proposal,p_selected_gifts);
 update public.baby_shower_responses
 set phone=trim(p_phone),address=trim(p_address),residence_zone=p_residence_zone,country=v_country
 where submission_token=p_token;
end;
$$;
revoke all on function public.submit_baby_shower_route(uuid,text,boolean,boolean,boolean,text,text[],text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_baby_shower_route(uuid,text,boolean,boolean,boolean,text,text[],text,text,text,text) to anon;
create or replace function public.admin_baby_shower_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.baby_shower_admins a where a.user_id=auth.uid()) then
 raise exception using message='admin_required',errcode='42501'; end if;
 return jsonb_build_object(
 'responses',coalesce((select jsonb_agg(jsonb_build_object(
 'id',r.id,'full_name',r.full_name,'phone',r.phone,'address',r.address,
 'residence_zone',r.residence_zone,'country',r.country,
 'attending',r.attending,'companion',r.companion,'wants_gift',r.wants_gift,
 'selected_gifts',r.selected_gifts,'gift_proposal',r.gift_proposal,'created_at',r.created_at
 ) order by r.created_at desc,r.id) from public.baby_shower_responses r),'[]'::jsonb),
 'gifts',coalesce((select jsonb_agg(jsonb_build_object(
 'name',g.name,'response_id',x.response_id,'reserved_by',r.full_name,'reserved_at',x.reserved_at
 ) order by g.position) from public.baby_shower_gifts g
 left join public.baby_shower_gift_reservations x on x.gift_name=g.name
 left join public.baby_shower_responses r on r.id=x.response_id),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.admin_baby_shower_dashboard() from public,anon,authenticated;
grant execute on function public.admin_baby_shower_dashboard() to authenticated;
commit;

-- À exécuter APRÈS supabase-migration-parcours.sql.
-- Ne supprime aucune réponse existante.
begin;
create or replace function public.baby_shower_phone_key(p_phone text)
returns text language plpgsql immutable strict set search_path='' as $$
declare v_digits text;
begin
 v_digits:=regexp_replace(p_phone,'[^0-9]','','g');
 if v_digits='' then return ''; end if;
 if ltrim(p_phone) like '+%' then return v_digits; end if;
 if left(v_digits,2)='00' then return substr(v_digits,3); end if;
 if left(v_digits,3)='011' and char_length(v_digits)>10 then return substr(v_digits,4); end if;
 if char_length(v_digits)=8 then return '509'||v_digits; end if;
 return v_digits;
end;
$$;
revoke all on function public.baby_shower_phone_key(text) from public,anon,authenticated;
-- S'il existe déjà des doublons, arrêter sans effacer arbitrairement une réponse.
do $$
begin
 if exists(select 1 from public.baby_shower_responses
 where phone<>'' group by public.baby_shower_phone_key(phone) having count(*)>1) then
 raise exception using message='existing_phone_duplicates',hint='Plusieurs réponses existantes utilisent le même téléphone. Résoudre ces doublons dans le Dashboard avant de réexécuter ce script.';
 end if;
end;
$$;
create unique index if not exists baby_shower_responses_phone_unique
 on public.baby_shower_responses(public.baby_shower_phone_key(phone)) where phone<>'';
create or replace function public.submit_baby_shower_route(
 p_token uuid,p_full_name text,p_attending boolean,p_companion boolean,p_wants_gift boolean,
 p_proposal text,p_selected_gifts text[],p_phone text,p_address text,p_residence_zone text,p_country text
) returns void language plpgsql security definer set search_path='' as $$
declare v_digits text; v_country text; v_phone_key text; v_constraint text;
begin
 v_digits:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 if p_token is null or p_phone is null or char_length(p_phone)>40
 or p_phone !~ '^[+0-9[:space:]().-]+$' or char_length(v_digits) not between 7 and 15
 or p_address is null or char_length(trim(p_address)) not between 5 and 500
 or p_residence_zone is null or p_residence_zone not in ('metro','haiti_other','abroad')
 or p_country is null or char_length(trim(p_country)) not between 2 and 80 then
 raise exception 'invalid_contact'; end if;
 v_country:=case when p_residence_zone='abroad' then trim(p_country) else 'Haïti' end;
 if p_residence_zone='abroad' and lower(v_country) in ('haiti','haïti') then
 raise exception 'invalid_country'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_token::text,0));
 v_phone_key:=public.baby_shower_phone_key(p_phone);
 if exists(select 1 from public.baby_shower_responses where submission_token=p_token) then
   -- Une réponse perdue sur le réseau peut être retentée, mais ses choix ne changent pas.
   if exists(select 1 from public.baby_shower_responses r where r.submission_token=p_token
     and public.baby_shower_phone_key(r.phone)=v_phone_key
     and r.full_name=trim(p_full_name) and r.address=trim(p_address)
     and r.residence_zone=p_residence_zone and r.country=v_country
     and r.attending=(case when p_residence_zone='abroad' then false else p_attending end)
     and r.companion=(case when p_residence_zone='abroad' then false else p_attending and p_companion end)
     and r.selected_gifts @> p_selected_gifts and r.selected_gifts <@ p_selected_gifts
     and r.gift_proposal=trim(p_proposal)
     and r.wants_gift=(p_wants_gift or cardinality(p_selected_gifts)>0 or char_length(trim(p_proposal))>0)
   ) then return;
   else raise exception using message='response_already_submitted',errcode='P0001'; end if;
 end if;
 if p_residence_zone='abroad' and ltrim(p_phone) !~ '^(\+|00|011)' then raise exception 'invalid_contact'; end if;
 -- Sérialiser les réponses d'un même téléphone, même depuis deux appareils.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('phone:'||v_phone_key,0));
 if exists(select 1 from public.baby_shower_responses where phone<>'' and public.baby_shower_phone_key(phone)=v_phone_key) then
 raise exception using message='response_already_submitted',errcode='P0001'; end if;
 -- Même si un client essaie de déclarer une présence étrangère, la base la force à faux.
 perform public.submit_baby_shower_rsvp(p_token,p_full_name,
 case when p_residence_zone='abroad' then false else p_attending end,
 case when p_residence_zone='abroad' then false else p_companion end,
 p_wants_gift,p_proposal,p_selected_gifts);
 update public.baby_shower_responses
 set phone=trim(p_phone),address=trim(p_address),residence_zone=p_residence_zone,country=v_country
 where submission_token=p_token;
exception when unique_violation then
 get stacked diagnostics v_constraint=CONSTRAINT_NAME;
 if v_constraint='baby_shower_responses_phone_unique' then
 raise exception using message='response_already_submitted',errcode='P0001';
 else raise; end if;
end;
$$;
revoke all on function public.submit_baby_shower_route(uuid,text,boolean,boolean,boolean,text,text[],text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_baby_shower_route(uuid,text,boolean,boolean,boolean,text,text[],text,text,text,text) to anon;

-- Seule la fonction complète reste accessible aux invités.
revoke execute on function public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text,text[]) from public,anon,authenticated;
do $$
begin
 if to_regprocedure('public.submit_baby_shower_contact(uuid,text,boolean,boolean,boolean,text,text[],text,text)') is not null then
 execute 'revoke execute on function public.submit_baby_shower_contact(uuid,text,boolean,boolean,boolean,text,text[],text,text) from public,anon,authenticated';
 end if;
end;
$$;
commit;

-- Remplace le catalogue par les catégories, fusionne les doublons et garde les réservations.
-- À exécuter sur la base existante dans SQL Editor.
begin;
lock table public.baby_shower_responses,public.baby_shower_gifts,public.baby_shower_gift_reservations in share row exclusive mode;
alter table public.baby_shower_gifts add column if not exists active boolean not null default true;
alter table public.baby_shower_gifts add column if not exists category text not null default '';
alter table public.baby_shower_gifts add column if not exists is_large boolean not null default false;
create temporary table gift_aliases(old_name text primary key,new_name text not null) on commit drop;
insert into gift_aliases(old_name,new_name) values
('Serviettes à capuche','Serviette de bain à capuche'),
('Serviette de bain','Serviette de bain à capuche'),
('Petite serviette de bain','Serviette de bain à capuche'),
('Débarbouillette','Débarbouillettes'),
('Gel lavant doux pour bébé','Soin lavant doux pour bébé — corps et cheveux'),
('Savon pour bébé','Soin lavant doux pour bébé — corps et cheveux'),
('Shampoing pour bébé','Soin lavant doux pour bébé — corps et cheveux'),
('Lingettes adaptées','Lingettes adaptées aux bébés'),
('Crème protectrice pour couche','Crème protectrice pour le change'),
('Parc','Parc pour bébé'),
('Matelas pour parc','Matelas compatible avec le parc'),
('Peigne ou brosse','Peigne ou brosse pour bébé'),
('Moustiquaire','Moustiquaire pour le parc'),
('Biberon','Biberons'),
('Coussinets','Coussinets d’allaitement');
insert into public.baby_shower_gifts(name,position,category,is_large,active) values
('Bodies et pyjamas (tailles 0–3 et 3–6 mois)',1,'Vêtements et accessoires',false,true),
('Chaussettes et moufles',2,'Vêtements et accessoires',false,true),
('Bonnets pour nouveau-né',3,'Vêtements et accessoires',false,true),
('Bavoirs',4,'Vêtements et accessoires',false,true),
('Tenues de sortie',5,'Vêtements et accessoires',false,true),
('Langes en coton',6,'Vêtements et accessoires',false,true),
('Serviette de bain à capuche',7,'Bain et soins',false,true),
('Débarbouillettes',8,'Bain et soins',false,true),
('Soin lavant doux pour bébé — corps et cheveux',9,'Bain et soins',false,true),
('Lotion hydratante adaptée aux nourrissons',10,'Bain et soins',false,true),
('Peigne ou brosse pour bébé',11,'Bain et soins',false,true),
('Petite trousse de soin — thermomètre et lime à ongles',12,'Bain et soins',false,true),
('Couches',13,'Change et hygiène',false,true),
('Lingettes adaptées aux bébés',14,'Change et hygiène',false,true),
('Crème protectrice pour le change',15,'Change et hygiène',false,true),
('Alèses imperméables lavables',16,'Change et hygiène',false,true),
('Biberons',17,'Alimentation',false,true),
('Brosse pour biberon',18,'Alimentation',false,true),
('Moustiquaire pour le parc',19,'Équipement et rangement',false,true),
('Panier à vêtements',20,'Équipement et rangement',false,true),
('Sac à langer',21,'Sorties',false,true),
('Tapis à langer nomade',22,'Sorties',false,true),
('Pochette pour les vêtements de rechange',23,'Sorties',false,true),
('Pochette isotherme pour biberons',24,'Sorties',false,true),
('Petite couverture pour les déplacements',25,'Sorties',false,true),
('Pare-soleil pour les vitres de la voiture',26,'Sorties',false,true),
('Hochet léger, facile à saisir',27,'Éveil',false,true),
('Livre en tissu',28,'Éveil',false,true),
('Cartes ou livre d’images à fort contraste',29,'Éveil',false,true),
('Jouet de dentition',30,'Éveil',false,true),
('Jouet sensoriel avec différentes textures',31,'Éveil',false,true),
('Petit miroir incassable conçu pour bébé',32,'Éveil',false,true),
('Jouets de bain faciles à nettoyer',33,'Éveil',false,true),
('Coussin d’allaitement ou de soutien pour les repas de bébé',34,'Pour maman',false,true),
('Soutiens-gorge d’allaitement',35,'Pour maman',false,true),
('Coussinets d’allaitement',36,'Pour maman',false,true),
('Sacs de conservation du lait maternel',37,'Pour maman',false,true),
('Organisateur à garder près du fauteuil ou du lit',38,'Pour maman',false,true),
('Grande gourde facile à ouvrir d’une main',39,'Pour maman',false,true),
('Veilleuse à lumière réglable',40,'Pour maman',false,true),
('Parc pour bébé',41,'Autres cadeaux',true,true),
('Matelas compatible avec le parc',42,'Autres cadeaux',true,true),
('Tire-lait',43,'Autres cadeaux',true,true),
('Porte-bébé',44,'Autres cadeaux',true,true),
('Poussette',45,'Autres cadeaux',true,true),
('Siège auto adapté dès la naissance',46,'Autres cadeaux',true,true),
('Fauteuil confortable avec soutien du dos',47,'Autres cadeaux',true,true),
('Repose-pieds',48,'Autres cadeaux',true,true),
('Tapis d’éveil',49,'Autres cadeaux',true,true),
('Arche d’éveil',50,'Autres cadeaux',true,true)
on conflict(name) do update set position=excluded.position,category=excluded.category,is_large=excluded.is_large,active=true;
-- Une fusion ne doit pas attribuer le même article à deux personnes différentes.
do $$
begin
 if exists(select coalesce(a.new_name,r.gift_name) from public.baby_shower_gift_reservations r
 left join gift_aliases a on a.old_name=r.gift_name
 group by coalesce(a.new_name,r.gift_name) having count(distinct r.response_id)>1) then
 raise exception using message='gift_merge_conflict',hint='Deux anciennes réservations différentes correspondent à un même cadeau fusionné. Les départager dans Supabase avant de réexécuter. Aucune modification n’a été conservée.';
 end if;
end;
$$;
insert into public.baby_shower_gift_reservations(gift_name,response_id,reserved_at)
select a.new_name,r.response_id,min(r.reserved_at)
from public.baby_shower_gift_reservations r join gift_aliases a on a.old_name=r.gift_name
where a.old_name<>a.new_name group by a.new_name,r.response_id
on conflict(gift_name) do nothing;
delete from public.baby_shower_gift_reservations r using gift_aliases a where r.gift_name=a.old_name and a.old_name<>a.new_name;
update public.baby_shower_responses r set selected_gifts=coalesce((
 select array_agg(distinct coalesce(a.new_name,x.name) order by coalesce(a.new_name,x.name))
 from unnest(r.selected_gifts) x(name) left join gift_aliases a on a.old_name=x.name),'{}'::text[])
where exists(select 1 from unnest(r.selected_gifts) x(name) join gift_aliases a on a.old_name=x.name);
update public.baby_shower_gifts set active=(name in (
'Bodies et pyjamas (tailles 0–3 et 3–6 mois)',
'Chaussettes et moufles',
'Bonnets pour nouveau-né',
'Bavoirs',
'Tenues de sortie',
'Langes en coton',
'Serviette de bain à capuche',
'Débarbouillettes',
'Soin lavant doux pour bébé — corps et cheveux',
'Lotion hydratante adaptée aux nourrissons',
'Peigne ou brosse pour bébé',
'Petite trousse de soin — thermomètre et lime à ongles',
'Couches',
'Lingettes adaptées aux bébés',
'Crème protectrice pour le change',
'Alèses imperméables lavables',
'Biberons',
'Brosse pour biberon',
'Moustiquaire pour le parc',
'Panier à vêtements',
'Sac à langer',
'Tapis à langer nomade',
'Pochette pour les vêtements de rechange',
'Pochette isotherme pour biberons',
'Petite couverture pour les déplacements',
'Pare-soleil pour les vitres de la voiture',
'Hochet léger, facile à saisir',
'Livre en tissu',
'Cartes ou livre d’images à fort contraste',
'Jouet de dentition',
'Jouet sensoriel avec différentes textures',
'Petit miroir incassable conçu pour bébé',
'Jouets de bain faciles à nettoyer',
'Coussin d’allaitement ou de soutien pour les repas de bébé',
'Soutiens-gorge d’allaitement',
'Coussinets d’allaitement',
'Sacs de conservation du lait maternel',
'Organisateur à garder près du fauteuil ou du lit',
'Grande gourde facile à ouvrir d’une main',
'Veilleuse à lumière réglable',
'Parc pour bébé',
'Matelas compatible avec le parc',
'Tire-lait',
'Porte-bébé',
'Poussette',
'Siège auto adapté dès la naissance',
'Fauteuil confortable avec soutien du dos',
'Repose-pieds',
'Tapis d’éveil',
'Arche d’éveil'));
create or replace function public.list_baby_shower_gifts()
returns table(name text,reserved boolean) language sql stable security definer set search_path='' as $$
 select g.name,exists(select 1 from public.baby_shower_gift_reservations r where r.gift_name=g.name)
 from public.baby_shower_gifts g where g.active order by g.position;
$$;
revoke all on function public.list_baby_shower_gifts() from public,anon,authenticated;
grant execute on function public.list_baby_shower_gifts() to anon;
create or replace function public.submit_baby_shower_rsvp(
 p_token uuid,p_full_name text,p_attending boolean,p_companion boolean,
 p_wants_gift boolean,p_proposal text,p_selected_gifts text[] default '{}'
) returns void language plpgsql security definer set search_path='' as $$
declare v_response_id uuid; v_gifts text[];
begin
 if p_token is null or p_full_name is null or char_length(trim(p_full_name)) not between 2 and 120
 or p_attending is null or p_companion is null or p_wants_gift is null
 or p_proposal is null or char_length(p_proposal)>500 or p_selected_gifts is null
 or cardinality(p_selected_gifts)>(select count(*) from public.baby_shower_gifts where active) or array_position(p_selected_gifts,null) is not null then
 raise exception 'invalid_response'; end if;
 -- Sérialiser aussi les nouvelles tentatives d'un même envoi.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_token::text,0));
 if exists(select 1 from public.baby_shower_responses where submission_token=p_token) then return; end if;
 select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_gifts from unnest(p_selected_gifts) x;
 if exists(select 1 from unnest(v_gifts) x where not exists(select 1 from public.baby_shower_gifts g where g.name=x and g.active)) then
 raise exception 'invalid_gift'; end if;
 -- Verrouiller les cadeaux dans le même ordre pour les requêtes concurrentes.
 perform g.name from public.baby_shower_gifts g where g.name=any(v_gifts) order by g.name for update;
 if exists(select 1 from public.baby_shower_gift_reservations where gift_name=any(v_gifts)) then
 raise exception using message='gift_unavailable',errcode='P0001'; end if;
 insert into public.baby_shower_responses(submission_token,full_name,attending,companion,wants_gift,gift_proposal,selected_gifts)
 values(p_token,trim(p_full_name),p_attending,p_attending and p_companion,
 p_wants_gift or cardinality(v_gifts)>0 or char_length(trim(p_proposal))>0,trim(p_proposal),v_gifts)
 returning id into v_response_id;
 insert into public.baby_shower_gift_reservations(gift_name,response_id)
 select unnest(v_gifts),v_response_id;
 -- Toute erreur annule la réponse et tous ses cadeaux : aucune réservation partielle.
end;
$$;
revoke all on function public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text,text[]) from public, anon, authenticated;


create or replace function public.admin_baby_shower_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.baby_shower_admins a where a.user_id=auth.uid()) then
 raise exception using message='admin_required',errcode='42501'; end if;
 return jsonb_build_object(
 'responses',coalesce((select jsonb_agg(jsonb_build_object(
 'id',r.id,'full_name',r.full_name,'phone',r.phone,'address',r.address,
 'residence_zone',r.residence_zone,'country',r.country,
 'attending',r.attending,'companion',r.companion,'wants_gift',r.wants_gift,
 'selected_gifts',r.selected_gifts,'gift_proposal',r.gift_proposal,'created_at',r.created_at
 ) order by r.created_at desc,r.id) from public.baby_shower_responses r),'[]'::jsonb),
 'gifts',coalesce((select jsonb_agg(jsonb_build_object(
 'name',g.name,'category',g.category,'large',g.is_large,'response_id',x.response_id,'reserved_by',r.full_name,'reserved_at',x.reserved_at
 ) order by g.position) from public.baby_shower_gifts g
 left join public.baby_shower_gift_reservations x on x.gift_name=g.name
 left join public.baby_shower_responses r on r.id=x.response_id where g.active),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.admin_baby_shower_dashboard() from public,anon,authenticated;
grant execute on function public.admin_baby_shower_dashboard() to authenticated;

commit;

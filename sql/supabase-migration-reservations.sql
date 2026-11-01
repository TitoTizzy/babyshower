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

-- Après les migrations parcours, réponse unique et catalogue.
-- Ne supprime aucune réponse. Les doublons existants doivent être départagés dans l’admin.
begin;
create or replace function public.baby_shower_name_key(p_name text)
returns text language sql immutable strict set search_path='' as $$
 select regexp_replace(translate(replace(replace(lower(trim(p_name)),'œ','oe'),'æ','ae'),
 'àáâãäåāăąçćčďèéêëēėęěìíîïīįñńňòóôõöøōőřśšşťùúûüūůűųýÿžźż',
 'aaaaaaaaacccdeeeeeeeeiiiiiinnnoooooooorssstuuuuuuuuyyzzz'),'[^[:alnum:]]','','g');
$$;
revoke all on function public.baby_shower_name_key(text) from public,anon,authenticated;
do $$ begin
 if exists(select 1 from public.baby_shower_responses group by public.baby_shower_name_key(full_name) having count(*)>1) then
 raise exception using message='existing_name_duplicates',hint='Départager les réponses portant le même nom complet dans l’administration, puis réexécuter cette migration.';
 end if;
end; $$;
create unique index if not exists baby_shower_responses_name_unique
 on public.baby_shower_responses(public.baby_shower_name_key(full_name));
create or replace function public.submit_baby_shower_route(
 p_token uuid,p_full_name text,p_attending boolean,p_companion boolean,p_wants_gift boolean,
 p_proposal text,p_selected_gifts text[],p_phone text,p_address text,p_residence_zone text,p_country text
) returns void language plpgsql security definer set search_path='' as $$
declare v_digits text; v_country text; v_phone_key text; v_constraint text; v_name_key text;
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
 v_name_key:=public.baby_shower_name_key(p_full_name);
 if v_name_key is null or char_length(v_name_key)<2 then raise exception 'invalid_name'; end if;
 if exists(select 1 from public.baby_shower_responses where submission_token=p_token) then
   -- Une réponse perdue sur le réseau peut être retentée, mais ses choix ne changent pas.
   if exists(select 1 from public.baby_shower_responses r where r.submission_token=p_token
     and public.baby_shower_phone_key(r.phone)=v_phone_key
     and r.full_name=trim(p_full_name) and r.address=trim(p_address)
     and r.residence_zone=p_residence_zone and r.country=v_country
     and r.attending=p_attending
     and r.companion=(p_attending and p_companion)
     and r.selected_gifts @> p_selected_gifts and r.selected_gifts <@ p_selected_gifts
     and r.gift_proposal=trim(p_proposal)
     and r.wants_gift=(p_wants_gift or cardinality(p_selected_gifts)>0 or char_length(trim(p_proposal))>0)
   ) then return;
   else raise exception using message='response_already_submitted',errcode='P0001'; end if;
 end if;
 if p_residence_zone='abroad' and ltrim(p_phone) !~ '^(\+|00|011)' then raise exception 'invalid_contact'; end if;
 -- Même nom OU même téléphone : vérification et index uniques côté serveur.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('name:'||v_name_key,0));
 if exists(select 1 from public.baby_shower_responses where public.baby_shower_name_key(full_name)=v_name_key) then
 raise exception using message='response_already_submitted',errcode='P0001'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('phone:'||v_phone_key,0));
 if exists(select 1 from public.baby_shower_responses where phone<>'' and public.baby_shower_phone_key(phone)=v_phone_key) then
 raise exception using message='response_already_submitted',errcode='P0001'; end if;
 -- La résidence ne détermine pas la présence : les proches éloignés peuvent venir.
 perform public.submit_baby_shower_rsvp(p_token,p_full_name,
 p_attending,p_attending and p_companion,
 p_wants_gift,p_proposal,p_selected_gifts);
 update public.baby_shower_responses
 set phone=trim(p_phone),address=trim(p_address),residence_zone=p_residence_zone,country=v_country
 where submission_token=p_token;
exception when unique_violation then
 get stacked diagnostics v_constraint=CONSTRAINT_NAME;
 if v_constraint in ('baby_shower_responses_phone_unique','baby_shower_responses_name_unique') then
 raise exception using message='response_already_submitted',errcode='P0001';
 else raise; end if;
end;
$$;
revoke all on function public.submit_baby_shower_route(uuid,text,boolean,boolean,boolean,text,text[],text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_baby_shower_route(uuid,text,boolean,boolean,boolean,text,text[],text,text,text,text) to anon;


-- Le jeton aléatoire mémorisé ne donne accès à aucune coordonnée.
create or replace function public.baby_shower_receipt_exists(p_token uuid)
returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from public.baby_shower_responses where submission_token=p_token);
$$;
revoke all on function public.baby_shower_receipt_exists(uuid) from public,anon,authenticated;
grant execute on function public.baby_shower_receipt_exists(uuid) to anon;
commit;

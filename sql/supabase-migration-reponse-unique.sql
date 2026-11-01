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

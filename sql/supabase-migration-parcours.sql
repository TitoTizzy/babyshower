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

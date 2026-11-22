-- Accès personnel aux cadeaux pour Marie Gaelle Mentor, après sa réponse.
-- Installer cette migration ne modifie aucun cadeau ni aucune réponse.
begin;
-- Normalisation nécessaire même si la migration identité n’a pas encore été installée.
create or replace function public.baby_shower_name_key(p_name text)
returns text language sql immutable strict set search_path='' as $$
 select regexp_replace(translate(replace(replace(lower(trim(p_name)),'œ','oe'),'æ','ae'),
 'àáâãäåāăąçćčďèéêëēėęěìíîïīįñńňòóôõöøōőřśšşťùúûüūůűųýÿžźż',
 'aaaaaaaaacccdeeeeeeeeiiiiiinnnoooooooorssstuuuuuuuuyyzzz'),'[^[:alnum:]]','','g');
$$;
revoke all on function public.baby_shower_name_key(text) from public,anon,authenticated;
create table if not exists public.baby_shower_gift_access (
 access_token uuid primary key default gen_random_uuid(),
 response_id uuid not null unique references public.baby_shower_responses(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists public.baby_shower_gift_additions (
 request_token uuid primary key,
 response_id uuid not null references public.baby_shower_responses(id) on delete cascade,
 selected_gifts text[] not null,
 proposal text not null,
 created_at timestamptz not null default now()
);
alter table public.baby_shower_gift_access enable row level security;
alter table public.baby_shower_gift_additions enable row level security;
revoke all on public.baby_shower_gift_access,public.baby_shower_gift_additions from public,anon,authenticated;

-- Le reçu de son premier envoi permet de retrouver son lien personnel.
create or replace function public.baby_shower_personal_gift_access(p_token uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_access uuid;
begin
 select id into v_id from public.baby_shower_responses
 where submission_token=p_token and public.baby_shower_name_key(full_name)='mariegaellementor'
 for update;
 if not found then return null; end if;
 insert into public.baby_shower_gift_access(response_id) values(v_id)
 on conflict(response_id) do nothing;
 select access_token into v_access from public.baby_shower_gift_access where response_id=v_id;
 return v_access;
end; $$;
revoke all on function public.baby_shower_personal_gift_access(uuid) from public,anon,authenticated;
grant execute on function public.baby_shower_personal_gift_access(uuid) to anon;

-- Les organisateurs peuvent récupérer le lien pour le lui transmettre.
create or replace function public.admin_baby_shower_gift_access(p_response_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_receipt uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.baby_shower_admins where user_id=auth.uid()) then
 raise exception using message='admin_required',errcode='42501'; end if;
 select submission_token into v_receipt from public.baby_shower_responses
 where id=p_response_id and public.baby_shower_name_key(full_name)='mariegaellementor';
 if not found then raise exception 'gift_access_not_allowed'; end if;
 return public.baby_shower_personal_gift_access(v_receipt);
end; $$;
revoke all on function public.admin_baby_shower_gift_access(uuid) from public,anon,authenticated;
grant execute on function public.admin_baby_shower_gift_access(uuid) to authenticated;

create or replace function public.baby_shower_gift_access_snapshot(p_access_token uuid,p_request_token uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_response public.baby_shower_responses%rowtype;
begin
 select r.* into v_response from public.baby_shower_responses r
 join public.baby_shower_gift_access a on a.response_id=r.id
 where a.access_token=p_access_token;
 if not found then raise exception using message='gift_access_invalid',errcode='42501'; end if;
 return jsonb_build_object(
 'full_name',v_response.full_name,'selected_gifts',v_response.selected_gifts,
 'proposal',v_response.gift_proposal,
 'request_received',exists(select 1 from public.baby_shower_gift_additions where response_id=v_response.id and request_token=p_request_token),
 'gifts',coalesce((select jsonb_agg(jsonb_build_object('name',g.name,'reserved',x.response_id is not null,'mine',coalesce(x.response_id=v_response.id,false)) order by g.position)
 from public.baby_shower_gifts g left join public.baby_shower_gift_reservations x on x.gift_name=g.name where g.active),'[]'::jsonb));
end; $$;
revoke all on function public.baby_shower_gift_access_snapshot(uuid,uuid) from public,anon,authenticated;
grant execute on function public.baby_shower_gift_access_snapshot(uuid,uuid) to anon;

create or replace function public.baby_shower_add_personal_gifts(
 p_access_token uuid,p_request_token uuid,p_selected_gifts text[],p_proposal text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_response public.baby_shower_responses%rowtype; v_gifts text[]; v_proposal text;
 v_previous public.baby_shower_gift_additions%rowtype; v_constraint text;
begin
 if p_request_token is null or p_selected_gifts is null or p_proposal is null
 or array_position(p_selected_gifts,null) is not null or char_length(p_proposal)>500
 or cardinality(p_selected_gifts)>(select count(*) from public.baby_shower_gifts where active) then
 raise exception 'invalid_addition'; end if;
 select coalesce(array_agg(distinct x order by x),'{}'::text[]) into v_gifts from unnest(p_selected_gifts) x;
 v_proposal:=trim(p_proposal);
 if cardinality(v_gifts)=0 and v_proposal='' then raise exception 'empty_addition'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gift-addition:'||p_request_token::text,0));
 select r.* into v_response from public.baby_shower_responses r
 join public.baby_shower_gift_access a on a.response_id=r.id
 where a.access_token=p_access_token for update of r;
 if not found then raise exception using message='gift_access_invalid',errcode='42501'; end if;
 select * into v_previous from public.baby_shower_gift_additions where request_token=p_request_token;
 if found then
  if v_previous.response_id<>v_response.id or v_previous.selected_gifts<>v_gifts or v_previous.proposal<>v_proposal then
   raise exception 'addition_request_changed'; end if;
  return public.baby_shower_gift_access_snapshot(p_access_token,p_request_token);
 end if;
 if exists(select 1 from unnest(v_gifts) x where not exists(select 1 from public.baby_shower_gifts where name=x and active)) then
 raise exception 'invalid_gift'; end if;
 perform name from public.baby_shower_gifts where name=any(v_gifts) order by name for update;
 if exists(select 1 from public.baby_shower_gift_reservations where gift_name=any(v_gifts) and response_id<>v_response.id) then
 raise exception 'gift_unavailable'; end if;
 if v_proposal<>'' and v_response.gift_proposal<>'' then
  v_proposal:=v_response.gift_proposal||E'\n\n'||v_proposal;
 elsif v_proposal='' then v_proposal:=v_response.gift_proposal; end if;
 if char_length(v_proposal)>500 then raise exception 'proposal_too_long'; end if;
 insert into public.baby_shower_gift_reservations(gift_name,response_id)
 select x,v_response.id from unnest(v_gifts) x
 where not exists(select 1 from public.baby_shower_gift_reservations where gift_name=x);
 update public.baby_shower_responses set
 selected_gifts=(select coalesce(array_agg(distinct x order by x),'{}'::text[]) from unnest(v_response.selected_gifts||v_gifts) x),
 gift_proposal=v_proposal,wants_gift=true where id=v_response.id;
 insert into public.baby_shower_gift_additions(request_token,response_id,selected_gifts,proposal)
 values(p_request_token,v_response.id,v_gifts,trim(p_proposal));
 return public.baby_shower_gift_access_snapshot(p_access_token,p_request_token);
exception when unique_violation then
 get stacked diagnostics v_constraint=CONSTRAINT_NAME;
 if v_constraint='baby_shower_gift_reservations_pkey' then raise exception 'gift_unavailable'; else raise; end if;
end; $$;
revoke all on function public.baby_shower_add_personal_gifts(uuid,uuid,text[],text) from public,anon,authenticated;
grant execute on function public.baby_shower_add_personal_gifts(uuid,uuid,text[],text) to anon;

insert into public.baby_shower_gift_access(response_id)
select id from public.baby_shower_responses where public.baby_shower_name_key(full_name)='mariegaellementor'
on conflict(response_id) do nothing;
commit;

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

-- À exécuter si la première version de supabase.sql a déjà été installée.
begin;
alter table public.baby_shower_responses add column if not exists selected_gifts text[] not null default '{}';
drop function if exists public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text);
create or replace function public.submit_baby_shower_rsvp(
 p_token uuid, p_full_name text, p_attending boolean,
 p_companion boolean, p_wants_gift boolean, p_proposal text,
 p_selected_gifts text[] default '{}'
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if p_token is null or p_attending is null or p_companion is null or p_wants_gift is null
 or p_full_name is null or char_length(trim(p_full_name)) not between 2 and 120
 or p_proposal is null or char_length(p_proposal) > 500
 or p_selected_gifts is null or cardinality(p_selected_gifts)>9
 or array_position(p_selected_gifts,null) is not null
 or not p_selected_gifts <@ array['Biberons','Bavoirs','Langes en coton','Petits bodies','Chaussettes','Débarbouillettes','Petite serviette de bain','Petits bonnets','Jouets bébé']::text[] then
   raise exception 'Réponse invalide';
 end if;
 insert into public.baby_shower_responses(submission_token,full_name,attending,companion,wants_gift,gift_proposal,selected_gifts)
 values(p_token,trim(p_full_name),p_attending,p_attending and p_companion,p_wants_gift or cardinality(p_selected_gifts)>0 or char_length(trim(p_proposal))>0,trim(p_proposal),array(select distinct unnest(p_selected_gifts)))
 on conflict(submission_token) do nothing;
end;
$$;
revoke all on function public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text,text[]) from public;
grant execute on function public.submit_baby_shower_rsvp(uuid,text,boolean,boolean,boolean,text,text[]) to anon;
commit;

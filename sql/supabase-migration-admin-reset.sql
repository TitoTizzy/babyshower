-- Base existante : exécuter ce fichier une fois dans Supabase SQL Editor.
-- Crée la fonction ; ne supprime aucune réponse à son installation.
begin;
create or replace function public.admin_reset_baby_shower_responses(
 p_response_ids uuid[], p_confirmation text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ids uuid[]; v_found integer; v_deleted integer; v_gifts integer;
begin
 if auth.uid() is null or not exists (
  select 1 from public.baby_shower_admins where user_id=auth.uid()
 ) then raise exception using message='admin_required',errcode='42501'; end if;
 if p_confirmation is distinct from 'SUPPRIMER' then
  raise exception 'confirmation_required'; end if;
 if p_response_ids is null or cardinality(p_response_ids) not between 1 and 500
 or array_position(p_response_ids,null) is not null then
  raise exception 'invalid_selection'; end if;
 select array_agg(distinct id order by id) into v_ids from unnest(p_response_ids) as t(id);
 -- Verrouiller dans un ordre stable et refuser une sélection périmée.
 perform id from public.baby_shower_responses where id=any(v_ids) order by id for update;
 select count(*) into v_found from public.baby_shower_responses where id=any(v_ids);
 if v_found<>cardinality(v_ids) then raise exception 'selection_changed'; end if;
 select count(*) into v_gifts from public.baby_shower_gift_reservations where response_id=any(v_ids);
 -- La clé étrangère ON DELETE CASCADE libère seulement leurs réservations.
 delete from public.baby_shower_responses where id=any(v_ids);
 get diagnostics v_deleted=row_count;
 return jsonb_build_object('deleted',v_deleted,'released_gifts',v_gifts);
end;
$$;
revoke all on function public.admin_reset_baby_shower_responses(uuid[],text) from public,anon,authenticated;
grant execute on function public.admin_reset_baby_shower_responses(uuid[],text) to authenticated;
commit;

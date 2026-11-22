-- Résumé personnel accessible uniquement avec le reçu aléatoire du premier envoi.
-- Installer ce fichier ne modifie aucune réponse ni réservation.
begin;
create or replace function public.baby_shower_response_summary(p_token uuid)
returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object(
  'full_name',r.full_name,
  'attending',r.attending,
  'companion',r.companion,
  'wants_gift',r.wants_gift,
  'selected_gifts',r.selected_gifts,
  'proposal',r.gift_proposal,
  'residence_zone',r.residence_zone,
  'country',r.country
 ) from public.baby_shower_responses r where r.submission_token=p_token;
$$;
revoke all on function public.baby_shower_response_summary(uuid) from public,anon,authenticated;
grant execute on function public.baby_shower_response_summary(uuid) to anon;
commit;

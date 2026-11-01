# Espace administrateur

Ouvrir `admin.html` avec Live Server, dans le même dossier que `js/config.js`. Après publication, accéder à `/admin.html`. Il n'y a volontairement pas de lien d'administration dans le parcours des invités.

## Activation dans Supabase

1. Installer `sql/supabase-migration-reservations.sql` si ce n'est pas déjà fait.
2. Exécuter `sql/supabase-migration-admin.sql` dans SQL Editor.
3. Dans Authentication > Users, créer votre compte avec votre adresse e-mail et un mot de passe personnel. Ne pas écrire le mot de passe dans un fichier du site. Confirmer l'adresse selon les paramètres de votre projet.
4. Exécuter séparément cette requête dans SQL Editor, en remplaçant l'adresse :

```sql
insert into public.baby_shower_admins(user_id)
select id from auth.users where lower(email)=lower('VOTRE_ADRESSE_EMAIL')
on conflict(user_id) do nothing;
```

Vérifier que la table `baby_shower_admins` contient bien votre identifiant. Une adresse sans compte Auth existant n'ajoute aucune ligne. Répéter la requête pour autoriser un deuxième organisateur.

5. Compléter `js/config.js` avec l'URL Supabase et la clé **publishable** uniquement, puis se connecter sur `admin.html`.

Sans ces étapes, l'administration ne peut pas lire la base. La page n'ajoute pas de compte et ne s'attribue jamais de droit administrateur.

## Tableau de bord

- Noms complets, présence, accompagnants, cadeaux sélectionnés et propositions libres.
- Totaux des réponses, participants, accompagnants, personnes attendues et cadeaux réservés.
- Recherche par nom ou cadeau, filtres de présence et de cadeaux.
- Catalogue « Qui offre quoi ? » avec le nom associé à chaque réservation.
- Export CSV des réponses actuellement filtrées (fichier contenant des données privées).
- Actualisation manuelle et déconnexion.

Cet espace est en lecture seule : il ne supprime ni ne modifie de réponse. Les noms identiques restent des réponses distinctes ; le site n'impose pas l'unicité du nom d'un invité.

## Protection des accès

La connexion utilise Supabase Auth par e-mail et mot de passe. La fonction SQL vérifie `auth.uid()` dans une liste privée d'administrateurs avant de retourner les données. Un compte connecté sans autorisation ne peut pas consulter les réponses. Les noms et les réponses ne sont pas exposés par l'API de disponibilité publique des cadeaux.

Le jeton d'accès reste uniquement en mémoire, sans localStorage ni cookie de session géré par cette page. Un rechargement demande une nouvelle connexion. La session expire avant l'expiration du jeton ; le mot de passe n'est jamais enregistré dans le code. Utiliser HTTPS après publication.

Pour retirer un administrateur, supprimer sa ligne dans `baby_shower_admins` depuis le Dashboard Supabase. Les prochaines lectures seront refusées. Pour des raisons de confidentialité, seules les personnes organisant l'événement doivent être autorisées.

## Vérification après activation

1. Un visiteur non connecté ne doit voir que le formulaire de connexion.
2. Un compte Auth non autorisé doit recevoir un refus d'accès.
3. Un administrateur doit voir les réponses réelles, les totaux et les réservations.
4. Vérifier que la déconnexion masque et efface les données de l'interface.
5. Depuis l'invitation publique, vérifier que la disponibilité des cadeaux reste accessible sans aucun nom.


Références : https://supabase.com/docs/guides/auth/passwords et https://supabase.com/docs/guides/database/functions

## Coordonnées des invités

Exécuter sql/supabase-migration-contact.sql sur la base existante pour activer le formulaire nom, téléphone et adresse. La migration conserve les anciennes réponses ; leurs coordonnées restent vides et sont affichées « Non renseigné ». Les nouvelles coordonnées sont visibles dans les fiches, la recherche et le CSV admin. Pour une base neuve, supabase.sql contient cette mise à jour. Les coordonnées sont enregistrées uniquement lors de la confirmation finale de présence, jamais à la simple saisie du formulaire.

## Parcours géographiques

Sur la base existante, exécuter uniquement sql/supabase-migration-parcours.sql pour installer les contacts ET les parcours, même si la migration contact n’a pas été faite. Ne pas réexécuter tout supabase.sql sur la base existante. Le script conserve les réponses et les réservations antérieures. Les anciennes réponses restent avec un lieu « Non précisé ».

Zone métropolitaine : présence oui/non, un accompagnant maximum. Ailleurs en Haïti : question sur le déplacement, oui/non, même limite d’accompagnant. Étranger : pays requis, aucune présence physique ni accompagnant, confirmation à distance. Le parcours étranger peut découvrir la surprise même sans cadeau. Il ne promet ni diffusion en direct ni paiement ou livraison en ligne. Les propositions de cadeaux restent facultatives dans tous les parcours.

L’administration distingue « À distance » des absents en Haïti et propose un filtre de résidence ; les coordonnées et le pays sont inclus dans la recherche et le CSV.

## Une seule réponse par numéro de téléphone

Après la migration parcours, exécuter sql/supabase-migration-reponse-unique.sql. Le téléphone normalisé est unique : espaces/tirets ignorés, indicatifs + / 00 / 011 reconnus, un numéro haïtien de 8 chiffres est assimilé au même numéro avec +509. À l’étranger, l’indicatif est obligatoire. Ce mécanisme ne vérifie pas l’identité par SMS : une personne utilisant un autre numéro peut se présenter comme une autre personne ; deux proches partageant un même numéro doivent contacter les organisateurs.

Un nouvel envoi avec le même téléphone est refusé, même depuis un autre navigateur. Une nouvelle tentative du même envoi après une erreur réseau reste idempotente : aucune seconde ligne ni réservation supplémentaire n’est créée. Si la base contient déjà des doublons, le script s’arrête sans rien effacer ; résoudre ces anciennes réponses dans le Dashboard puis réexécuter. Les anciennes réponses sans téléphone sont conservées.

Après un envoi confirmé, une page avec un check vert récapitule les cadeaux réservés et permet de poursuivre vers la surprise. En mode aperçu sans Supabase, aucun succès vert n’est affiché. Pour modifier une réponse, l’invité contacte les organisateurs ; aucune modification anonyme d’une réponse existante n’est autorisée.

## Cadeaux par catégories et « Autres cadeaux »

Exécuter sql/supabase-migration-cadeaux-categories.sql après les migrations déjà installées. Cette mise à jour réorganise le catalogue en 40 idées principales et 10 équipements plus importants. Elle fusionne les produits lavants et les serviettes, conserve les réservations avec les nouveaux noms et actualise les cadeaux dans les anciennes réponses. Les anciens articles sont désactivés, pas supprimés du catalogue. Si deux personnes ont réservé des articles désormais fusionnés, le script s’arrête avec gift_merge_conflict : départager les réservations dans le Dashboard avant de réessayer.

La rubrique « Autres cadeaux » s’ouvre seulement après confirmation dans un pop-up. Choisir Non, Échap ou revenir plus tard n’affiche pas ces articles. Les gros cadeaux gardent la sélection multiple et l’unicité de réservation. Pour un cadeau à plusieurs, une seule personne réserve pour le groupe ; aucun paiement partagé n’est intégré. La limite de cadeaux en base suit désormais la taille du catalogue actif.

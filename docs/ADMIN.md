# Espace administrateur

Ouvrir `admin.html` depuis le serveur du projet ou via le nounours discret de l’invitation. Après publication, accéder à `/admin.html`. Le lien discret ne remplace pas la connexion et l’autorisation Supabase.

## Activation dans Supabase

1. Nouvelle base : exécuter `sql/supabase.sql`. Base existante déjà configurée : conserver les migrations installées, ne pas réexécuter le schéma complet.
2. Pour cette mise à jour, exécuter `sql/supabase-migration-admin-reset.sql` si nécessaire, puis `sql/supabase-migration-identite-parcours.sql`.
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

L’espace permet de lire/exporter les réponses et de supprimer une sélection après confirmation explicite. Le nom complet normalisé et le téléphone sont désormais chacun uniques ; deux proches avec exactement le même nom complet doivent contacter les organisateurs pour être départagés.

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

Zone métropolitaine : parcours habituel, présence oui/non et un accompagnant maximum. Ailleurs en Haïti ou à l’étranger : pays requis à l’étranger, puis « Penses-tu pouvoir être présent le 13 ? ». Oui confirme l’intention de venir et continue vers les cadeaux facultatifs puis la confirmation avec un accompagnant maximum. Non affiche un message chaleureux et un pop-up proposant de participer en offrant un cadeau. Oui ouvre directement la liste ; Non enregistre l’absence sans cadeau et ouvre directement le choix de révélation. La résidence à l’étranger n’impose plus une absence en base. Aucun paiement ou direct vidéo n’est promis.

L’administration distingue « À distance » des absents en Haïti et propose un filtre de résidence ; les coordonnées et le pays sont inclus dans la recherche et le CSV.

## Une seule réponse par numéro de téléphone

Après la migration parcours, exécuter sql/supabase-migration-reponse-unique.sql. Le téléphone normalisé est unique : espaces/tirets ignorés, indicatifs + / 00 / 011 reconnus, un numéro haïtien de 8 chiffres est assimilé au même numéro avec +509. À l’étranger, l’indicatif est obligatoire. Ce mécanisme ne vérifie pas l’identité par SMS : une personne changeant à la fois de nom et de numéro peut contourner ces critères ; deux proches partageant un même numéro doivent contacter les organisateurs.

Un nouvel envoi avec le même téléphone est refusé, même depuis un autre navigateur. Une nouvelle tentative du même envoi après une erreur réseau reste idempotente : aucune seconde ligne ni réservation supplémentaire n’est créée. Si la base contient déjà des doublons, le script s’arrête sans rien effacer ; résoudre ces anciennes réponses dans le Dashboard puis réexécuter. Les anciennes réponses sans téléphone sont conservées.

Après un envoi confirmé, une page avec un check vert récapitule les cadeaux réservés et permet de poursuivre vers la surprise. En mode aperçu sans Supabase, aucun succès vert n’est affiché. Pour modifier une réponse, l’invité contacte les organisateurs ; aucune modification anonyme d’une réponse existante n’est autorisée.

## Cadeaux par catégories et « Autres cadeaux »

Exécuter sql/supabase-migration-cadeaux-categories.sql après les migrations déjà installées. Cette mise à jour réorganise le catalogue en 40 idées principales et 10 équipements plus importants. Elle fusionne les produits lavants et les serviettes, conserve les réservations avec les nouveaux noms et actualise les cadeaux dans les anciennes réponses. Les anciens articles sont désactivés, pas supprimés du catalogue. Si deux personnes ont réservé des articles désormais fusionnés, le script s’arrête avec gift_merge_conflict : départager les réservations dans le Dashboard avant de réessayer.

La rubrique « Autres cadeaux » s’ouvre seulement après confirmation dans un pop-up. Choisir Non, Échap ou revenir plus tard n’affiche pas ces articles. Les gros cadeaux gardent la sélection multiple et l’unicité de réservation. Pour un cadeau à plusieurs, une seule personne réserve pour le groupe ; aucun paiement partagé n’est intégré. La limite de cadeaux en base suit désormais la taille du catalogue actif.

## Supprimer les réponses de test

Base existante : exécuter une fois `sql/supabase-migration-admin-reset.sql`. Installer cette migration ne supprime aucune donnée. Une nouvelle base inclut cette fonction via `sql/supabase.sql`.

Dans l’admin, cocher les réponses de test (ou sélectionner les réponses affichées après filtrage), puis « Supprimer la sélection… ». Vérifier tous les noms dans la fenêtre et saisir SUPPRIMER. Les sélections restent actives à travers les filtres ; la fenêtre récapitule la sélection complète. Le site ne déduit pas automatiquement qu’une réponse est un test. Limite : 500 réponses par opération.

La suppression est définitive. Elle enlève uniquement les réponses sélectionnées et leurs réservations, libère leurs numéros de téléphone pour un nouvel essai et conserve le catalogue, les comptes Auth et les droits administrateur. Exporter le CSV avant si une sauvegarde est nécessaire. Le serveur vérifie auth.uid() et la liste des administrateurs ; les visiteurs anonymes et comptes non autorisés ne peuvent pas exécuter cette fonction. Une sélection périmée échoue sans suppression partielle.

Aucune réponse n’a été supprimée lors de l’installation du code.

## Nom, téléphone et mémoire du navigateur

Exécuter `sql/supabase-migration-identite-parcours.sql` sur la base existante après les migrations précédentes. Cette migration ne supprime rien. Si elle retourne `existing_name_duplicates`, départager les noms déjà présents dans l’admin, puis réessayer. Les index et vérifications transactionnelles refusent un nom complet normalisé OU un téléphone déjà enregistrés, indépendamment du navigateur. Majuscules, accents latins usuels, espaces et ponctuation du nom sont ignorés. L’adresse et le pays n’imposent aucune unicité : deux personnes distinctes à la même adresse sont acceptées.

Après un envoi confirmé uniquement, l’invitation mémorise un jeton UUID aléatoire dans localStorage, sans nom, téléphone ni adresse. À chaque ouverture, le serveur confirme seulement l’existence de ce jeton : le formulaire est remplacé par « On a déjà ta réponse ». Si la réponse a été supprimée via le reset, le jeton local est retiré et le formulaire redevient accessible. Une vérification réseau indisponible affiche une invitation à réessayer. Sans stockage local disponible, la protection serveur reste active. La mémoire dépend du navigateur et du domaine utilisé. Aucun code SMS, CAPTCHA ou lien personnel n’est ajouté.

L’administration compte comme présent un proche hors zone ou à l’étranger ayant répondu Oui. Le filtre « À distance » regroupe ceux de ces deux zones qui ont répondu Non. Le reset libère le nom, le téléphone, les cadeaux et la mémoire locale lors de la prochaine vérification du serveur.

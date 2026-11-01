# Baby Shower · Jehmara & Myrtho

Invitation du 13 décembre 2026 à Pèlerin 6, optimisée pour mobile. Site statique HTML/CSS/JavaScript connecté à Supabase.

## Organisation

- `index.html` : invitation ; `admin.html` : espace privé des parents.
- `css/` : styles de l’invitation et de l’administration.
- `js/` : logique des deux pages et configuration publique Supabase.
- `images/` : photo du couple.
- `sql/` : schéma complet et historique des migrations.
- `docs/ADMIN.md` : installation et fonctionnement de l’administration.

## Lancer le site

Depuis ce dossier :

```sh
python -m http.server 4318 --bind 127.0.0.1
```

Ouvrir http://127.0.0.1:4318/index.html et http://127.0.0.1:4318/admin.html. Live Server dans VS Code convient aussi. Aucun build ni dépendance JavaScript à installer.

## Supabase

Le projet utilise `js/config.js` : URL Supabase et clé publique publishable uniquement. Aucune clé secrète ou service_role ne doit y figurer. Les tables privées et les fonctions SQL contrôlent l’accès aux données ; les administrateurs doivent être autorisés dans `baby_shower_admins`.

Pour une nouvelle base, exécuter `sql/supabase.sql`. Sur la base déjà configurée, ne pas le réexécuter : les migrations historiques restent conservées pour le suivi et ne doivent pas être relancées sans besoin. Le catalogue par catégories a déjà été installé sur le projet existant.

## Parcours et réservations

Trois parcours : zone métropolitaine, ailleurs en Haïti, étranger. Les participants sur place peuvent venir avec un accompagnant. Les proches à l’étranger confirment à distance.

Le catalogue compte 40 idées principales et 10 équipements dans « Autres cadeaux », accessibles après confirmation dans un pop-up. Plusieurs choix sont possibles. Les cadeaux restent facultatifs.

La confirmation finale enregistre la réponse et réserve les cadeaux dans une transaction. Abandonner le questionnaire ne bloque aucun article. Un cadeau réservé ne peut plus être choisi par un autre invité ; en cas de concurrence, aucun enregistrement partiel n’est conservé. Une seule réponse est acceptée par numéro normalisé (sans vérification SMS). Les propositions libres ne sont pas soumises à l’unicité du catalogue.

La disponibilité publique ne révèle aucun nom. L’espace administrateur permet de consulter les coordonnées, présences, cadeaux et propositions, avec filtres et export CSV. La révélation du sexe est facultative et ne montre pas le prénom.

## Mise en ligne

Servir le dossier à la racine d’un hébergement statique HTTPS. Le dépôt GitHub contient le code ; un push ne publie pas automatiquement le site. La configuration Supabase publique est nécessaire au navigateur ; les mots de passe, sessions et réponses des invités ne font pas partie du dépôt.

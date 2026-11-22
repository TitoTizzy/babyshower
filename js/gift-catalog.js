"use strict";
window.BABY_SHOWER_GIFT_CATALOG = Object.freeze({
  groups: [
    {
      title: "Vêtements et accessoires",
      icon: "body",
      items: [
        "Bodies et pyjamas (tailles 0–3 et 3–6 mois)",
        "Chaussettes et moufles",
        "Bonnets pour nouveau-né",
        "Bavoirs",
        "Tenues de sortie",
        "Langes en coton",
      ],
    },
    {
      title: "Bain et soins",
      icon: "cloth",
      items: [
        "Serviette de bain à capuche",
        "Débarbouillettes",
        "Soin lavant doux pour bébé — corps et cheveux",
        "Lotion hydratante adaptée aux nourrissons",
        "Peigne ou brosse pour bébé",
        "Petite trousse de soin — thermomètre et lime à ongles",
      ],
    },
    {
      title: "Change et hygiène",
      icon: "cloth",
      items: [
        "Couches",
        "Lingettes adaptées aux bébés",
        "Crème protectrice pour le change",
        "Alèses imperméables lavables",
      ],
    },
    {
      title: "Alimentation",
      icon: "bottle",
      items: ["Biberons", "Brosse pour biberon"],
    },
    {
      title: "Équipement et rangement",
      icon: "cloth",
      items: ["Moustiquaire pour le parc", "Panier à vêtements"],
    },
    {
      title: "Sorties",
      icon: "body",
      items: [
        "Sac à langer",
        "Tapis à langer nomade",
        "Pochette pour les vêtements de rechange",
        "Pochette isotherme pour biberons",
        "Petite couverture pour les déplacements",
        "Pare-soleil pour les vitres de la voiture",
      ],
    },
    {
      title: "Éveil",
      icon: "toy",
      items: [
        "Hochet léger, facile à saisir",
        "Livre en tissu",
        "Cartes ou livre d’images à fort contraste",
        "Jouet de dentition",
        "Jouet sensoriel avec différentes textures",
        "Petit miroir incassable conçu pour bébé",
        "Jouets de bain faciles à nettoyer",
      ],
    },
    {
      title: "Pour maman",
      icon: "bib",
      items: [
        "Coussin d’allaitement ou de soutien pour les repas de bébé",
        "Soutiens-gorge d’allaitement",
        "Coussinets d’allaitement",
        "Sacs de conservation du lait maternel",
        "Organisateur à garder près du fauteuil ou du lit",
        "Grande gourde facile à ouvrir d’une main",
        "Veilleuse à lumière réglable",
      ],
    },
    {
      title: "Autres cadeaux",
      icon: "toy",
      big: true,
      items: [
        "Parc pour bébé",
        "Matelas compatible avec le parc",
        "Tire-lait",
        "Porte-bébé",
        "Poussette",
        "Siège auto adapté dès la naissance",
        "Fauteuil confortable avec soutien du dos",
        "Repose-pieds",
        "Tapis d’éveil",
        "Arche d’éveil",
      ],
    },
  ],
  sketchPaths: {
    bear: '<circle cx="25" cy="21" r="11" fill="#e4d4f5"/><circle cx="75" cy="21" r="11" fill="#e4d4f5"/><path d="M22 40c-8-35 66-35 57 0-2 20-56 24-57 0Z" fill="#f6eefb"/><ellipse cx="50" cy="77" rx="26" ry="29" fill="#f4eafa"/><ellipse cx="50" cy="77" rx="16" ry="19" fill="#ffffff70"/><ellipse cx="20" cy="70" rx="10" ry="18" transform="rotate(25 20 70)" fill="#f4eafa"/><ellipse cx="80" cy="70" rx="10" ry="18" transform="rotate(-25 80 70)" fill="#f4eafa"/><ellipse cx="29" cy="101" rx="15" ry="12" fill="#e8dcf6"/><ellipse cx="71" cy="101" rx="15" ry="12" fill="#e8dcf6"/><path d="M37 36h1m24 0h1m-18 8 5 4 5-4Zm5 4v6m-6-2q6 7 12 0M40 62l10 6 10-6v12l-10-6-10 6Z"/><path d="M33 43h-3m37 0h3" stroke="#d58ead"/>',
    baby: '<path d="M24 58Q6 78 30 111q20 14 41-1Q96 77 75 58" fill="#fff5df"/><path d="M26 60q23 15 48 0M24 68l44 39M77 69l-46 41M30 89l30 24" stroke="#a99578"/><circle cx="37" cy="77" r="3" fill="#bfd7f4" stroke="none"/><circle cx="64" cy="82" r="3" fill="#f0bdd1" stroke="none"/><circle cx="46" cy="100" r="2.5" fill="#f0bdd1" stroke="none"/><circle cx="60" cy="99" r="2.5" fill="#bfd7f4" stroke="none"/><circle cx="50" cy="39" r="26" fill="#fff4ed"/><path d="M24 35q-8-7-9 3t10 10m50-13q9-7 10 3t-10 10M44 14q-2-11 7-10t-2 10M36 39q4-5 8 0m13 0q4-5 8 0m-19 9q5 7 10 0"/><path d="M33 47h4m26 0h4" stroke="#d58ead"/>',
    bib: '<path d="M24 19 36 9q14 30 28 0l12 10 9 38q1 47-35 49-36-2-35-49Z" fill="#fbe3ef"/><path d="M28 22 20 60q-1 38 30 40 31-2 30-40l-8-38M44 52q-9-11-16-2t22 27q31-18 22-27t-16 2l-6 7Z"/><circle cx="32" cy="19" r="2"/>',
    bottle:
      '<path d="M32 38h36l7 61q0 13-25 13t-25-13Z" fill="#e9f1ff"/><path d="M31 38v-8h38v8M35 30V20q0-6 9-6V6h12v8q9 0 9 6v10M31 88h42"/><path d="M36 55h9m-9 12h6m-6 12h9"/><path d="M52 73q-8-11-13-4t16 17q24-12 16-19t-13 6Z" fill="#f1cede"/>',
    toy: '<circle cx="50" cy="35" r="24" fill="#e3edff"/><circle cx="50" cy="35" r="13" fill="#fff9"/><path d="M40 58 34 99q0 11 16 11t16-11L60 58Z" fill="#f6d9e9"/><path d="m50 20 4 9 10 1-8 6 2 10-8-5-8 5 2-10-8-6 10-1ZM38 87h24"/>',
    body: '<path d="m31 12 19 6 19-6 21 23-15 14-10-11v47l-15 23-15-23V38L25 49 10 35Z" fill="#e9e7fb"/><path d="M31 12q19 25 38 0M35 85q15 10 30 0"/><circle cx="50" cy="95" r="2"/><path d="M43 48q-8-8-12-1t19 19q24-14 19-20t-12 2l-7 6Z"/>',
    cloth:
      '<path d="M23 20h57v82H23q-11 0-11-11V31q0-11 11-11Z" fill="#e4ecfa"/><path d="M23 20v82M29 31h40M29 40h30M29 91h40"/><path d="M36 62q8-14 16 0t16 0M37 74q7-13 14 0t16 0" stroke="#b780a2"/>',
  },
});

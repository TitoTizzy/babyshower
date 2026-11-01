"use strict";
const config = window.BABY_SHOWER_CONFIG || {};
const configured = Boolean(config.supabaseUrl && config.supabaseKey);
document.getElementById("demo").hidden = configured;
const state = {
  step: "welcome",
  fullName: "",
  phone: "",
  address: "",
  residenceZone: "",
  country: "",
  attending: false,
  companion: false,
  wantsGift: false,
  selectedGifts: [],
  proposal: "",
  giftNotice: "",
  id: crypto.randomUUID ? crypto.randomUUID() : null,
  saved: false,
  submitting: false,
  otherGiftsOpen: false,
  remembered: false,
};
const screen = document.getElementById("screen");
const giftGroups = [
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
];
const giftList = giftGroups.flatMap((group) => group.items);
const giftSketches = giftGroups.flatMap((group) =>
  group.items.map(() => group.icon),
);
const sketchPaths = {
  bear: '<circle cx="25" cy="21" r="11" fill="#e4d4f5"/><circle cx="75" cy="21" r="11" fill="#e4d4f5"/><path d="M22 40c-8-35 66-35 57 0-2 20-56 24-57 0Z" fill="#f6eefb"/><ellipse cx="50" cy="77" rx="26" ry="29" fill="#f4eafa"/><ellipse cx="50" cy="77" rx="16" ry="19" fill="#ffffff70"/><ellipse cx="20" cy="70" rx="10" ry="18" transform="rotate(25 20 70)" fill="#f4eafa"/><ellipse cx="80" cy="70" rx="10" ry="18" transform="rotate(-25 80 70)" fill="#f4eafa"/><ellipse cx="29" cy="101" rx="15" ry="12" fill="#e8dcf6"/><ellipse cx="71" cy="101" rx="15" ry="12" fill="#e8dcf6"/><path d="M37 36h1m24 0h1m-18 8 5 4 5-4Zm5 4v6m-6-2q6 7 12 0M40 62l10 6 10-6v12l-10-6-10 6Z"/><path d="M33 43h-3m37 0h3" stroke="#d58ead"/>',
  baby: '<path d="M24 58Q6 78 30 111q20 14 41-1Q96 77 75 58" fill="#fff5df"/><path d="M26 60q23 15 48 0M24 68l44 39M77 69l-46 41M30 89l30 24" stroke="#a99578"/><circle cx="37" cy="77" r="3" fill="#bfd7f4" stroke="none"/><circle cx="64" cy="82" r="3" fill="#f0bdd1" stroke="none"/><circle cx="46" cy="100" r="2.5" fill="#f0bdd1" stroke="none"/><circle cx="60" cy="99" r="2.5" fill="#bfd7f4" stroke="none"/><circle cx="50" cy="39" r="26" fill="#fff4ed"/><path d="M24 35q-8-7-9 3t10 10m50-13q9-7 10 3t-10 10M44 14q-2-11 7-10t-2 10M36 39q4-5 8 0m13 0q4-5 8 0m-19 9q5 7 10 0"/><path d="M33 47h4m26 0h4" stroke="#d58ead"/>',
  bib: '<path d="M24 19 36 9q14 30 28 0l12 10 9 38q1 47-35 49-36-2-35-49Z" fill="#fbe3ef"/><path d="M28 22 20 60q-1 38 30 40 31-2 30-40l-8-38M44 52q-9-11-16-2t22 27q31-18 22-27t-16 2l-6 7Z"/><circle cx="32" cy="19" r="2"/>',
  bottle:
    '<path d="M32 38h36l7 61q0 13-25 13t-25-13Z" fill="#e9f1ff"/><path d="M31 38v-8h38v8M35 30V20q0-6 9-6V6h12v8q9 0 9 6v10M31 88h42"/><path d="M36 55h9m-9 12h6m-6 12h9"/><path d="M52 73q-8-11-13-4t16 17q24-12 16-19t-13 6Z" fill="#f1cede"/>',
  toy: '<circle cx="50" cy="35" r="24" fill="#e3edff"/><circle cx="50" cy="35" r="13" fill="#fff9"/><path d="M40 58 34 99q0 11 16 11t16-11L60 58Z" fill="#f6d9e9"/><path d="m50 20 4 9 10 1-8 6 2 10-8-5-8 5 2-10-8-6 10-1ZM38 87h24"/>',
  body: '<path d="m31 12 19 6 19-6 21 23-15 14-10-11v47l-15 23-15-23V38L25 49 10 35Z" fill="#e9e7fb"/><path d="M31 12q19 25 38 0M35 85q15 10 30 0"/><circle cx="50" cy="95" r="2"/><path d="M43 48q-8-8-12-1t19 19q24-14 19-20t-12 2l-7 6Z"/>',
  cloth:
    '<path d="M23 20h57v82H23q-11 0-11-11V31q0-11 11-11Z" fill="#e4ecfa"/><path d="M23 20v82M29 31h40M29 40h30M29 91h40"/><path d="M36 62q8-14 16 0t16 0M37 74q7-13 14 0t16 0" stroke="#b780a2"/>',
};
function sketchIcon(type) {
  return (
    '<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    sketchPaths[type] +
    "</svg>"
  );
}
function renderGiftGroups(big) {
  return giftGroups
    .filter((group) => Boolean(group.big) === big)
    .map(
      (group) =>
        `<section class="gift-category" aria-label="${escapeHtml(group.title)}"><h3>${escapeHtml(group.title)}</h3>${group.title === "Pour maman" ? '<p class="small">Les accessoires d’allaitement sont des idées facultatives, selon ce qui convient à Jehmara.</p>' : ""}<ul class="gifts">${group.items
          .map((g) => {
            const i = giftList.indexOf(g),
              reserved = giftAvailability.get(g) === true,
              disabled = reserved || !availabilityReady;
            return `<li style="--i:${Math.min(i, 8)}"><label class="gift-tile ${reserved ? "reserved" : ""}"><input type="checkbox" name="gifts" value="${escapeHtml(g)}" ${state.selectedGifts.includes(g) && !reserved ? "checked" : ""} ${disabled ? "disabled" : ""}><span class="gift-drawing">${sketchIcon(giftSketches[i])}</span><span class="gift-text">${g}<small class="gift-status">${reserved ? "Déjà réservé" : !availabilityReady ? "Vérification requise" : "Disponible"}</small></span><span class="gift-check" aria-hidden="true">${reserved ? "—" : "✓"}</span></label></li>`;
          })
          .join("")}</ul></section>`,
    )
    .join("");
}
function revealOtherGifts() {
  state.otherGiftsOpen = true;
  const section = document.getElementById("other-gifts");
  section.innerHTML = renderGiftGroups(true);
  section.hidden = false;
  const trigger = document.getElementById("other-gifts-trigger");
  if (trigger) {
    trigger.hidden = true;
    trigger.setAttribute("aria-expanded", "true");
  }
  updateGiftAvailabilityUI();
  const heading = section.querySelector("h3");
  if (heading) {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      behavior: motionReduced.matches ? "instant" : "smooth",
      block: "start",
    });
  }
}

function updateGiftSummary() {
  const count = state.selectedGifts.length;
  const summary = document.getElementById("gift-count");
  if (summary)
    summary.textContent = count
      ? count +
        " cadeau" +
        (count > 1 ? "x" : "") +
        " sélectionné" +
        (count > 1 ? "s" : "")
      : "Aucun cadeau sélectionné";
}
function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function button(text, action, style = "") {
  return `<button class="btn ${style}" type="button" data-action="${action}">${text.replace(/ →$/, "")}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>`;
}
let transitioning = false;
let paletteIndex = 0,
  bloomTimer = null;
let giftAvailability = new Map(),
  availabilityReady = !configured,
  availabilityLoading = false;
let giftRequest = 0;
function captureGiftForm() {
  if (state.step !== "gifts") return;
  const proposal = document.getElementById("proposal");
  if (proposal) state.proposal = proposal.value;
  const wants = document.getElementById("wants-gift");
  if (wants) state.wantsGift = wants.checked;
}
async function refreshGifts() {
  if (!configured) {
    availabilityReady = true;
    return;
  }
  if (availabilityLoading) return;
  const request = ++giftRequest;
  availabilityLoading = true;
  try {
    const response = await fetch(
      config.supabaseUrl.replace(/\/$/, "") +
        "/rest/v1/rpc/list_baby_shower_gifts",
      {
        method: "POST",
        headers: {
          apikey: config.supabaseKey,
          "Content-Type": "application/json",
        },
        body: "{}",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error("availability");
    const rows = await response.json();
    if (
      !Array.isArray(rows) ||
      rows.length !== giftList.length ||
      rows.some(
        (r) => !giftList.includes(r.name) || typeof r.reserved !== "boolean",
      )
    )
      throw new Error("catalog");
    if (request !== giftRequest) return;
    captureGiftForm();
    giftAvailability = new Map(rows.map((r) => [r.name, r.reserved]));
    availabilityReady = true;
    const oldCount = state.selectedGifts.length;
    state.selectedGifts = state.selectedGifts.filter(
      (g) => !giftAvailability.get(g),
    );
    if (oldCount !== state.selectedGifts.length)
      state.giftNotice =
        "Certains cadeaux viennent d’être réservés. Ils ont été retirés de ta sélection ; tu peux choisir d’autres idées.";
  } catch (error) {
    availabilityReady = false;
    state.giftNotice =
      "La disponibilité des cadeaux ne peut pas être vérifiée. Réessaie avant de choisir un cadeau.";
  } finally {
    availabilityLoading = false;
    if (state.step === "gifts") updateGiftAvailabilityUI();
  }
}
function updateGiftAvailabilityUI() {
  if (state.step !== "gifts") return;
  screen.querySelectorAll('input[name="gifts"]').forEach((input) => {
    const reserved = giftAvailability.get(input.value) === true;
    input.disabled = reserved || !availabilityReady;
    input.checked = state.selectedGifts.includes(input.value) && !reserved;
    const tile = input.closest(".gift-tile");
    tile.classList.toggle("reserved", reserved);
    tile.querySelector(".gift-status").textContent = reserved
      ? "Déjà réservé"
      : !availabilityReady
        ? "Vérification requise"
        : "Disponible";
  });
  const notice = document.getElementById("gift-notice");
  if (notice) notice.textContent = state.giftNotice;
  const status = screen.querySelector(".availability-tools .small");
  if (status)
    status.textContent = availabilityLoading
      ? "Vérification des disponibilités…"
      : availabilityReady
        ? "Disponibilités actualisées"
        : "Disponibilités non vérifiées";
  updateGiftSummary();
}
setInterval(() => {
  if (state.step === "gifts" && document.visibilityState === "visible")
    refreshGifts();
}, 20000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.step === "gifts")
    refreshGifts();
});
const motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
function go(step, direction = 1) {
  if (transitioning || step === state.step) return;
  transitioning = true;
  if (state.step === "name") {
    state.fullName = document.getElementById("full-name").value;
    state.phone = document.getElementById("phone").value;
    state.address = document.getElementById("address").value;
    if (document.getElementById("country"))
      state.country = document.getElementById("country").value;
  }
  captureGiftForm();
  const advances = direction > 0;
  document.body.style.setProperty("--direction", direction);
  const finish = () => {
    if (advances) paletteIndex++;
    const palette = paletteIndex % 2 ? "pink" : "blue";
    const panel = document.querySelector(".card");
    panel.dataset.palette = palette;
    document.body.dataset.palette = palette;
    state.step = step;
    render();
    if (window.matchMedia("(max-width:760px)").matches && step !== "welcome") {
      requestAnimationFrame(() =>
        document
          .querySelector(".questionnaire-stage")
          .scrollIntoView({ behavior: "instant", block: "start" }),
      );
    }
    if (!motionReduced.matches) {
      panel.classList.remove("step-bloom");
      void panel.offsetWidth;
      panel.classList.add("step-bloom");
      clearTimeout(bloomTimer);
      bloomTimer = setTimeout(() => panel.classList.remove("step-bloom"), 800);
    }
    screen.classList.remove("leaving");
    screen.classList.add("entering");
    transitioning = false;
    if (step === "reveal") celebrate();
    if (step === "gifts") refreshGifts();
    if (step === "distant-no")
      document.getElementById("distance-gift-dialog").showModal();
  };
  if (motionReduced.matches) {
    finish();
    return;
  }
  screen.classList.remove("entering");
  screen.classList.add("leaving");
  setTimeout(finish, 180);
}
function celebrate() {
  if (motionReduced.matches) return;
  const layer = document.getElementById("confetti");
  layer.innerHTML = Array.from(
    { length: 55 },
    (_, i) =>
      '<i style="--x:' +
      Math.random() * 100 +
      "%;--c:" +
      (state.step === "reveal"
        ? ["#60a5fa", "#93c5fd", "#e0f2fe", "#38bdf8"]
        : ["#7cacf0", "#e8a4c9", "#fafcff", "#b2a0dd"])[i % 4] +
      ";--delay:" +
      Math.random() * 0.7 +
      's"></i>',
  ).join("");
  setTimeout(() => {
    layer.innerHTML = "";
  }, 3600);
}
function render() {
  document.body.dataset.mood = state.step;
  document.querySelector(".card").dataset.step = state.step;
  const stages = {
    welcome: 1,
    location: 2,
    name: 3,
    continue: 4,
    "gift-choice": 5,
    gifts: 5,
    rsvp: 6,
    "reveal-choice": 7,
    reveal: 7,
    surprise: 7,
    thanks: 7,
    submitted: 7,
    "already-submitted": 7,
    stop: 4,
    "distant-attendance": 4,
    "distant-yes": 4,
    "distant-no": 4,
    "memory-check": 7,
    remembered: 7,
  };
  const stage = stages[state.step] || 1;
  document.getElementById("step-label").textContent =
    String(stage).padStart(2, "0") + " / 07";
  const order = [
    "welcome",
    "location",
    "name",
    "continue",
    "gift-choice",
    "gifts",
    "rsvp",
    "reveal-choice",
    "reveal",
  ];
  const idx = Math.max(0, order.indexOf(state.step));
  document.getElementById("progress").innerHTML = Array.from(
    { length: 7 },
    (_, i) => `<i class="${i < stage ? "active" : ""}"></i>`,
  ).join("");
  let html = "";
  switch (state.step) {
    case "welcome":
      html = `<span class="pill">Tu comptes pour nous</span><h2>On fête bébé.<br>De près ou de loin, avec toi !</h2><p class="copy">Si on t’envoie cette invitation, c’est parce que tu comptes pour nous. Pour accueillir notre premier bébé, on a envie de partager notre joie avec les gens qu’on aime.</p><p class="copy">Notre baby shower aura lieu le <strong>13 décembre 2026 à Pèlerin 6</strong>. Que tu sois tout près ou à l’autre bout du monde, on a une belle surprise à partager avec toi !</p><p class="copy">Dis-nous où tu es, et on te prépare la suite.</p><div class="actions">${button("On y va →", "location")}</div>`;
      break;
    case "location":
      html = `<span class="pill">Près du cœur, où que tu sois</span><h2>Tu es où<br>en ce moment ?</h2><p class="copy">On sait que tous nos proches ne sont pas au même endroit. Dis-nous d’où tu nous lis pour qu’on adapte la suite pour toi.</p><div class="location-options">${[
        [
          "metro",
          "Dans la zone métropolitaine",
          "Port-au-Prince et ses environs",
        ],
        [
          "haiti_other",
          "Ailleurs en Haïti",
          "En dehors de la zone métropolitaine",
        ],
        ["abroad", "À l’étranger", "On célèbre aussi avec toi, à distance"],
      ]
        .map(
          ([zone, title, subtitle]) =>
            `<button class="location-option" type="button" data-action="location-${zone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-6 6-6 12 0 18 6-6 6-12 0-18Z"/></svg><span><strong>${title}</strong><small>${subtitle}</small></span><span class="chevron" aria-hidden="true">→</span></button>`,
        )
        .join("")}</div>`;
      break;
    case "name":
      html = `<h2>Pour qu’on garde<br>le contact</h2><p class="copy">${state.residenceZone === "abroad" ? "Même de loin, on veut garder le lien avec toi. Laisse-nous tes coordonnées pour qu’on puisse partager les nouvelles de bébé." : "Laisse-nous tes coordonnées pour qu’on puisse te préciser l’heure et les derniers détails."}</p><form id="name-form"><label for="full-name">Nom complet</label><input id="full-name" name="name" autocomplete="name" autocapitalize="words" enterkeyhint="next" spellcheck="false" required minlength="2" maxlength="120" value="${escapeHtml(state.fullName)}" placeholder="Prénom et nom"><label for="phone">Numéro de téléphone</label><input id="phone" name="tel" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="next" required minlength="7" maxlength="40" value="${escapeHtml(state.phone)}" placeholder="${state.residenceZone === "abroad" ? "Numéro avec indicatif du pays" : "Ex. : +509 1234 5678"}">${state.residenceZone === "abroad" ? `<label for="country">Pays de résidence</label><input id="country" name="country-name" autocomplete="country-name" required minlength="2" maxlength="80" value="${escapeHtml(state.country)}" placeholder="Ex. : Canada, France, États-Unis">` : ""}<label for="address">Adresse</label><textarea id="address" name="street-address" autocomplete="street-address" enterkeyhint="done" required minlength="5" maxlength="500" placeholder="Quartier, rue, numéro et ville">${escapeHtml(state.address)}</textarea><p class="small">Tes coordonnées restent entre nous, pour l’organisation du baby shower. Elles ne sont pas visibles par les autres invités.</p><div class="actions"><button class="btn" type="submit">Suivant →</button></div></form>`;
      break;
    case "memory-check":
      html =
        '<h2>Un petit instant…</h2><p class="copy">On vérifie si ta réponse est déjà enregistrée.</p><p id="memory-error" class="error" role="status"></p><div class="actions"><button type="button" class="btn" data-action="check-memory">Vérifier à nouveau</button></div>';
      break;
    case "remembered":
      html =
        '<span class="pill">C’est déjà bien reçu</span><h2>On a déjà<br>ta réponse !</h2><p class="copy">Merci d’avoir pris le temps de nous répondre. Tout est enregistré, pas besoin de recommencer. Si tu veux changer quelque chose, écris-nous directement.</p><div class="actions">' +
        button("Retrouver la surprise", "reveal-choice") +
        "</div>";
      break;
    case "distant-attendance":
      html =
        '<span class="pill">De près ou de loin, tu comptes pour nous</span><h2>Penses-tu pouvoir être présent le 13 ?</h2><p class="copy">On sait que la distance peut compliquer les choses. On aurait tellement aimé t’avoir avec nous, mais surtout, aucune pression.</p><div class="note">La fête aura lieu le <strong>13 décembre 2026 à Pèlerin 6</strong>. Avec ou sans cadeau, tu as toute ta place.</div><div class="actions">' +
        button("Oui", "distant-yes-answer") +
        button("Non", "distant-no-answer", "quiet") +
        "</div>";
      break;
    case "distant-yes":
      html =
        '<span class="pill">Quelle belle nouvelle !</span><h2>Parfait !<br>On a hâte de te retrouver.</h2><p class="copy">Ça nous fait tellement plaisir de savoir que tu pourras être avec nous le 13. On te précisera l’heure bientôt.</p><div class="note">Ta présence suffit à nous faire plaisir. Tu n’as aucune obligation d’offrir un cadeau.</div><div class="actions">' +
        button("On continue →", "gift-choice") +
        "</div>";
      break;
    case "distant-no":
      html =
        '<span class="pill">La distance ne change rien</span><h2>On comprend,<br>et on pense fort à toi.</h2><p class="copy">Tu vas nous manquer, mais on sait que ce n’est pas toujours possible de faire le déplacement. Même de loin, tu comptes beaucoup pour nous.</p><div class="actions">' +
        button("Continuer", "distance-gift-open") +
        '</div><p id="error" class="error" role="alert"></p>';
      break;
    case "continue":
      html = `<span class="pill">${state.residenceZone === "abroad" ? "La distance ne change rien" : "Le plus beau cadeau, c’est toi"}</span><h2>${escapeHtml(state.fullName)},<br>${state.residenceZone === "abroad" ? "tu fais partie de la fête, même de loin." : state.residenceZone === "haiti_other" ? "si tu peux faire le déplacement, on sera ravis !" : "tu viens fêter ça avec nous ?"}</h2><p class="copy">${state.residenceZone === "abroad" ? "On aurait aimé t’avoir tout près, mais tu as toute ta place dans cette belle aventure. On a pensé à toi aussi en préparant cette invitation." : state.residenceZone === "haiti_other" ? "On sait que venir jusqu’à Pèlerin 6 demande de s’organiser. Aucune pression : tu pourras nous dire si le déplacement est possible pour toi." : "Ça nous ferait tellement plaisir de t’avoir avec nous pour fêter l’arrivée de bébé."}</p><div class="note"><strong>${state.residenceZone === "abroad" ? "Tu n’as absolument rien à offrir." : "Tu n’as absolument rien à offrir pour venir."}</strong> ${state.residenceZone === "abroad" ? "Partager notre joie avec toi nous fait déjà très plaisir." : "Ce qui nous ferait plaisir, c’est de passer ce moment avec toi."}</div><p>On continue ?</p><div class="actions">${button("Oui, je continue", "gift-choice")}${button("Non, je m’arrête ici", "stop", "quiet")}</div>`;
      break;
    case "stop":
      html = `<h2>Pas de souci !<br>Reviens quand tu veux.</h2><p class="copy">Prends ton temps et reviens quand tu veux pour la suite. Pour l’instant, ta réponse n’a pas été enregistrée.</p><div class="actions">${button("Reprendre mon invitation", "continue")}</div>`;
      break;
    case "gift-choice":
      html = `<span class="pill">Une petite attention, si tu le souhaites</span><h2>Vous nous avez<br>demandé des idées…</h2><p class="copy">Plusieurs d’entre vous nous ont demandé ce qui nous ferait plaisir pour bébé. Alors, on a rassemblé quelques idées ici.</p><div class="note">Si tu as envie de nous gâter, la liste est là. Mais vraiment, aucun cadeau n’est nécessaire pour partager ce moment avec nous.</div><p>Tu veux y jeter un œil ?</p><div class="actions">${button("Oui, voir les idées", "gifts")}${button("Non, je passe à la suite", "rsvp", "quiet")}</div>`;
      break;
    case "gifts":
      html = `<span class="pill">Une attention, si tu le souhaites</span><h2>Une liste pour<br>accueillir bébé.</h2><p class="gift-instruction">Si tu as envie de nous gâter, tu peux choisir <strong>plusieurs idées à la fois</strong>. Pour éviter les doublons entre proches, on réserve tes choix dès que tu confirmes ta réponse à la prochaine étape.</p><p class="small">La marque, c’est toi qui choisis. Et offrir un cadeau reste entièrement facultatif.</p>${!configured ? '<div class="note">Mode aperçu : les réservations entre invités nécessitent la connexion à Supabase.</div>' : ""}<p id="gift-notice" class="error" role="status">${escapeHtml(state.giftNotice)}</p><div class="availability-tools"><span class="small">${availabilityLoading ? "Vérification des disponibilités…" : availabilityReady ? "Disponibilités actualisées" : "Disponibilités non vérifiées"}</span><button type="button" class="back" data-action="refresh-gifts">Actualiser</button></div><form id="gift-form"><div class="gift-summary"><strong id="gift-count" role="status" aria-live="polite"></strong><span>Choix multiples</span><button type="button" class="jump-gifts" data-action="gift-end">Voir la suite ↓</button></div>${renderGiftGroups(false)}<section class="other-gifts-invite"><h3>D’autres idées, seulement si tu en as envie</h3><p class="small">On a mis les équipements plus importants dans une liste à part. C’est entièrement facultatif.</p><button type="button" id="other-gifts-trigger" class="btn secondary" data-action="other-gifts" aria-haspopup="dialog" aria-controls="other-gifts-dialog" aria-expanded="${state.otherGiftsOpen}" ${state.otherGiftsOpen ? "hidden" : ""}>Voir les autres cadeaux</button><div id="other-gifts" ${state.otherGiftsOpen ? "" : "hidden"}>${state.otherGiftsOpen ? renderGiftGroups(true) : ""}</div></section><label class="check"><input id="wants-gift" type="checkbox" ${state.wantsGift ? "checked" : ""}>Je propose de donner autre chose</label><label id="gift-finish" for="proposal">Proposer un cadeau</label><textarea id="proposal" maxlength="500" placeholder="Tu as une autre idée ? Dis-nous ce qui te ferait plaisir d’offrir.">${escapeHtml(state.proposal)}</textarea><p class="small">Encore une étape : confirme ta réponse sur la page suivante pour qu’on garde tes cadeaux de côté.</p><div class="actions"><button class="btn" type="submit">Continuer →</button></div></form>`;
      break;
    case "rsvp":
      if (state.residenceZone !== "metro") {
        html = state.attending
          ? '<span class="pill">On te garde une place</span><h2>On t’attend le 13 !</h2><p class="copy">À Pèlerin 6, le 13 décembre 2026. On te précisera l’heure bientôt.</p><div class="note">Tu peux venir avec une personne, si tu veux.</div><label class="check"><input id="companion" type="checkbox" ' +
            (state.companion ? "checked" : "") +
            '>Oui, je viens avec une personne</label><div class="actions">' +
            button("Confirmer ma réponse →", "confirm-route") +
            '</div><p id="error" class="error" role="alert"></p>'
          : '<span class="pill">Avec nous, à distance</span><h2>Merci de penser<br>à nous et à bébé.</h2><p class="copy">Même si tu ne peux pas venir, ta petite attention nous touche beaucoup. On pourra s’organiser ensemble pour les cadeaux.</p><p class="copy">Confirme ta réponse pour réserver tes choix, puis retrouver notre petite surprise.</p><div class="actions">' +
            button("Confirmer ma réponse →", "confirm-route") +
            '</div><p id="error" class="error" role="alert"></p>';
      } else {
        html =
          '<span class="pill">Ta réponse</span><h2>Alors, tu seras là ?</h2><p class="copy">On t’attend le <strong>13 décembre 2026 à Pèlerin 6</strong>. On te précisera l’heure bientôt.</p><div class="note">Tu peux venir avec une personne, si tu veux. Une seule, pour qu’on puisse bien accueillir tout le monde.</div><label class="check"><input id="companion" type="checkbox" ' +
          (state.companion ? "checked" : "") +
          '>Oui, je viens avec une personne</label><div class="actions">' +
          button("Oui, je serai là", "yes") +
          button("Je ne pourrai pas venir", "no", "quiet") +
          '</div><p id="error" class="error" role="alert"></p>';
      }
      break;
    case "submitted":
      html = state.saved
        ? `<div class="submission-success"><div class="success-check" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="m11 25 9 9 18-20"/></svg></div><span class="confirmation-label">Confirmation</span><h2>C’est bien reçu !</h2><p class="copy">Merci ${escapeHtml(state.fullName)} ! Ta réponse a bien été enregistrée${state.selectedGifts.length ? " et tes cadeaux sont réservés" : ""}.</p>${state.selectedGifts.length ? `<ul class="confirmation-list" aria-label="Cadeaux réservés">${state.selectedGifts.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>` : ""}${state.proposal ? '<p class="copy">On a aussi bien reçu ta proposition de cadeau.</p>' : ""}<p class="small">Pas besoin de remplir l’invitation une deuxième fois. Si tu veux changer quelque chose, écris-nous directement.</p><div class="actions">${button(state.residenceZone !== "metro" || state.attending || state.wantsGift ? "Découvrir la suite →" : "Terminer →", "after-submit")}</div></div>`
        : `<div class="preview-confirmation"><h2>Aperçu uniquement</h2><p>Cette réponse n’a pas été enregistrée et aucun cadeau n’a été réservé.</p></div><div class="actions">${button("Voir la suite de l’aperçu", "after-submit")}</div>`;
      break;
    case "already-submitted":
      html = `<span class="pill">On a déjà ta réponse</span><h2>Pas besoin de<br>recommencer.</h2><div class="note duplicate-notice">On a déjà reçu une réponse avec ce nom complet ou ce numéro de téléphone. Aucune nouvelle réponse ni réservation n’a été ajoutée.</div><p class="copy">Si tu veux modifier ta réponse ou tes cadeaux, écris-nous directement. Si tu t’es trompé de numéro, tu peux corriger tes coordonnées.</p><div class="actions">${button("Vérifier mes coordonnées", "edit-contact")}</div>`;
      break;
    case "reveal-choice":
      html = `<span class="pill">${state.saved ? "Ta réponse est enregistrée" : "Aperçu de la suite"}</span><h2>Tu veux savoir<br>ou tu gardes la surprise ?</h2><p class="copy">${state.remembered ? "On est heureux de partager cette nouvelle avec toi." : state.attending ? "On a trop hâte de te retrouver !" : "On comprend que tu ne puisses pas venir. Même de loin, tu comptes pour nous et on veut partager cette surprise avec toi."}</p><p>Tu veux qu’on te dise <strong>si c’est une fille ou un garçon</strong> maintenant ? Ou tu préfères attendre le 13 décembre pour le découvrir ?</p><div class="actions">${button("Oui, je veux savoir !", "reveal")}${button("Je garde la surprise pour le 13", "surprise", "secondary")}</div>`;
      break;
    case "reveal":
      html = `<div class="reveal"><span class="symbol" aria-hidden="true"><svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 58Q6 78 30 111q20 14 41-1Q96 77 75 58" fill="#fff5df"/><path d="M26 60q23 15 48 0M24 68l44 39M77 69l-46 41M30 89l30 24" stroke="#a99578"/><circle cx="37" cy="77" r="3" fill="#bfd7f4" stroke="none"/><circle cx="64" cy="82" r="3" fill="#f0bdd1" stroke="none"/><circle cx="46" cy="100" r="2.5" fill="#f0bdd1" stroke="none"/><circle cx="60" cy="99" r="2.5" fill="#bfd7f4" stroke="none"/><circle cx="50" cy="39" r="26" fill="#fff4ed"/><path d="M24 35q-8-7-9 3t10 10m50-13q9-7 10 3t-10 10M44 14q-2-11 7-10t-2 10M36 39q4-5 8 0m13 0q4-5 8 0m-19 9q5 7 10 0"/><path d="M33 47h4m26 0h4" stroke="#d58ead"/></svg></span><p class="eyebrow">Notre petite merveille</p><h2>C’est un garçon !</h2><p class="copy">Déjà tellement aimé, avant même son premier regard.</p><div class="note">Son arrivée est prévue le <strong>8 février 2027</strong>.</div><p class="copy">Mais chut… garde ça entre nous ! Certains de nos proches préfèrent attendre le 13 décembre pour le découvrir.</p></div>`;
      break;
    case "surprise":
      html = `<span class="pill">La surprise est bien gardée</span><h2>Rendez-vous le<br>13 décembre 2026 !</h2><p class="copy">${state.residenceZone === "abroad" ? "Alors, on garde le secret jusqu’au 13 décembre ! Même à distance, on a hâte de partager cette nouvelle avec toi." : "Alors, on garde le secret jusqu’au 13 décembre ! On a hâte de partager cette nouvelle avec toi."}</p>${state.attending ? '<div class="note">On te précisera l’heure bientôt.</div>' : ""}<p class="copy">On t’embrasse, et à très vite ! ♡</p>`;
      break;
    case "thanks":
      html = `<span class="pill">${state.saved ? "Ta réponse est enregistrée" : "Aperçu de la suite"}</span><h2>Tu vas nous manquer !</h2><p class="copy">On aurait aimé t’avoir avec nous, mais on comprend. On pense fort à toi et on t’envoie plein d’amour.</p>`;
      break;
  }
  screen.innerHTML =
    html +
    ((order.includes(state.step) && idx > 0 && idx < 7) ||
    ["distant-attendance", "distant-yes", "distant-no"].includes(state.step)
      ? '<button class="back" type="button" data-action="back"><svg style="transform:rotate(180deg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>Retour</button>'
      : "");
  updateGiftSummary();
  const seal = document.getElementById("illustrated-seal");
  if (seal)
    seal.innerHTML = sketchIcon(
      ["gifts", "gift-choice"].includes(state.step)
        ? "bib"
        : state.step === "reveal"
          ? "baby"
          : "bear",
    );
  screen.querySelector("h2")?.setAttribute("tabindex", "-1");
  screen.querySelector("h2")?.focus({ preventScroll: true });
}
screen.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "name-form") {
    const name = document.getElementById("full-name").value.trim();
    if (name.length < 2) {
      document
        .getElementById("full-name")
        .setCustomValidity("Merci de saisir ton nom complet.");
      document.getElementById("full-name").reportValidity();
      return;
    }
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const digits = phone.replace(/\D/g, "");
    if (
      !/^[+\d\s().-]+$/.test(phone) ||
      digits.length < 7 ||
      digits.length > 15 ||
      (state.residenceZone === "abroad" && !/^(\+|00|011)/.test(phone))
    ) {
      document
        .getElementById("phone")
        .setCustomValidity(
          "Vérifie ton numéro : entre 7 et 15 chiffres. À l’étranger, ajoute l’indicatif du pays, par exemple +1 ou +33.",
        );
      document.getElementById("phone").reportValidity();
      return;
    }
    if (address.length < 5) {
      document
        .getElementById("address")
        .setCustomValidity("Ajoute ton quartier ou ta rue et ta ville.");
      document.getElementById("address").reportValidity();
      return;
    }
    const country =
      state.residenceZone === "abroad"
        ? document.getElementById("country").value.trim()
        : "Haïti";
    if (
      country.length < 2 ||
      country.length > 80 ||
      (state.residenceZone === "abroad" &&
        ["haiti", "haïti"].includes(country.toLowerCase()))
    ) {
      document
        .getElementById("country")
        .setCustomValidity(
          "Indique le pays où tu vis, ou reviens choisir un parcours en Haïti.",
        );
      document.getElementById("country").reportValidity();
      return;
    }
    state.fullName = name;
    state.phone = phone;
    state.address = address;
    state.country = country;
    go(state.residenceZone === "metro" ? "continue" : "distant-attendance");
  }
  if (e.target.id === "gift-form") {
    state.proposal = document.getElementById("proposal").value.trim();
    state.selectedGifts = Array.from(
      screen.querySelectorAll('input[name="gifts"]:checked:not(:disabled)'),
      (input) => input.value,
    );
    state.wantsGift =
      document.getElementById("wants-gift").checked ||
      Boolean(state.proposal) ||
      state.selectedGifts.length > 0;
    go("rsvp");
  }
});
screen.addEventListener("change", (e) => {
  if (e.target.name === "gifts") {
    state.selectedGifts = Array.from(
      screen.querySelectorAll('input[name="gifts"]:checked'),
      (input) => input.value,
    );
    updateGiftSummary();
  }
});
screen.addEventListener("animationend", (event) => {
  if (event.target === screen && event.animationName === "step-in")
    screen.classList.remove("entering");
});
screen.addEventListener("input", (e) => {
  if (["full-name", "phone", "address", "country"].includes(e.target.id))
    e.target.setCustomValidity("");
});
screen.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const a = btn.dataset.action;
  if (state.submitting) return;
  if (!motionReduced.matches && Number.isFinite(e.clientX)) {
    const wave = document.createElement("i");
    wave.className = "reply-burst";
    wave.style.left = e.clientX + "px";
    wave.style.top = e.clientY + "px";
    document.body.appendChild(wave);
    setTimeout(() => wave.remove(), 650);
  }
  if (a === "check-memory") {
    await checkBrowserMemory();
    return;
  }
  if (a === "distant-yes-answer" || a === "distant-no-answer") {
    state.attending = a === "distant-yes-answer";
    state.companion = false;
    go(state.attending ? "distant-yes" : "distant-no");
    return;
  }
  if (a === "distance-gift-open") {
    document.getElementById("distance-gift-dialog").showModal();
    return;
  }
  if (a === "other-gifts") {
    captureGiftForm();
    document.body.classList.add("other-gifts-open");
    document.getElementById("other-gifts-dialog").showModal();
    return;
  }
  if (a === "after-submit") {
    if (configured && !state.saved) return;
    go(
      state.residenceZone !== "metro" || state.attending || state.wantsGift
        ? "reveal-choice"
        : "thanks",
    );
    return;
  }
  if (a === "edit-contact") {
    go("name", -1);
    return;
  }
  if (a.startsWith("location-")) {
    const zone = a.slice(9);
    if (!["metro", "haiti_other", "abroad"].includes(zone)) return;
    state.residenceZone = zone;
    state.attending = false;
    state.companion = false;
    if (zone !== "abroad") state.country = "Haïti";
    else if (state.country === "Haïti") state.country = "";
    go("name");
    return;
  }
  if (a === "gift-end") {
    document.getElementById("gift-finish").scrollIntoView({
      behavior: motionReduced.matches ? "instant" : "smooth",
      block: "start",
    });
    return;
  }
  if (a === "refresh-gifts") {
    captureGiftForm();
    await refreshGifts();
    return;
  }
  if (a === "back") {
    const prev = {
      location: "welcome",
      name: "location",
      continue: "name",
      "distant-attendance": "name",
      "distant-yes": "distant-attendance",
      "distant-no": "distant-attendance",
      "gift-choice":
        state.residenceZone === "metro" ? "continue" : "distant-yes",
      gifts:
        state.residenceZone !== "metro" && !state.attending
          ? "distant-no"
          : "gift-choice",
      rsvp:
        state.residenceZone !== "metro" && !state.attending
          ? "gifts"
          : "gift-choice",
    };
    go(prev[state.step], -1);
    return;
  }
  if (a === "yes" || a === "no" || a === "confirm-route") {
    if (a !== "confirm-route") state.attending = a === "yes";
    state.companion =
      state.attending && Boolean(document.getElementById("companion")?.checked);
    await submitInvitation(btn);
    return;
  }
  go(a);
});
async function saveResponse() {
  if (!configured) {
    state.saved = false;
    return;
  }
  if (!state.id) throw new Error("Un navigateur récent est nécessaire.");
  if (config.supabaseKey.startsWith("sb_secret_"))
    throw new Error("Configuration invalide");
  const url = config.supabaseUrl.replace(/\/$/, "");
  const response = await fetch(url + "/rest/v1/rpc/submit_baby_shower_route", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: config.supabaseKey },
    body: JSON.stringify({
      p_token: state.id,
      p_full_name: state.fullName,
      p_phone: state.phone,
      p_address: state.address,
      p_residence_zone: state.residenceZone,
      p_country: state.country,
      p_attending: state.attending,
      p_companion: state.companion,
      p_wants_gift: state.wantsGift,
      p_proposal: state.proposal,
      p_selected_gifts: state.selectedGifts,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.message === "gift_unavailable")
      throw new Error("gift_unavailable");
    if (error.message === "response_already_submitted")
      throw new Error("response_already_submitted");
    throw new Error("Enregistrement impossible");
  }
  state.saved = true;
  rememberSubmission();
}
const card = document.querySelector(".card");
card.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || motionReduced.matches) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--mx", e.clientX - rect.left + "px");
  card.style.setProperty("--my", e.clientY - rect.top + "px");
});
const otherGiftsDialog = document.getElementById("other-gifts-dialog");
document.getElementById("other-gifts-yes").addEventListener("click", () => {
  otherGiftsDialog.close();
  revealOtherGifts();
});
document
  .getElementById("other-gifts-no")
  .addEventListener("click", () => otherGiftsDialog.close());
otherGiftsDialog.addEventListener("close", () =>
  document.body.classList.remove("other-gifts-open"),
);
const receiptKey = "babyshower:receipt:" + config.supabaseUrl;
let memoryRequest = 0;
function readReceipt() {
  try {
    const token = localStorage.getItem(receiptKey);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      token || "",
    )
      ? token
      : null;
  } catch {
    return null;
  }
}
function rememberSubmission() {
  try {
    localStorage.setItem(receiptKey, state.id);
  } catch {}
}
async function checkBrowserMemory() {
  const token = readReceipt();
  if (!configured || !token) {
    if (state.step === "memory-check" || state.remembered) {
      state.saved = false;
      state.remembered = false;
      state.step = "welcome";
      render();
    }
    return;
  }
  const request = ++memoryRequest;
  state.step = "memory-check";
  render();
  try {
    const response = await fetch(
      config.supabaseUrl.replace(/\/$/, "") +
        "/rest/v1/rpc/baby_shower_receipt_exists",
      {
        method: "POST",
        headers: {
          apikey: config.supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_token: token }),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("receipt_check_failed");
    const exists = await response.json();
    if (typeof exists !== "boolean") throw new Error("invalid_status");
    if (request !== memoryRequest) return;
    if (exists) {
      state.saved = true;
      state.remembered = true;
      state.step = "remembered";
    } else {
      try {
        localStorage.removeItem(receiptKey);
      } catch {}
      state.saved = false;
      state.remembered = false;
      state.step = "welcome";
    }
    render();
  } catch {
    if (request === memoryRequest) {
      document.getElementById("memory-error").textContent =
        "Impossible de vérifier ta réponse pour le moment. Réessaie quand la connexion revient.";
    }
  }
}
async function submitInvitation(
  button,
  { directReveal = false, errorId = "error" } = {},
) {
  if (state.submitting || state.saved) return;
  state.submitting = true;
  const text = button.textContent;
  screen.querySelectorAll("button").forEach((b) => (b.disabled = true));
  document
    .querySelectorAll("#distance-gift-dialog button")
    .forEach((b) => (b.disabled = true));
  button.textContent = "Envoi en cours…";
  try {
    await saveResponse();
    document.getElementById("distance-gift-dialog").close();
    go(directReveal ? "reveal-choice" : "submitted");
  } catch (err) {
    if (err.message === "response_already_submitted") {
      document.getElementById("distance-gift-dialog").close();
      go("already-submitted");
    } else if (err.message === "gift_unavailable") {
      state.giftNotice =
        "Un proche vient de réserver une de tes idées. Ta réponse n’a pas été enregistrée. Vérifie la liste et confirme à nouveau.";
      go("gifts", -1);
    } else {
      const error = document.getElementById(errorId);
      if (error)
        error.textContent =
          "Ta réponse n’a pas été confirmée. Vérifie ta connexion puis réessaie.";
    }
  } finally {
    state.submitting = false;
    screen.querySelectorAll("button").forEach((b) => (b.disabled = false));
    document
      .querySelectorAll("#distance-gift-dialog button")
      .forEach((b) => (b.disabled = false));
    if (button.isConnected) button.textContent = text;
  }
}
const distanceGiftDialog = document.getElementById("distance-gift-dialog");
document.getElementById("distance-gift-yes").addEventListener("click", () => {
  if (state.submitting) return;
  state.wantsGift = true;
  distanceGiftDialog.close();
  go("gifts");
});
document
  .getElementById("distance-gift-no")
  .addEventListener("click", async (event) => {
    if (state.submitting) return;
    state.attending = false;
    state.companion = false;
    state.wantsGift = false;
    state.selectedGifts = [];
    state.proposal = "";
    await submitInvitation(event.currentTarget, {
      directReveal: true,
      errorId: "distance-gift-error",
    });
  });
distanceGiftDialog.addEventListener("cancel", (event) => {
  if (state.submitting) event.preventDefault();
});
window.addEventListener("storage", (event) => {
  if (event.key === receiptKey && event.newValue && !state.submitting) {
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    checkBrowserMemory();
  }
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) checkBrowserMemory();
});
render();
screen.classList.add("entering");
checkBrowserMemory();

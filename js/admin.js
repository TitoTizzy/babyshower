"use strict";
const $ = (id) => document.getElementById(id);
const settings = window.BABY_SHOWER_CONFIG || {};
const configured = Boolean(
  settings.supabaseUrl &&
  settings.supabaseKey &&
  !settings.supabaseKey.startsWith("sb_secret_"),
);
let session = null,
  expiryTimer = null,
  requestController = null,
  requestVersion = 0;
let snapshot = { responses: [], gifts: [] };
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const dateFormat = new Intl.DateTimeFormat("fr-HT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Port-au-Prince",
});
function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Date inconnue" : dateFormat.format(d);
}
function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}
const zoneLabels = {
  metro: "Zone métropolitaine",
  haiti_other: "Ailleurs en Haïti",
  abroad: "À l’étranger",
};
function isRemote(row) {
  return (
    ["abroad", "haiti_other"].includes(row.residence_zone) && !row.attending
  );
}
function zoneLabel(row) {
  return zoneLabels[row.residence_zone] || "Non précisé";
}
function selectedGifts(row) {
  return Array.isArray(row.selected_gifts) ? row.selected_gifts : [];
}
function hasGift(row) {
  return (
    row.wants_gift ||
    selectedGifts(row).length > 0 ||
    Boolean(row.gift_proposal?.trim())
  );
}
function resetSession(message = "") {
  requestVersion++;
  requestController?.abort();
  clearTimeout(expiryTimer);
  session = null;
  clearResetSelection();
  snapshot = { responses: [], gifts: [] };
  $("dashboard").hidden = true;
  $("login-panel").hidden = false;
  $("response-list").innerHTML = "";
  $("gift-list").innerHTML = "";
  $("account").textContent = "";
  $("password").value = "";
  $("login-error").textContent = message;
  $("login-button").disabled = !configured;
  $("refresh").disabled = false;
  $("export").disabled = false;
  $("search").value = "";
  $("attendance-filter").value = "all";
  $("gift-filter").value = "all";
  $("location-filter").value = "all";
}
async function api(path, { body, token, signal } = {}) {
  const response = await fetch(settings.supabaseUrl.replace(/\/$/, "") + path, {
    method: "POST",
    headers: {
      apikey: settings.supabaseKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body || {}),
    signal: signal || AbortSignal.timeout(15000),
    cache: "no-store",
    credentials: "omit",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || data?.msg || "request_failed");
    error.status = response.status;
    throw error;
  }
  return data;
}
function filteredResponses() {
  const query = normalize($("search").value.trim()),
    attendance = $("attendance-filter").value,
    gifts = $("gift-filter").value;
  return snapshot.responses.filter((row) => {
    if (
      (attendance === "yes" && (!row.attending || isRemote(row))) ||
      (attendance === "no" && (row.attending || isRemote(row))) ||
      (attendance === "distance" && !isRemote(row))
    )
      return false;
    if (
      $("location-filter").value !== "all" &&
      row.residence_zone !== $("location-filter").value
    )
      return false;
    if ((gifts === "yes" && !hasGift(row)) || (gifts === "no" && hasGift(row)))
      return false;
    return (
      !query ||
      normalize(
        [
          row.full_name,
          row.phone,
          row.address,
          row.country,
          zoneLabel(row),
          ...selectedGifts(row),
          row.gift_proposal,
        ].join(" "),
      ).includes(query)
    );
  });
}
function renderResponses() {
  const rows = filteredResponses();
  $("result-count").textContent =
    rows.length +
    " réponse" +
    (rows.length !== 1 ? "s" : "") +
    " affichée" +
    (rows.length !== 1 ? "s" : "") +
    " sur " +
    snapshot.responses.length;
  $("response-list").innerHTML = rows.length
    ? rows
        .map(
          (row) =>
            `<article class="response"><label class="reset-row"><input type="checkbox" data-reset-id="${escapeHtml(row.id)}" ${resetSelection.has(row.id) ? "checked" : ""} ${resetBusy ? "disabled" : ""}>Sélectionner pour suppression</label><div class="response-head"><h3>${escapeHtml(row.full_name)}</h3><span class="badge ${isRemote(row) ? "distance" : row.attending ? "" : "absent"}">${isRemote(row) ? "À distance" : row.attending ? "Participe" : "Ne participe pas"}</span></div><p class="response-meta">${isRemote(row) ? "À distance · aucune présence sur place" : row.attending ? (row.companion ? "Avec 1 accompagnant · 2 personnes" : "Sans accompagnant · 1 personne") : "Absent"} · ${escapeHtml(formatDate(row.created_at))}</p><p class="route-details">${escapeHtml(zoneLabel(row))}${row.country ? " · " + escapeHtml(row.country) : ""}</p><div class="contact-details"><p><strong>Téléphone</strong><br>${escapeHtml(row.phone || "Non renseigné")}</p><p class="contact-address"><strong>Adresse</strong><br>${escapeHtml(row.address || "Non renseignée")}</p></div>${
              selectedGifts(row).length
                ? `<ul class="gift-chips" aria-label="Cadeaux sélectionnés">${selectedGifts(
                    row,
                  )
                    .map((g) => `<li>${escapeHtml(g)}</li>`)
                    .join("")}</ul>`
                : `<p class="small muted">${hasGift(row) ? "Souhaite offrir un cadeau, sans article sélectionné." : "Aucun cadeau prévu."}</p>`
            }${row.gift_proposal ? `<p class="proposal"><strong>Proposition libre</strong><br>${escapeHtml(row.gift_proposal)}</p>` : ""}</article>`,
        )
        .join("")
    : '<div class="empty">' +
      (snapshot.responses.length
        ? "Aucune réponse ne correspond à tes filtres."
        : "Aucune réponse reçue pour le moment.") +
      "</div>";
}
function renderDashboard() {
  const rows = snapshot.responses,
    attending = rows.filter((r) => r.attending),
    companions = attending.filter((r) => r.companion).length;
  $("stat-distance").textContent = rows.filter(isRemote).length;
  $("stat-total").textContent = rows.length;
  $("stat-attending").textContent = attending.length;
  $("stat-companions").textContent = companions;
  $("stat-headcount").textContent = attending.length + companions;
  $("stat-gifts").textContent =
    snapshot.gifts.filter((g) => g.response_id).length +
    " / " +
    snapshot.gifts.length;
  renderResponses();
  $("gift-list").innerHTML = snapshot.gifts.length
    ? snapshot.gifts
        .map(
          (g) =>
            `<article class="catalog-item ${g.response_id ? "" : "free"}"><h3>${escapeHtml(g.name)}</h3><span class="badge ${g.response_id ? "absent" : ""}">${g.response_id ? "Réservé" : "Disponible"}</span>${g.response_id ? `<p>Par <strong>${escapeHtml(g.reserved_by || "Invité")}</strong><br>${escapeHtml(formatDate(g.reserved_at))}</p>` : ""}</article>`,
        )
        .join("")
    : '<div class="empty">Le catalogue de cadeaux n’est pas encore installé.</div>';
  $("updated").textContent =
    "Dernière actualisation : " + formatDate(new Date());
}
async function loadDashboard() {
  if (!session) return;
  const version = ++requestVersion;
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  const timeout = setTimeout(() => controller.abort(), 15000);
  $("refresh").disabled = true;
  $("export").disabled = true;
  $("dashboard-message").className = "muted";
  $("dashboard-message").textContent = "Chargement des réponses…";
  try {
    const data = await api("/rest/v1/rpc/admin_baby_shower_dashboard", {
      token: session.access_token,
      signal: controller.signal,
    });
    if (version !== requestVersion || !session) return false;
    if (!Array.isArray(data?.responses) || !Array.isArray(data?.gifts))
      throw new Error("invalid_data");
    snapshot = data;
    for (const id of resetSelection)
      if (!data.responses.some((row) => row.id === id))
        resetSelection.delete(id);
    updateResetSelection();
    renderDashboard();
    $("dashboard-message").textContent = "";
    return true;
  } catch (error) {
    if (version !== requestVersion) return false;
    if (error.status === 401 || error.status === 403) {
      resetSession(
        error.status === 403
          ? "Ce compte n’est pas autorisé à accéder à l’administration."
          : "Ta session a expiré. Connecte-toi à nouveau.",
      );
    } else {
      $("dashboard-message").className = "error";
      $("dashboard-message").textContent =
        "Impossible de charger les réponses. Vérifie la connexion et l’installation du script admin, puis actualise.";
    }
    return false;
  } finally {
    clearTimeout(timeout);
    if (version === requestVersion) {
      $("refresh").disabled = false;
      $("export").disabled = false;
    }
  }
}
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configured) return;
  $("login-button").disabled = true;
  $("login-button").textContent = "Connexion en cours…";
  $("login-error").textContent = "";
  const version = ++requestVersion;
  try {
    const data = await api("/auth/v1/token?grant_type=password", {
      body: { email: $("email").value.trim(), password: $("password").value },
    });
    if (version !== requestVersion) return;
    if (
      !data?.access_token ||
      !data?.user?.email ||
      !Number.isFinite(data.expires_in)
    )
      throw new Error("invalid_session");
    session = { access_token: data.access_token };
    $("password").value = "";
    expiryTimer = setTimeout(
      () => resetSession("Ta session a expiré. Connecte-toi à nouveau."),
      Math.max(0, (data.expires_in - 30) * 1000),
    );
    const loaded = await loadDashboard();
    if (!session) return;
    if (loaded) {
      $("login-panel").hidden = true;
      $("dashboard").hidden = false;
      $("account").textContent = "Connecté en tant que " + data.user.email;
    } else {
      resetSession(
        "La connexion a réussi, mais les données ne sont pas accessibles. Vérifie le script admin et réessaie.",
      );
    }
  } catch (error) {
    if (version === requestVersion)
      resetSession(
        error.status === 400
          ? "Adresse e-mail ou mot de passe incorrect."
          : "Connexion impossible. Vérifie Supabase et ta connexion internet.",
      );
  } finally {
    $("login-button").disabled = !configured;
    $("login-button").textContent = "Se connecter →";
  }
});
$("logout").addEventListener("click", () => {
  const token = session?.access_token;
  resetSession("Tu es déconnecté.");
  if (token) api("/auth/v1/logout", { token }).catch(() => {});
});
$("refresh").addEventListener("click", loadDashboard);
$("search").addEventListener("input", renderResponses);
$("attendance-filter").addEventListener("change", renderResponses);
$("gift-filter").addEventListener("change", renderResponses);
$("location-filter").addEventListener("change", renderResponses);
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
$("export").addEventListener("click", () => {
  if (!session) return;
  const rows = [
    [
      "Nom complet",
      "Téléphone",
      "Adresse",
      "Zone de résidence",
      "Pays",
      "Participation",
      "Accompagnants",
      "Personnes attendues",
      "Cadeaux sélectionnés",
      "Proposition libre",
      "Date de réponse",
    ],
    ...filteredResponses().map((r) => [
      r.full_name,
      r.phone || "",
      r.address || "",
      zoneLabel(r),
      r.country || "",
      isRemote(r) ? "À distance" : r.attending ? "Oui" : "Non",
      r.attending && r.companion ? 1 : 0,
      r.attending ? (r.companion ? 2 : 1) : 0,
      selectedGifts(r).join(" | "),
      r.gift_proposal,
      formatDate(r.created_at),
    ]),
  ];
  const csv =
    "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "baby-shower-reponses.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener("pagehide", () => resetSession());
$("setup-notice").hidden = configured;
$("login-button").disabled = !configured;

const resetSelection = new Set();
let resetBusy = false;
let pendingResetIds = [];
function updateResetSelection() {
  $("reset-count").textContent =
    `${resetSelection.size} réponse(s) sélectionnée(s)`;
  $("reset-open").disabled = !resetSelection.size || resetBusy;
}
function clearResetSelection() {
  resetSelection.clear();
  pendingResetIds = [];
  $("reset-confirmation").value = "";
  $("reset-error").textContent = "";
  $("reset-submit").disabled = true;
  if ($("reset-dialog").open) $("reset-dialog").close();
  updateResetSelection();
}
$("response-list").addEventListener("change", (event) => {
  const input = event.target.closest("input[data-reset-id]");
  if (!input || resetBusy) return;
  if (input.checked) resetSelection.add(input.dataset.resetId);
  else resetSelection.delete(input.dataset.resetId);
  updateResetSelection();
});
$("reset-select-visible").addEventListener("click", () => {
  if (resetBusy) return;
  for (const row of filteredResponses()) {
    if (resetSelection.size >= 500) break;
    resetSelection.add(row.id);
  }
  renderResponses();
  updateResetSelection();
});
$("reset-clear").addEventListener("click", () => {
  if (resetBusy) return;
  clearResetSelection();
  renderResponses();
});
$("reset-open").addEventListener("click", () => {
  if (!session || resetBusy || !resetSelection.size) return;
  const rows = snapshot.responses.filter((row) => resetSelection.has(row.id));
  pendingResetIds = rows.map((row) => row.id);
  $("reset-names").innerHTML = rows
    .map(
      (row) =>
        `<li>${escapeHtml(row.full_name)} — ${escapeHtml(row.phone || "Sans téléphone")}</li>`,
    )
    .join("");
  $("reset-summary").textContent =
    `${rows.length} réponse(s) seront supprimées. Leurs réservations seront libérées et ces numéros pourront répondre à nouveau. Cette suppression est définitive.`;
  $("reset-confirmation").value = "";
  $("reset-error").textContent = "";
  $("reset-submit").disabled = true;
  $("reset-dialog").showModal();
});
$("reset-confirmation").addEventListener("input", () => {
  $("reset-submit").disabled =
    resetBusy || $("reset-confirmation").value !== "SUPPRIMER";
});
$("reset-cancel").addEventListener("click", () => {
  if (!resetBusy) $("reset-dialog").close();
});
$("reset-dialog").addEventListener("cancel", (event) => {
  if (resetBusy) event.preventDefault();
});
$("reset-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    !session ||
    resetBusy ||
    !pendingResetIds.length ||
    $("reset-confirmation").value !== "SUPPRIMER"
  )
    return;
  resetBusy = true;
  const token = session.access_token;
  $("reset-submit").disabled = true;
  $("reset-cancel").disabled = true;
  $("reset-confirmation").disabled = true;
  $("reset-error").textContent = "Suppression en cours…";
  try {
    const result = await api("/rest/v1/rpc/admin_reset_baby_shower_responses", {
      token,
      body: { p_response_ids: pendingResetIds, p_confirmation: "SUPPRIMER" },
    });
    if (session?.access_token !== token) return;
    clearResetSelection();
    const loaded = await loadDashboard();
    if (loaded) {
      $("dashboard-message").className = "muted";
      $("dashboard-message").textContent =
        `${result.deleted} réponse(s) supprimée(s), ${result.released_gifts} cadeau(x) libéré(s).`;
    }
  } catch (error) {
    if (session?.access_token !== token) return;
    if (error.status === 401 || error.status === 403) {
      resetSession("Reconnecte-toi avec un compte administrateur autorisé.");
    } else {
      $("reset-error").textContent =
        error.message === "selection_changed"
          ? "La sélection a changé. Annule, actualise les réponses et recommence."
          : "La suppression n’a pas été confirmée. Vérifie la migration reset et la connexion. Avant de réessayer après une coupure, actualise les réponses pour vérifier le résultat.";
    }
  } finally {
    resetBusy = false;
    $("reset-cancel").disabled = false;
    $("reset-confirmation").disabled = false;
    $("reset-submit").disabled = $("reset-confirmation").value !== "SUPPRIMER";
    updateResetSelection();
  }
});
updateResetSelection();

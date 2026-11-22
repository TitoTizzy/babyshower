"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const settings = window.BABY_SHOWER_CONFIG || {};
  const { groups, sketchPaths } = window.BABY_SHOWER_GIFT_CATALOG;
  const accessToken = location.hash.slice(1);
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let data = null,
    loading = false,
    sending = false,
    bigOpen = false,
    pending = null;
  const selection = new Set();
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function message(text, type = "") {
    $("access-message").textContent = text;
    $("access-message").className = type;
  }
  async function rpc(name, body) {
    const response = await fetch(
      settings.supabaseUrl.replace(/\/$/, "") + "/rest/v1/rpc/" + name,
      {
        method: "POST",
        headers: {
          apikey: settings.supabaseKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
        credentials: "omit",
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || "request_failed");
    return result;
  }
  function validate(value) {
    if (
      !value ||
      typeof value.full_name !== "string" ||
      !Array.isArray(value.selected_gifts) ||
      value.selected_gifts.some((x) => typeof x !== "string") ||
      typeof value.proposal !== "string" ||
      !Array.isArray(value.gifts) ||
      value.gifts.some(
        (g) =>
          typeof g.name !== "string" ||
          typeof g.reserved !== "boolean" ||
          typeof g.mine !== "boolean",
      )
    )
      throw new Error("invalid_data");
    return value;
  }
  function groupMarkup(big) {
    return groups
      .filter((group) => Boolean(group.big) === big)
      .map(
        (group) =>
          `<section class="gift-category"><h3>${escape(group.title)}</h3><ul class="gifts">${group.items
            .filter((name) => data.gifts.some((g) => g.name === name))
            .map((name) => {
              const g = data.gifts.find((g) => g.name === name);
              return `<li><label class="gift-tile ${g.reserved ? "reserved" : ""} ${g.mine ? "own" : ""}"><input type="checkbox" name="extra-gifts" value="${escape(name)}" ${selection.has(name) ? "checked" : ""} ${g.reserved || sending ? "disabled" : ""}><span class="gift-drawing"><svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${sketchPaths[group.icon]}</svg></span><span class="gift-text">${escape(name)}<small class="gift-status">${g.mine ? "Déjà dans tes cadeaux" : g.reserved ? "Déjà réservé" : "Disponible"}</small></span></label></li>`;
            })
            .join("")}</ul></section>`,
      )
      .join("");
  }
  function render() {
    $("access-greeting").textContent =
      `${data.full_name}, tes premiers choix sont bien enregistrés. Tu peux revenir ici quand tu veux pour consulter la liste ou ajouter une nouvelle idée.`;
    $("existing-gifts").innerHTML = data.selected_gifts
      .map((g) => `<li>${escape(g)}</li>`)
      .join("");
    $("existing-gifts").hidden = !data.selected_gifts.length;
    $("existing-proposal").textContent = data.proposal
      ? "Ta proposition déjà reçue :\n" + data.proposal
      : !data.selected_gifts.length
        ? "Aucun cadeau réservé pour le moment."
        : "";
    for (const name of selection) {
      if (data.gifts.find((g) => g.name === name)?.reserved)
        selection.delete(name);
    }
    $("access-main-gifts").innerHTML = groupMarkup(false);
    if (bigOpen) {
      $("access-big-gifts").innerHTML = groupMarkup(true);
      $("access-big-gifts").hidden = false;
      $("access-big-open").hidden = true;
    }
    const remaining = Math.max(
      0,
      500 - data.proposal.length - (data.proposal ? 2 : 0),
    );
    $("access-proposal").maxLength = remaining;
    $("access-proposal").disabled = remaining === 0 || sending;
    $("access-proposal-limit").textContent =
      `${remaining} caractères disponibles pour une nouvelle proposition. Les idées déjà reçues sont conservées.`;
    $("access-updated").textContent =
      "Liste actualisée à " +
      new Intl.DateTimeFormat("fr-HT", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    $("access-content").hidden = false;
  }
  function setBusy(value) {
    sending = value;
    $("access-submit").disabled = value;
    $("access-refresh").disabled = value;
    document
      .querySelectorAll('input[name="extra-gifts"]')
      .forEach(
        (i) =>
          (i.disabled =
            value || data.gifts.find((g) => g.name === i.value)?.reserved),
      );
    $("access-proposal").disabled =
      value || $("access-proposal").maxLength === 0;
  }
  async function load({ quiet = false } = {}) {
    if (loading || sending) return;
    loading = true;
    $("access-refresh").disabled = true;
    try {
      data = validate(
        await rpc("baby_shower_gift_access_snapshot", {
          p_access_token: accessToken,
          p_request_token: pending?.id || null,
        }),
      );
      render();
      if (!quiet) message("La liste est à jour.");
    } catch (error) {
      if (error.message === "gift_access_invalid") {
        $("access-content").hidden = true;
        message(
          "Ce lien personnel n’est plus actif. Écris à Jehmara ou Myrtho pour le retrouver.",
          "error",
        );
      } else
        message(
          data
            ? "La liste affichée est la dernière connue. Actualisation impossible pour le moment : réessaie avant de confirmer un ajout."
            : "Impossible de retrouver la liste pour le moment. Réessaie en actualisant la page.",
          "error",
        );
    } finally {
      loading = false;
      $("access-refresh").disabled = false;
    }
  }
  function confirmResult(result) {
    data = validate(result);
    selection.clear();
    $("access-proposal").value = "";
    pending = null;
    render();
    message(
      "✓ C’est bien reçu ! Tes ajouts sont enregistrés. Tes premiers choix sont toujours gardés de côté.",
      "success",
    );
    $("access-message").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  $("access-form").addEventListener("change", (event) => {
    if (event.target.name !== "extra-gifts") return;
    if (event.target.checked) selection.add(event.target.value);
    else selection.delete(event.target.value);
  });
  $("access-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending || loading || !data) return;
    const gifts = [...selection].sort(),
      proposal = $("access-proposal").value.trim();
    if (!gifts.length && !proposal) {
      message(
        "Choisis une nouvelle idée ou écris une proposition avant de confirmer.",
        "error",
      );
      return;
    }
    setBusy(true);
    try {
      // Un ajout dont la réponse réseau a été perdue est vérifié avant tout nouvel envoi.
      if (pending) {
        const status = validate(
          await rpc("baby_shower_gift_access_snapshot", {
            p_access_token: accessToken,
            p_request_token: pending.id,
          }),
        );
        if (status.request_received) {
          if (pending.signature !== JSON.stringify({ gifts, proposal })) {
            data = status;
            pending = null;
            render();
            message(
              "Ton précédent ajout a bien été reçu. Tes nouvelles idées ne sont pas encore confirmées : vérifie-les, puis confirme à nouveau.",
              "success",
            );
            return;
          }
          confirmResult(status);
          return;
        }
      }
      const signature = JSON.stringify({ gifts, proposal });
      if (!pending || pending.signature !== signature)
        pending = { id: crypto.randomUUID(), signature, gifts, proposal };
      const result = await rpc("baby_shower_add_personal_gifts", {
        p_access_token: accessToken,
        p_request_token: pending.id,
        p_selected_gifts: pending.gifts,
        p_proposal: pending.proposal,
      });
      confirmResult(result);
    } catch (error) {
      if (error.message === "gift_access_invalid") {
        $("access-content").hidden = true;
        message(
          "Ce lien personnel n’est plus actif. Écris à Jehmara ou Myrtho.",
          "error",
        );
      } else if (error.message === "gift_unavailable") {
        pending = null;
        message(
          "Un proche vient de réserver une de tes idées. Aucun ajout de cet envoi n’a été enregistré. Actualise la liste et choisis à nouveau.",
          "error",
        );
      } else if (error.message === "proposal_too_long") {
        pending = null;
        message(
          "Ta nouvelle proposition dépasse la place disponible. Raccourcis-la avant de confirmer.",
          "error",
        );
      } else
        message(
          "Ton ajout n’a pas pu être confirmé. Réessaie : on vérifiera d’abord s’il a déjà été reçu, pour éviter un doublon.",
          "error",
        );
    } finally {
      setBusy(false);
    }
  });
  $("access-refresh").addEventListener("click", () => load());
  $("access-big-open").addEventListener("click", () =>
    $("access-big-dialog").showModal(),
  );
  $("access-big-no").addEventListener("click", () =>
    $("access-big-dialog").close(),
  );
  $("access-big-yes").addEventListener("click", () => {
    bigOpen = true;
    $("access-big-dialog").close();
    render();
    $("access-big-gifts").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  });
  if (
    !settings.supabaseUrl ||
    !settings.supabaseKey ||
    settings.supabaseKey.startsWith("sb_secret_")
  )
    message(
      "La liste n’est pas encore connectée. Écris à Jehmara ou Myrtho.",
      "error",
    );
  else if (!uuid.test(accessToken))
    message(
      "Ouvre cette page avec ton lien personnel complet, transmis par Jehmara ou Myrtho.",
      "error",
    );
  else {
    load();
    setInterval(() => {
      if (!document.hidden) load({ quiet: true });
    }, 20000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) load({ quiet: true });
    });
  }
})();

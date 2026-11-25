"use strict";
(function (global) {
  // Le reçu donne accès à une réponse : garder un identifiant cryptographiquement sûr.
  function randomId() {
    try {
      var crypto = global.crypto || global.msCrypto;
      if (!crypto) return null;
      if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
      if (typeof crypto.getRandomValues !== "function") return null;
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = [];
      for (var i = 0; i < bytes.length; i++)
        hex.push(("0" + bytes[i].toString(16)).slice(-2));
      return (
        hex.slice(0, 4).join("") +
        "-" +
        hex.slice(4, 6).join("") +
        "-" +
        hex.slice(6, 8).join("") +
        "-" +
        hex.slice(8, 10).join("") +
        "-" +
        hex.slice(10).join("")
      );
    } catch (_) {
      return null;
    }
  }
  function timeoutSignal(milliseconds) {
    if (global.AbortSignal && typeof global.AbortSignal.timeout === "function")
      return global.AbortSignal.timeout(milliseconds);
    if (typeof global.AbortController !== "function") return undefined;
    var controller = new global.AbortController();
    global.setTimeout(function () {
      controller.abort();
    }, milliseconds);
    return controller.signal;
  }
  function listenMedia(query, callback) {
    if (typeof query.addEventListener === "function")
      query.addEventListener("change", callback);
    else if (typeof query.addListener === "function")
      query.addListener(callback);
  }
  function focus(element) {
    if (!element) return;
    try {
      element.focus({ preventScroll: true });
    } catch (_) {
      element.focus();
    }
  }
  function prepareDialog(dialog) {
    if (typeof dialog.showModal === "function") return;
    var backdrop = null,
      previousFocus = null,
      hiddenSiblings = [];
    if (typeof dialog.open !== "boolean")
      Object.defineProperty(dialog, "open", {
        configurable: true,
        get: function () {
          return this.hasAttribute("open");
        },
        set: function (value) {
          if (value) this.setAttribute("open", "");
          else this.removeAttribute("open");
        },
      });
    function focusable() {
      return Array.prototype.filter.call(
        dialog.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]',
        ),
        function (element) {
          return element.getClientRects().length > 0;
        },
      );
    }
    function keyboard(event) {
      if (!dialog.open) return;
      if (event.key === "Escape" || event.key === "Esc") {
        var cancel = new Event("cancel", { cancelable: true });
        dialog.dispatchEvent(cancel);
        if (!cancel.defaultPrevented) dialog.close();
        event.preventDefault();
      } else if (event.key === "Tab") {
        var items = focusable(),
          first = items[0],
          last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          focus(dialog);
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          focus(last);
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          focus(first);
        }
      }
    }
    dialog.showModal = function () {
      if (dialog.open) return;
      previousFocus = document.activeElement;
      backdrop = document.createElement("div");
      backdrop.className = "browser-dialog-backdrop";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.appendChild(backdrop);
      dialog.classList.add("browser-dialog-fallback");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("tabindex", "-1");
      dialog.setAttribute("open", "");
      document.body.classList.add("browser-dialog-open");
      hiddenSiblings = [];
      Array.prototype.forEach.call(document.body.children, function (element) {
        if (
          element !== dialog &&
          element !== backdrop &&
          !element.contains(dialog)
        ) {
          hiddenSiblings.push([element, element.getAttribute("aria-hidden")]);
          element.setAttribute("aria-hidden", "true");
        }
      });
      document.addEventListener("keydown", keyboard, true);
      focus(dialog.querySelector("[autofocus]") || focusable()[0] || dialog);
    };
    dialog.close = function (value) {
      if (!dialog.open) return;
      dialog.returnValue = value || "";
      dialog.removeAttribute("open");
      dialog.removeAttribute("aria-modal");
      if (backdrop && backdrop.parentNode)
        backdrop.parentNode.removeChild(backdrop);
      backdrop = null;
      document.body.classList.remove("browser-dialog-open");
      document.removeEventListener("keydown", keyboard, true);
      hiddenSiblings.forEach(function (entry) {
        if (entry[1] === null) entry[0].removeAttribute("aria-hidden");
        else entry[0].setAttribute("aria-hidden", entry[1]);
      });
      hiddenSiblings = [];
      if (previousFocus && document.contains(previousFocus))
        focus(previousFocus);
      dialog.dispatchEvent(new Event("close"));
    };
  }
  function syncControls() {
    document
      .querySelectorAll('.gift-tile input[type="checkbox"]')
      .forEach(function (input) {
        input
          .closest(".gift-tile")
          .classList.toggle("is-selected", input.checked);
      });
    document.querySelectorAll(".actions").forEach(function (actions) {
      var buttons = Array.prototype.filter.call(
        actions.children,
        function (child) {
          return child.classList.contains("btn");
        },
      );
      actions.classList.toggle("has-two-choices", buttons.length === 2);
    });
  }
  function ready() {
    document.querySelectorAll("dialog").forEach(prepareDialog);
    syncControls();
    document.addEventListener("change", function (event) {
      if (event.target.matches('.gift-tile input[type="checkbox"]'))
        syncControls();
    });
    document.addEventListener("focusin", function (event) {
      var tile = event.target.closest(".gift-tile");
      if (tile) tile.classList.add("is-focused");
    });
    document.addEventListener("focusout", function (event) {
      var tile = event.target.closest(".gift-tile");
      if (tile) tile.classList.remove("is-focused");
    });
    var scheduled = false;
    new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      global.requestAnimationFrame(function () {
        scheduled = false;
        syncControls();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  global.BabyShowerBrowser = Object.freeze({
    openDialog: function (dialog) {
      prepareDialog(dialog);
      dialog.showModal();
    },
    closeDialog: function (dialog) {
      prepareDialog(dialog);
      dialog.close();
    },
    randomId: randomId,
    timeoutSignal: timeoutSignal,
    listenMedia: listenMedia,
    focus: focus,
  });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready);
  else ready();
})(window);

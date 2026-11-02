"use strict";
(() => {
  const field = document.querySelector(".bubble-field");
  if (!field) return;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const bubbles = Array.from({ length: 24 }, (_, index) => {
    const element = document.createElement("span");
    element.className = "floating-bubble";
    element.style.setProperty("--bubble-size", `${random(24, 82)}px`);
    element.style.setProperty("--bubble-hue", index % 2 ? "328" : "212");
    const point = {
      x: (index % 6) * (100 / 6) + random(2, 11),
      y: Math.floor(index / 6) * 25 + random(3, 18),
    };
    field.appendChild(element);
    return { element, point, animation: null };
  });
  const transform = (point, scale = 1) =>
    `translate3d(${point.x}vw, ${point.y}vh, 0) scale(${scale})`;
  function drift(bubble) {
    if (reducedMotion.matches) return;
    const points = [bubble.point];
    for (let i = 0; i < 4; i++) {
      const previous = points.at(-1);
      points.push({
        x: clamp(previous.x + random(-24, 24), 1, 96),
        y: clamp(previous.y + random(-26, 26), 1, 96),
      });
    }
    bubble.animation = bubble.element.animate(
      points.map((point, index) => ({
        transform: transform(point, index === 0 || index === 4 ? 1 : random(0.85, 1.12)),
        opacity: index === 0 || index === 4 ? 0.35 : random(0.25, 0.6),
        offset: index / 4,
      })),
      {
        duration: random(16000, 30000),
        easing: "ease-in-out",
        fill: "forwards",
      },
    );
    bubble.animation.onfinish = () => {
      bubble.point = points.at(-1);
      bubble.element.style.transform = transform(bubble.point);
      bubble.animation.cancel();
      drift(bubble);
    };
    if (document.hidden) bubble.animation.pause();
  }
  function start() {
    for (const bubble of bubbles) {
      if (bubble.animation) {
        bubble.animation.onfinish = null;
        bubble.animation.cancel();
      }
      bubble.element.style.transform = transform(bubble.point);
      if (!reducedMotion.matches) drift(bubble);
    }
  }
  function syncVisibility() {
    for (const bubble of bubbles) {
      if (!bubble.animation || reducedMotion.matches) continue;
      if (document.hidden) bubble.animation.pause();
      else bubble.animation.play();
    }
  }
  reducedMotion.addEventListener("change", start);
  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("pagehide", () => {
    for (const bubble of bubbles) bubble.animation?.pause();
  });
  window.addEventListener("pageshow", syncVisibility);
  start();
})();

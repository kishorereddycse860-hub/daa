/* =========================================================
   SortLab — page transitions
   Clicking an internal link plays CorridorFX (a glowing tunnel
   opening into a futuristic glass corridor, reflective floor,
   motion-blur streaks) full-screen before navigating, then the
   new page plays it in reverse to reveal itself. Each run picks
   a random color palette (blue / violet / amber / crimson /
   emerald) so it doesn't feel repetitive. Whole cover+reveal
   sequence runs ~4.5s. Falls back to instant nav if canvas
   isn't available, or motion is reduced.
   ========================================================= */

(function(){
  "use strict";

  const NAV_FLAG = "sl_pt_nav";
  const PALETTE_FLAG = "sl_pt_palette";
  const COVER_MS = 2100;
  const REVEAL_MS = 2600;

  const WARP_LABELS = [
    "O(1)", "O(n)", "O(log n)", "O(n log n)", "O(n\u00B2)", "O(n\u00B3)",
    "swap()", "compare", "i++", "j--", "pivot", "merge()",
    "partition()", "heapify()", "divide & conquer", "recursive",
    "stable", "in-place", "temp = arr[i]", "arr[j]",
    "bubble sort", "selection sort", "insertion sort",
    "merge sort", "quick sort", "heap sort", "sorted \u2713"
  ];

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let engine = null;
  let rampRaf = null;

  function buildOverlay(){
    const overlay = document.getElementById("ptOverlay");
    if (!overlay || overlay.dataset.built) return overlay;
    overlay.dataset.built = "1";
    overlay.innerHTML = `<canvas class="pt-canvas"></canvas><div class="pt-label">entering…</div>`;
    return overlay;
  }

  function pickPalette(){
    const names = (window.CorridorFX && window.CorridorFX.PALETTE_NAMES) || ["blue"];
    return names[Math.floor(Math.random() * names.length)];
  }

  function ensureEngine(overlay, palette){
    if (engine || reduced || !window.CorridorFX) return engine;
    const canvas = overlay.querySelector(".pt-canvas");
    if (!canvas) return null;

    engine = window.CorridorFX.start(canvas, {
      palette,
      speed: 1,
      frames: 10,
      streaks: 18,
      labels: WARP_LABELS,
      labelScale: 1.3,
      opacityScale: 1,
      fill: "#040611"
    });

    // accelerate hard over the first ~0.75s so it genuinely feels like
    // flooring it, not just idling forward
    const rampStart = performance.now();
    const RAMP_MS = 750, FROM = 1, TO = 4.4;
    function ramp(now){
      const p = Math.min(1, (now - rampStart) / RAMP_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      if (engine) engine.setSpeed(FROM + (TO - FROM) * eased);
      if (p < 1) rampRaf = requestAnimationFrame(ramp);
    }
    rampRaf = requestAnimationFrame(ramp);
    return engine;
  }

  function isSameOriginHtmlLink(a){
    if (!a || !a.getAttribute) return false;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (a.target && a.target !== "" && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    let url;
    try { url = new URL(href, window.location.href); } catch (err) { return false; }
    if (url.origin !== window.location.origin) return false;
    return true;
  }

  function playEntrance(){
    const overlay = buildOverlay();
    if (!overlay) return;
    const wasInternalNav = sessionStorage.getItem(NAV_FLAG) === "1";
    const palette = sessionStorage.getItem(PALETTE_FLAG) || "blue";
    sessionStorage.removeItem(NAV_FLAG);
    sessionStorage.removeItem(PALETTE_FLAG);

    if (!wasInternalNav || reduced){
      overlay.classList.remove("pt-covering", "pt-covered", "pt-revealing");
      return; // direct load / refresh — no forced transition
    }

    overlay.classList.add("pt-covered");
    const e = ensureEngine(overlay, palette);
    void overlay.offsetWidth;
    requestAnimationFrame(() => {
      overlay.classList.add("pt-revealing");
      overlay.classList.remove("pt-covered");
      setTimeout(() => {
        overlay.classList.remove("pt-revealing", "pt-covering");
        if (rampRaf){ cancelAnimationFrame(rampRaf); rampRaf = null; }
        if (e){ e.stop(); engine = null; }
      }, REVEAL_MS);
    });
  }

  function handleClick(e){
    const a = e.target.closest ? e.target.closest("a") : null;
    if (!isSameOriginHtmlLink(a)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const dest = a.href;
    if (dest === window.location.href) return;

    e.preventDefault();

    if (reduced){
      window.location.href = dest;
      return;
    }

    const palette = pickPalette();
    const overlay = buildOverlay();
    overlay.classList.remove("pt-revealing");
    overlay.classList.add("pt-covering");
    ensureEngine(overlay, palette);
    sessionStorage.setItem(NAV_FLAG, "1");
    sessionStorage.setItem(PALETTE_FLAG, palette);
    setTimeout(() => { window.location.href = dest; }, COVER_MS);
  }

  document.addEventListener("click", handleClick);
  window.addEventListener("DOMContentLoaded", playEntrance);
})();

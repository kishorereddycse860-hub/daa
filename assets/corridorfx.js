/* =========================================================
   SortLab — CorridorFX
   A glowing tunnel that opens into a long futuristic glass
   corridor: converging structural frames rushing toward the
   camera, a bright core light at the vanishing point, a
   reflective floor band, and radial motion-blur streaks for a
   high-speed "flying forward" feel. Ships with several color
   palettes (blue is the default/cinematic one; others give the
   same shape in different moods) — see PALETTES below.
   ========================================================= */

(function(){
  "use strict";

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);

  const PALETTES = {
    blue:   { wall: "#3AA7FF", wallDim: "#1B4E8C", floor: "#8FE8FF", core: "#EAFBFF", glow: "rgba(58,167,255,0.85)" },
    violet: { wall: "#9B6BFF", wallDim: "#4A2E8C", floor: "#D9B8FF", core: "#F3EAFF", glow: "rgba(155,107,255,0.85)" },
    amber:  { wall: "#FF9F45", wallDim: "#8C4E1B", floor: "#FFE1A8", core: "#FFF6E6", glow: "rgba(255,159,69,0.85)" },
    crimson:{ wall: "#FF3B5C", wallDim: "#7A1B2E", floor: "#FF9DB0", core: "#FFEFF2", glow: "rgba(255,59,92,0.85)" },
    emerald:{ wall: "#2FE39B", wallDim: "#166B48", floor: "#A8FFDA", core: "#EAFFF6", glow: "rgba(47,227,155,0.85)" }
  };
  const PALETTE_NAMES = Object.keys(PALETTES);

  function start(canvas, opts){
    opts = Object.assign({
      palette: "blue",
      speed: 1,
      frames: 12,
      streaks: 26,
      labels: [],
      labelScale: 1,
      opacityScale: 1,
      fill: "#040611"
    }, opts || {});

    const colors = PALETTES[opts.palette] || PALETTES.blue;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, cx = 0, cy = 0, raf = null, running = true, t = 0;

    function resize(){
      const rect = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.round(rect.width * DPR));
      h = canvas.height = Math.max(1, Math.round(rect.height * DPR));
      cx = w / 2; cy = h * 0.48;
    }
    window.addEventListener("resize", resize);
    resize();

    const maxHalfW = () => w * 0.62;
    const maxHalfH = () => h * 0.58;

    const frameData = [];
    for (let i = 0; i < opts.frames; i++){
      frameData.push({
        prog: i / opts.frames,
        label: opts.labels.length && Math.random() < 0.5
          ? opts.labels[Math.floor(Math.random() * opts.labels.length)]
          : null
      });
    }

    const streakData = [];
    function respawnStreak(s){
      s.angle = Math.random() * Math.PI * 2;
      s.prog = 0;
      s.len = 0.08 + Math.random() * 0.12;
      s.speedMul = 0.7 + Math.random() * 0.9;
    }
    for (let i = 0; i < opts.streaks; i++){
      const s = {};
      respawnStreak(s);
      s.prog = Math.random();
      streakData.push(s);
    }

    function ease(p){ return p * p; } // accelerate into the distance

    function draw(){
      if (!running) return;
      t += 0.016 * opts.speed;

      if (opts.fill){
        ctx.fillStyle = opts.fill;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const HW = maxHalfW(), HH = maxHalfH();

      // core glow at the vanishing point — the "bright light at the far end"
      ctx.save();
      const coreR = Math.min(w, h) * (0.05 + 0.015 * Math.sin(t * 3));
      const coreGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 6);
      coreGrd.addColorStop(0, colors.core);
      coreGrd.addColorStop(0.25, colors.glow);
      coreGrd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = opts.opacityScale;
      ctx.fillStyle = coreGrd;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // four static edge lines defining the corridor silhouette (walls/ceiling/floor converge here)
      ctx.save();
      ctx.globalAlpha = 0.35 * opts.opacityScale;
      ctx.strokeStyle = colors.wallDim;
      ctx.lineWidth = 1 * DPR;
      const corners = [[-HW, -HH], [HW, -HH], [HW, HH], [-HW, HH]];
      ctx.beginPath();
      for (const [dx, dy] of corners){
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx, cy + dy);
      }
      ctx.stroke();
      ctx.restore();

      // structural cross-section frames rushing toward the camera
      for (let i = 0; i < frameData.length; i++){
        const f = frameData[i];
        f.prog = (f.prog + 0.006 * opts.speed) % 1;
        const p = ease(f.prog);
        const halfW = HW * p, halfH = HH * p;
        const alphaIn = Math.min(1, f.prog * 5);
        const alphaOut = f.prog > 0.88 ? Math.max(0, (1 - f.prog) / 0.12) : 1;
        const alpha = alphaIn * alphaOut * opts.opacityScale;
        if (alpha <= 0.02) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colors.wall;
        ctx.lineWidth = (1.2 + f.prog * 2.2) * DPR;
        ctx.shadowBlur = (8 + f.prog * 18) * DPR;
        ctx.shadowColor = colors.glow;
        ctx.strokeRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);

        // reflective floor edge — brighter, slightly separate color
        ctx.strokeStyle = colors.floor;
        ctx.lineWidth = (1.5 + f.prog * 2.6) * DPR;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, cy + halfH);
        ctx.lineTo(cx + halfW, cy + halfH);
        ctx.stroke();

        if (f.label && f.prog > 0.12 && f.prog < 0.75){
          ctx.fillStyle = colors.core;
          ctx.font = `${Math.round((9 + f.prog * 13) * opts.labelScale * DPR)}px 'IBM Plex Mono', monospace`;
          ctx.textAlign = "center";
          ctx.globalAlpha = Math.min(1, alpha * 1.3);
          ctx.fillText(f.label, cx, cy - halfH - 4 * DPR);
        }
        ctx.restore();
      }

      // floor reflection wash — soft brighter band at the bottom of the corridor
      ctx.save();
      ctx.globalAlpha = 0.16 * opts.opacityScale;
      const floorGrd = ctx.createLinearGradient(0, cy + HH * 0.15, 0, cy + HH);
      floorGrd.addColorStop(0, "rgba(0,0,0,0)");
      floorGrd.addColorStop(1, colors.floor);
      ctx.fillStyle = floorGrd;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - HW, cy + HH);
      ctx.lineTo(cx + HW, cy + HH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // radial motion-blur streaks — the "flying through space" cue
      ctx.save();
      ctx.lineCap = "round";
      for (const s of streakData){
        s.prog += 0.02 * opts.speed * s.speedMul;
        if (s.prog >= 1){ respawnStreak(s); continue; }
        const p = ease(s.prog);
        const r0 = p * Math.max(HW, HH) * 1.05;
        const r1 = Math.min(Math.max(HW, HH) * 1.05, r0 + s.len * Math.max(HW, HH));
        const dx = Math.cos(s.angle), dy = Math.sin(s.angle) * (HH / HW);
        const alpha = Math.min(1, s.prog * 4) * (1 - s.prog) * opts.opacityScale;
        if (alpha <= 0.02) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colors.core;
        ctx.shadowBlur = 6 * DPR;
        ctx.shadowColor = colors.glow;
        ctx.lineWidth = (1 + s.prog * 1.6) * DPR;
        ctx.beginPath();
        ctx.moveTo(cx + dx * r0, cy + dy * r0);
        ctx.lineTo(cx + dx * r1, cy + dy * r1);
        ctx.stroke();
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    }
    draw();

    return {
      stop(){ running = false; if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", resize); },
      setSpeed(v){ opts.speed = v; }
    };
  }

  window.CorridorFX = { start, PALETTES, PALETTE_NAMES };
})();

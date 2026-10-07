/* ============================================================
   TEJJAS A R — MIDNIGHT OCEAN
   Vanilla JS · rAF-driven · delta-time · DPR-aware · pause offscreen
   ============================================================ */
(() => {
"use strict";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------------- helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Run fn(start/stop) based on element visibility */
function visibilityLoop(el, onStart, onStop) {
  let running = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !running) { running = true; onStart(); }
      else if (!e.isIntersecting && running) { running = false; onStop(); }
    });
  }, { threshold: 0.05 });
  io.observe(el);
  return io;
}

/* ---------------- marquee: duplicate for seamless loop ---------------- */
(() => {
  const track = document.getElementById("marqueeTrack");
  if (track) track.innerHTML += track.innerHTML;
})();

/* ---------------- preloader ---------------- */
(() => {
  const pre = document.getElementById("preloader");
  if (!pre) return;
  const done = () => pre.classList.add("done");
  if (document.readyState === "complete") setTimeout(done, 500);
  else {
    window.addEventListener("load", () => setTimeout(done, 500));
    setTimeout(done, 3500); // failsafe
  }
})();

/* ---------------- custom cursor ---------------- */
(() => {
  if (!finePointer || reduced) return;
  const dot = document.getElementById("cursorDot");
  const glow = document.getElementById("cursorGlow");
  let mx = -100, my = -100, gx = -100, gy = -100;
  window.addEventListener("pointermove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  }, { passive: true });
  (function loop() {
    gx = lerp(gx, mx, 0.08); gy = lerp(gy, my, 0.08);
    glow.style.transform = `translate(${gx}px,${gy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll("a, button, .filter").forEach(el => {
    el.addEventListener("pointerenter", () => { dot.style.scale = "2.2"; });
    el.addEventListener("pointerleave", () => { dot.style.scale = "1"; });
  });
})();

/* ---------------- nav / progress / menu ---------------- */
(() => {
  const nav = document.getElementById("nav");
  const bar = document.querySelector("#progress span");
  const toTop = document.getElementById("toTop");
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    toTop.classList.toggle("show", y > 600);
    updateTimeline();
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  toTop.addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); });

  menuBtn.addEventListener("click", () => {
    const open = mobileMenu.classList.toggle("open");
    menuBtn.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open);
  });
  mobileMenu.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      menuBtn.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    })
  );

  // active section link
  const links = [...document.querySelectorAll(".nav-links a")];
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(a => a.classList.remove("active"));
        const a = map.get(e.target.id);
        if (a) a.classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach(s => io.observe(s));
})();

/* ---------------- reveal on scroll ---------------- */
(() => {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
})();

/* ---------------- timeline fill ---------------- */
function updateTimeline() {
  const tl = document.getElementById("timeline");
  const fill = document.getElementById("timelineFill");
  if (!tl || !fill) return;
  const r = tl.getBoundingClientRect();
  const vh = window.innerHeight;
  const p = clamp((vh * 0.72 - r.top) / r.height, 0, 1);
  fill.style.transform = `scaleY(${p})`;
}

/* ---------------- magnetic buttons ---------------- */
(() => {
  if (!finePointer || reduced) return;
  document.querySelectorAll(".magnetic").forEach(el => {
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
})();

/* ---------------- hero constellation ---------------- */
(() => {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  let W = 0, H = 0, ctx = null, parts = [], orbs = [], raf = 0, last = 0;
  let mx = -9999, my = -9999;

  function build() {
    ({ ctx, w: W, h: H } = fitCanvas(canvas));
    const n = Math.round(clamp(W / 16, 40, 95));
    parts = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-0.28, 0.28), vy: rand(-0.28, 0.28),
      r: rand(1.2, 2.6)
    }));
    orbs = [
      { x: W * 0.18, y: H * 0.32, r: 190, c: "77,124,254", a: 0.10, vx: 0.12, vy: 0.08 },
      { x: W * 0.85, y: H * 0.66, r: 230, c: "56,189,248", a: 0.07, vx: -0.1, vy: 0.1 },
      { x: W * 0.6, y: H * 0.12, r: 150, c: "99,102,241", a: 0.08, vx: 0.08, vy: -0.06 }
    ];
    if (reduced) draw(0.016);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    // ambient orbs
    for (const o of orbs) {
      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, `rgba(${o.c},${o.a})`);
      g.addColorStop(1, `rgba(${o.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
    }
    // links
    const LINK = 132;
    ctx.lineWidth = 1;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      for (let j = i + 1; j < parts.length; j++) {
        const q = parts[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(96,140,255,${(1 - d / LINK) * 0.22})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }
    // dots
    for (const p of parts) {
      if (!reduced) {
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60;
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < 140 && d > 1) { p.x += (dx / d) * 0.6; p.y += (dy / d) * 0.6; }
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      }
      ctx.fillStyle = "rgba(140,175,255,0.75)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
  }

  function frame(t) {
    const dt = clamp((t - last) / 1000, 0, 0.05); last = t;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  canvas.parentElement.addEventListener("pointermove", e => {
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  }, { passive: true });
  canvas.parentElement.addEventListener("pointerleave", () => { mx = my = -9999; });

  build();
  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(build, 200); });
  if (!reduced) {
    visibilityLoop(canvas, () => { last = performance.now(); raf = requestAnimationFrame(frame); },
      () => cancelAnimationFrame(raf));
  }
})();

/* ---------------- typed roles ---------------- */
(() => {
  const el = document.getElementById("typed");
  if (!el) return;
  const roles = ["distributed systems.", "ML pipelines.", "network tools.", "clean backends."];
  if (reduced) { el.textContent = roles[0]; return; }
  let ri = 0, ci = 0, deleting = false;
  (function tick() {
    const word = roles[ri];
    el.textContent = word.slice(0, ci);
    let delay = deleting ? 30 : 58;
    if (!deleting && ci === word.length) { delay = 1500; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; ri = (ri + 1) % roles.length; delay = 350; }
    ci += deleting ? -1 : 1;
    setTimeout(tick, delay);
  })();
})();

/* ---------------- animated counters ---------------- */
(() => {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      if (reduced) { el.textContent = target.toFixed(dec); return; }
      const t0 = performance.now(), dur = 1700;
      (function step(t) {
        const p = clamp((t - t0) / dur, 0, 1);
        el.textContent = (target * easeOutCubic(p)).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(dec);
      })(t0);
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
})();

/* ============================================================
   PROJECT 1 — Distributed File System visualization
   ============================================================ */
(() => {
  const canvas = document.getElementById("dfsCanvas");
  const captionEl = document.getElementById("dfsCaption");
  const stepsEl = document.getElementById("dfsSteps");
  if (!canvas) return;

  const BLUE = "#4d7cfe", SKY = "#38bdf8";
  const STAGES = [
    { id: "upload",    short: "Upload",    dur: 1.9, caption: "Client uploads dataset.zip to the cluster" },
    { id: "chunk",     short: "Chunking",  dur: 2.6, caption: "Splitting file into 4 chunks · checksummed blocks" },
    { id: "replicate", short: "Replicate", dur: 3.4, caption: "Replicating chunks across nodes · R = 3" },
    { id: "heartbeat", short: "Heartbeat", dur: 2.6, caption: "Heartbeats healthy · all nodes alive" },
    { id: "failure",   short: "Failure",   dur: 2.4, caption: "node-2 failed — heartbeats lost" },
    { id: "rebalance", short: "Rebalance", dur: 3.2, caption: "Re-replicating across survivors · R = 3 restored" },
    { id: "recover",   short: "Recover",   dur: 2.8, caption: "node-2 recovered — syncing data back" }
  ];
  STAGES.forEach(s => {
    const el = document.createElement("span");
    el.textContent = s.short;
    stepsEl.appendChild(el);
  });
  const stepEls = [...stepsEl.children];

  let W = 0, H = 0, ctx = null;
  let stageIdx = 0, stageT = 0, raf = 0, last = 0, ringT = 0;
  let chunks = [], particles = [], rings = [], events = [];
  let nodes = [];
  let fileBox = {}, chunkY = 0, nodeY = 0, nodeW = 0, nodeH = 0;

  const chunkPos = k => ({ x: W / 2 + (k - 1.5) * 88, y: chunkY });
  const nodeX = i => (W * (i + 0.5)) / 3;
  const slotPos = (i, k) => {
    const pad = 14, gap = 8;
    const sw = (nodeW - pad * 2 - gap * 3) / 4;
    return { x: nodeX(i) - nodeW / 2 + pad + sw / 2 + k * (sw + gap), y: nodeY + 62, w: sw, h: 26 };
  };

  function reset() {
    nodes = [0, 1, 2].map(i => ({ name: "node-" + (i + 1), alive: true, slots: ["empty", "empty", "empty", "empty"], pulse: Math.random() * 6 }));
    chunks = [0, 1, 2, 3].map(k => ({ k, x: 0, y: 0, vis: false, label: "c" + k }));
    particles = []; rings = [];
  }

  function spawnP(sx, sy, tx, ty, dur, label, kind, onArrive) {
    particles.push({ sx, sy, tx, ty, x: sx, y: sy, t: -0.001, dur, label, kind, onArrive, done: false });
  }
  const at = (t, fn) => events.push({ at: t, fn, fired: false });

  function setStage(i) {
    stageIdx = i; stageT = 0; events = [];
    const s = STAGES[i];
    captionEl.textContent = s.caption;
    stepEls.forEach((el, j) => {
      el.classList.toggle("on", j === i);
      el.classList.toggle("done", j < i);
    });
    const cx = fileBox.x + fileBox.w / 2, cy = fileBox.y + fileBox.h / 2;
    if (s.id === "chunk") {
      chunks.forEach(c => (c.vis = false));
      chunks.forEach((c, k) => {
        const p = chunkPos(k);
        at(0.15 + k * 0.3, () => spawnP(cx, cy, p.x, p.y, 0.8, c.label, "chunk",
          () => { c.vis = true; c.x = p.x; c.y = p.y; }));
      });
    } else if (s.id === "replicate") {
      chunks.forEach((c, k) => {
        const p = chunkPos(k);
        const primary = k % 3;
        const sp = slotPos(primary, k);
        at(0.1 + k * 0.32, () => spawnP(p.x, p.y, sp.x, sp.y, 0.7, c.label, "chunk",
          () => { nodes[primary].slots[k] = "full"; }));
        [0, 1, 2].filter(n => n !== primary).forEach((n, j) => {
          const dp = slotPos(n, k);
          at(0.55 + k * 0.32 + j * 0.45, () =>
            spawnP(nodeX(primary), nodeY + 20, dp.x, dp.y, 0.7, c.label, "copy",
              () => { nodes[n].slots[k] = "full"; }));
        });
      });
    } else if (s.id === "failure") {
      nodes[1].alive = false;
      nodes[1].slots = nodes[1].slots.map(() => "lost");
    } else if (s.id === "rebalance") {
      chunks.forEach((c, k) => {
        const a = slotPos(0, k), b = slotPos(2, k);
        at(0.15 + k * 0.4, () => spawnP(nodeX(0), nodeY + 20, b.x, b.y, 0.75, c.label, "copy", null));
        at(0.35 + k * 0.4, () => spawnP(nodeX(2), nodeY + 20, a.x, a.y, 0.75, c.label, "copy", null));
      });
    } else if (s.id === "recover") {
      nodes[1].alive = true;
      nodes[1].slots = nodes[1].slots.map(() => "syncing");
      chunks.forEach((c, k) => {
        const dp = slotPos(1, k);
        at(0.2 + k * 0.32, () => spawnP(nodeX(0), nodeY + 20, dp.x, dp.y, 0.7, c.label, "copy",
          () => { nodes[1].slots[k] = "full"; }));
      });
    }
  }

  function layout() {
    ({ ctx, w: W, h: H } = fitCanvas(canvas));
    fileBox = { x: W / 2 - 85, y: 30, w: 170, h: 58 };
    chunkY = 168;
    nodeY = H - 128; nodeH = 104;
    nodeW = Math.min(200, (W - 40) / 3 - 14);
    reset();
    if (reduced) {
      // static end-state: everything replicated, all alive
      chunks.forEach((c, k) => { const p = chunkPos(k); c.vis = true; c.x = p.x; c.y = p.y; });
      nodes.forEach(n => (n.slots = ["full", "full", "full", "full"]));
      draw(0);
    } else {
      setStage(0);
    }
  }

  function drawFile(t) {
    const pulse = 1 + Math.sin(t * 3) * 0.02;
    const w = fileBox.w * pulse, h = fileBox.h * pulse;
    const x = fileBox.x + fileBox.w / 2 - w / 2, y = fileBox.y + fileBox.h / 2 - h / 2;
    ctx.save();
    ctx.shadowColor = "rgba(77,124,254,0.55)"; ctx.shadowBlur = 22;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "rgba(77,124,254,0.22)"); g.addColorStop(1, "rgba(56,189,248,0.10)");
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(126,162,255,0.7)"; ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 14); ctx.stroke();
    ctx.fillStyle = "#e9efff"; ctx.font = "600 13px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText("dataset.zip", x + w / 2, y + 25);
    ctx.fillStyle = "#8b99bd"; ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText("12 MB", x + w / 2, y + 43);
  }

  function drawChunks() {
    chunks.forEach(c => {
      if (!c.vis) return;
      ctx.save();
      ctx.shadowColor = "rgba(56,189,248,0.6)"; ctx.shadowBlur = 14;
      ctx.fillStyle = "rgba(56,189,248,0.16)";
      roundRect(ctx, c.x - 33, c.y - 17, 66, 34, 10); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(56,189,248,0.8)"; ctx.lineWidth = 1.4;
      roundRect(ctx, c.x - 33, c.y - 17, 66, 34, 10); ctx.stroke();
      ctx.fillStyle = "#d9f3ff"; ctx.font = "600 12px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText(c.label, c.x, c.y + 4);
    });
  }

  function drawNodes(t) {
    nodes.forEach((n, i) => {
      const x = nodeX(i) - nodeW / 2, y = nodeY;
      const alive = n.alive;
      ctx.save();
      if (alive) { ctx.shadowColor = "rgba(77,124,254,0.4)"; ctx.shadowBlur = 18; }
      ctx.fillStyle = alive ? "rgba(15,23,46,0.85)" : "rgba(10,13,24,0.85)";
      roundRect(ctx, x, y, nodeW, nodeH, 14); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = alive ? "rgba(126,162,255,0.55)" : "rgba(95,108,146,0.35)";
      ctx.lineWidth = 1.4;
      roundRect(ctx, x, y, nodeW, nodeH, 14); ctx.stroke();

      // status LED
      const ledX = x + 16, ledY = y + 20;
      const glow = alive ? 0.6 + Math.sin(t * 4 + n.pulse) * 0.4 : 0.15;
      ctx.fillStyle = alive ? `rgba(52,211,153,${glow})` : "rgba(95,108,146,0.4)";
      ctx.shadowColor = alive ? "rgba(52,211,153,0.8)" : "transparent";
      ctx.shadowBlur = alive ? 10 : 0;
      ctx.beginPath(); ctx.arc(ledX, ledY, 5, 0, 7); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = alive ? "#c9d6f5" : "#5f6c92";
      ctx.font = "600 12px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      ctx.fillText(n.name, ledX + 12, ledY + 4);
      ctx.textAlign = "right";
      ctx.fillStyle = alive ? "rgba(52,211,153,0.9)" : "rgba(251,113,133,0.85)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(alive ? "● alive" : "✕ offline", x + nodeW - 12, ledY + 4);

      // slots
      for (let k = 0; k < 4; k++) {
        const s = slotPos(i, k);
        const st = n.slots[k];
        if (st === "full") {
          ctx.save();
          ctx.shadowColor = "rgba(77,124,254,0.7)"; ctx.shadowBlur = 8;
          ctx.fillStyle = "rgba(77,124,254,0.28)";
          roundRect(ctx, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 7); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = "rgba(126,162,255,0.8)";
          ctx.fillStyle = "#dbe6ff";
        } else if (st === "lost") {
          ctx.fillStyle = "rgba(95,108,146,0.12)";
          roundRect(ctx, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 7); ctx.fill();
          ctx.strokeStyle = "rgba(95,108,146,0.4)";
          ctx.fillStyle = "#5f6c92";
        } else if (st === "syncing") {
          const a = 0.35 + Math.sin(t * 6 + k) * 0.2;
          ctx.fillStyle = `rgba(56,189,248,${a})`;
          roundRect(ctx, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 7); ctx.fill();
          ctx.strokeStyle = "rgba(56,189,248,0.8)";
          ctx.fillStyle = "#d9f3ff";
        } else {
          ctx.strokeStyle = "rgba(125,160,255,0.22)";
          ctx.fillStyle = "#5f6c92";
        }
        ctx.lineWidth = 1.2;
        roundRect(ctx, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, 7); ctx.stroke();
        if (st === "full" || st === "lost" || st === "syncing") {
          ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
          ctx.fillText("c" + k, s.x, s.y + 3.5);
        }
      }
      if (!alive) {
        ctx.fillStyle = "rgba(251,113,133,0.9)";
        ctx.font = "600 10px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
        ctx.fillText("OFFLINE", x + nodeW / 2, y + nodeH - 10);
      }
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      if (p.t < 0) return;
      const r = p.kind === "copy" ? 6 : 9;
      ctx.save();
      ctx.shadowColor = p.kind === "copy" ? "rgba(56,189,248,0.8)" : "rgba(77,124,254,0.8)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = p.kind === "copy" ? SKY : BLUE;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      ctx.restore();
      // trail
      ctx.strokeStyle = p.kind === "copy" ? "rgba(56,189,248,0.35)" : "rgba(77,124,254,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "600 9px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText(p.label, p.x, p.y - r - 5);
    });
  }

  function drawRings() {
    rings.forEach(r => {
      ctx.strokeStyle = `rgba(52,211,153,${r.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nodeX(r.node), nodeY + 20, r.r, 0, 7); ctx.stroke();
    });
  }

  function drawBG() {
    ctx.fillStyle = "rgba(125,160,255,0.05)";
    for (let x = 20; x < W; x += 30)
      for (let y = 16; y < H; y += 30) { ctx.fillRect(x, y, 1.5, 1.5); }
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    drawBG();
    drawFile(t);
    // faint guide lines
    if (stageIdx === 1 || stageIdx === 2) {
      ctx.strokeStyle = "rgba(125,160,255,0.14)";
      ctx.setLineDash([5, 6]); ctx.lineWidth = 1.2;
      chunks.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(fileBox.x + fileBox.w / 2, fileBox.y + fileBox.h);
        ctx.quadraticCurveTo(fileBox.x + fileBox.w / 2, chunkY - 40, c.x || W / 2, chunkY - 20);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    drawChunks();
    drawRings();
    drawNodes(t);
    drawParticles();
  }

  function update(dt, t) {
    stageT += dt;
    const s = STAGES[stageIdx];
    events.forEach(ev => { if (!ev.fired && stageT >= ev.at) { ev.fired = true; ev.fn(); } });
    if (s.id === "heartbeat") {
      ringT += dt;
      if (ringT > 0.75) {
        ringT = 0;
        nodes.forEach((n, i) => { if (n.alive) rings.push({ node: i, r: 12, alpha: 0.8 }); });
      }
    }
    rings.forEach(r => { r.r += 46 * dt; r.alpha = Math.max(0, 0.8 * (1 - r.r / 52)); });
    rings = rings.filter(r => r.alpha > 0);
    particles.forEach(p => {
      if (p.done) return;
      p.t += dt / p.dur;
      if (p.t < 0) return;
      const e = easeInOutCubic(clamp(p.t, 0, 1));
      p.x = lerp(p.sx, p.tx, e);
      const lift = Math.sin(e * Math.PI) * 46;
      p.y = lerp(p.sy, p.ty, e) - lift;
      if (p.t >= 1) { p.done = true; if (p.onArrive) p.onArrive(); }
    });
    particles = particles.filter(p => !p.done);
    if (stageT >= s.dur) {
      if (stageIdx === STAGES.length - 1) { reset(); setStage(0); }
      else setStage(stageIdx + 1);
    }
    draw(t);
  }

  function frame(tms) {
    const dt = clamp((tms - last) / 1000, 0, 0.05); last = tms;
    update(dt, tms / 1000);
    raf = requestAnimationFrame(frame);
  }

  layout();
  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { cancelAnimationFrame(raf); layout(); if (!reduced && visOn) { last = performance.now(); raf = requestAnimationFrame(frame); } }, 220); });
  let visOn = false;
  if (!reduced) {
    visibilityLoop(canvas,
      () => { visOn = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      () => { visOn = false; cancelAnimationFrame(raf); });
  }
})();

/* ============================================================
   PROJECT 2 — Sentiment Analysis pipeline
   ============================================================ */
(() => {
  const reviewEl = document.getElementById("sentReview");
  const tokensEl = document.getElementById("sentTokens");
  const barsEl = document.getElementById("sentBars");
  const gauge = document.getElementById("sentGauge");
  const verdictEl = document.getElementById("sentVerdict");
  if (!reviewEl || !gauge) return;

  const REVIEWS = [
    {
      text: "The delivery was incredibly fast and the quality exceeded expectations",
      pos: ["incredibly", "fast", "quality", "exceeded", "expectations"],
      neg: [],
      tfidf: [["quality", 0.82], ["fast", 0.74], ["exceeded", 0.68], ["delivery", 0.41], ["incredibly", 0.38]],
      score: 0.93, label: "Positive", cls: "pos"
    },
    {
      text: "Terrible packaging, the item arrived broken and support was unhelpful",
      pos: [],
      neg: ["terrible", "broken", "unhelpful"],
      tfidf: [["broken", 0.88], ["terrible", 0.79], ["unhelpful", 0.71], ["packaging", 0.44], ["support", 0.33]],
      score: 0.12, label: "Negative", cls: "neg"
    },
    {
      text: "It works fine for the price, nothing amazing but does the job",
      pos: ["fine"],
      neg: [],
      tfidf: [["price", 0.55], ["amazing", 0.51], ["works", 0.47], ["fine", 0.42], ["job", 0.36]],
      score: 0.52, label: "Neutral", cls: "neu"
    }
  ];

  let gW = 0, gH = 0, gtx = null;
  let needle = 0.5, needleTarget = 0.5, gRaf = 0, gLast = 0, gaugeOn = false;
  const verdictColor = { pos: "#34d399", neg: "#fb7185", neu: "#94a3b8" };

  function sizeGauge() {
    ({ ctx: gtx, w: gW, h: gH } = fitCanvas(gauge));
    drawGauge();
  }

  function drawGauge() {
    if (!gtx) return;
    const cx = gW / 2, cy = gH - 16, R = Math.min(gW / 2 - 18, gH - 52);
    gtx.clearRect(0, 0, gW, gH);
    // track
    gtx.lineWidth = 15; gtx.lineCap = "round";
    gtx.strokeStyle = "rgba(125,160,255,0.12)";
    gtx.beginPath(); gtx.arc(cx, cy, R, Math.PI, 2 * Math.PI); gtx.stroke();
    // zones
    const zones = [[0, 0.4, "#fb7185"], [0.4, 0.6, "#94a3b8"], [0.6, 1, "#34d399"]];
    zones.forEach(([a, b, c]) => {
      gtx.strokeStyle = c + "55";
      gtx.beginPath(); gtx.arc(cx, cy, R, Math.PI + a * Math.PI, Math.PI + b * Math.PI); gtx.stroke();
    });
    // ticks
    gtx.strokeStyle = "rgba(139,153,189,0.5)"; gtx.lineWidth = 1.5;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const x1 = cx + Math.cos(a) * (R - 12), y1 = cy + Math.sin(a) * (R - 12);
      const x2 = cx + Math.cos(a) * (R - 18), y2 = cy + Math.sin(a) * (R - 18);
      gtx.beginPath(); gtx.moveTo(x1, y1); gtx.lineTo(x2, y2); gtx.stroke();
    }
    // needle
    const na = Math.PI + needle * Math.PI;
    gtx.save();
    gtx.shadowColor = "rgba(56,189,248,0.8)"; gtx.shadowBlur = 10;
    gtx.strokeStyle = "#e9efff"; gtx.lineWidth = 3.5; gtx.lineCap = "round";
    gtx.beginPath(); gtx.moveTo(cx, cy);
    gtx.lineTo(cx + Math.cos(na) * (R - 24), cy + Math.sin(na) * (R - 24)); gtx.stroke();
    gtx.restore();
    gtx.fillStyle = "#38bdf8";
    gtx.beginPath(); gtx.arc(cx, cy, 7, 0, 7); gtx.fill();
    gtx.fillStyle = "#050914";
    gtx.beginPath(); gtx.arc(cx, cy, 3, 0, 7); gtx.fill();
    // labels
    gtx.fillStyle = "#5f6c92"; gtx.font = "10px 'JetBrains Mono', monospace"; gtx.textAlign = "center";
    gtx.fillText("neg", cx - R + 4, cy + 14);
    gtx.fillText("neu", cx, cy - R - 8);
    gtx.fillText("pos", cx + R - 4, cy + 14);
    // score text
    gtx.fillStyle = "#e9efff"; gtx.font = "600 15px 'JetBrains Mono', monospace";
    gtx.fillText(needle.toFixed(2), cx, cy - 26);
  }

  function gaugeFrame(t) {
    const dt = clamp((t - gLast) / 1000, 0, 0.05); gLast = t;
    needle = lerp(needle, needleTarget, Math.min(1, dt * 3.2));
    if (Math.abs(needle - needleTarget) < 0.0005) needle = needleTarget;
    drawGauge();
    gRaf = requestAnimationFrame(gaugeFrame);
  }
  function gaugeStart() {
    if (gaugeOn || reduced) { drawGauge(); return; }
    gaugeOn = true; gLast = performance.now();
    gRaf = requestAnimationFrame(gaugeFrame);
  }
  function gaugeStop() {
    gaugeOn = false; cancelAnimationFrame(gRaf);
  }

  let runId = 0;

  async function playReview(rv, id) {
    // 1. review typing
    reviewEl.innerHTML = "";
    const caret = document.createElement("span");
    caret.className = "sent-caret";
    reviewEl.appendChild(caret);
    if (reduced) {
      reviewEl.insertBefore(document.createTextNode(rv.text + " "), caret);
    } else {
      for (let i = 0; i < rv.text.length; i++) {
        if (id !== runId) return;
        reviewEl.insertBefore(document.createTextNode(rv.text[i]), caret);
        await sleep(14);
      }
      await sleep(350);
    }
    if (id !== runId) return;

    // 2. tokens
    tokensEl.innerHTML = "";
    const words = rv.text.split(/\s+/).slice(0, 16);
    const spans = words.map(w => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, "");
      const s = document.createElement("span");
      s.className = "tok";
      s.textContent = w;
      if (rv.pos.includes(clean)) s.dataset.cls = "pos";
      else if (rv.neg.includes(clean)) s.dataset.cls = "neg";
      else if (clean.length > 4) s.dataset.cls = "neu";
      tokensEl.appendChild(s);
      return s;
    });
    for (const s of spans) {
      if (id !== runId) return;
      s.classList.add("show");
      if (!reduced) await sleep(45);
    }
    if (!reduced) await sleep(300);
    if (id !== runId) return;
    spans.forEach(s => { if (s.dataset.cls) s.classList.add(s.dataset.cls); });
    if (!reduced) await sleep(500);
    if (id !== runId) return;

    // 3. tf-idf bars
    barsEl.innerHTML = "";
    const barFills = [];
    rv.tfidf.forEach(([w, v]) => {
      const row = document.createElement("div");
      row.className = "sent-bar";
      row.innerHTML = `<span class="w">${w}</span><span class="track"><span class="fill"></span></span><span class="v">${v.toFixed(2)}</span>`;
      barsEl.appendChild(row);
      barFills.push({ row, fill: row.querySelector(".fill"), v });
    });
    for (const b of barFills) {
      if (id !== runId) return;
      b.row.classList.add("show");
      requestAnimationFrame(() => requestAnimationFrame(() => { b.fill.style.width = (b.v * 100) + "%"; }));
      if (!reduced) await sleep(110);
    }
    if (id !== runId) return;

    // 4. gauge + verdict
    needleTarget = rv.score;
    if (reduced) { needle = rv.score; drawGauge(); }
    verdictEl.className = "sent-verdict";
    verdictEl.textContent = "…";
    if (!reduced) await sleep(900);
    if (id !== runId) return;
    verdictEl.textContent = rv.label;
    verdictEl.classList.add("show", rv.cls);
    if (!reduced) await sleep(2600);
  }

  async function loop(id) {
    let i = 0;
    while (id === runId) {
      await playReview(REVIEWS[i % REVIEWS.length], id);
      i++;
      if (reduced) break;
    }
  }

  const frame = document.querySelector(".sentiment-viz");
  sizeGauge();
  let rT;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(sizeGauge, 200); });
  visibilityLoop(frame,
    () => { gaugeStart(); runId++; const id = runId; loop(id); },
    () => { runId++; gaugeStop(); });
})();

/* ============================================================
   PROJECT 3 — Packet Analyzer visualization
   ============================================================ */
(() => {
  const canvas = document.getElementById("pktCanvas");
  const totalEl = document.getElementById("pktTotal");
  const rateEl = document.getElementById("pktRate");
  if (!canvas) return;

  const PROTOS = {
    TCP:  { color: "#38bdf8", label: "TCP · 443",  w: 0.5 },
    UDP:  { color: "#818cf8", label: "UDP · 53",   w: 0.32 },
    ICMP: { color: "#fbbf24", label: "ICMP · ping", w: 0.18 }
  };
  const keys = Object.keys(PROTOS);

  let W = 0, H = 0, ctx = null;
  let packets = [], raf = 0, last = 0, spawnT = 0;
  let filter = "ALL", total = 0, totalShown = 0;
  let secCount = 0, secT = 0, samples = new Array(90).fill(0);
  let pps = 0;

  const laneY = i => 26 + i * ((H - 84) / 3) + ((H - 84) / 3) / 2;
  const pickProto = () => {
    const r = Math.random();
    let acc = 0;
    for (const k of keys) { acc += PROTOS[k].w; if (r <= acc) return k; }
    return "TCP";
  };
  const randIP = () => `192.168.1.${1 + Math.floor(Math.random() * 40)} → 10.0.0.${1 + Math.floor(Math.random() * 40)}`;

  function spawn() {
    const proto = pickProto();
    const lane = keys.indexOf(proto);
    total++; secCount++;
    if (filter !== "ALL" && filter !== proto) return;
    packets.push({
      proto, x: -190, y: laneY(lane),
      speed: rand(150, 260), seed: rand(0, 6.28),
      label: randIP(), born: performance.now()
    });
    if (packets.length > 42) packets.shift();
  }

  function drawBG() {
    keys.forEach((k, i) => {
      const y = laneY(i), lh = (H - 84) / 3;
      ctx.fillStyle = "rgba(125,160,255,0.03)";
      roundRect(ctx, 12, y - lh / 2 + 8, W - 24, lh - 16, 12); ctx.fill();
      ctx.fillStyle = PROTOS[k].color;
      ctx.font = "600 11px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      ctx.globalAlpha = 0.85;
      ctx.fillText(PROTOS[k].label, 26, y - lh / 2 + 28);
      ctx.globalAlpha = 1;
    });
  }

  function drawPackets(t) {
    ctx.textAlign = "center";
    packets.forEach(p => {
      const c = PROTOS[p.proto].color;
      const y = p.y + Math.sin(t * 2 + p.seed) * 4;
      const w = 176, h = 32;
      const fade = clamp((p.x + 190) / 120, 0, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.shadowColor = c; ctx.shadowBlur = 12;
      ctx.fillStyle = c + "26";
      roundRect(ctx, p.x, y - h / 2, w, h, 9); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = c; ctx.lineWidth = 1.4;
      roundRect(ctx, p.x, y - h / 2, w, h, 9); ctx.stroke();
      // trail
      const tg = ctx.createLinearGradient(p.x - 90, 0, p.x, 0);
      tg.addColorStop(0, "transparent"); tg.addColorStop(1, c + "55");
      ctx.strokeStyle = tg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x - 90, y); ctx.lineTo(p.x, y); ctx.stroke();
      ctx.fillStyle = "#e9efff"; ctx.font = "10.5px 'JetBrains Mono', monospace";
      ctx.fillText(p.label, p.x + w / 2, y + 3.5);
      ctx.fillStyle = c; ctx.font = "700 9px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      ctx.fillText(p.proto, p.x + 10, y - h / 2 - 6);
      ctx.textAlign = "center";
      ctx.restore();
    });
  }

  function drawThroughput() {
    const bx = 14, bw = W - 28, by = H - 46, bh = 34;
    ctx.fillStyle = "rgba(125,160,255,0.05)";
    roundRect(ctx, bx, by, bw, bh, 8); ctx.fill();
    const max = Math.max(4, ...samples);
    const n = samples.length, sw = bw / n;
    samples.forEach((s, i) => {
      const h = (s / max) * (bh - 10);
      const g = ctx.createLinearGradient(0, by + bh, 0, by);
      g.addColorStop(0, "rgba(77,124,254,0.25)"); g.addColorStop(1, "rgba(56,189,248,0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(bx + i * sw + 0.5, by + bh - 4 - h, sw - 1, h);
    });
    ctx.fillStyle = "#5f6c92"; ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
    ctx.fillText("throughput · pkts/s", bx + 10, by + 14);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    drawBG();
    drawPackets(t);
    drawThroughput();
  }

  function update(dt, t) {
    if (!reduced) {
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = rand(0.2, 0.42); }
    }
    packets.forEach(p => { p.x += p.speed * dt; });
    packets = packets.filter(p => p.x < W + 220);
    secT += dt;
    if (secT >= 1) {
      secT = 0;
      samples.push(secCount); samples.shift();
      pps = lerp(pps, secCount, 0.5);
      secCount = 0;
      totalShown = Math.round(lerp(totalShown, total, 0.4));
      if (totalEl) totalEl.textContent = `${totalShown.toLocaleString("en-IN")} pkts`;
      if (rateEl) rateEl.textContent = `${Math.round(pps)} pps`;
    }
    draw(t);
  }

  function frame(tms) {
    const dt = clamp((tms - last) / 1000, 0, 0.05); last = tms;
    update(dt, tms / 1000);
    raf = requestAnimationFrame(frame);
  }

  function layout() {
    ({ ctx, w: W, h: H } = fitCanvas(canvas));
    if (reduced) {
      // static snapshot
      for (let i = 0; i < 9; i++) {
        const proto = keys[i % 3];
        packets.push({ proto, x: 60 + i * ((W - 300) / 9), y: laneY(i % 3), speed: 0, seed: i, label: randIP(), born: 0 });
      }
      samples = samples.map(() => 2 + Math.floor(Math.random() * 4));
      total = 1284; totalShown = 1284; pps = 3;
      if (totalEl) totalEl.textContent = "1,284 pkts";
      if (rateEl) rateEl.textContent = "3 pps";
      draw(1.2);
    }
  }

  document.querySelectorAll(".pkt-filters .filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pkt-filters .filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.proto;
      packets = [];
    });
  });

  layout();
  let rT, visOn = false;
  window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { cancelAnimationFrame(raf); packets = []; layout(); if (!reduced && visOn) { last = performance.now(); raf = requestAnimationFrame(frame); } }, 220); });
  if (!reduced) {
    visibilityLoop(canvas,
      () => { visOn = true; last = performance.now(); raf = requestAnimationFrame(frame); },
      () => { visOn = false; cancelAnimationFrame(raf); });
  }
})();

/* keep timeline in sync after layout */
window.addEventListener("load", updateTimeline);
window.addEventListener("resize", () => requestAnimationFrame(updateTimeline));
})();

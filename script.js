/* Tejjas A R — Ember Red portfolio.
   Vanilla JS. All motion is transform/opacity (GPU-composited), rAF-driven. */
(() => {
"use strict";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE_POINTER = window.matchMedia("(pointer: fine)").matches;
const nowS = () => performance.now() / 1000;

/* ---------- utils ---------- */
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = (t) => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
const easeO = (t) => 1 - Math.pow(1 - t, 3);
const seg = (t, a, b) => clamp01((t - a) / (b - a));

function fitCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/* Run fn(t, dt) via rAF only while el is visible. Static frame when reduced motion. */
function loopWhileVisible(el, fn, staticT) {
  let raf = 0, running = false, t0 = 0, last = 0;
  if (REDUCED && staticT !== undefined) { fn(staticT, 0); return () => {}; }
  const tick = (now) => {
    if (!running) return;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    fn(t, dt);
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting && !running) {
        running = true; t0 = performance.now(); last = t0;
        raf = requestAnimationFrame(tick);
      } else if (!e.isIntersecting && running) {
        running = false; cancelAnimationFrame(raf);
      }
    });
  }, { threshold: 0.12 });
  io.observe(el);
  return () => { running = false; cancelAnimationFrame(raf); io.disconnect(); };
}

/* ---------- ember particles (hero) ---------- */
function initEmbers() {
  const c = document.getElementById("embers");
  if (!c) return;
  const hero = c.closest(".hero");
  let W = 0, H = 0, ctx = null, parts = [];
  function resize() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    ctx = fitCanvas(c, W, H);
    const target = Math.min(90, Math.floor(W / 14));
    parts = [];
    for (let i = 0; i < target; i++) parts.push(newP(true));
  }
  function newP(anyY) {
    return {
      x: Math.random() * W,
      y: anyY ? Math.random() * H : H + 10 + Math.random() * 30,
      r: 0.7 + Math.random() * 2.3,
      vy: 14 + Math.random() * 34,
      ph: Math.random() * Math.PI * 2,
      sw: 6 + Math.random() * 16,
      hue: Math.random() < 0.72 ? "255,72,48" : "255,159,46",
      a: 0.25 + Math.random() * 0.55,
    };
  }
  function frame(t, dt) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.y -= p.vy * dt;
      p.x += Math.sin(t * 0.9 + p.ph) * p.sw * dt;
      if (p.y < -20) parts[i] = newP(false);
      const tw = 0.6 + 0.4 * Math.sin(t * 2.4 + p.ph);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${(p.a * tw).toFixed(3)})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  if (REDUCED) { resize(); ctx.clearRect(0, 0, W, H); return; }
  resize();
  window.addEventListener("resize", resize, { passive: true });
  loopWhileVisible(hero, frame);
}

/* ---------- nav / progress / drawer / active link ---------- */
function initNav() {
  const nav = document.getElementById("nav");
  const prog = document.getElementById("progress");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 30);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    document.getElementById("toTop").classList.toggle("show", y > 600);
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );

  const map = {};
  links.querySelectorAll("a[data-nav]").forEach((a) => { map[a.dataset.nav] = a; });
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        Object.values(map).forEach((a) => a.classList.remove("active"));
        const a = map[e.target.id];
        if (a) a.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  ["work", "skills", "journey", "education", "contact"].forEach((id) => {
    const s = document.getElementById(id);
    if (s) io.observe(s);
  });

  document.getElementById("toTop").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  });
}

/* ---------- reveal on scroll (with stagger) ---------- */
function initReveals() {
  const els = document.querySelectorAll(".reveal");
  els.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    const i = sibs.indexOf(el) % 5;
    el.style.setProperty("--d", (i * 0.09).toFixed(2) + "s");
  });
  if (REDUCED) { els.forEach((el) => el.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => io.observe(el));
}

/* ---------- animated counters ---------- */
function initCounters() {
  const els = document.querySelectorAll(".stat-num[data-count]");
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const pre = el.dataset.prefix || "";
      const dur = 1500, t0 = performance.now();
      if (REDUCED) { el.textContent = pre + target.toFixed(dec); return; }
      (function tick(now) {
        const p = clamp01((now - t0) / dur);
        el.textContent = pre + (target * easeO(p)).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = pre + target.toFixed(dec);
      })(t0);
    });
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

/* ---------- magnetic buttons ---------- */
function initMagnetic() {
  if (!FINE_POINTER || REDUCED) return;
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${(dx * 0.14).toFixed(1)}px, ${(dy * 0.18).toFixed(1)}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
}

/* ---------- timeline progress ---------- */
function initTimeline() {
  const tl = document.getElementById("timeline");
  const bar = document.getElementById("tlProgress");
  if (!tl || !bar) return;
  const items = [...tl.querySelectorAll(".tl-item")];
  let ticking = false;
  function update() {
    const r = tl.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = r.height;
    const seen = clamp01((vh * 0.62 - r.top) / total);
    bar.style.height = (seen * 100).toFixed(1) + "%";
    items.forEach((it) => {
      const ir = it.getBoundingClientRect();
      it.classList.toggle("lit", ir.top < vh * 0.66);
    });
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

/* ============ PROJECT VIZ 1 — Distributed File System ============
   Looping staged animation: Upload → Chunk → Replicate ×3 → Heartbeat → Failure/Recovery */
function initDFS() {
  const canvas = document.getElementById("dfsCanvas");
  const tag = document.getElementById("dfsStage");
  if (!canvas) return;
  const LW = 640, LH = 360;
  const ctx = fitCanvas(canvas, LW, LH);

  const RED = "#ff3b3b", REDDIM = "rgba(255,59,59,0.28)";
  const IVORY = "#f7ece5", MUTED = "#bd9f92", GRAY = "#6e5a52";
  const MONO = '10px "JetBrains Mono", monospace';

  const client = { x: 18, y: 148, w: 104, h: 64, label: "CLIENT" };
  const master = { x: 200, y: 148, w: 104, h: 64, label: "MASTER" };
  const nodes = [
    { x: 396, y: 30,  w: 132, h: 68, label: "STORAGE 1" },
    { x: 396, y: 146, w: 132, h: 68, label: "STORAGE 2" },
    { x: 396, y: 262, w: 132, h: 68, label: "STORAGE 3" },
  ];
  const cc = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const chunkHome = [
    { dx: -36, dy: -32 }, { dx: 36, dy: -32 },
    { dx: -36, dy: 32 }, { dx: 36, dy: 32 },
  ];
  const slot = (j, i) => ({
    x: nodes[j].x + 16 + (i % 2) * 26,
    y: nodes[j].y + 24 + Math.floor(i / 2) * 26,
  });
  const T = 15; // loop seconds

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function box(b, border, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = "rgba(255,59,59,0.8)"; ctx.shadowBlur = 18; }
    rr(b.x, b.y, b.w, b.h, 10);
    ctx.fillStyle = "rgba(255,59,59,0.07)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = border; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = border === GRAY ? GRAY : MUTED;
    ctx.font = MONO; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }
  function doc(x, y, s, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(255,59,59,0.9)"; ctx.shadowBlur = 16;
    ctx.fillStyle = RED;
    ctx.beginPath();
    const w = s, h = s * 1.22, f = s * 0.3;
    ctx.moveTo(x - w/2, y - h/2);
    ctx.lineTo(x + w/2 - f, y - h/2); ctx.lineTo(x + w/2, y - h/2 + f);
    ctx.lineTo(x + w/2, y + h/2); ctx.lineTo(x - w/2, y + h/2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function chunk(x, y, s, alpha, color) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(255,59,59,0.9)"; ctx.shadowBlur = 10;
    rr(x - s/2, y - s/2, s, s, 4);
    ctx.fillStyle = color || RED; ctx.fill();
    ctx.restore();
  }
  function link(a, b, alpha) {
    const A = cc(a), B = cc(b);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = REDDIM; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.restore();
  }
  function badge(j, alpha, text) {
    const n = nodes[j];
    const x = n.x + n.w / 2, y = n.y - 14;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const w = ctx.measureText(text).width + 18;
    rr(x - w/2, y - 11, w, 22, 11);
    ctx.fillStyle = "rgba(200,30,30,0.85)"; ctx.fill();
    ctx.shadowColor = "rgba(255,59,59,0.9)"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }
  function stageFor(t) {
    if (t < 2.5) return "Upload";
    if (t < 4.5) return "Chunk";
    if (t < 8.5) return "Replicate ×3";
    if (t < 11) return "Heartbeat";
    return "Failure → Recovery";
  }

  function draw(t) {
    ctx.clearRect(0, 0, LW, LH);
    const mC = cc(master), cC = cc(client);

    // failure dim factor for node 2 (index 1)
    let dim = 1;
    if (t >= 11 && t < 12.6) dim = lerp(1, 0.22, easeIO(seg(t, 11, 11.8)));
    else if (t >= 12.6 && t < 13.4) dim = lerp(0.22, 1, easeIO(seg(t, 12.6, 13.4)));
    const recovering = t >= 12.6 && t < 13.6;

    // links
    link(client, master, 0.8);
    nodes.forEach((n) => link(master, n, 0.55));

    // boxes
    box(client, RED, false);
    box(master, RED, t >= 8.5 && t < 11);
    nodes.forEach((n, j) => box(n, j === 1 ? (dim < 0.9 ? GRAY : RED) : RED, recovering && j === 1));

    // ---- stage 1: upload ----
    if (t < 2.5) {
      const p = easeIO(seg(t, 0.2, 2.3));
      doc(lerp(cC.x, mC.x, p), lerp(cC.y, mC.y, p) - 46, 40, 1);
    }
    // ---- stage 2: chunk ----
    if (t >= 2.5 && t < 4.5) {
      const p = easeO(seg(t, 2.5, 3.6));
      chunkHome.forEach((o) => {
        chunk(mC.x + o.dx * p, mC.y + o.dy * p, 20, 1);
      });
      doc(mC.x, mC.y - 52, 34, 1 - p);
    }
    // ---- stage 3: replicate ----
    if (t >= 4.5 && t < 8.5) {
      let k = 0;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++, k++) {
          const st = 4.5 + k * 0.16, dur = 1.15;
          const p = easeIO(seg(t, st, st + dur));
          const fx = mC.x + chunkHome[i].dx, fy = mC.y + chunkHome[i].dy;
          const s = slot(j, i);
          const sx = s.x + 9, sy = s.y + 9;
          // arc lift
          const mx = (fx + sx) / 2, my = Math.min(fy, sy) - 34;
          const x = lerp(lerp(fx, mx, p), lerp(mx, sx, p), p);
          const y = lerp(lerp(fy, my, p), lerp(my, sy, p), p);
          chunk(x, y, 18, 1);
        }
      }
      if (t > 7.2) nodes.forEach((_, j) => badge(j, seg(t, 7.2, 8) * (0.75 + 0.25 * Math.sin(t * 5)), "R=3"));
    }
    // ---- stage 4: heartbeat (chunks rest on nodes) ----
    if (t >= 8.5 && t < 11) {
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 4; i++) {
          const s = slot(j, i);
          chunk(s.x + 9, s.y + 9, 18, 1);
        }
      nodes.forEach((_, j) => badge(j, 0.75 + 0.25 * Math.sin(t * 5), "R=3"));
      // heartbeat pulses
      nodes.forEach((n, j) => {
        const q = ((t - 8.5) * 1.4 + j * 0.45) % 2;
        const nC = cc(n);
        const px = q < 1 ? lerp(mC.x, nC.x, q) : lerp(nC.x, mC.x, q - 1);
        const py = q < 1 ? lerp(mC.y, nC.y, q) : lerp(nC.y, mC.y, q - 1);
        ctx.save();
        ctx.shadowColor = "rgba(255,120,60,1)"; ctx.shadowBlur = 14;
        ctx.fillStyle = "#ffb020";
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }
    // ---- stage 5: failure + recovery ----
    if (t >= 11) {
      for (let j = 0; j < 3; j++) {
        if (j === 1) continue;
        for (let i = 0; i < 4; i++) {
          const s = slot(j, i);
          chunk(s.x + 9, s.y + 9, 18, 1);
        }
      }
      // node 2's chunks: fade while failed, fly to neighbors during rebalance, fly back on recovery
      const n2 = nodes[1];
      if (t < 12) {
        const a = dim;
        for (let i = 0; i < 4; i++) { const s = slot(1, i); chunk(s.x + 9, s.y + 9, 18, a); }
        if (t > 11.4) {
          ctx.save(); ctx.globalAlpha = seg(t, 11.4, 12);
          ctx.fillStyle = "#ff6b6b"; ctx.font = '700 11px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText("✕ NODE DOWN", n2.x + n2.w / 2, n2.y + n2.h + 16);
          ctx.restore();
        }
      } else if (t < 13) {
        // rebalance: 2 chunks → node 0, 2 chunks → node 2
        for (let i = 0; i < 4; i++) {
          const from = slot(1, i);
          const tj = i < 2 ? 0 : 2;
          const to = { x: nodes[tj].x + 16 + (i % 2) * 26 + 70, y: nodes[tj].y + 24 + Math.floor(i / 2) * 26 };
          const p = easeIO(seg(t, 12 + i * 0.08, 12.8 + i * 0.08));
          chunk(lerp(from.x + 9, to.x + 9, p), lerp(from.y + 9, to.y + 9, p), 18, 1);
        }
        ctx.save(); ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#ffb020"; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = "center";
        ctx.fillText("⟳ REBALANCING", 320, 348);
        ctx.restore();
      } else {
        // recovery: chunks fly home, node glows
        for (let i = 0; i < 4; i++) {
          const home = slot(1, i);
          const tj = i < 2 ? 0 : 2;
          const away = { x: nodes[tj].x + 16 + (i % 2) * 26 + 70, y: nodes[tj].y + 24 + Math.floor(i / 2) * 26 };
          const p = easeIO(seg(t, 13 + i * 0.07, 13.7 + i * 0.07));
          chunk(lerp(away.x + 9, home.x + 9, p), lerp(away.y + 9, home.y + 9, p), 18, 1);
        }
        if (t > 13.8) {
          ctx.save(); ctx.globalAlpha = seg(t, 13.8, 14.2);
          ctx.fillStyle = "#8aff9e"; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = "center";
          ctx.fillText("✓ RECOVERED", n2.x + n2.w / 2, n2.y + n2.h + 16);
          ctx.restore();
        }
      }
    }

    tag.textContent = stageFor(t);
  }

  if (REDUCED) { draw(9.5); return; }
  loopWhileVisible(canvas, (t) => draw(t % T));
  window.addEventListener("resize", () => fitCanvas(canvas, LW, LH), { passive: true });
}

/* ============ PROJECT VIZ 2 — Sentiment Analysis pipeline ============
   Tokenize → TF-IDF → Classify, cycling through sample reviews. */
function initSentiment() {
  const frame = document.getElementById("svReview");
  if (!frame) return;
  const stage = document.getElementById("svStage");
  const review = document.getElementById("svReview");
  const bars = document.getElementById("svBars");
  const needle = document.getElementById("svNeedle");
  const verdict = document.getElementById("svVerdict");

  const EX = [
    {
      text: "The delivery was fast and the product works great",
      stop: ["the", "was", "and"],
      bars: [["great", 92], ["delivery", 78], ["fast", 71], ["works", 64], ["product", 58]],
      angle: 58, label: "POSITIVE", cls: "pos",
    },
    {
      text: "Terrible quality, broke after one day of use",
      stop: ["after", "one", "of", "use"],
      bars: [["terrible", 94], ["broke", 81], ["quality", 73], ["day", 42]],
      angle: -58, label: "NEGATIVE", cls: "neg",
    },
    {
      text: "It arrived on time and does the job",
      stop: ["it", "on", "and", "the"],
      bars: [["arrived", 61], ["time", 66], ["does", 52], ["job", 57]],
      angle: 0, label: "NEUTRAL", cls: "neu",
    },
  ];

  let timers = [], active = false, idx = 0;
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const clean = (w) => w.toLowerCase().replace(/[^a-z]/g, "");

  function renderStatic(i) {
    const ex = EX[i % EX.length];
    stage.textContent = "Classify";
    review.innerHTML = "";
    ex.text.split(" ").forEach((w) => {
      const s = document.createElement("span");
      s.className = "w on " + (ex.stop.includes(clean(w)) ? "stop" : "tok");
      s.textContent = w;
      review.appendChild(s);
    });
    bars.innerHTML = "";
    ex.bars.forEach(([w, v]) => {
      const row = document.createElement("div");
      row.className = "sv-bar";
      row.innerHTML = `<span class="blabel">${w}</span><span class="btrack"><span class="bfill" style="width:${v}%"></span></span><span class="bval">${v}</span>`;
      bars.appendChild(row);
    });
    needle.style.transform = `rotate(${ex.angle}deg)`;
    verdict.textContent = ex.label;
    verdict.className = "sv-verdict show " + ex.cls;
  }

  function play(i) {
    if (!active) return;
    idx = i % EX.length;
    const ex = EX[idx];
    verdict.className = "sv-verdict";
    verdict.textContent = "—";
    needle.style.transform = "rotate(0deg)";
    stage.textContent = "Tokenize";
    review.innerHTML = "";
    bars.innerHTML = "";
    const words = ex.text.split(" ");
    words.forEach((w) => {
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w;
      review.appendChild(s);
    });
    const spans = [...review.children];
    spans.forEach((s, k) => later(() => { if (active) s.classList.add("on"); }, 350 + k * 130));
    const tokDone = 350 + words.length * 130 + 450;
    later(() => {
      if (!active) return;
      spans.forEach((s) => s.classList.add(ex.stop.includes(clean(s.textContent)) ? "stop" : "tok"));
    }, tokDone);
    later(() => {
      if (!active) return;
      stage.textContent = "TF-IDF features";
      ex.bars.forEach(([w, v], k) => {
        const row = document.createElement("div");
        row.className = "sv-bar";
        row.innerHTML = `<span class="blabel">${w}</span><span class="btrack"><span class="bfill"></span></span><span class="bval">${v}</span>`;
        bars.appendChild(row);
        later(() => { if (active) row.querySelector(".bfill").style.width = v + "%"; }, 120 + k * 140);
      });
    }, tokDone + 900);
    const clsT = tokDone + 900 + 1500;
    later(() => {
      if (!active) return;
      stage.textContent = "Classify";
      needle.style.transform = `rotate(${ex.angle}deg)`;
      later(() => {
        if (!active) return;
        verdict.textContent = ex.label;
        verdict.classList.add("show", ex.cls);
      }, 1250);
    }, clsT);
    later(() => play(idx + 1), clsT + 3800);
  }

  const vizFrame = review.closest(".viz-frame");
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting && !active) { active = true; play(idx); }
      else if (!e.isIntersecting && active) { active = false; clearTimers(); }
    });
  }, { threshold: 0.2 });
  io.observe(vizFrame);

  if (REDUCED) {
    active = false;
    renderStatic(0);
  }
}

/* ============ PROJECT VIZ 3 — Network Packet Analyzer ============
   Packets stream across protocol lanes; filter control dims non-matching traffic. */
function initPackets() {
  const canvas = document.getElementById("pktCanvas");
  if (!canvas) return;
  const LW = 720, LH = 252;
  const ctx = fitCanvas(canvas, LW, LH);

  const lanes = [
    { proto: "TCP",  y: 66,  color: "#ff3b3b" },
    { proto: "UDP",  y: 132, color: "#ff9f2e" },
    { proto: "ICMP", y: 198, color: "#f7ece5" },
  ];
  const MONO = '10px "JetBrains Mono", monospace';
  const FILTERS = ["ALL", "TCP", "UDP", "ICMP"];

  let packets = [], filter = "ALL", fi = 0;
  let lastSpawn = 0, lastAuto = 0, lastUser = -100;
  const counts = { TCP: 0, UDP: 0, ICMP: 0 };
  const cntEls = {
    TCP: document.getElementById("cntTcp"),
    UDP: document.getElementById("cntUdp"),
    ICMP: document.getElementById("cntIcmp"),
  };
  const btns = [...document.querySelectorAll(".pkt-filter")];

  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rip = () => `${rint(11, 223)}.${rint(0, 255)}.${rint(0, 255)}.${rint(1, 254)}`;
  const rport = () => rint(1024, 65535);

  function setFilter(f, fromUser) {
    filter = f; fi = FILTERS.indexOf(f);
    btns.forEach((b) => b.classList.toggle("is-active", b.dataset.proto === f));
    if (fromUser) lastUser = nowS();
  }
  btns.forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.proto, true)));

  function spawn() {
    const lane = lanes[rint(0, 2)];
    const p = {
      lane, proto: lane.proto, x: -240 - Math.random() * 60,
      speed: 95 + Math.random() * 75,
      src: `${rip()}:${lane.proto === "ICMP" ? "echo" : rport()}`,
      dst: `${rip()}:${lane.proto === "ICMP" ? "reply" : rport()}`,
    };
    packets.push(p);
    counts[lane.proto]++;
    const el = cntEls[lane.proto];
    if (el) el.textContent = counts[lane.proto];
  }

  function chip(p) {
    const w = 224, h = 32, x = p.x, y = p.lane.y - h / 2;
    const dim = filter !== "ALL" && p.proto !== filter;
    ctx.save();
    ctx.globalAlpha = dim ? 0.08 : 1;
    ctx.shadowColor = p.lane.color;
    ctx.shadowBlur = dim ? 0 : 12;
    ctx.fillStyle = "rgba(20,10,8,0.92)";
    ctx.strokeStyle = p.lane.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    // proto tag
    ctx.fillStyle = p.lane.color;
    ctx.fillRect(x + 10, y + 8, 44, 16);
    ctx.fillStyle = "#0b0605";
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(p.proto, x + 32, y + 17);
    // addresses
    ctx.fillStyle = dim ? "#8a6f63" : "#f7ece5";
    ctx.font = MONO; ctx.textAlign = "left";
    ctx.fillText(`${p.src} → ${p.dst}`, x + 62, y + 17);
    ctx.restore();
  }

  function frame(t, dt) {
    if (t - lastSpawn > 0.5) { lastSpawn = t; if (packets.length < 15) spawn(); }
    if (t - lastAuto > 8 && t - lastUser > 25) { lastAuto = t; setFilter(FILTERS[(fi + 1) % FILTERS.length], false); }

    ctx.clearRect(0, 0, LW, LH);
    // lanes
    lanes.forEach((L) => {
      ctx.save();
      ctx.strokeStyle = "rgba(255,59,59,0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 9]);
      ctx.lineDashOffset = -(t * 26);
      ctx.beginPath(); ctx.moveTo(70, L.y); ctx.lineTo(LW - 8, L.y); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = L.color; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(L.proto, 12, L.y);
      ctx.restore();
    });
    packets.forEach((p) => { p.x += p.speed * dt; chip(p); });
    packets = packets.filter((p) => p.x < LW + 60);
  }

  if (REDUCED) {
    // static: a few parked packets, all visible
    packets = [
      { lane: lanes[0], proto: "TCP", x: 120, speed: 0, src: "192.168.1.10:443", dst: "10.0.0.8:52134" },
      { lane: lanes[1], proto: "UDP", x: 380, speed: 0, src: "172.16.4.2:53", dst: "192.168.1.20:33011" },
      { lane: lanes[2], proto: "ICMP", x: 200, speed: 0, src: "10.1.0.5:echo", dst: "10.1.0.9:reply" },
    ];
    frame(0, 0);
    return;
  }
  loopWhileVisible(canvas, frame);
  window.addEventListener("resize", () => fitCanvas(canvas, LW, LH), { passive: true });
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initEmbers();
  initNav();
  initReveals();
  initCounters();
  initMagnetic();
  initTimeline();
  initDFS();
  initSentiment();
  initPackets();
});

})();

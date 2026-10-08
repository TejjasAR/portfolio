/* Distributed File System topology demo: client, master, and storage nodes. */
(() => {
  "use strict";

  const canvas = document.getElementById("dfsCanvas");
  if (!canvas || canvas.dataset.engine !== "topology") return;

  const caption = document.getElementById("dfsCaption");
  const steps = document.getElementById("dfsSteps");
  const progress = document.getElementById("dfsProgress");
  const stageCount = document.getElementById("dfsStageCount");
  const control = document.getElementById("dfsControl");
  const frameEl = canvas.closest(".viz-frame");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const STAGES = [
    { id: "request", short: "Request", dur: 2.1, text: "Client asks the master to store dataset.zip" },
    { id: "metadata", short: "Metadata", dur: 2.4, text: "Master selects primary nodes and returns a chunk map" },
    { id: "write", short: "Direct write", dur: 3.5, text: "Client streams four chunks directly to primary storage nodes" },
    { id: "replicate", short: "Replicate", dur: 3.5, text: "Storage nodes create a second replica for every chunk" },
    { id: "heartbeat", short: "Heartbeat", dur: 2.8, text: "Storage nodes send periodic heartbeats to the master" },
    { id: "failure", short: "Failover", dur: 2.8, text: "Master misses storage-2 heartbeats; c0 and c1 become under-replicated" },
    { id: "repair", short: "Repair", dur: 3.6, text: "Master reroutes healthy replicas to storage-4" },
    { id: "recover", short: "Rejoin", dur: 3.2, text: "storage-2 rejoins and synchronizes its chunk inventory" }
  ];

  steps.innerHTML = "";
  STAGES.forEach(stage => {
    const chip = document.createElement("span");
    chip.textContent = stage.short;
    steps.appendChild(chip);
  });
  const chips = [...steps.children];

  let ctx, W = 1, H = 1, dpr = 1;
  let stageIndex = 0, stageTime = 0, last = 0, raf = 0;
  let visible = false, paused = false, pulseClock = 0;
  let events = [], packets = [], waves = [];
  let client, master, nodes = [];

  const colors = {
    control: "#a5b4fc",
    data: "#38bdf8",
    repair: "#fbbf24",
    health: "#34d399",
    danger: "#fb7185"
  };

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const topY = 30;
    const roleW = Math.min(168, W * 0.31);
    client = { x: W * 0.08, y: topY, w: roleW, h: 74 };
    master = { x: W * 0.92 - roleW, y: topY, w: roleW, h: 74 };
    const gap = Math.max(7, W * 0.014);
    const nodeW = Math.min(164, (W - gap * 5) / 4);
    const total = nodeW * 4 + gap * 3;
    const start = (W - total) / 2;
    const nodeY = H - 126;
    nodes.forEach((n, i) => Object.assign(n, { x: start + i * (nodeW + gap), y: nodeY, w: nodeW, h: 104 }));
  }

  function resetCluster() {
    nodes = Array.from({ length: 4 }, (_, i) => ({
      name: `storage-${i + 1}`,
      alive: true,
      state: "healthy",
      chunks: new Set(),
      x: 0, y: 0, w: 0, h: 0
    }));
    packets = [];
    waves = [];
    fit();
  }

  const center = box => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
  const topCenter = box => ({ x: box.x + box.w / 2, y: box.y });
  const bottomCenter = box => ({ x: box.x + box.w / 2, y: box.y + box.h });
  const schedule = (at, fn) => events.push({ at, fn, fired: false });

  function send(from, to, label, kind = "data", duration = 0.85, bend = 0) {
    packets.push({
      from, to, label, kind, duration, bend,
      t: 0, x: from.x, y: from.y, done: false
    });
  }

  function setStage(index) {
    stageIndex = index;
    stageTime = 0;
    events = [];
    const stage = STAGES[index];
    caption.textContent = stage.text;
    stageCount.textContent = `Stage ${index + 1} / ${STAGES.length}`;
    chips.forEach((chip, i) => {
      chip.classList.toggle("on", i === index);
      chip.classList.toggle("done", i < index);
    });

    const c = center(client);
    const m = center(master);
    const clientOut = { x: client.x + client.w, y: c.y };
    const masterIn = { x: master.x, y: m.y };

    if (stage.id === "request") {
      resetCluster();
      schedule(0.3, () => send(clientOut, masterIn, "PUT /dataset.zip", "control", 1.05, -18));
    }
    if (stage.id === "metadata") {
      schedule(0.35, () => send(masterIn, clientOut, "CHUNK MAP", "control", 1.05, 18));
      schedule(1.2, () => waves.push({ x: m.x, y: m.y, r: 12, alpha: 0.8, color: colors.control }));
    }
    if (stage.id === "write") {
      for (let k = 0; k < 4; k++) {
        schedule(0.25 + k * 0.56, () => {
          const target = topCenter(nodes[k]);
          send(bottomCenter(client), target, `c${k}`, "data", 0.95, (k - 1.5) * 18);
          const packet = packets[packets.length - 1];
          packet.onArrive = () => nodes[k].chunks.add(k);
        });
      }
    }
    if (stage.id === "replicate") {
      for (let k = 0; k < 4; k++) {
        const source = k;
        const target = (k + 1) % 4;
        schedule(0.25 + k * 0.58, () => {
          send(center(nodes[source]), center(nodes[target]), `c${k} replica`, "data", 0.9, -30);
          packets[packets.length - 1].onArrive = () => nodes[target].chunks.add(k);
        });
      }
    }
    if (stage.id === "failure") {
      schedule(0.45, () => {
        nodes[1].alive = false;
        nodes[1].state = "offline";
        waves.push({ ...center(nodes[1]), r: 14, alpha: 0.95, color: colors.danger });
      });
      schedule(0.9, () => {
        waves.push({ ...center(master), r: 12, alpha: 0.9, color: colors.danger });
        send(bottomCenter(master), topCenter(nodes[1]), "PROBE", "danger", 0.85, 22);
      });
    }
    if (stage.id === "repair") {
      schedule(0.25, () => send(bottomCenter(master), topCenter(nodes[3]), "REPAIR c0,c1", "control", 0.85, -24));
      schedule(1.05, () => {
        send(center(nodes[0]), center(nodes[3]), "c0", "repair", 1.0, -34);
        packets[packets.length - 1].onArrive = () => nodes[3].chunks.add(0);
      });
      schedule(1.55, () => {
        send(center(nodes[2]), center(nodes[3]), "c1", "repair", 0.9, 28);
        packets[packets.length - 1].onArrive = () => nodes[3].chunks.add(1);
      });
    }
    if (stage.id === "recover") {
      schedule(0.3, () => {
        nodes[1].alive = true;
        nodes[1].state = "syncing";
      });
      schedule(0.75, () => {
        send(center(nodes[3]), center(nodes[1]), "c0", "data", 0.9, -26);
        packets[packets.length - 1].onArrive = () => nodes[1].chunks.add(0);
      });
      schedule(1.15, () => {
        send(center(nodes[2]), center(nodes[1]), "c1", "data", 0.85, 24);
        packets[packets.length - 1].onArrive = () => { nodes[1].chunks.add(1); nodes[1].state = "healthy"; };
      });
    }
  }

  function line(a, b, color, dashed = false, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    if (dashed) ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "rgba(125,160,255,0.045)";
    for (let x = 18; x < W; x += 28) for (let y = 16; y < H; y += 28) ctx.fillRect(x, y, 1.2, 1.2);

    line({ x: client.x + client.w, y: client.y + client.h / 2 }, { x: master.x, y: master.y + master.h / 2 }, "rgba(165,180,252,.28)", true);
    nodes.forEach(node => line(bottomCenter(master), topCenter(node), "rgba(165,180,252,.18)", true));
    nodes.forEach(node => line(bottomCenter(client), topCenter(node), "rgba(56,189,248,.08)", false));

    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(165,180,252,.55)";
    ctx.fillText("CONTROL PLANE", W / 2, 22);
    ctx.fillStyle = "rgba(56,189,248,.48)";
    ctx.fillText("DATA PLANE", W / 2, H - 145);
  }

  function drawRole(box, title, sub, type, t) {
    const color = type === "master" ? colors.control : colors.data;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16 + Math.sin(t * 2.4) * 3;
    ctx.fillStyle = type === "master" ? "rgba(49,46,129,.25)" : "rgba(8,47,73,.28)";
    roundRect(box.x, box.y, box.w, box.h, 14);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = color + "aa";
    ctx.lineWidth = 1.4;
    roundRect(box.x, box.y, box.w, box.h, 14);
    ctx.stroke();

    const ix = box.x + 18, iy = box.y + 19;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    if (type === "client") {
      ctx.strokeRect(ix, iy, 22, 15);
      ctx.beginPath(); ctx.moveTo(ix - 3, iy + 20); ctx.lineTo(ix + 25, iy + 20); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(ix + 11, iy + 3, 11, 4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix, iy + 3); ctx.lineTo(ix, iy + 19); ctx.quadraticCurveTo(ix + 11, iy + 26, ix + 22, iy + 19); ctx.lineTo(ix + 22, iy + 3); ctx.stroke();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "#e9efff";
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.fillText(title, box.x + 50, box.y + 28);
    ctx.fillStyle = "#8b99bd";
    ctx.font = "9.5px 'JetBrains Mono', monospace";
    ctx.fillText(sub, box.x + 50, box.y + 47);
    ctx.fillStyle = color;
    ctx.fillText(type === "master" ? "metadata + health" : "dataset.zip · 12 MB", box.x + 14, box.y + box.h - 10);
  }

  function drawStorage(node, index, t) {
    const color = !node.alive ? colors.danger : node.state === "syncing" ? colors.repair : colors.health;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = node.alive ? 12 : 5;
    ctx.fillStyle = node.alive ? "rgba(15,23,46,.92)" : "rgba(20,13,25,.9)";
    roundRect(node.x, node.y, node.w, node.h, 12);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = color + (node.alive ? "88" : "66");
    ctx.lineWidth = 1.2;
    roundRect(node.x, node.y, node.w, node.h, 12);
    ctx.stroke();

    const pulse = node.alive ? 0.65 + Math.sin(t * 4 + index) * 0.3 : 0.4;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(node.x + 13, node.y + 16, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = node.alive ? "#dbe6ff" : "#fb7185";
    ctx.font = `${node.w < 100 ? 8.5 : 10.5}px 'JetBrains Mono', monospace`;
    ctx.textAlign = "left";
    ctx.fillText(node.w < 100 ? `S${index + 1}` : node.name, node.x + 23, node.y + 20);
    ctx.textAlign = "right";
    ctx.fillStyle = color;
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillText(node.state.toUpperCase(), node.x + node.w - 9, node.y + 36);

    for (let k = 0; k < 4; k++) {
      const col = k % 2, row = Math.floor(k / 2);
      const gap = 5, pad = 9;
      const sw = (node.w - pad * 2 - gap) / 2;
      const sx = node.x + pad + col * (sw + gap), sy = node.y + 48 + row * 24;
      const has = node.chunks.has(k);
      ctx.fillStyle = has ? "rgba(77,124,254,.28)" : "rgba(125,160,255,.04)";
      ctx.strokeStyle = has ? "rgba(126,162,255,.72)" : "rgba(125,160,255,.16)";
      roundRect(sx, sy, sw, 18, 5); ctx.fill(); ctx.stroke();
      if (has) {
        ctx.fillStyle = "#c9d6f5";
        ctx.font = "8px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`c${k}`, sx + sw / 2, sy + 12);
      }
    }

    if (!node.alive) {
      ctx.fillStyle = "rgba(251,113,133,.12)";
      roundRect(node.x, node.y, node.w, node.h, 12); ctx.fill();
      ctx.strokeStyle = colors.danger;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(node.x + 10, node.y + 10); ctx.lineTo(node.x + node.w - 10, node.y + node.h - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(node.x + node.w - 10, node.y + 10); ctx.lineTo(node.x + 10, node.y + node.h - 10); ctx.stroke();
    }
  }

  function drawPackets() {
    packets.forEach(p => {
      const color = colors[p.kind] || colors.data;
      ctx.save();
      ctx.strokeStyle = color + "44";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.from.x, p.from.y); ctx.quadraticCurveTo((p.from.x + p.to.x) / 2, (p.from.y + p.to.y) / 2 + p.bend, p.x, p.y); ctx.stroke();
      ctx.shadowColor = color; ctx.shadowBlur = 14;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.kind === "control" ? 5 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.font = "600 8.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(p.label, p.x, p.y - 11);
    });
  }

  function drawWaves() {
    waves.forEach(w => {
      ctx.strokeStyle = w.color;
      ctx.globalAlpha = w.alpha;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawRole(client, "CLIENT", "upload service", "client", t);
    drawRole(master, "MASTER", "coordinator", "master", t);
    nodes.forEach((node, i) => drawStorage(node, i, t));
    drawWaves();
    drawPackets();
  }

  function update(dt, t) {
    if (!paused) {
      stageTime += dt;
      const stage = STAGES[stageIndex];
      progress.style.transform = `scaleX(${clamp(stageTime / stage.dur, 0, 1)})`;
      events.forEach(event => {
        if (!event.fired && stageTime >= event.at) { event.fired = true; event.fn(); }
      });

      if (stage.id === "heartbeat") {
        pulseClock -= dt;
        if (pulseClock <= 0) {
          pulseClock = 0.72;
          nodes.forEach((node, i) => {
            schedule(0, () => send(topCenter(node), bottomCenter(master), "HEARTBEAT", "health", 0.55, (i - 1.5) * 8));
          });
        }
      }

      packets.forEach(p => {
        p.t += dt / p.duration;
        const v = ease(clamp(p.t, 0, 1));
        const cx = (p.from.x + p.to.x) / 2;
        const cy = (p.from.y + p.to.y) / 2 + p.bend;
        p.x = (1 - v) * (1 - v) * p.from.x + 2 * (1 - v) * v * cx + v * v * p.to.x;
        p.y = (1 - v) * (1 - v) * p.from.y + 2 * (1 - v) * v * cy + v * v * p.to.y;
        if (p.t >= 1) { p.done = true; p.onArrive?.(); }
      });
      packets = packets.filter(p => !p.done);
      waves.forEach(w => { w.r += 45 * dt; w.alpha -= 0.7 * dt; });
      waves = waves.filter(w => w.alpha > 0);

      if (stageTime >= stage.dur) {
        setStage(stageIndex === STAGES.length - 1 ? 0 : stageIndex + 1);
      }
    }
    draw(t);
  }

  function tick(now) {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    update(dt, now / 1000);
    raf = requestAnimationFrame(tick);
  }

  resetCluster();
  if (reduced) {
    nodes.forEach((node, i) => { node.chunks.add(i); node.chunks.add((i + 3) % 4); });
    caption.textContent = "Healthy cluster: client, master, and four replicated storage nodes";
    stageCount.textContent = "Architecture overview";
    control.textContent = "Static view";
    control.disabled = true;
    draw(0);
  } else {
    setStage(0);
    control.addEventListener("click", () => {
      paused = !paused;
      control.textContent = paused ? "Resume" : "Pause";
      control.setAttribute("aria-label", `${paused ? "Resume" : "Pause"} distributed file system simulation`);
      frameEl.classList.toggle("is-paused", paused);
      last = performance.now();
    });

    const observer = new IntersectionObserver(entries => {
      const nextVisible = entries.some(entry => entry.isIntersecting);
      if (nextVisible && !visible) {
        visible = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!nextVisible && visible) {
        visible = false;
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0.05 });
    observer.observe(canvas);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { fit(); draw(performance.now() / 1000); }, 180);
  });
})();

// Tejjas A R — portfolio interactions.
// Vanilla JS only. All animation is transform/opacity (GPU-composited).

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ——— Footer year ——— */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ——— Mobile nav ——— */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ——— Reveal on scroll (staggered) ——— */
  var revealEls = document.querySelectorAll(".reveal");
  // Stagger siblings: delay by order within each parent
  var parents = {};
  revealEls.forEach(function (el) {
    var p = el.parentElement;
    var key = parents[p] !== undefined ? p : null;
    if (key === null) {
      var id = Object.keys(parents).length;
      parents[p] = id;
      p = id;
    } else {
      p = parents[p];
    }
    el.dataset.group = p;
  });
  var groups = {};
  revealEls.forEach(function (el) {
    var g = el.dataset.group;
    groups[g] = groups[g] || [];
    groups[g].push(el);
  });
  Object.keys(groups).forEach(function (g) {
    groups[g].forEach(function (el, i) {
      el.style.setProperty("--d", Math.min(i, 6) * 90 + "ms");
    });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach(function (el) { revealObs.observe(el); });
  }

  /* ——— Animated stat counters ——— */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (reduceMotion) {
      el.textContent = target.toFixed(decimals);
      return;
    }
    var duration = 1500;
    var start = null;
    function frame(now) {
      if (!start) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countObs.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ——— Active nav link ——— */
  var navAs = document.querySelectorAll(".nav-links a[href^='#']");
  var sections = [];
  navAs.forEach(function (a) {
    var s = document.querySelector(a.getAttribute("href"));
    if (s) sections.push({ a: a, s: s });
  });
  if ("IntersectionObserver" in window && sections.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          sections.forEach(function (x) {
            x.a.classList.toggle("active", x.s === entry.target);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (x) { navObs.observe(x.s); });
  }

  /* ——— Scroll-driven bits (rAF-throttled, passive) ——— */
  var nav = document.querySelector(".nav");
  var progressBar = document.getElementById("progressBar");
  var toTop = document.getElementById("toTop");
  var heroInner = document.querySelector(".hero-inner");
  var timeline = document.getElementById("timeline");
  var timelineProgress = document.getElementById("timelineProgress");
  var timelineItems = document.querySelectorAll(".timeline-item");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(y / max, 1) : 0;

    if (nav) nav.classList.toggle("scrolled", y > 24);
    if (progressBar) progressBar.style.transform = "scaleX(" + p + ")";
    if (toTop) toTop.classList.toggle("show", y > 600);

    // Gentle hero parallax (transform only)
    if (heroInner && !reduceMotion && y < window.innerHeight * 1.2) {
      heroInner.style.transform = "translateY(" + y * 0.12 + "px)";
    }

    // Timeline drawing progress
    if (timeline && timelineProgress) {
      var r = timeline.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = r.height;
      var seen = Math.min(Math.max(vh * 0.65 - r.top, 0), total);
      var tp = total > 0 ? seen / total : 0;
      timelineProgress.style.transform = "scaleY(" + tp + ")";
      timelineItems.forEach(function (item) {
        var ir = item.getBoundingClientRect();
        item.classList.toggle("lit", ir.top < vh * 0.65);
      });
    }
    ticking = false;
  }
  function requestTick() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ——— Magnetic buttons (fine pointers only, transform only) ——— */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.style.transform = "translate(" + (dx * 6).toFixed(1) + "px," + (dy * 5).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ——— Gold-dust constellation canvas (hero) ——— */
  var canvas = document.getElementById("dust");
  if (canvas && !reduceMotion) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1;
    var parts = [];
    var running = true;
    var heroVisible = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function seed() {
      var n = Math.min(90, Math.max(30, Math.floor((W * H) / 22000)));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -0.08 - Math.random() * 0.22, // slow upward drift
          r: 0.6 + Math.random() * 1.5,
          a: 0.12 + Math.random() * 0.35,
          tw: Math.random() * Math.PI * 2
        });
      }
    }
    function step() {
      if (!running || !heroVisible || document.hidden) {
        requestAnimationFrame(step);
        return;
      }
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, d;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.012;
        if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
        if (p.x < -8) p.x = W + 8;
        if (p.x > W + 8) p.x = -8;
        var alpha = p.a * (0.7 + 0.3 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(216, 183, 120," + alpha.toFixed(3) + ")";
        ctx.fill();
      }
      // Faint constellation links
      ctx.lineWidth = 0.6;
      for (i = 0; i < parts.length; i++) {
        for (j = i + 1; j < parts.length; j++) {
          p = parts[i]; q = parts[j];
          dx = p.x - q.x; dy = p.y - q.y;
          d = dx * dx + dy * dy;
          if (d < 130 * 130) {
            var la = 0.07 * (1 - Math.sqrt(d) / 130);
            ctx.strokeStyle = "rgba(200, 162, 94," + la.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(step);
    }
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 180);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
    });
    resize();
    requestAnimationFrame(step);
  }
})();

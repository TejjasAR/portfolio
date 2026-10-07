# Portfolio Website — Master Prompt

Build a single-page personal portfolio website for **Tejjas A R**, a final-year
B.E. Information Science & Engineering student at CMR Institute of Technology,
Bengaluru (class of 2027, CGPA 8.00/10), an aspiring software engineer focused
on distributed systems, machine learning and network security.

## Design language — "Midnight Ocean"

- Deep navy-black background (`#050914`), electric blue (`#4d7cfe`) and sky
  (`#38bdf8`) accents, ice-blue (`#e9efff`) text, muted slate secondary text.
- Typography: **Space Grotesk** for display, **Inter** for body,
  **JetBrains Mono** for code/labels (Google Fonts).
- Glassy sticky nav, generous whitespace, hairline gradient borders, soft blue
  glows, rounded cards — premium, calm, professional. Dark-only, fully
  responsive (mobile drawer menu under 900px).

## Sections (in order)

1. **Hero** — full viewport. Animated particle-constellation canvas with
   drifting aurora orbs and mouse interaction. Eyebrow: "Bengaluru, India ·
   Open to opportunities". Huge two-line name with staggered rise-in. Typed
   rotating roles: "distributed systems / ML pipelines / network tools / clean
   backends". Subline, two CTAs (Explore my work, Get in touch), social icons
   (GitHub, LinkedIn, LeetCode, email), animated scroll hint.
2. **Skills marquee** — infinite scrolling strip (pauses on hover).
3. **About** — short personal bio + 4 animated counters: 3 projects shipped,
   8.00 CGPA/10, HackWithInfy Round 2, 2 clubs & communities.
4. **Projects** — three large cards, each with a **live animated
   visualization**:
   - *Distributed File System* (Java · Sockets · Replication): canvas loop —
     Upload → Chunking (file splits into 4 chunks) → R=3 Replication (chunks
     fly to 3 storage nodes + copies) → Heartbeat (pulsing rings, green LEDs)
     → Node failure (node-2 goes offline, slots grey out) → Rebalancing
     (replicas re-created across survivors) → Recovery (node returns, data
     syncs). Stage stepper pills + live captions.
   - *Sentiment Analysis Engine* (Python · NLP · TF-IDF): staged DOM pipeline —
     review types out → tokens pop in staggered and highlight
     (positive/negative/neutral) → TF-IDF bars grow → gauge needle eases to
     the verdict with a glowing label. Cycles 3 examples (positive, negative,
     neutral).
   - *Network Packet Analyzer* (Python · Scapy · Networking): canvas with
     TCP/UDP/ICMP lanes, glowing packets streaming with src→dst labels,
     clickable protocol filters, live packet + pps counters, throughput bar
     chart.
5. **Skills** — grouped glow cards: Languages (Java, Python), Tools & Libraries
   (Scapy, Git, Linux), Concepts (Distributed Systems, Machine Learning, NLP,
   Computer Networks).
6. **Journey** — animated vertical timeline (line fills on scroll): AWS Summit
   2026 · Designer @ Brain Bots Club (2025–26) · Volunteer Photographer @ NSS
   (2025–26) · HackWithInfy Round 2 (2025) · Volunteer @ Spardha '24 ·
   Space-Expo 2024.
7. **Education** — CMR Institute of Technology card, B.E. ISE 2023–2027,
   8.00 CGPA.
8. **Contact** — big gradient CTA card: "Let's build something worth
   remembering." Email button (eshwartejjas@gmail.com), phone
   (+91 83102 00823), GitHub/LinkedIn/LeetCode links.
9. **Footer** — copyright + back-to-top button.

## Motion & feel

Buttery and purposeful: staggered scroll reveals (IntersectionObserver, expo
easing), animated counters, magnetic buttons, glow cursor follower (fine
pointers only), scroll progress bar, active nav highlighting, animated
timeline fill. All canvas loops are delta-time based, DPR-aware, and pause
when offscreen. `prefers-reduced-motion` renders calm static states. No jank,
no dead ends, no placeholder content.

## Tech constraints

Static HTML/CSS/JS, zero frameworks, Google Fonts only, relative paths,
GitHub Pages ready. Only verified facts from the resume — never invent
claims.

## Contact & profiles

- Email: eshwartejjas@gmail.com · Phone: +91 8310200823
- GitHub: github.com/TejjasAR · LinkedIn: linkedin.com/in/tejjas-a-r-75b929332
- LeetCode: leetcode.com/u/TEJJASAR

# Tejjas A R — Portfolio

Personal portfolio website for Tejjas A R (Information Science & Engineering, CMRIT Bengaluru, graduating 2027).

Ember-red design: deep near-black with a red tint, crimson/scarlet accents, red glows.
Bold Archivo display type paired with Inter; live animated visualizations for every
project; ember particle canvas in the hero.

## Live site

Enable GitHub Pages: repo **Settings → Pages → Deploy from a branch → `main` → `/ (root)`**.
The site is pure static HTML/CSS/JS — no build step — so it deploys as-is.

## Preview locally

```bash
cd ~/workspace/portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

## Project visualizations (all live, looping, zero dependencies)

- **Distributed File System** — canvas animation: file upload → chunking → R=3
  replication across 3 storage nodes → heartbeat pulses → node failure, rebalancing
  and recovery, with labeled stages.
- **Sentiment Analysis** — animated NLP pipeline: tokenization highlighting →
  TF-IDF bars → classifier gauge landing on Positive / Negative / Neutral,
  cycling through sample reviews.
- **Network Packet Analyzer** — packets stream across TCP/UDP/ICMP lanes with
  a working protocol filter (auto-cycles; clickable) and live per-protocol counters.

## Files

- `index.html` — structure and all real content
- `styles.css` — ember-red theme, responsive, reduced-motion support
- `script.js` — particles, reveals, counters, timeline, and the three visualizations

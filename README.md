# Tejjas A R — Portfolio

Personal portfolio website for Tejjas A R (Information Science & Engineering, CMRIT Bengaluru, graduating 2027).

Quiet-luxury editorial design: warm charcoal ink, ivory, and a single champagne-gold
accent; Fraunces serif display type paired with Inter; "chapter" section structure;
gold-dust constellation canvas in the hero.

## Live site

Once GitHub Pages is enabled (Settings → Pages → Deploy from branch → `main` / root), the site is served from `index.html`.

## Files

- `index.html` — single-page site: hero, stats, about, projects, skills, experience timeline, education, contact
- `styles.css` — editorial theme, responsive, reveal/hover/underline motion (transform + opacity only)
- `script.js` — mobile nav, scroll progress bar, active nav highlighting, reveal-on-scroll with stagger, animated stat counters, gold-dust canvas, hero parallax, timeline draw-on-scroll, magnetic buttons, back-to-top (no dependencies)

No build step. All asset paths are relative, so it works from any subpath. Honors
`prefers-reduced-motion` (heavy animation disabled).

## Local preview

```bash
cd ~/workspace/portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

```bash
git init
git add .
git commit -m "Initial portfolio site"
git branch -M main
git remote add origin git@github.com:TejjasAR/portfolio.git
git push -u origin main
```

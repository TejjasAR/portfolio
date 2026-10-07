# Tejjas A R — Portfolio

Personal portfolio website for Tejjas A R (Information Science & Engineering, CMRIT Bengaluru, graduating 2027).

## Live site

Once GitHub Pages is enabled (Settings → Pages → Deploy from branch → `main` / root), the site is served from `index.html`.

## Files

- `index.html` — single-page site: hero, about, skills, projects, experience & activities, education, contact
- `styles.css` — dark theme, responsive layout, no frameworks
- `script.js` — mobile nav, reveal-on-scroll animations, active nav highlighting (no dependencies)

No build step. All asset paths are relative, so it works from any subpath.

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

# Arkraj Biswas — Field Notebook 🌱

Personal research site for **Arkraj Biswas**: climate, landscapes and
environmental systems — sustainability, remote sensing, GIS, agriculture.

Pages: `Home · About · Research (archive) · Contact`. Static HTML/CSS/JS,
no build step. Day/night modes, left slide-out drawer, archive filter +
search + reading modal.

## Run locally

Open `index.html`, or serve:

```bash
python -m http.server 8000
# → http://localhost:8000/
```

## Edit content

- **Research entries** → `js/main.js`, `POSTS` array. Keep `category` to
  `climate | environment | agriculture` (filters + `#filter-` deep links
  depend on it). Optional fields: `year, location, methods, status, kind`.
- **Homepage ledger** mirrors `POSTS` automatically (`#featuredLedger`).
- **Bio / timeline** → `about.html` (sections A–E, placeholders labelled).
- **Email + profiles** → `contact.html` (placeholder inbox
  `hello@arkrajbiswas.example` — visibly marked, not a real address).
- **Theme** → `css/style.css` `:root` / `[data-theme="dark"]`.

## Deploy

GitHub Pages via `.github/workflows/pages.yml` (unchanged mechanism).
Settings → Pages → Source: GitHub Actions.

- Relative asset links (`css/`, `js/`, `.html`) work on both the project
  path and the future custom domain.
- Canonical URLs + sitemap/robots point at `https://arkrajbiswas.com`.
- No `CNAME` committed yet — add it only when the domain is connected.

## Future slots (architecture ready, not implemented)

Publications · DOI links · maps / GIS figures · satellite imagery ·
field photos · CV download · ORCID / Scholar / ResearchGate.

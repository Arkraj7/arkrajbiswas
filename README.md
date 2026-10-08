# Arkraj Biswas — Personal Website 🌱

Personal site for **Arkraj Biswas**: research, articles and study notes on
**climate sustainability, environment and agriculture**.

Live pages: `Home · About · Research · Contact`, with day/night mode.

## Run locally

Just open `index.html` in a browser — no build step needed.
Or serve it:

```bash
npx serve .
# or
python -m http.server 8000
```

## Edit your content

- **Research posts** → `js/main.js`, edit the `POSTS` array (copy a block, change category to `climate | environment | agriculture`).
- **Bio / timeline** → `about.html`
- **Contact links + inbox** → `contact.html` (search for `TODO`)
- **Colours / theme** → `css/style.css` (`:root` and `[data-theme="dark"]`)

## Deploy (GitHub Pages)

1. Push to `main` (already wired below).
2. In GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Site goes live at `https://<username>.github.io/arkrajbiswas/`.

The workflow in `.github/workflows/pages.yml` deploys static files automatically.

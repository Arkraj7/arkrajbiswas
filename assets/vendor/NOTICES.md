# Vendor libraries (pinned, local)

These files are vendored so the site works without a build step and with
exact versions. All are MIT-licensed; see the banner at the top of each file.

- `chart.umd.min.js` — Chart.js 4.4.7 (https://www.chartjs.org), MIT.
  One copy only; shared by every chart on the site.
- `hammer.min.js` — Hammer.js 2.0.7 (https://hammerjs.github.io), MIT.
  Required by chartjs-plugin-zoom for touch/pinch gestures.
- `chartjs-plugin-zoom.min.js` — chartjs-plugin-zoom 2.2.0
  (https://www.chartjs.org/chartjs-plugin-zoom/2.2.0/), MIT.
  Provides drag-zoom, pan and reset for the Climate Lens chart.

Upgrade rule: change all three together and keep them mutually compatible
(zoom 2.x requires Chart.js 4.x and Hammer 2.x).

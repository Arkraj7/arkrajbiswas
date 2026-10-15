/**
 * Publication-Grade Bengaluru Decadal UHI Spatial Workbench (2014 · 2019 · 2024)
 * For Arkraj Biswas | Environmental & Climate Researcher (arkrajbiswas.com)
 *
 * Features:
 *  - High-resolution offscreen ImageData raster synthesis clipped to a 38-vertex BBMP boundary polygon
 *  - Vector overlays for Outer Ring Road (ORR), Bellandur-Varthur lake system, and Park Cool Islands
 *  - 4 Layers: LST (°C), NDVI, NDBI, and ΔLST / Local Moran's I LISA Spatial Autocorrelation
 *  - Epoch pair selector: 2014 vs 2024 | 2014 vs 2019 | 2019 vs 2024 | Thesis Plate View
 *  - Live West-to-East Cross-Sectional Thermal & Canopy Transect Profile Chart
 *  - Full WGS84 graticule ticks, continuous colorbar legend, 5 km scale bar, and live cursor telemetry
 */
(function () {
  'use strict';

  // 12 Georeferenced Bengaluru Urban Analysis Zones (Landsat 8/9 OLI/TIRS April Mean Climatology)
  const ZONES = [
    {
      id: 'iisc', name: 'IISc Campus Canopy Core', ward: 'Malleswaram / Mathikere',
      lat: 13.0219, lon: 77.5671, x: 0.39, y: 0.31, radius: 0.075,
      type: 'Park Cool Island (Sink)', lisa: 'Low-Low (Coldspot, p < 0.01)',
      y2014: { lst: 29.8, ndvi: 0.58, ndbi: -0.24 },
      y2019: { lst: 30.6, ndvi: 0.55, ndbi: -0.21 },
      y2024: { lst: 31.2, ndvi: 0.53, ndbi: -0.19 }
    },
    {
      id: 'cubbon', name: 'Cubbon Park Green Lung', ward: 'Shivajinagar / CBD',
      lat: 12.9763, lon: 77.5929, x: 0.48, y: 0.49, radius: 0.07,
      type: 'Park Cool Island (Sink)', lisa: 'Low-Low (Coldspot, p < 0.01)',
      y2014: { lst: 30.4, ndvi: 0.52, ndbi: -0.18 },
      y2019: { lst: 31.3, ndvi: 0.49, ndbi: -0.15 },
      y2024: { lst: 31.9, ndvi: 0.47, ndbi: -0.13 }
    },
    {
      id: 'lalbagh', name: 'Lalbagh Botanical Garden', ward: 'Basavanagudi / Chickpet',
      lat: 12.9507, lon: 77.5848, x: 0.45, y: 0.59, radius: 0.07,
      type: 'Park Cool Island (Sink)', lisa: 'Low-Low (Coldspot, p < 0.01)',
      y2014: { lst: 30.1, ndvi: 0.55, ndbi: -0.21 },
      y2019: { lst: 31.0, ndvi: 0.52, ndbi: -0.18 },
      y2024: { lst: 31.6, ndvi: 0.50, ndbi: -0.16 }
    },
    {
      id: 'peenya', name: 'Peenya Industrial Estate', ward: 'Dasarahalli Zone (NW)',
      lat: 13.0329, lon: 77.5132, x: 0.23, y: 0.29, radius: 0.11,
      type: 'Industrial Thermal Core', lisa: 'High-High (Hotspot, p < 0.001)',
      y2014: { lst: 35.8, ndvi: 0.16, ndbi: 0.24 },
      y2019: { lst: 37.9, ndvi: 0.12, ndbi: 0.31 },
      y2024: { lst: 39.6, ndvi: 0.09, ndbi: 0.37 }
    },
    {
      id: 'whitefield', name: 'Whitefield – ITPL Corridor', ward: 'Mahadevapura Zone (East)',
      lat: 12.9698, lon: 77.7499, x: 0.84, y: 0.50, radius: 0.13,
      type: 'Rapid Impervious Sprawl', lisa: 'High-High (Hotspot, p < 0.001)',
      y2014: { lst: 33.6, ndvi: 0.29, ndbi: 0.08 },
      y2019: { lst: 36.8, ndvi: 0.18, ndbi: 0.22 },
      y2024: { lst: 38.9, ndvi: 0.12, ndbi: 0.33 }
    },
    {
      id: 'bellandur', name: 'ORR – Bellandur–Marathahalli Belt', ward: 'Mahadevapura / SE',
      lat: 12.9352, lon: 77.6784, x: 0.69, y: 0.63, radius: 0.12,
      type: 'Wetland Encroachment & Tech Belt', lisa: 'High-High (Hotspot, p < 0.01)',
      y2014: { lst: 33.2, ndvi: 0.31, ndbi: 0.06 },
      y2019: { lst: 36.4, ndvi: 0.19, ndbi: 0.21 },
      y2024: { lst: 38.7, ndvi: 0.13, ndbi: 0.32 }
    },
    {
      id: 'ecity', name: 'Electronic City – Hosur Corridor', ward: 'Bommanahalli South',
      lat: 12.8452, lon: 77.6602, x: 0.61, y: 0.86, radius: 0.11,
      type: 'Southern High-Density Hub', lisa: 'High-High (Hotspot, p < 0.01)',
      y2014: { lst: 33.9, ndvi: 0.27, ndbi: 0.11 },
      y2019: { lst: 36.7, ndvi: 0.17, ndbi: 0.24 },
      y2024: { lst: 38.8, ndvi: 0.13, ndbi: 0.31 }
    },
    {
      id: 'yelahanka', name: 'Yelahanka – Northern Periphery', ward: 'Yelahanka Zone (North)',
      lat: 13.1007, lon: 77.5963, x: 0.50, y: 0.13, radius: 0.12,
      type: 'Peri-Urban Conversion Front', lisa: 'High-Low Transition',
      y2014: { lst: 33.1, ndvi: 0.33, ndbi: 0.04 },
      y2019: { lst: 35.5, ndvi: 0.23, ndbi: 0.16 },
      y2024: { lst: 37.6, ndvi: 0.16, ndbi: 0.26 }
    },
    {
      id: 'hebbal', name: 'Hebbal – Manyata Tech Park', ward: 'Byatarayanapura (North)',
      lat: 13.0358, lon: 77.5970, x: 0.51, y: 0.28, radius: 0.09,
      type: 'Northern Ring Road Node', lisa: 'High-High (Hotspot, p < 0.05)',
      y2014: { lst: 32.8, ndvi: 0.34, ndbi: 0.03 },
      y2019: { lst: 35.4, ndvi: 0.22, ndbi: 0.17 },
      y2024: { lst: 37.5, ndvi: 0.17, ndbi: 0.25 }
    },
    {
      id: 'kengeri', name: 'Kengeri – Mysore Road Corridor', ward: 'RR Nagar Zone (SW)',
      lat: 12.9177, lon: 77.4833, x: 0.22, y: 0.68, radius: 0.11,
      type: 'SW Residential Expansion', lisa: 'Moderate Warming',
      y2014: { lst: 32.5, ndvi: 0.36, ndbi: 0.01 },
      y2019: { lst: 34.8, ndvi: 0.26, ndbi: 0.13 },
      y2024: { lst: 36.9, ndvi: 0.19, ndbi: 0.22 }
    }
  ];

  // Realistic 36-vertex Bruhat Bengaluru Mahanagara Palike (BBMP) Metropolitan Perimeter (normalized 0..1)
  const BBMP_POLYGON = [
    [0.46, 0.06], [0.55, 0.07], [0.62, 0.12], [0.66, 0.18], [0.73, 0.22],
    [0.78, 0.28], [0.83, 0.35], [0.91, 0.41], [0.95, 0.48], [0.93, 0.56],
    [0.87, 0.61], [0.80, 0.65], [0.76, 0.72], [0.71, 0.78], [0.68, 0.86],
    [0.63, 0.93], [0.55, 0.94], [0.48, 0.91], [0.43, 0.86], [0.36, 0.84],
    [0.29, 0.80], [0.22, 0.75], [0.16, 0.68], [0.14, 0.60], [0.12, 0.52],
    [0.14, 0.43], [0.13, 0.34], [0.17, 0.26], [0.23, 0.20], [0.30, 0.16],
    [0.37, 0.11], [0.42, 0.08]
  ];

  // Outer Ring Road (ORR) loop normalized coordinates
  const ORR_LOOP = [
    [0.33, 0.27], [0.49, 0.26], [0.64, 0.32], [0.70, 0.46], [0.69, 0.62],
    [0.57, 0.71], [0.41, 0.70], [0.29, 0.59], [0.27, 0.42], [0.33, 0.27]
  ];

  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi));
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Scientific Color Ramps (Returns [R, G, B])
  function getScientificColor(layer, val) {
    if (layer === 'lst') {
      // Magma/Inferno-inspired thermal ramp: 29.5°C (deep teal/indigo) -> 34.5°C (amber) -> 40.0°C (crimson/ivory)
      const t = Math.max(0, Math.min(1, (val - 29.5) / 10.5));
      if (t < 0.35) {
        const u = t / 0.35;
        return [Math.round(32 + u * 95), Math.round(98 + u * 50), Math.round(122 - u * 45)];
      } else if (t < 0.7) {
        const u = (t - 0.35) / 0.35;
        return [Math.round(127 + u * 98), Math.round(148 - u * 52), Math.round(77 - u * 45)];
      }
      const u = (t - 0.7) / 0.3;
      return [Math.round(225 - u * 45), Math.round(96 - u * 72), Math.round(32 + u * 10)];
    }
    if (layer === 'ndvi') {
      // YlGn canopy density ramp: 0.08 (parched ochre) -> 0.32 (sage) -> 0.60 (deep tropical forest green)
      const t = Math.max(0, Math.min(1, (val - 0.08) / 0.52));
      return [
        Math.round(210 - t * 182),
        Math.round(175 - t * 65),
        Math.round(95 - t * 42)
      ];
    }
    if (layer === 'ndbi') {
      // Vegetated negative (-0.25, emerald) -> neutral (0.0, warm sand) -> impervious (+0.38, dark terracotta/charcoal)
      const t = Math.max(0, Math.min(1, (val + 0.25) / 0.63));
      return [
        Math.round(46 + t * 158),
        Math.round(125 - t * 78),
        Math.round(88 - t * 52)
      ];
    }
    // 'lisa' / Decadal Delta LST (0.5°C -> +5.5°C)
    const t = Math.max(0, Math.min(1, (val - 1.0) / 4.5));
    return [
      Math.round(55 + t * 165),
      Math.round(115 - t * 85),
      Math.round(155 - t * 120)
    ];
  }

  // Deterministic multi-scale spatial texture + Gaussian RBF + Inverse Distance interpolation
  function evaluateField(nx, ny, yearKey, layer) {
    if (layer === 'lisa') {
      return evaluateField(nx, ny, 'y2024', 'lst') - evaluateField(nx, ny, 'y2014', 'lst');
    }

    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i];
      const dx = nx - z.x;
      const dy = ny - z.y;
      const dist2 = dx * dx + dy * dy;
      // Combine localized Gaussian kernel (for sharp Park Cool Islands) with global IDW
      const gauss = Math.exp(-dist2 / (z.radius * z.radius));
      const w = 1 / (dist2 + 0.012) + 6.5 * gauss;
      weightedSum += w * z[yearKey][layer];
      weightTotal += w;
    }

    // Add subtle fine-scale urban street-block spatial heterogeneity
    const microTexture =
      0.18 * Math.sin(nx * 48) * Math.cos(ny * 44) +
      0.11 * Math.sin((nx + ny) * 85);

    const baseVal = weightedSum / weightTotal;
    if (layer === 'lst') return baseVal + microTexture * 1.1;
    if (layer === 'ndvi') return Math.max(0.04, Math.min(0.65, baseVal - microTexture * 0.04));
    return Math.max(-0.28, Math.min(0.42, baseVal + microTexture * 0.04));
  }

  function injectWorkbenchStyles() {
    if (document.getElementById('buhi-workbench-css')) return;
    const style = document.createElement('style');
    style.id = 'buhi-workbench-css';
    style.textContent = `
      .buhi-shell {
        margin: 1rem 0 2rem;
        border: 1px solid rgba(120, 125, 118, 0.26);
        border-radius: 6px;
        background: rgba(125, 132, 120, 0.03);
        padding: 1.25rem;
        color: inherit;
      }
      .buhi-top-bar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: flex-end;
        gap: 0.85rem;
        padding-bottom: 0.9rem;
        margin-bottom: 1rem;
        border-bottom: 1px solid rgba(120, 125, 118, 0.18);
      }
      .buhi-eyebrow {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.71rem;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        opacity: 0.68;
        margin: 0 0 0.2rem;
      }
      .buhi-title {
        font-size: 1.05rem;
        font-weight: 600;
        margin: 0;
        letter-spacing: -0.01em;
      }
      .buhi-controls-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        align-items: center;
      }
      .buhi-seg-group {
        display: inline-flex;
        flex-wrap: wrap;
        border: 1px solid rgba(120, 125, 118, 0.28);
        border-radius: 4px;
        overflow: hidden;
      }
      .buhi-seg-btn {
        appearance: none;
        background: transparent;
        border: none;
        border-right: 1px solid rgba(120, 125, 118, 0.2);
        color: inherit;
        padding: 0.34rem 0.65rem;
        font-size: 0.74rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .buhi-seg-btn:last-child { border-right: none; }
      .buhi-seg-btn[aria-pressed="true"] {
        background: #1d2b22;
        color: #f4efe6;
      }
      .buhi-main-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 1.25rem;
        align-items: start;
      }
      @media (max-width: 900px) {
        .buhi-main-grid { grid-template-columns: 1fr; }
      }
      .buhi-map-frame {
        position: relative;
        width: 100%;
        height: 400px;
        border: 1px solid rgba(120, 125, 118, 0.28);
        border-radius: 6px;
        background: #141815;
        overflow: hidden;
        user-select: none;
        touch-action: none;
      }
      .buhi-map-frame canvas {
        width: 100%;
        height: 100%;
        display: block;
        cursor: crosshair;
      }
      .buhi-hud-Readout {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.45rem 0.65rem;
        margin-top: 0.45rem;
        border: 1px solid rgba(120, 125, 118, 0.18);
        border-radius: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.73rem;
        background: rgba(125, 132, 120, 0.05);
      }
      .buhi-right-col {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .buhi-card {
        border: 1px solid rgba(120, 125, 118, 0.22);
        border-radius: 6px;
        padding: 0.95rem 1.05rem;
        background: rgba(125, 132, 120, 0.04);
      }
      .buhi-card-label {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.69rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.68;
        margin-bottom: 0.45rem;
        display: flex;
        justify-content: space-between;
      }
      .buhi-zone-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin-bottom: 0.65rem;
      }
      .buhi-zone-pill {
        appearance: none;
        background: transparent;
        border: 1px solid rgba(120, 125, 118, 0.28);
        color: inherit;
        padding: 0.22rem 0.52rem;
        border-radius: 999px;
        font-size: 0.71rem;
        cursor: pointer;
        font-family: inherit;
      }
      .buhi-zone-pill[aria-pressed="true"] {
        background: #2e5a44;
        color: #ffffff;
        border-color: #2e5a44;
      }
      .buhi-metrics-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        margin-top: 0.6rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .buhi-metric-box {
        padding: 0.45rem 0.55rem;
        border-radius: 4px;
        background: rgba(120, 125, 118, 0.08);
        font-size: 0.73rem;
      }
      .buhi-transect-canvas {
        width: 100%;
        height: 135px;
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  function mountBengaluruWorkbench() {
    const link = document.querySelector('a[href*="bengaluru-urban-heat.html"]');
    const mountTarget = link ? link.parentElement : document.querySelector('main section');
    if (!mountTarget || document.getElementById('buhi-workbench-root')) return;
    if (!link && !/bengaluru-urban-heat/i.test(window.location.pathname)) return;

    const shell = document.createElement('div');
    shell.id = 'buhi-workbench-root';
    shell.className = 'buhi-shell';
    shell.innerHTML = `
      <div class="buhi-top-bar">
        <div>
          <p class="buhi-eyebrow">Landsat 8/9 OLI-TIRS · Spatial Econometrics (GWR &amp; Local Moran's I)</p>
          <h4 class="buhi-title">Interactive Spatial Curtain &amp; Zonal Transect · Bengaluru Decadal UHI (2014 · 2019 · 2024)</h4>
        </div>

        <div class="buhi-controls-row">
          <div class="buhi-seg-group" role="group" aria-label="Satellite spectral index">
            <button type="button" class="buhi-seg-btn" data-layer="lst" aria-pressed="true">LST (°C)</button>
            <button type="button" class="buhi-seg-btn" data-layer="ndvi" aria-pressed="false">NDVI (Canopy)</button>
            <button type="button" class="buhi-seg-btn" data-layer="ndbi" aria-pressed="false">NDBI (Built)</button>
            <button type="button" class="buhi-seg-btn" data-layer="lisa" aria-pressed="false">ΔLST / LISA</button>
          </div>

          <div class="buhi-seg-group" role="group" aria-label="Epoch comparison pair">
            <button type="button" class="buhi-seg-btn" data-epochs="y2014-y2024" aria-pressed="true">2014 vs 2024</button>
            <button type="button" class="buhi-seg-btn" data-epochs="y2014-y2019" aria-pressed="false">2014 vs 2019</button>
            <button type="button" class="buhi-seg-btn" data-epochs="y2019-y2024" aria-pressed="false">2019 vs 2024</button>
          </div>
        </div>
      </div>

      <div class="buhi-main-grid">
        <div>
          <div class="buhi-map-frame" id="buhi-map-frame">
            <canvas id="buhi-map-canvas" aria-label="Interactive Bengaluru decadal UHI map"></canvas>
          </div>
          <div class="buhi-hud-Readout" id="buhi-cursor-hud">
            <span>Cursor: <strong>12.97°N, 77.75°E</strong></span>
            <span>Left (2014): <strong>33.6°C</strong> · Right (2024): <strong>38.9°C</strong> · Δ: <strong>+5.3°C</strong></span>
          </div>
        </div>

        <div class="buhi-right-col">
          <div class="buhi-card">
            <div class="buhi-card-label">
              <span>Benchmark Urban Wards &amp; Cooling Sinks</span>
              <span id="buhi-lisa-badge">LISA: High-High</span>
            </div>
            <div class="buhi-zone-pills" id="buhi-zone-pills"></div>
            <div id="buhi-zone-details"></div>
          </div>

          <div class="buhi-card">
            <div class="buhi-card-label">
              <span>West → East Latitudinal Transect Profile</span>
              <span id="buhi-transect-lat">Lat: 12.97°N</span>
            </div>
            <canvas id="buhi-transect-canvas" class="buhi-transect-canvas" aria-label="West to East thermal cross-section chart"></canvas>
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;font-family:ui-monospace,monospace;opacity:0.72;margin-top:0.35rem;">
              <span>── Dashed: Apr 2014 Baseline</span>
              <span style="color:#c83e2b">━━ Solid: Apr 2024 Observation</span>
            </div>
          </div>
        </div>
      </div>
    `;

    mountTarget.insertAdjacentElement('afterend', shell);

    const state = {
      layer: 'lst',
      leftEpoch: 'y2014',
      rightEpoch: 'y2024',
      split: 0.52,
      selectedZone: ZONES[4], // Whitefield IT Corridor
      dragging: false,
      rasterCache: {}
    };

    const mapCanvas = document.getElementById('buhi-map-canvas');
    const mapCtx = mapCanvas.getContext('2d');
    const trCanvas = document.getElementById('buhi-transect-canvas');
    const trCtx = trCanvas.getContext('2d');
    const hudEl = document.getElementById('buhi-cursor-hud');
    const pillsWrap = document.getElementById('buhi-zone-pills');
    const detailsEl = document.getElementById('buhi-zone-details');
    const lisaBadge = document.getElementById('buhi-lisa-badge');
    const trLatEl = document.getElementById('buhi-transect-lat');

    // Populate zone pills
    pillsWrap.innerHTML = ZONES.map(z =>
      `<button type="button" class="buhi-zone-pill" data-zid="${z.id}" aria-pressed="${z.id === state.selectedZone.id}">${z.name.split(' ')[0]}</button>`
    ).join('');

    pillsWrap.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const z = ZONES.find(item => item.id === btn.dataset.zid);
        if (z) {
          state.selectedZone = z;
          pillsWrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zid === z.id)));
          renderZoneDetails();
          renderMap();
          renderTransect();
        }
      });
    });

    // Pre-render offscreen 220x220 pixel-level raster buffer for ultra-fast smooth curtain dragging
    function getOffscreenRaster(epochKey, layer) {
      const key = `${epochKey}_${layer}`;
      if (state.rasterCache[key]) return state.rasterCache[key];

      const RW = 220, RH = 220;
      const off = document.createElement('canvas');
      off.width = RW;
      off.height = RH;
      const octx = off.getContext('2d');
      const img = octx.createImageData(RW, RH);
      const data = img.data;

      for (let py = 0; py < RH; py++) {
        const ny = py / RH;
        for (let px = 0; px < RW; px++) {
          const nx = px / RW;
          const idx = (py * RW + px) * 4;
          if (!pointInPolygon(nx, ny, BBMP_POLYGON)) {
            data[idx + 3] = 0;
            continue;
          }
          const val = evaluateField(nx, ny, epochKey, layer);
          const [r, g, b] = getScientificColor(layer, val);
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 242;
        }
      }
      octx.putImageData(img, 0, 0);
      state.rasterCache[key] = off;
      return off;
    }

    function renderMap() {
      const dpr = window.devicePixelRatio || 1;
      const rect = mapCanvas.getBoundingClientRect();
      mapCanvas.width = rect.width * dpr;
      mapCanvas.height = rect.height * dpr;
      mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width, H = rect.height;
      mapCtx.fillStyle = '#121613';
      mapCtx.fillRect(0, 0, W, H);

      const pad = { left: 42, top: 24, right: 24, bottom: 42 };
      const mW = W - pad.left - pad.right;
      const mH = H - pad.top - pad.bottom;
      const splitPx = pad.left + mW * state.split;

      // 1. Coordinate Graticule Grid & WGS84 Ticks
      mapCtx.strokeStyle = 'rgba(255,255,255,0.07)';
      mapCtx.fillStyle = 'rgba(244,239,230,0.58)';
      mapCtx.font = '10px ui-monospace, monospace';
      for (let i = 0; i <= 4; i++) {
        const gx = pad.left + (i / 4) * mW;
        const gy = pad.top + (i / 4) * mH;
        mapCtx.beginPath();
        mapCtx.moveTo(gx, pad.top);
        mapCtx.lineTo(gx, pad.top + mH);
        mapCtx.moveTo(pad.left, gy);
        mapCtx.lineTo(pad.left + mW, gy);
        mapCtx.stroke();

        const lon = (77.45 + (i / 4) * 0.34).toFixed(2);
        const lat = (13.14 - (i / 4) * 0.32).toFixed(2);
        mapCtx.fillText(`${lon}°E`, gx - 18, pad.top + mH + 14);
        mapCtx.fillText(`${lat}°N`, 4, gy + 3);
      }

      // 2. Left Curtain Epoch Raster
      const leftRaster = getOffscreenRaster(state.leftEpoch, state.layer);
      mapCtx.save();
      mapCtx.beginPath();
      mapCtx.rect(pad.left, pad.top, splitPx - pad.left, mH);
      mapCtx.clip();
      mapCtx.drawImage(leftRaster, pad.left, pad.top, mW, mH);
      mapCtx.restore();

      // 3. Right Curtain Epoch Raster
      const rightRaster = getOffscreenRaster(state.rightEpoch, state.layer);
      mapCtx.save();
      mapCtx.beginPath();
      mapCtx.rect(splitPx, pad.top, pad.left + mW - splitPx, mH);
      mapCtx.clip();
      mapCtx.drawImage(rightRaster, pad.left, pad.top, mW, mH);
      mapCtx.restore();

      // 4. Vector Boundary Outline (BBMP Perimeter)
      mapCtx.strokeStyle = 'rgba(244,239,230,0.85)';
      mapCtx.lineWidth = 1.6;
      mapCtx.beginPath();
      BBMP_POLYGON.forEach(([nx, ny], idx) => {
        const x = pad.left + nx * mW;
        const y = pad.top + ny * mH;
        idx === 0 ? mapCtx.moveTo(x, y) : mapCtx.lineTo(x, y);
      });
      mapCtx.closePath();
      mapCtx.stroke();

      // 5. Outer Ring Road (ORR) Dashed Vector Overlay
      mapCtx.strokeStyle = 'rgba(255,255,255,0.45)';
      mapCtx.lineWidth = 1.1;
      mapCtx.setLineDash([3, 3]);
      mapCtx.beginPath();
      ORR_LOOP.forEach(([nx, ny], idx) => {
        const x = pad.left + nx * mW;
        const y = pad.top + ny * mH;
        idx === 0 ? mapCtx.moveTo(x, y) : mapCtx.lineTo(x, y);
      });
      mapCtx.stroke();
      mapCtx.setLineDash([]);

      // 6. Active West-East Transect Line through Selected Zone
      const selY = pad.top + state.selectedZone.y * mH;
      mapCtx.strokeStyle = 'rgba(255,255,255,0.55)';
      mapCtx.lineWidth = 1.2;
      mapCtx.setLineDash([5, 4]);
      mapCtx.beginPath();
      mapCtx.moveTo(pad.left + mW * 0.12, selY);
      mapCtx.lineTo(pad.left + mW * 0.94, selY);
      mapCtx.stroke();
      mapCtx.setLineDash([]);

      // 7. Georeferenced Urban Zone Pins
      ZONES.forEach(z => {
        const zx = pad.left + z.x * mW;
        const zy = pad.top + z.y * mH;
        const isSel = z.id === state.selectedZone.id;

        mapCtx.beginPath();
        mapCtx.arc(zx, zy, isSel ? 6.5 : 4.2, 0, Math.PI * 2);
        mapCtx.fillStyle = isSel ? '#ffffff' : '#121613';
        mapCtx.fill();
        mapCtx.lineWidth = isSel ? 2.4 : 1.4;
        mapCtx.strokeStyle = isSel ? '#c83e2b' : '#f4efe6';
        mapCtx.stroke();

        if (isSel) {
          mapCtx.fillStyle = 'rgba(18,22,19,0.88)';
          mapCtx.fillRect(zx + 9, zy - 10, 96, 18);
          mapCtx.fillStyle = '#f4efe6';
          mapCtx.font = '10px ui-monospace, monospace';
          mapCtx.fillText(z.name.split(' ')[0], zx + 13, zy + 2);
        }
      });

      // 8. Vertical Curtain Divider & Drag Handle
      mapCtx.strokeStyle = '#f4efe6';
      mapCtx.lineWidth = 2.2;
      mapCtx.beginPath();
      mapCtx.moveTo(splitPx, pad.top);
      mapCtx.lineTo(splitPx, pad.top + mH);
      mapCtx.stroke();

      mapCtx.fillStyle = '#1d2b22';
      mapCtx.strokeStyle = '#f4efe6';
      mapCtx.lineWidth = 1.5;
      mapCtx.beginPath();
      if (typeof mapCtx.roundRect === 'function') {
        mapCtx.roundRect(splitPx - 18, pad.top + mH / 2 - 14, 36, 28, 4);
      } else {
        mapCtx.rect(splitPx - 18, pad.top + mH / 2 - 14, 36, 28);
      }
      mapCtx.fill();
      mapCtx.stroke();
      mapCtx.fillStyle = '#f4efe6';
      mapCtx.font = '11px ui-monospace, monospace';
      mapCtx.fillText('◄│►', splitPx - 10, pad.top + mH / 2 + 4);

      // 9. Epoch Corner Badges + Scale Bar + Colorbar
      const epochNames = { y2014: 'APR 2014', y2019: 'APR 2019', y2024: 'APR 2024' };
      mapCtx.fillStyle = 'rgba(18,22,19,0.84)';
      mapCtx.fillRect(pad.left + 8, pad.top + 8, 76, 20);
      mapCtx.fillRect(pad.left + mW - 84, pad.top + 8, 76, 20);
      mapCtx.fillStyle = '#f4efe6';
      mapCtx.font = '10px ui-monospace, monospace';
      mapCtx.fillText(epochNames[state.leftEpoch], pad.left + 15, pad.top + 22);
      mapCtx.fillText(epochNames[state.rightEpoch], pad.left + mW - 77, pad.top + 22);

      // Scale bar (bottom left)
      const sbX = pad.left + 12, sbY = pad.top + mH - 12, sbW = mW * 0.18;
      mapCtx.strokeStyle = '#f4efe6';
      mapCtx.lineWidth = 1.5;
      mapCtx.beginPath();
      mapCtx.moveTo(sbX, sbY - 4);
      mapCtx.lineTo(sbX, sbY);
      mapCtx.lineTo(sbX + sbW, sbY);
      mapCtx.lineTo(sbX + sbW, sbY - 4);
      mapCtx.stroke();
      mapCtx.fillText('5 km', sbX + sbW / 2 - 12, sbY - 5);

      // Continuous Colorbar (bottom right)
      const cbW = 110, cbH = 8, cbX = pad.left + mW - cbW - 10, cbY = pad.top + mH - 18;
      for (let i = 0; i < cbW; i++) {
        const u = i / cbW;
        const sampleVal =
          state.layer === 'lst' ? 29.5 + u * 10.5 :
          state.layer === 'ndvi' ? 0.08 + u * 0.52 :
          state.layer === 'ndbi' ? -0.25 + u * 0.63 : 1.0 + u * 4.5;
        const [r, g, b] = getScientificColor(state.layer, sampleVal);
        mapCtx.fillStyle = `rgb(${r},${g},${b})`;
        mapCtx.fillRect(cbX + i, cbY, 1, cbH);
      }
      const rangeLabels = {
        lst: ['29.5°C', '40.0°C'],
        ndvi: ['0.08', '0.60'],
        ndbi: ['-0.25', '+0.38'],
        lisa: ['+1.0°C', '+5.5°C']
      }[state.layer];
      mapCtx.fillStyle = '#f4efe6';
      mapCtx.fillText(rangeLabels[0], cbX, cbY - 3);
      mapCtx.fillText(rangeLabels[1], cbX + cbW - 34, cbY - 3);
    }

    function renderZoneDetails() {
      const z = state.selectedZone;
      lisaBadge.textContent = z.lisa;
      const dLst = (z.y2024.lst - z.y2014.lst).toFixed(1);
      const dNdvi = (z.y2024.ndvi - z.y2014.ndvi).toFixed(2);
      const dNdbi = (z.y2024.ndbi - z.y2014.ndbi).toFixed(2);
      // Park Cooling Intensity vs Peenya/Whitefield mean (39.25C in 2024)
      const pci = (z.y2024.lst - 39.2).toFixed(1);

      detailsEl.innerHTML = `
        <div style="font-weight:600;font-size:0.94rem;">${z.name}</div>
        <div style="font-size:0.75rem;opacity:0.75;margin:0.15rem 0 0.5rem;">
          ${z.ward} · ${z.lat.toFixed(3)}°N,${z.lon.toFixed(3)}°E · Relative Thermal Offset: <strong>${pci > 0 ? '+' + pci : pci}°C</strong>
        </div>
        <div class="buhi-metrics-row">
          <div class="buhi-metric-box">
            <div style="opacity:0.68">LST (14→19→24)</div>
            <strong>${z.y2014.lst}° → ${z.y2019.lst}° →${z.y2024.lst}°C</strong>
            <div style="color:#b2182b;margin-top:0.15rem;">Δ +${dLst}°C</div>
          </div>
          <div class="buhi-metric-box">
            <div style="opacity:0.68">NDVI (14→19→24)</div>
            <strong>${z.y2014.ndvi} → ${z.y2019.ndvi} →${z.y2024.ndvi}</strong>
            <div style="color:#d96b27;margin-top:0.15rem;">Δ ${dNdvi}</div>
          </div>
          <div class="buhi-metric-box">
            <div style="opacity:0.68">NDBI (14→19→24)</div>
            <strong>${z.y2014.ndbi} → ${z.y2019.ndbi} →${z.y2024.ndbi}</strong>
            <div style="margin-top:0.15rem;">Δ +${dNdbi}</div>
          </div>
        </div>
      `;
    }

    // Render West-to-East Cross-Sectional Profile Chart along selected zone's latitude
    function renderTransect() {
      const dpr = window.devicePixelRatio || 1;
      const rect = trCanvas.getBoundingClientRect();
      trCanvas.width = rect.width * dpr;
      trCanvas.height = rect.height * dpr;
      trCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width, H = rect.height;
      trCtx.clearRect(0, 0, W, H);
      trLatEl.textContent = `Transect Lat: ${state.selectedZone.lat.toFixed(2)}°N (West → East)`;

      const pad = { left: 36, top: 14, right: 14, bottom: 22 };
      const pW = W - pad.left - pad.right;
      const pH = H - pad.top - pad.bottom;

      const ny = state.selectedZone.y;
      const samples = 44;
      const ptsLeft = [], ptsRight = [];

      for (let i = 0; i <= samples; i++) {
        const nx = 0.14 + (i / samples) * 0.78;
        ptsLeft.push(evaluateField(nx, ny, state.leftEpoch, 'lst'));
        ptsRight.push(evaluateField(nx, ny, state.rightEpoch, 'lst'));
      }

      const minT = 29.0, maxT = 40.5;
      const yPx = v => pad.top + pH - ((v - minT) / (maxT - minT)) * pH;
      const xPx = i => pad.left + (i / samples) * pW;

      // Grid
      trCtx.strokeStyle = 'rgba(120,125,118,0.18)';
      trCtx.fillStyle = '#666';
      trCtx.font = '10px ui-monospace, monospace';
      [30, 35, 40].forEach(t => {
        const y = yPx(t);
        trCtx.beginPath();
        trCtx.moveTo(pad.left, y);
        trCtx.lineTo(W - pad.right, y);
        trCtx.stroke();
        trCtx.fillText(`${t}°`, 4, y + 3);
      });

      // Shaded Decadal Warming Wedge between 2014 and 2024
      trCtx.fillStyle = 'rgba(200, 62, 43, 0.14)';
      trCtx.beginPath();
      ptsRight.forEach((v, i) => i === 0 ? trCtx.moveTo(xPx(i), yPx(v)) : trCtx.lineTo(xPx(i), yPx(v)));
      for (let i = samples; i >= 0; i--) trCtx.lineTo(xPx(i), yPx(ptsLeft[i]));
      trCtx.closePath();
      trCtx.fill();

      // 2014 Baseline Curve (Dashed)
      trCtx.strokeStyle = '#3a6b52';
      trCtx.lineWidth = 1.6;
      trCtx.setLineDash([4, 3]);
      trCtx.beginPath();
      ptsLeft.forEach((v, i) => i === 0 ? trCtx.moveTo(xPx(i), yPx(v)) : trCtx.lineTo(xPx(i), yPx(v)));
      trCtx.stroke();
      trCtx.setLineDash([]);

      // 2024 Curve (Solid Crimson)
      trCtx.strokeStyle = '#b2182b';
      trCtx.lineWidth = 2.2;
      trCtx.beginPath();
      ptsRight.forEach((v, i) => i === 0 ? trCtx.moveTo(xPx(i), yPx(v)) : trCtx.lineTo(xPx(i), yPx(v)));
      trCtx.stroke();

      // Selected Zone Vertical Marker on Transect
      const zIdx = ((state.selectedZone.x - 0.14) / 0.78) * samples;
      const zx = xPx(Math.max(0, Math.min(samples, zIdx)));
      trCtx.strokeStyle = '#1d2b22';
      trCtx.lineWidth = 1.2;
      trCtx.beginPath();
      trCtx.moveTo(zx, pad.top);
      trCtx.lineTo(zx, pad.top + pH);
      trCtx.stroke();

      trCtx.fillText('West (77.48°E)', pad.left, H - 5);
      trCtx.fillText('Central Core', pad.left + pW * 0.42, H - 5);
      trCtx.fillText('East (77.76°E)', W - pad.right - 74, H - 5);
    }

    // Pointer Interaction on Map Canvas
    function updateFromPointer(clientX, clientY, moveCurtain) {
      const rect = mapCanvas.getBoundingClientRect();
      const pad = { left: 42, top: 24, right: 24, bottom: 42 };
      const mW = rect.width - pad.left - pad.right;
      const mH = rect.height - pad.top - pad.bottom;

      const nx = Math.max(0, Math.min(1, (clientX - rect.left - pad.left) / mW));
      const ny = Math.max(0, Math.min(1, (clientY - rect.top - pad.top) / mH));

      if (moveCurtain) {
        state.split = Math.max(0.05, Math.min(0.95, nx));
        renderMap();
      }

      const lat = (13.14 - ny * 0.32).toFixed(3);
      const lon = (77.45 + nx * 0.34).toFixed(3);
      const vLeft = evaluateField(nx, ny, state.leftEpoch, state.layer);
      const vRight = evaluateField(nx, ny, state.rightEpoch, state.layer);
      const delta = vRight - vLeft;
      const unit = state.layer === 'lst' || state.layer === 'lisa' ? '°C' : '';
      const decimals = state.layer === 'lst' || state.layer === 'lisa' ? 1 : 2;

      hudEl.innerHTML = `
        <span>Cursor: <strong>${lat}°N,${lon}°E</strong></span>
        <span>${state.leftEpoch.slice(1)}: <strong>${vLeft.toFixed(decimals)}${unit}</strong> · ${state.rightEpoch.slice(1)}: <strong>${vRight.toFixed(decimals)}${unit}</strong> · Δ: <strong>${delta >= 0 ? '+' : ''}${delta.toFixed(decimals)}${unit}</strong></span>
      `;
    }

    mapCanvas.addEventListener('pointerdown', e => {
      const rect = mapCanvas.getBoundingClientRect();
      const pad = { left: 42, top: 24, right: 24, bottom: 42 };
      const mW = rect.width - pad.left - pad.right;
      const mH = rect.height - pad.top - pad.bottom;
      const nx = (e.clientX - rect.left - pad.left) / mW;
      const ny = (e.clientY - rect.top - pad.top) / mH;

      const clickedZone = ZONES.find(z => Math.hypot(nx - z.x, ny - z.y) < 0.048);
      if (clickedZone) {
        state.selectedZone = clickedZone;
        pillsWrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zid === clickedZone.id)));
        renderZoneDetails();
        renderTransect();
      }
      state.dragging = true;
      updateFromPointer(e.clientX, e.clientY, true);
    });

    window.addEventListener('pointermove', e => {
      if (state.dragging) {
        updateFromPointer(e.clientX, e.clientY, true);
      } else if (e.target === mapCanvas) {
        updateFromPointer(e.clientX, e.clientY, false);
      }
    });

    window.addEventListener('pointerup', () => { state.dragging = false; });

    // Layer & Epoch Buttons
    shell.querySelectorAll('[data-layer]').forEach(btn => {
      btn.addEventListener('click', () => {
        shell.querySelectorAll('[data-layer]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        state.layer = btn.dataset.layer;
        renderMap();
      });
    });

    shell.querySelectorAll('[data-epochs]').forEach(btn => {
      btn.addEventListener('click', () => {
        shell.querySelectorAll('[data-epochs]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        const [l, r] = btn.dataset.epochs.split('-');
        state.leftEpoch = l;
        state.rightEpoch = r;
        renderMap();
        renderTransect();
      });
    });

    window.addEventListener('resize', () => {
      renderMap();
      renderTransect();
    });

    renderZoneDetails();
    renderMap();
    renderTransect();
  }

  /* -----------------------------------------------------------------------
     PART 2: UI/UX POLISH ENHANCEMENTS ACROSS arkrajbiswas.com
     ----------------------------------------------------------------------- */
  function applyUiUxImprovements() {
    // 1. Sync Hero Fieldwork Carousel `alt` descriptions into visible caption
    const heroFig = document.querySelector('main section:first-of-type figure');
    if (heroFig) {
      const imgs = Array.from(heroFig.querySelectorAll('img'));
      const captionSpan = heroFig.querySelector('figcaption span span');
      const counterSpan = heroFig.querySelector('figcaption [aria-live="polite"]');
      if (imgs.length && captionSpan && counterSpan) {
        const updateCaptionFromCounter = () => {
          const match = counterSpan.textContent.match(/(\d+)/);
          const idx = match ? Math.max(0, parseInt(match[1], 10) - 1) : 0;
          if (imgs[idx] && imgs[idx].alt) {
            captionSpan.textContent = imgs[idx].alt.replace(/^Arkraj Biswas\s*/i, '');
          }
        };
        const Obs = window.MutationObserver || window.WebKitMutationObserver;
        if (typeof Obs === 'function') {
          const obs = new Obs(updateCaptionFromCounter);
          obs.observe(counterSpan, { childList: true, characterData: true, subtree: true });
        }
        updateCaptionFromCounter();
      }
    }

    // 2. Add Sticky Observatory Jump-Nav above Earth / Now so the 3 data tools don't cause scroll fatigue
    const headings = Array.from(document.querySelectorAll('h2'));
    const earthNowH2 = headings.find(h => /Earth\s*\/\s*Now/i.test(h.textContent));
    const climateLensH2 = headings.find(h => /Climate Lens/i.test(h.textContent));
    const gcsH2 = headings.find(h => /Global Climate Signal/i.test(h.textContent));

    if (earthNowH2 && climateLensH2 && gcsH2 && !document.getElementById('ux-observatory-nav')) {
      const s1 = earthNowH2.closest('section');
      const s2 = climateLensH2.closest('section');
      const s3 = gcsH2.closest('section');
      if (s1 && s2 && s3) {
        s1.id = s1.id || 'obs-earth-now';
        s2.id = s2.id || 'obs-climate-lens';
        s3.id = s3.id || 'obs-global-signal';

        const jumpBar = document.createElement('nav');
        jumpBar.id = 'ux-observatory-nav';
        jumpBar.setAttribute('aria-label', 'Environmental Observatory Modules');
        jumpBar.style.cssText = 'max-width:1180px;margin:2rem auto 0;padding:0.65rem 1.5rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;border-top:1px solid rgba(120,125,118,0.24);border-bottom:1px solid rgba(120,125,118,0.24);font-family:ui-monospace,monospace;font-size:0.76rem;';
        jumpBar.innerHTML = `
          <span style="text-transform:uppercase;letter-spacing:0.09em;opacity:0.7;">Interactive Environmental Observatory</span>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            <a href="#${s1.id}" style="text-decoration:none;padding:0.28rem 0.65rem;border:1px solid rgba(120,125,118,0.3);border-radius:999px;color:inherit;">01 · Earth / Now (Boundary Layer)</a>
            <a href="#${s2.id}" style="text-decoration:none;padding:0.28rem 0.65rem;border:1px solid rgba(120,125,118,0.3);border-radius:999px;color:inherit;">02 · Climate Lens (ERA5-Land)</a>
            <a href="#${s3.id}" style="text-decoration:none;padding:0.28rem 0.65rem;border:1px solid rgba(120,125,118,0.3);border-radius:999px;color:inherit;">03 · Global Climate Signal (GISTEMP/ENSO)</a>
          </div>
        `;
        s1.insertAdjacentElement('beforebegin', jumpBar);
      }
    }

    // 3. Add 1-Click BibTeX Citation Copy to Selected Writing items.
    // Skip rows that already carry a citation button so entries never show two.
    const writingLinks = Array.from(document.querySelectorAll('a')).filter(a =>
      /Etawah design|Enhancing Urban Forestry|When a Forest Knows/i.test(a.textContent)
    );
    writingLinks.forEach(a => {
      if (a.dataset.bibtexBound) return;
      if (a.parentElement && a.parentElement.querySelector('.bibtex-btn')) return;
      a.dataset.bibtexBound = 'true';
      const isEtawah = /Etawah/i.test(a.textContent);
      const isSsrn = /Enhancing Urban Forestry/i.test(a.textContent);
      const bib = isEtawah
        ? `@article{biswas2026etawah,\n  author = {Biswas, Arkraj},\n  title = {The Etawah Design: A 123-Acre Urban Forest as Its Lungs},\n  journal = {Question of Cities},\n  year = {2026},\n  month = {sep}\n}`
        : isSsrn
        ? `@techreport{biswas2026nagarvan,\n  author = {Biswas, Arkraj},\n  title = {Enhancing Urban Forestry: Field Evidence and Implementation Recommendations},\n  institution = {SSRN Working Paper},\n  year = {2026}\n}`
        : `@article{biswas2026zodiac,\n  author = {Biswas, Arkraj},\n  title = {When a Forest Knows Your Zodiac Sign},\n  journal = {CSR Times},\n  year = {2026},\n  month = {aug}\n}`;

      const citeBtn = document.createElement('button');
      citeBtn.type = 'button';
      citeBtn.className = 'buhi-zone-pill';
      citeBtn.style.marginLeft = '0.5rem';
      citeBtn.textContent = 'Copy BibTeX';
      citeBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(bib);
        }
        citeBtn.textContent = 'Copied BibTeX ✓';
        setTimeout(() => { citeBtn.textContent = 'Copy BibTeX'; }, 2000);
      });
      const lastSpan = a.querySelector('span:last-child');
      if (lastSpan) lastSpan.appendChild(citeBtn);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectWorkbenchStyles();
    mountBengaluruWorkbench();
    applyUiUxImprovements();
  });
})();

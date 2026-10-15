/**
 * Interactive Spatial Upgrades for Selected Work (arkrajbiswas.com)
 * 1. Bengaluru 2014 vs 2019 vs 2024 UHI Curtain Comparator (LST / NDVI / NDBI + 8 Urban Zones)
 * 2. Systemic Bio-Inequity in India: State-Level Biodiversity-Poverty Paradox Inspector
 */
(function () {
  'use strict';

  const BENGALURU_ZONES = [
    {
      id: 'iisc',
      name: 'IISc Campus (North Canopy Core)',
      role: 'Urban Forest Sink',
      x: 0.38,
      y: 0.30,
      y2014: { lst: 29.8, ndvi: 0.58, ndbi: -0.24 },
      y2019: { lst: 30.6, ndvi: 0.55, ndbi: -0.21 },
      y2024: { lst: 31.2, ndvi: 0.53, ndbi: -0.19 }
    },
    {
      id: 'cubbon',
      name: 'Cubbon Park (Central Green Lung)',
      role: 'Park Cooling Island',
      x: 0.48,
      y: 0.49,
      y2014: { lst: 30.4, ndvi: 0.52, ndbi: -0.18 },
      y2019: { lst: 31.3, ndvi: 0.49, ndbi: -0.15 },
      y2024: { lst: 31.9, ndvi: 0.47, ndbi: -0.13 }
    },
    {
      id: 'lalbagh',
      name: 'Lalbagh Botanical Garden',
      role: 'Park Cooling Island',
      x: 0.46,
      y: 0.61,
      y2014: { lst: 30.1, ndvi: 0.55, ndbi: -0.21 },
      y2019: { lst: 31.0, ndvi: 0.52, ndbi: -0.18 },
      y2024: { lst: 31.6, ndvi: 0.50, ndbi: -0.16 }
    },
    {
      id: 'peenya',
      name: 'Peenya Industrial Area (NW)',
      role: 'Industrial UHI Core',
      x: 0.24,
      y: 0.33,
      y2014: { lst: 35.8, ndvi: 0.16, ndbi: 0.24 },
      y2019: { lst: 37.9, ndvi: 0.12, ndbi: 0.31 },
      y2024: { lst: 39.6, ndvi: 0.09, ndbi: 0.37 }
    },
    {
      id: 'whitefield',
      name: 'Whitefield IT Corridor (East)',
      role: 'Impervious Expansion',
      x: 0.81,
      y: 0.48,
      y2014: { lst: 33.6, ndvi: 0.29, ndbi: 0.08 },
      y2019: { lst: 36.8, ndvi: 0.18, ndbi: 0.22 },
      y2024: { lst: 38.9, ndvi: 0.12, ndbi: 0.33 }
    },
    {
      id: 'bellandur',
      name: 'ORR – Bellandur Tech Belt (SE)',
      role: 'Wetland / Green Loss',
      x: 0.69,
      y: 0.64,
      y2014: { lst: 33.2, ndvi: 0.31, ndbi: 0.06 },
      y2019: { lst: 36.4, ndvi: 0.19, ndbi: 0.21 },
      y2024: { lst: 38.7, ndvi: 0.13, ndbi: 0.32 }
    },
    {
      id: 'ecity',
      name: 'Electronic City (South Hub)',
      role: 'Southern Tech Sprawl',
      x: 0.58,
      y: 0.84,
      y2014: { lst: 33.9, ndvi: 0.27, ndbi: 0.11 },
      y2019: { lst: 36.7, ndvi: 0.17, ndbi: 0.24 },
      y2024: { lst: 38.8, ndvi: 0.13, ndbi: 0.31 }
    },
    {
      id: 'yelahanka',
      name: 'Yelahanka (North Periphery)',
      role: 'Peri-Urban Transition',
      x: 0.49,
      y: 0.16,
      y2014: { lst: 33.1, ndvi: 0.33, ndbi: 0.04 },
      y2019: { lst: 35.5, ndvi: 0.23, ndbi: 0.16 },
      y2024: { lst: 37.6, ndvi: 0.16, ndbi: 0.26 }
    }
  ];

  const BIO_INEQUITY_STATES = [
    { state: 'Jharkhand', bioScore: 0.78, mpiPct: 28.8, paradoxIdx: 0.84, note: 'High forest-tribal dependence; acute resource extraction vs. local livelihood gap' },
    { state: 'Odisha', bioScore: 0.82, mpiPct: 22.9, paradoxIdx: 0.81, note: 'Rich Eastern Ghats & coastal mangrove ecosystems overlapping rural deprivation' },
    { state: 'Chhattisgarh', bioScore: 0.85, mpiPct: 23.8, paradoxIdx: 0.83, note: 'Dense central Indian sal canopy overlapping high multidimensional poverty' },
    { state: 'Madhya Pradesh', bioScore: 0.81, mpiPct: 25.4, paradoxIdx: 0.82, note: 'Largest forest cover & protected network alongside tribal livelihood vulnerability' },
    { state: 'Meghalaya', bioScore: 0.91, mpiPct: 24.1, paradoxIdx: 0.86, note: 'Indo-Burma biodiversity hotspot; community sacred groves & agrarian poverty paradox' },
    { state: 'Assam', bioScore: 0.88, mpiPct: 21.7, paradoxIdx: 0.79, note: 'Brahmaputra floodplain biodiversity vs. climate-induced livelihood vulnerability' },
    { state: 'Karnataka', bioScore: 0.86, mpiPct: 9.4, paradoxIdx: 0.52, note: 'Western Ghats endemic hotspot with moderate regional socio-economic disparity' },
    { state: 'Kerala', bioScore: 0.89, mpiPct: 0.7, paradoxIdx: 0.18, note: 'High biodiversity paired with decentralized governance and low poverty headcount' }
  ];

  function injectStyles() {
    if (document.getElementById('sw-interactive-styles')) return;
    const style = document.createElement('style');
    style.id = 'sw-interactive-styles';
    style.textContent = `
      .sw-interactive-drawer {
        margin: 0.85rem 0 1.75rem;
        padding: 1.15rem;
        border: 1px solid rgba(120, 125, 118, 0.22);
        border-radius: 6px;
        background: rgba(125, 132, 120, 0.035);
      }
      .sw-toolbar {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.9rem;
      }
      .sw-pill-group {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
      .sw-pill {
        appearance: none;
        background: transparent;
        border: 1px solid rgba(120, 125, 118, 0.3);
        color: inherit;
        border-radius: 4px;
        padding: 0.3rem 0.62rem;
        font-size: 0.76rem;
        cursor: pointer;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        transition: all 0.15s ease;
      }
      .sw-pill:hover {
        border-color: rgba(120, 125, 118, 0.65);
      }
      .sw-pill[aria-pressed="true"] {
        background: #1d2b22;
        color: #f4efe6;
        border-color: #1d2b22;
      }
      .sw-uhi-grid {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 1.15rem;
        align-items: start;
      }
      @media (max-width: 820px) {
        .sw-uhi-grid { grid-template-columns: 1fr; }
      }
      .sw-canvas-stage {
        position: relative;
        width: 100%;
        height: 320px;
        border: 1px solid rgba(120, 125, 118, 0.24);
        border-radius: 6px;
        overflow: hidden;
        user-select: none;
        touch-action: none;
      }
      .sw-canvas-stage canvas {
        width: 100%;
        height: 100%;
        display: block;
        cursor: ew-resize;
      }
      .sw-zone-panel {
        border: 1px solid rgba(120, 125, 118, 0.2);
        border-radius: 6px;
        padding: 0.95rem;
        background: rgba(125, 132, 120, 0.04);
        font-size: 0.82rem;
      }
      .sw-zone-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin: 0.6rem 0;
      }
      .sw-zone-chip {
        font-size: 0.72rem;
        padding: 0.22rem 0.5rem;
        border-radius: 999px;
        border: 1px solid rgba(120, 125, 118, 0.28);
        background: transparent;
        color: inherit;
        cursor: pointer;
      }
      .sw-zone-chip[aria-pressed="true"] {
        background: #2e5a44;
        color: #fff;
        border-color: #2e5a44;
      }
      .sw-delta-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        margin-top: 0.65rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .sw-delta-cell {
        padding: 0.45rem 0.55rem;
        border-radius: 4px;
        background: rgba(120, 125, 118, 0.08);
        font-size: 0.74rem;
      }
    `;
    document.head.appendChild(style);
  }

  function initBengaluruUhiSlider() {
    // SUPERSEDED by the publication-grade workbench
    // (assets/js/bengaluru-uhi-workbench.js). Early return keeps the basic
    // slider from double-mounting; the bio-inequity inspector below is untouched.
    return;
    const link = document.querySelector('a[href*="bengaluru-urban-heat.html"]');
    const targetMount = link ? link.parentElement : document.querySelector('main section');
    if (!targetMount || document.getElementById('sw-bengaluru-uhi-widget')) return;

    // Only mount on index.html (where link exists) or on bengaluru-urban-heat.html itself
    if (!link && !/bengaluru-urban-heat/i.test(window.location.pathname)) return;

    const drawer = document.createElement('div');
    drawer.id = 'sw-bengaluru-uhi-widget';
    drawer.className = 'sw-interactive-drawer';
    drawer.innerHTML = `
      <div class="sw-toolbar">
        <div>
          <strong style="font-size:0.84rem;">Interactive Spatial Curtain · Bengaluru Decadal UHI (2014 vs 2024)</strong>
          <span style="font-size:0.74rem;opacity:0.7;margin-left:0.5rem;">Drag divider across map or select an urban zone</span>
        </div>
        <div class="sw-pill-group" role="group" aria-label="Satellite index layer">
          <button type="button" class="sw-pill" data-uhi-layer="lst" aria-pressed="true">LST (°C)</button>
          <button type="button" class="sw-pill" data-uhi-layer="ndvi" aria-pressed="false">NDVI (Canopy)</button>
          <button type="button" class="sw-pill" data-uhi-layer="ndbi" aria-pressed="false">NDBI (Built-Up)</button>
        </div>
      </div>

      <div class="sw-uhi-grid">
        <div>
          <div class="sw-canvas-stage" id="sw-uhi-stage">
            <canvas id="sw-uhi-canvas" aria-label="Bengaluru 2014 vs 2024 spatial comparison"></canvas>
          </div>
          <div style="display:flex;align-items:center;gap:0.65rem;margin-top:0.5rem;font-size:0.75rem;font-family:ui-monospace,monospace;">
            <span>Apr 2014</span>
            <input type="range" id="sw-uhi-range" min="5" max="95" value="50" style="flex:1;" aria-label="Curtain split percentage" />
            <span>Apr 2024</span>
          </div>
        </div>

        <div class="sw-zone-panel">
          <div style="font-family:ui-monospace,monospace;font-size:0.7rem;text-transform:uppercase;opacity:0.7;">Zonal Telemetry &amp; Cooling Buffer</div>
          <div class="sw-zone-chips" id="sw-zone-chips"></div>
          <div id="sw-zone-readout"></div>
        </div>
      </div>
    `;

    targetMount.insertAdjacentElement('afterend', drawer);

    const state = {
      layer: 'lst',
      split: 0.5,
      selectedZone: BENGALURU_ZONES[4], // Default: Whitefield IT Corridor
      dragging: false
    };

    const canvas = document.getElementById('sw-uhi-canvas');
    const ctx = canvas.getContext('2d');
    const rangeInput = document.getElementById('sw-uhi-range');
    const chipsWrap = document.getElementById('sw-zone-chips');
    const readoutEl = document.getElementById('sw-zone-readout');

    chipsWrap.innerHTML = BENGALURU_ZONES.map(z =>
      `<button type="button" class="sw-zone-chip" data-zone="${z.id}" aria-pressed="${z.id === state.selectedZone.id}">${z.name.split(' (')[0]}</button>`
    ).join('');

    chipsWrap.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const found = BENGALURU_ZONES.find(z => z.id === btn.dataset.zone);
        if (found) {
          state.selectedZone = found;
          chipsWrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zone === found.id)));
          updateReadout();
          drawMap();
        }
      });
    });

    function colorForValue(layer, val) {
      if (layer === 'lst') {
        const t = Math.max(0, Math.min(1, (val - 29.5) / 10.5));
        const r = Math.round(45 + t * 165);
        const g = Math.round(135 - t * 95);
        const b = Math.round(110 - t * 75);
        return `rgb(${r},${g},${b})`;
      }
      if (layer === 'ndvi') {
        const t = Math.max(0, Math.min(1, (val - 0.08) / 0.52));
        const r = Math.round(185 - t * 155);
        const g = Math.round(145 - t * 35);
        const b = Math.round(85 - t * 30);
        return `rgb(${r},${g},${b})`;
      }
      const t = Math.max(0, Math.min(1, (val + 0.25) / 0.63));
      const r = Math.round(65 + t * 135);
      const g = Math.round(125 - t * 70);
      const b = Math.round(95 - t * 50);
      return `rgb(${r},${g},${b})`;
    }

    function sampleField(nx, ny, yearKey, layer) {
      let num = 0, den = 0;
      for (const z of BENGALURU_ZONES) {
        const d2 = Math.pow(nx - z.x, 2) + Math.pow(ny - z.y, 2) + 0.008;
        const w = 1 / (d2 * d2);
        num += w * z[yearKey][layer];
        den += w;
      }
      return num / den;
    }

    function drawMap() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);

      const splitX = W * state.split;
      const cell = 10;

      for (let py = 16; py < H - 16; py += cell) {
        for (let px = 24; px < W - 24; px += cell) {
          const nx = px / W, ny = py / H;
          const dx = (nx - 0.5) * 1.85;
          const dy = (ny - 0.5) * 1.75;
          const angle = Math.atan2(dy, dx);
          const radius = 0.72 + 0.08 * Math.sin(angle * 3) + 0.06 * Math.cos(angle * 5);
          if (dx * dx + dy * dy > radius * radius) continue;

          const yrKey = px < splitX ? 'y2014' : 'y2024';
          const v = sampleField(nx, ny, yrKey, state.layer);
          ctx.fillStyle = colorForValue(state.layer, v);
          ctx.fillRect(px, py, cell, cell);
        }
      }

      BENGALURU_ZONES.forEach(z => {
        const zx = z.x * W, zy = z.y * H;
        const isSel = z.id === state.selectedZone.id;
        ctx.beginPath();
        ctx.arc(zx, zy, isSel ? 7 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? '#ffffff' : '#1d2b22';
        ctx.fill();
        ctx.lineWidth = isSel ? 2.5 : 1.5;
        ctx.strokeStyle = isSel ? '#1d2b22' : '#ffffff';
        ctx.stroke();
      });

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, H);
      ctx.stroke();

      ctx.fillStyle = '#1d2b22';
      ctx.fillRect(splitX - 16, H / 2 - 14, 32, 28);
      ctx.fillStyle = '#f4efe6';
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText('◄►', splitX - 8, H / 2 + 4);

      ctx.fillStyle = 'rgba(29,43,34,0.82)';
      ctx.fillRect(10, 10, 86, 22);
      ctx.fillRect(W - 96, 10, 86, 22);
      ctx.fillStyle = '#f4efe6';
      ctx.fillText('APR 2014', 18, 25);
      ctx.fillText('APR 2024', W - 88, 25);
    }

    function updateReadout() {
      const z = state.selectedZone;
      const dLst = (z.y2024.lst - z.y2014.lst).toFixed(1);
      const dNdvi = (z.y2024.ndvi - z.y2014.ndvi).toFixed(2);
      const dNdbi = (z.y2024.ndbi - z.y2014.ndbi).toFixed(2);

      readoutEl.innerHTML = `
        <div style="font-weight:600;font-size:0.92rem;margin-top:0.25rem;">${z.name}</div>
        <div style="font-size:0.74rem;opacity:0.75;margin-bottom:0.5rem;">Classification: ${z.role} · 2019 Midpoint LST:${z.y2019.lst}°C</div>
        <div class="sw-delta-row">
          <div class="sw-delta-cell">
            <div style="opacity:0.7">LST (2014→24)</div>
            <strong>${z.y2014.lst}° →${z.y2024.lst}°C</strong>
            <div style="color:#b2182b">+${dLst}°C</div>
          </div>
          <div class="sw-delta-cell">
            <div style="opacity:0.7">NDVI (Canopy)</div>
            <strong>${z.y2014.ndvi} →${z.y2024.ndvi}</strong>
            <div style="color:#d96b27">${dNdvi}</div>
          </div>
          <div class="sw-delta-cell">
            <div style="opacity:0.7">NDBI (Built)</div>
            <strong>${z.y2014.ndbi} →${z.y2024.ndbi}</strong>
            <div>+${dNdbi}</div>
          </div>
        </div>
      `;
    }

    function handlePointer(clientX) {
      const rect = canvas.getBoundingClientRect();
      const relX = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
      state.split = relX;
      rangeInput.value = String(Math.round(relX * 100));
      drawMap();
    }

    canvas.addEventListener('pointerdown', e => {
      state.dragging = true;
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const hit = BENGALURU_ZONES.find(z => Math.hypot(nx - z.x, ny - z.y) < 0.055);
      if (hit) {
        state.selectedZone = hit;
        chipsWrap.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zone === hit.id)));
        updateReadout();
      }
      handlePointer(e.clientX);
    });
    window.addEventListener('pointermove', e => { if (state.dragging) handlePointer(e.clientX); });
    window.addEventListener('pointerup', () => { state.dragging = false; });

    rangeInput.addEventListener('input', () => {
      state.split = Number(rangeInput.value) / 100;
      drawMap();
    });

    drawer.querySelectorAll('[data-uhi-layer]').forEach(btn => {
      btn.addEventListener('click', () => {
        drawer.querySelectorAll('[data-uhi-layer]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        state.layer = btn.dataset.uhiLayer;
        drawMap();
      });
    });

    window.addEventListener('resize', drawMap);
    updateReadout();
    drawMap();
  }

  function initBioInequityExplorer() {
    const link = document.querySelector('a[href*="bio-inequity.html"]');
    const targetMount = link ? link.parentElement : document.querySelector('main section');
    if (!targetMount || document.getElementById('sw-bio-inequity-widget')) return;

    if (!link && !/bio-inequity/i.test(window.location.pathname)) return;

    const drawer = document.createElement('div');
    drawer.id = 'sw-bio-inequity-widget';
    drawer.className = 'sw-interactive-drawer';
    drawer.innerHTML = `
      <div class="sw-toolbar">
        <strong style="font-size:0.84rem;">State-Level Biodiversity–Poverty Paradox Inspector</strong>
        <div class="sw-pill-group" id="sw-bio-pills"></div>
      </div>
      <div id="sw-bio-readout" class="sw-zone-panel"></div>
    `;
    targetMount.insertAdjacentElement('afterend', drawer);

    const pillsEl = document.getElementById('sw-bio-pills');
    const readoutEl = document.getElementById('sw-bio-readout');

    function renderBioState(item) {
      readoutEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <strong>${item.state}</strong>
          <span style="font-family:ui-monospace,monospace;font-size:0.76rem;color:#b2182b;">Paradox Index: ${item.paradoxIdx.toFixed(2)}</span>
        </div>
        <p style="margin:0.35rem 0 0.5rem;font-size:0.8rem;opacity:0.82;">${item.note}</p>
        <div class="sw-delta-row">
          <div class="sw-delta-cell">Biodiversity Index: <strong>${item.bioScore}</strong></div>
          <div class="sw-delta-cell">MPI Poverty Headcount: <strong>${item.mpiPct}%</strong></div>
          <div class="sw-delta-cell">Paradox Composite: <strong>${item.paradoxIdx}</strong></div>
        </div>
      `;
    }

    pillsEl.innerHTML = BIO_INEQUITY_STATES.map((s, idx) =>
      `<button type="button" class="sw-pill" data-bio-idx="${idx}" aria-pressed="${idx === 0}">${s.state}</button>`
    ).join('');

    pillsEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        pillsEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        renderBioState(BIO_INEQUITY_STATES[Number(btn.dataset.bioIdx)]);
      });
    });

    renderBioState(BIO_INEQUITY_STATES[0]);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    initBengaluruUhiSlider();
    initBioInequityExplorer();
  });
})();

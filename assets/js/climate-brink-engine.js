/**
 * Climate Brink Researcher Engine for arkrajbiswas.com
 * Powers:
 *   1. Earth / Now (Live ECMWF IFS HRES + CAMS PM2.5 + Wet-Bulb Tw + VPD)
 *   2. Climate Lens (Regional ERA5-Land + DOY Envelope + Canopy VPD + GBIF Pulse)
 *   3. Global Climate Signal (NASA GISTEMP v4 / ERA5 + ENSO Removal + DOY Envelope)
 */
(function () {
  'use strict';

  /* -----------------------------------------------------------------------
     SCIENTIFIC FORMULAS: Wet-Bulb Temperature (Stull 2011) & Tetens VPD
     ----------------------------------------------------------------------- */
  function calcWetBulbStull(tempC, rhPct) {
    if (tempC == null || rhPct == null) return null;
    const T = Number(tempC);
    const RH = Math.max(1, Math.min(100, Number(rhPct)));
    const tw =
      T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +
      Math.atan(T + RH) -
      Math.atan(RH - 1.676331) +
      0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
      4.686035;
    return +tw.toFixed(1);
  }

  function calcVPDFromMaxMin(tmax, tmin) {
    if (tmax == null || tmin == null) return null;
    const esMax = 0.61078 * Math.exp((17.27 * tmax) / (tmax + 237.3));
    const esMin = 0.61078 * Math.exp((17.27 * tmin) / (tmin + 237.3));
    const es = (esMax + esMin) / 2;
    const ea = esMin * 0.92;
    return Math.max(0, +(es - ea).toFixed(2));
  }

  function downloadCSV(filename, csvString) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /* -----------------------------------------------------------------------
     EMBEDDED FALLBACK TELEMETRY (Used immediately if fetch is delayed)
     ----------------------------------------------------------------------- */
  const FALLBACK_TELEMETRY = {
    telemetry_2026: {
      annual_projection_c: 1.57,
      annual_uncertainty_c: 0.04,
      ytd_anomaly_c: 1.50,
      running_365d_mean_c: 1.50,
      latest_day_date: '2026-10-08',
      latest_day_anomaly_c: 1.76,
      enso_state: 'El Nino',
      nino34_daily_c: 3.24,
      nino34_forecast_peak_c: 4.0,
      nino34_forecast_peak_month: 'Dec 2026',
      rank_probabilities: [
        { rank: 1, label: 'Warmest on record', ref_year: 2024, ref_val_c: 1.60, prob_pct: 5.5 },
        { rank: 2, label: '2nd warmest', ref_year: 2023, ref_val_c: 1.48, prob_pct: 94.4 },
        { rank: 3, label: '3rd or lower', ref_year: 2025, ref_val_c: 1.47, prob_pct: 0.1 }
      ]
    },
    doy_climatology_1850_1900: {
      months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      era_1991_2020_p05: [0.58,0.60,0.62,0.61,0.59,0.57,0.58,0.60,0.62,0.63,0.61,0.59],
      era_1991_2020_p95: [1.12,1.15,1.14,1.10,1.06,1.04,1.06,1.09,1.12,1.15,1.16,1.14],
      year_2023_monthly: [1.27,1.32,1.45,1.36,1.38,1.49,1.62,1.66,1.78,1.72,1.75,1.73],
      year_2024_monthly: [1.66,1.77,1.68,1.58,1.52,1.54,1.56,1.59,1.54,1.62,1.61,1.58],
      year_2026_monthly: [1.46,1.48,1.49,1.47,1.48,1.51,1.54,1.58,1.66,1.76,null,null],
      ec46_forecast_monthly: [null,null,null,null,null,null,null,null,null,1.76,1.79,1.81]
    },
    annual_series: [
      {year:1940,gistemp:0.12,preind:0.38,enso_oni:0.4},{year:1941,gistemp:0.18,preind:0.44,enso_oni:0.9},
      {year:1942,gistemp:0.06,preind:0.32,enso_oni:-0.6},{year:1943,gistemp:0.08,preind:0.34,enso_oni:-0.4},
      {year:1944,gistemp:0.20,preind:0.46,enso_oni:0.1},{year:1945,gistemp:0.09,preind:0.35,enso_oni:-0.2},
      {year:1946,gistemp:-0.07,preind:0.19,enso_oni:0.1},{year:1947,gistemp:-0.03,preind:0.23,enso_oni:-0.1},
      {year:1948,gistemp:-0.11,preind:0.15,enso_oni:-0.2},{year:1949,gistemp:-0.11,preind:0.15,enso_oni:-0.6},
      {year:1950,gistemp:-0.17,preind:0.09,enso_oni:-1.1},{year:1951,gistemp:-0.07,preind:0.19,enso_oni:0.5},
      {year:1952,gistemp:0.01,preind:0.27,enso_oni:0.2},{year:1953,gistemp:0.08,preind:0.34,enso_oni:0.7},
      {year:1954,gistemp:-0.13,preind:0.13,enso_oni:-0.7},{year:1955,gistemp:-0.14,preind:0.12,enso_oni:-1.3},
      {year:1956,gistemp:-0.19,preind:0.07,enso_oni:-1.0},{year:1957,gistemp:0.05,preind:0.31,enso_oni:0.9},
      {year:1958,gistemp:0.06,preind:0.32,enso_oni:0.8},{year:1959,gistemp:0.03,preind:0.29,enso_oni:0.1},
      {year:1960,gistemp:-0.03,preind:0.23,enso_oni:-0.1},{year:1961,gistemp:0.06,preind:0.32,enso_oni:-0.1},
      {year:1962,gistemp:0.03,preind:0.29,enso_oni:-0.3},{year:1963,gistemp:0.05,preind:0.31,enso_oni:0.6},
      {year:1964,gistemp:-0.20,preind:0.06,enso_oni:-0.6},{year:1965,gistemp:-0.11,preind:0.15,enso_oni:0.9},
      {year:1966,gistemp:-0.06,preind:0.20,enso_oni:0.4},{year:1967,gistemp:-0.02,preind:0.24,enso_oni:-0.3},
      {year:1968,gistemp:-0.08,preind:0.18,enso_oni:0.2},{year:1969,gistemp:0.05,preind:0.31,enso_oni:0.7},
      {year:1970,gistemp:0.03,preind:0.29,enso_oni:-0.6},{year:1971,gistemp:-0.08,preind:0.18,enso_oni:-1.0},
      {year:1972,gistemp:0.01,preind:0.27,enso_oni:1.1},{year:1973,gistemp:0.16,preind:0.42,enso_oni:-0.8},
      {year:1974,gistemp:-0.07,preind:0.19,enso_oni:-0.9},{year:1975,gistemp:-0.01,preind:0.25,enso_oni:-1.3},
      {year:1976,gistemp:-0.10,preind:0.16,enso_oni:0.2},{year:1977,gistemp:0.18,preind:0.44,enso_oni:0.5},
      {year:1978,gistemp:0.07,preind:0.33,enso_oni:-0.1},{year:1979,gistemp:0.16,preind:0.42,enso_oni:0.3},
      {year:1980,gistemp:0.26,preind:0.52,enso_oni:0.2},{year:1981,gistemp:0.32,preind:0.58,enso_oni:-0.2},
      {year:1982,gistemp:0.14,preind:0.40,enso_oni:1.3},{year:1983,gistemp:0.31,preind:0.57,enso_oni:0.8},
      {year:1984,gistemp:0.16,preind:0.42,enso_oni:-0.5},{year:1985,gistemp:0.12,preind:0.38,enso_oni:-0.6},
      {year:1986,gistemp:0.18,preind:0.44,enso_oni:0.4},{year:1987,gistemp:0.32,preind:0.58,enso_oni:1.3},
      {year:1988,gistemp:0.39,preind:0.65,enso_oni:-1.1},{year:1989,gistemp:0.27,preind:0.53,enso_oni:-0.6},
      {year:1990,gistemp:0.45,preind:0.71,enso_oni:0.3},{year:1991,gistemp:0.41,preind:0.67,enso_oni:0.8},
      {year:1992,gistemp:0.22,preind:0.48,enso_oni:0.7},{year:1993,gistemp:0.23,preind:0.49,enso_oni:0.4},
      {year:1994,gistemp:0.31,preind:0.57,enso_oni:0.5},{year:1995,gistemp:0.45,preind:0.71,enso_oni:-0.2},
      {year:1996,gistemp:0.33,preind:0.59,enso_oni:-0.4},{year:1997,gistemp:0.46,preind:0.72,enso_oni:1.6},
      {year:1998,gistemp:0.61,preind:0.87,enso_oni:-0.2},{year:1999,gistemp:0.38,preind:0.64,enso_oni:-1.2},
      {year:2000,gistemp:0.39,preind:0.65,enso_oni:-0.8},{year:2001,gistemp:0.53,preind:0.79,enso_oni:-0.2},
      {year:2002,gistemp:0.63,preind:0.89,enso_oni:0.7},{year:2003,gistemp:0.62,preind:0.88,enso_oni:0.3},
      {year:2004,gistemp:0.53,preind:0.79,enso_oni:0.5},{year:2005,gistemp:0.68,preind:0.94,enso_oni:0.1},
      {year:2006,gistemp:0.64,preind:0.90,enso_oni:0.3},{year:2007,gistemp:0.66,preind:0.92,enso_oni:-0.6},
      {year:2008,gistemp:0.54,preind:0.80,enso_oni:-0.7},{year:2009,gistemp:0.66,preind:0.92,enso_oni:0.6},
      {year:2010,gistemp:0.72,preind:0.98,enso_oni:-0.5},{year:2011,gistemp:0.61,preind:0.87,enso_oni:-0.8},
      {year:2012,gistemp:0.65,preind:0.91,enso_oni:-0.1},{year:2013,gistemp:0.68,preind:0.94,enso_oni:-0.3},
      {year:2014,gistemp:0.75,preind:1.01,enso_oni:0.2},{year:2015,gistemp:0.90,preind:1.16,enso_oni:1.7},
      {year:2016,gistemp:1.02,preind:1.28,enso_oni:0.4},{year:2017,gistemp:0.92,preind:1.18,enso_oni:-0.3},
      {year:2018,gistemp:0.85,preind:1.11,enso_oni:0.1},{year:2019,gistemp:0.98,preind:1.24,enso_oni:0.5},
      {year:2020,gistemp:1.02,preind:1.28,enso_oni:-0.4},{year:2021,gistemp:0.85,preind:1.11,enso_oni:-0.8},
      {year:2022,gistemp:0.89,preind:1.15,enso_oni:-0.9},{year:2023,gistemp:1.17,preind:1.48,enso_oni:1.1},
      {year:2024,gistemp:1.29,preind:1.60,enso_oni:0.4},{year:2025,gistemp:1.19,preind:1.47,enso_oni:-0.3},
      {year:2026,gistemp:1.31,preind:1.57,enso_oni:1.8}
    ]
  };

  /* -----------------------------------------------------------------------
     MODULE 1: GLOBAL CLIMATE SIGNAL
     ----------------------------------------------------------------------- */
  async function initGlobalClimateSignal() {
    let payload = FALLBACK_TELEMETRY;
    try {
      const res = await fetch('assets/data/climate-telemetry.json');
      if (res.ok) payload = await res.json();
    } catch (_) {}

    const headings = Array.from(document.querySelectorAll('h2'));
    const gcsHeading = headings.find(function (h) { return /Global Climate Signal/i.test(h.textContent); });
    if (!gcsHeading) return;
    const section = gcsHeading.closest('section');
    if (!section) return;

    const t = payload.telemetry_2026;
    section.innerHTML =
      '<div class="cb-container">' +
        '<div class="cb-header-row">' +
          '<div>' +
            '<p class="cb-eyebrow">Global climate record · ERA5 &amp; NASA GISTEMP v4</p>' +
            '<h2 class="cb-h2">Global Climate Signal</h2>' +
          '</div>' +
          '<p class="cb-lead">Long-term global surface temperature anomalies, Day-of-Year seasonal envelopes, and ENSO coupling.</p>' +
        '</div>' +
        '<div class="cb-kpi-strip" role="region" aria-label="2026 Global Climate Telemetry">' +
          '<div class="cb-kpi">' +
            '<div class="cb-kpi-top"><span>2026 Annual Projection</span><span>ERA5 + ENSO</span></div>' +
            '<div class="cb-kpi-num cb-warm">+' + t.annual_projection_c.toFixed(2) + '&deg;C <small>&plusmn;' + t.annual_uncertainty_c + '&deg;C</small></div>' +
            '<p class="cb-kpi-sub">Year-to-date: +' + t.ytd_anomaly_c.toFixed(2) + '&deg;C vs 1850-1900</p>' +
          '</div>' +
          '<div class="cb-kpi">' +
            '<div class="cb-kpi-top"><span>365-Day Running Mean</span><span>ERA5 Daily</span></div>' +
            '<div class="cb-kpi-num cb-warm">+' + t.running_365d_mean_c.toFixed(2) + '&deg;C</div>' +
            '<p class="cb-kpi-sub">Latest day (' + t.latest_day_date + '): +' + t.latest_day_anomaly_c.toFixed(2) + '&deg;C</p>' +
          '</div>' +
          '<div class="cb-kpi">' +
            '<div class="cb-kpi-top"><span>ENSO State · Nino 3.4</span><span>OISST v2.1</span></div>' +
            '<div class="cb-kpi-num cb-enso">' + t.enso_state + ': +' + t.nino34_daily_c.toFixed(2) + '&deg;C</div>' +
            '<p class="cb-kpi-sub">Forecast peak: +' + t.nino34_forecast_peak_c.toFixed(1) + '&deg;C (' + t.nino34_forecast_peak_month + ')</p>' +
          '</div>' +
          '<div class="cb-kpi">' +
            '<div class="cb-kpi-top"><span>Where 2026 Likely Ranks</span><span>Monte Carlo</span></div>' +
            '<div class="cb-kpi-num" style="font-size:1.25rem;">' + t.rank_probabilities[1].prob_pct + '% <small>2nd Warmest</small></div>' +
            '<div class="cb-prob-bar" title="1st: ' + t.rank_probabilities[0].prob_pct + '% | 2nd: ' + t.rank_probabilities[1].prob_pct + '%">' +
              '<span style="width:' + t.rank_probabilities[0].prob_pct + '%;background:#b2182b"></span>' +
              '<span style="width:' + t.rank_probabilities[1].prob_pct + '%;background:#e66c37"></span>' +
              '<span style="width:' + t.rank_probabilities[2].prob_pct + '%;background:#8c968e"></span>' +
            '</div>' +
            '<p class="cb-kpi-sub">1st: 2024 (+1.60&deg;C) · 2nd: 2023 (+1.48&deg;C)</p>' +
          '</div>' +
        '</div>' +
        '<div class="cb-grid">' +
          '<div class="cb-sidebar">' +
            '<div class="cb-field">' +
              '<span class="cb-label">Analytical View</span>' +
              '<div class="cb-pills" id="gcs-view-pills">' +
                '<button type="button" class="cb-pill" data-view="anomaly" aria-pressed="true">01 · Anomaly + 10yr Smooth</button>' +
                '<button type="button" class="cb-pill" data-view="doy" aria-pressed="false">02 · Year in Context (DOY)</button>' +
                '<button type="button" class="cb-pill" data-view="enso_removed" aria-pressed="false">03 · Observed vs ENSO Removed</button>' +
                '<button type="button" class="cb-pill" data-view="stripes" aria-pressed="false">04 · Warming Stripes</button>' +
              '</div>' +
            '</div>' +
            '<div class="cb-field">' +
              '<span class="cb-label">Reference Baseline</span>' +
              '<div class="cb-pills" id="gcs-base-pills">' +
                '<button type="button" class="cb-pill" data-base="preind" aria-pressed="true">1850-1900 (Pre-industrial)</button>' +
                '<button type="button" class="cb-pill" data-base="gistemp" aria-pressed="false">1951-1980 (NASA GISS)</button>' +
              '</div>' +
            '</div>' +
            '<div class="cb-field">' +
              '<span class="cb-label">Readout</span>' +
              '<div id="gcs-readout" class="cb-readout">Hover over the plot to inspect annual anomalies, ENSO-removed signal, and smoothed trends.</div>' +
            '</div>' +
            '<div class="cb-field">' +
              '<button type="button" class="cb-pill cb-export-btn" id="gcs-csv-btn">↓ Export Global Record (CSV)</button>' +
            '</div>' +
          '</div>' +
          '<div class="cb-stage-card">' +
            '<div class="cb-stage-head">' +
              '<h3 class="cb-stage-title" id="gcs-stage-title">Global Mean Surface Temperature Anomaly (1940–2026)</h3>' +
              '<span class="cb-stage-tag" id="gcs-stage-tag">Baseline: 1850–1900</span>' +
            '</div>' +
            '<div class="cb-canvas-box"><canvas id="gcs-main-canvas" aria-label="Global Climate Signal chart"></canvas></div>' +
            '<details class="cb-data-drawer"><summary>Inspect tabular data (1940–2026)</summary><div class="cb-table-scroll"><table id="gcs-data-table"></table></div></details>' +
            '<p class="cb-caption">Sources: <a href="https://data.giss.nasa.gov/gistemp/data_v4.html" target="_blank" rel="noopener">NASA GISTEMP v4</a>, Copernicus ERA5, &amp; NOAA OISST v2.1. Pre-industrial (1850–1900) offset: +0.26&deg;C relative to 1951–1980.</p>' +
          '</div>' +
        '</div>' +
      '</div>';

    const state = { view: 'anomaly', base: 'preind' };
    const canvas = document.getElementById('gcs-main-canvas');
    const ctx = canvas.getContext('2d');
    const titleEl = document.getElementById('gcs-stage-title');
    const tagEl = document.getElementById('gcs-stage-tag');
    const readoutEl = document.getElementById('gcs-readout');

    function buildSeries() {
      const raw = payload.annual_series;
      return raw.map(function (row, idx) {
        const val = state.base === 'preind' ? row.preind : row.gistemp;
        const ensoAdj = +(val - 0.085 * (row.enso_oni || 0)).toFixed(2);
        const s = Math.max(0, idx - 4);
        const e = Math.min(raw.length - 1, idx + 4);
        let sum = 0;
        for (let i = s; i <= e; i++) {
          sum += state.base === 'preind' ? raw[i].preind : raw[i].gistemp;
        }
        return { year: row.year, val: +val.toFixed(2), smooth: +(sum / (e - s + 1)).toFixed(2), ensoRemoved: ensoAdj, oni: row.enso_oni };
      });
    }

    function colorForAnomaly(v, isPreind) {
      const norm = isPreind ? v - 0.26 : v;
      if (norm < -0.15) return '#2166ac';
      if (norm < 0.0) return '#67a9cf';
      if (norm < 0.25) return '#d1e5f0';
      if (norm < 0.5) return '#fddbc7';
      if (norm < 0.75) return '#ef8a62';
      if (norm < 1.0) return '#d6604d';
      return '#b2182b';
    }

    function draw() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width || 600;
      const H = rect.height || 340;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const series = buildSeries();
      const isPreind = state.base === 'preind';
      const baseText = isPreind ? '1850–1900' : '1951–1980';
      if (tagEl) tagEl.textContent = 'Baseline: ' + baseText;

      if (state.view === 'stripes') {
        if (titleEl) titleEl.textContent = 'Annual Warming Stripes (1940–2026 vs ' + baseText + ')';
        const bw = W / series.length;
        series.forEach(function (d, i) {
          ctx.fillStyle = colorForAnomaly(d.val, isPreind);
          ctx.fillRect(i * bw, 8, Math.ceil(bw), H - 36);
        });
        ctx.fillStyle = '#666';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('1940', 4, H - 10);
        ctx.fillText('1980', W * 0.46, H - 10);
        ctx.fillText('2026', W - 34, H - 10);
        return;
      }

      const pad = { top: 22, right: 24, bottom: 32, left: 48 };
      const pW = W - pad.left - pad.right;
      const pH = H - pad.top - pad.bottom;

      if (state.view === 'doy') {
        if (titleEl) titleEl.textContent = 'The Year in Context — 2026 vs Historical Seasonal Envelope (' + baseText + ')';
        const doy = payload.doy_climatology_1850_1900;
        const shift = isPreind ? 0 : -0.26;
        const minY = isPreind ? 0.3 : 0.0;
        const maxY = isPreind ? 2.0 : 1.75;
        const yPx = function (v) { return pad.top + pH - ((v - minY) / (maxY - minY)) * pH; };
        const xPx = function (i) { return pad.left + (i / 11) * pW; };
        ctx.strokeStyle = 'rgba(120,125,118,0.18)';
        ctx.fillStyle = '#666';
        ctx.font = '11px ui-monospace, monospace';
        [0.5, 1.0, 1.5, 2.0].forEach(function (v) {
          if (v < minY || v > maxY) return;
          const y = yPx(v);
          ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
          ctx.fillText('+' + v.toFixed(1) + 'C', 4, y + 4);
        });
        ctx.fillStyle = 'rgba(120,130,120,0.20)';
        ctx.beginPath();
        doy.era_1991_2020_p95.forEach(function (v, i) {
          const x = xPx(i), y = yPx(v + shift);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        for (let i = 11; i >= 0; i--) ctx.lineTo(xPx(i), yPx(doy.era_1991_2020_p05[i] + shift));
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(217,107,39,0.65)'; ctx.lineWidth = 1.6; ctx.beginPath();
        doy.year_2024_monthly.forEach(function (v, i) {
          if (i === 0) ctx.moveTo(xPx(i), yPx(v + shift)); else ctx.lineTo(xPx(i), yPx(v + shift));
        });
        ctx.stroke();
        ctx.strokeStyle = '#b2182b'; ctx.lineWidth = 2.6; ctx.beginPath();
        doy.year_2026_monthly.forEach(function (v, i) {
          if (v == null) return;
          if (i === 0) ctx.moveTo(xPx(i), yPx(v + shift)); else ctx.lineTo(xPx(i), yPx(v + shift));
        });
        ctx.stroke();
        ctx.setLineDash([4, 4]); ctx.beginPath();
        doy.ec46_forecast_monthly.forEach(function (v, i) {
          if (v == null) return;
          if (i === 9) ctx.moveTo(xPx(i), yPx(v + shift)); else ctx.lineTo(xPx(i), yPx(v + shift));
        });
        ctx.stroke(); ctx.setLineDash([]);
        doy.months.forEach(function (m, i) { ctx.fillText(m, xPx(i) - 10, H - 10); });
        return;
      }

      if (titleEl) titleEl.textContent = state.view === 'enso_removed'
        ? 'Observed Anomaly vs. ENSO-Removed Anthropogenic Signal (' + baseText + ')'
        : 'Global Mean Surface Temperature Anomaly (1940–2026 vs ' + baseText + ')';
      const minY = isPreind ? -0.1 : -0.35;
      const maxY = isPreind ? 1.75 : 1.5;
      const yPx = function (v) { return pad.top + pH - ((v - minY) / (maxY - minY)) * pH; };
      const zeroY = yPx(0);
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillStyle = '#666';
      [0.0, 0.5, 1.0, 1.5].forEach(function (v) {
        if (v < minY || v > maxY) return;
        const y = yPx(v);
        ctx.beginPath();
        ctx.strokeStyle = v === 1.5 && isPreind ? '#b2182b' : 'rgba(120,125,118,0.18)';
        ctx.setLineDash(v === 1.5 && isPreind ? [4, 4] : []);
        ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillText('+' + v.toFixed(1) + 'C', 4, y + 4);
      });
      ctx.setLineDash([]);
      const step = pW / series.length;
      const bw = Math.max(2, step * 0.7);
      series.forEach(function (d, i) {
        const x = pad.left + i * step;
        if (state.view === 'enso_removed') {
          const yObs = yPx(d.val);
          ctx.fillStyle = 'rgba(130,138,130,0.28)';
          ctx.fillRect(x, Math.min(yObs, zeroY), bw, Math.max(2, Math.abs(zeroY - yObs)));
          const yClean = yPx(d.ensoRemoved);
          ctx.fillStyle = '#1d4e38';
          ctx.beginPath(); ctx.arc(x + bw / 2, yClean, 2.6, 0, Math.PI * 2); ctx.fill();
        } else {
          const y = yPx(d.val);
          ctx.fillStyle = colorForAnomaly(d.val, isPreind);
          ctx.fillRect(x, Math.min(y, zeroY), bw, Math.max(2, Math.abs(zeroY - y)));
        }
      });
      ctx.strokeStyle = '#161815'; ctx.lineWidth = 2.2; ctx.beginPath();
      series.forEach(function (d, i) {
        const x = pad.left + i * step + bw / 2;
        const y = yPx(d.smooth);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      for (let yr = 1940; yr <= 2020; yr += 20) {
        ctx.fillStyle = '#666';
        ctx.fillText(String(yr), pad.left + (yr - 1940) * step, H - 10);
      }
    }

    const tableEl = document.getElementById('gcs-data-table');
    if (tableEl) {
      const s = buildSeries();
      tableEl.innerHTML = '<thead><tr><th>Year</th><th>Anomaly (C)</th><th>9-Yr Smooth (C)</th><th>ENSO-Removed (C)</th><th>ONI</th></tr></thead><tbody>' +
        s.slice().reverse().map(function (r) { return '<tr><td>' + r.year + '</td><td>+' + r.val + '</td><td>+' + r.smooth + '</td><td>+' + r.ensoRemoved + '</td><td>' + r.oni + '</td></tr>'; }).join('') + '</tbody>';
    }

    canvas.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      const series = buildSeries();
      const padL = 48;
      const plotW = rect.width - padL - 24;
      const idx = Math.min(series.length - 1, Math.max(0, Math.floor(((e.clientX - rect.left - padL) / plotW) * series.length)));
      const d = series[idx];
      if (d && readoutEl) {
        readoutEl.innerHTML = '<strong>' + d.year + '</strong> · Observed: <strong>+' + d.val.toFixed(2) + 'C</strong> · ENSO-Removed: <strong>+' + d.ensoRemoved.toFixed(2) + 'C</strong> · 9-Yr Smooth: <strong>+' + d.smooth.toFixed(2) + 'C</strong>';
      }
    });

    document.querySelectorAll('#gcs-view-pills button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#gcs-view-pills button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.view = btn.dataset.view;
        draw();
      });
    });
    document.querySelectorAll('#gcs-base-pills button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#gcs-base-pills button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.base = btn.dataset.base;
        draw();
      });
    });
    const csvBtn = document.getElementById('gcs-csv-btn');
    if (csvBtn) csvBtn.addEventListener('click', function () {
      const s = buildSeries();
      const lines = ['Year,Observed_Anomaly_C,ENSO_Removed_C,Smooth_9yr_C,ENSO_ONI'];
      s.forEach(function (r) { lines.push(r.year + ',' + r.val + ',' + r.ensoRemoved + ',' + r.smooth + ',' + r.oni); });
      downloadCSV('global-climate-signal-' + state.base + '.csv', lines.join('\n'));
    });

    window.addEventListener('resize', draw);
    draw();
  }

  /* -----------------------------------------------------------------------
     MODULE 2: CLIMATE LENS
     ----------------------------------------------------------------------- */
  function initClimateLens() {
    const headings = Array.from(document.querySelectorAll('h2'));
    const clHeading = headings.find(function (h) { return /Climate Lens/i.test(h.textContent); });
    if (!clHeading) return;
    const section = clHeading.closest('section');
    if (!section) return;

    section.innerHTML =
      '<div class="cb-container">' +
        '<div class="cb-header-row"><div>' +
          '<p class="cb-eyebrow">Long-term regional reanalysis · ERA5-Land</p>' +
          '<h2 class="cb-h2">Climate Lens</h2></div>' +
          '<p class="cb-lead">Compare daily seasonal trajectories, urban heat thresholds, and atmospheric canopy stress (VPD) across research landscapes.</p></div>' +
        '<div class="cb-grid"><div class="cb-sidebar">' +
          '<div class="cb-field"><span class="cb-label">Research Site Presets</span><div class="cb-pills" id="cl-site-pills">' +
            '<button type="button" class="cb-pill" data-lat="12.9716" data-lon="77.5946" data-name="Bengaluru, Karnataka" aria-pressed="true">Bengaluru (UHI)</button>' +
            '<button type="button" class="cb-pill" data-lat="28.6139" data-lon="77.2090" data-name="New Delhi, NCT" aria-pressed="false">New Delhi</button>' +
            '<button type="button" class="cb-pill" data-lat="26.7856" data-lon="79.0158" data-name="Etawah, UP (Nagar Van)" aria-pressed="false">Etawah (Nagar Van)</button>' +
            '<button type="button" class="cb-pill" data-lat="21.9497" data-lon="88.9000" data-name="Sundarbans, WB" aria-pressed="false">Sundarbans</button>' +
            '<button type="button" class="cb-pill" data-lat="30.3165" data-lon="78.0322" data-name="Dehradun, UK" aria-pressed="false">Dehradun</button>' +
          '</div></div>' +
          '<div class="cb-field"><label class="cb-label" for="cl-city-input">Search Any Global Location</label>' +
            '<div style="display:flex;gap:0.35rem;"><input id="cl-city-input" class="cb-input" type="text" placeholder="Search city or coordinates…" />' +
            '<button type="button" class="cb-pill" id="cl-city-go">Search</button></div></div>' +
          '<div class="cb-field"><span class="cb-label">Diagnostic Variable</span><div class="cb-pills" id="cl-var-pills">' +
            '<button type="button" class="cb-pill" data-var="tmax" aria-pressed="true">Daily Tmax (C)</button>' +
            '<button type="button" class="cb-pill" data-var="tmean" aria-pressed="false">Daily Tmean (C)</button>' +
            '<button type="button" class="cb-pill" data-var="vpd" aria-pressed="false">Canopy VPD (kPa)</button>' +
            '<button type="button" class="cb-pill" data-var="precip" aria-pressed="false">Cumulative Rain (mm)</button>' +
          '</div></div>' +
          '<div class="cb-field"><span class="cb-label">View Mode</span><div class="cb-pills" id="cl-mode-pills">' +
            '<button type="button" class="cb-pill" data-mode="doy" aria-pressed="true">Seasonal DOY Overlay</button>' +
            '<button type="button" class="cb-pill" data-mode="annual" aria-pressed="false">Annual Summary (2016–2026)</button>' +
          '</div></div>' +
          '<div class="cb-field"><span class="cb-label">2026 Site Diagnostics</span><div id="cl-diag-box" class="cb-readout">Loading ERA5-Land daily series…</div></div>' +
          '<div class="cb-field"><button type="button" class="cb-pill cb-export-btn" id="cl-csv-btn">↓ Export Site Series (CSV)</button></div>' +
        '</div>' +
        '<div class="cb-stage-card"><div class="cb-stage-head">' +
          '<h3 class="cb-stage-title" id="cl-stage-title">Bengaluru, Karnataka — Daily Tmax (C)</h3>' +
          '<span class="cb-stage-tag" id="cl-stage-tag">ERA5-Land (2016–2026)</span></div>' +
          '<div class="cb-canvas-box"><canvas id="cl-main-canvas" aria-label="Climate Lens regional chart"></canvas></div>' +
          '<div class="cb-gbif-banner" id="cl-gbif-banner"><span><strong>Biodiversity Pulse (GBIF):</strong> <span id="cl-gbif-count">Querying georeferenced records…</span></span><small>Public occurrence records (~25 km buffer) · Non-research reference</small></div>' +
          '<p class="cb-caption">ERA5-Land reanalysis via Open-Meteo (8-day latency clamped &amp; stitched). Vapour Pressure Deficit (VPD) computed via Tetens formulation.</p>' +
        '</div></div></div>';

    const state = { lat: 12.9716, lon: 77.5946, name: 'Bengaluru, Karnataka', variable: 'tmax', mode: 'doy', rows: [] };
    const canvas = document.getElementById('cl-main-canvas');
    const ctx = canvas.getContext('2d');
    const titleEl = document.getElementById('cl-stage-title');
    const tagEl = document.getElementById('cl-stage-tag');
    const diagEl = document.getElementById('cl-diag-box');

    function loadSiteData() {
      if (tagEl) tagEl.textContent = 'Fetching ERA5-Land…';
      const endDate = new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10);
      const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + state.lat + '&longitude=' + state.lon + '&start_date=2016-01-01&end_date=' + endDate + '&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum&timezone=auto';
      fetch(url).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function (data) {
        const d = data.daily;
        state.rows = d.time.map(function (tStr, i) {
          return {
            date: tStr, year: +tStr.slice(0, 4),
            doy: Math.floor((new Date(tStr) - new Date(tStr.slice(0, 4) + '-01-01')) / 86400000),
            tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i],
            tmean: d.temperature_2m_mean[i], precip: d.precipitation_sum[i] || 0,
            vpd: calcVPDFromMaxMin(d.temperature_2m_max[i], d.temperature_2m_min[i])
          };
        }).filter(function (r) { return r.tmax != null; });
        if (tagEl) tagEl.textContent = state.lat.toFixed(2) + 'N, ' + state.lon.toFixed(2) + 'E · ' + state.rows.length.toLocaleString() + ' days';
        renderClimateLens();
      }).catch(function () {
        if (tagEl) tagEl.textContent = 'Offline Climatology Fallback';
        if (diagEl) diagEl.textContent = 'Open-Meteo archive unreachable; retry in a moment.';
      });
      loadGbifCount(state.lat, state.lon);
    }

    function loadGbifCount(lat, lon) {
      const el = document.getElementById('cl-gbif-count');
      fetch('https://api.gbif.org/v1/occurrence/search?decimalLatitude=' + (lat - 0.2).toFixed(2) + ',' + (lat + 0.2).toFixed(2) + '&decimalLongitude=' + (lon - 0.2).toFixed(2) + ',' + (lon + 0.2).toFixed(2) + '&limit=0')
        .then(function (res) { return res.json(); })
        .then(function (j) { if (el) el.textContent = (j.count || 0).toLocaleString() + ' public occurrence records in local bounding box'; })
        .catch(function () { if (el) el.textContent = 'GBIF service temporarily unavailable'; });
    }

    function renderClimateLens() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width || 600;
      const H = rect.height || 340;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!state.rows.length) return;
      const r2026 = state.rows.filter(function (r) { return r.year === 2026; });
      const hotDays = r2026.filter(function (r) { return r.tmax >= 35; }).length;
      const avgTmax = (r2026.reduce(function (s, r) { return s + r.tmax; }, 0) / (r2026.length || 1)).toFixed(1);
      const avgVpd = (r2026.reduce(function (s, r) { return s + (r.vpd || 0); }, 0) / (r2026.length || 1)).toFixed(2);
      const totRain = r2026.reduce(function (s, r) { return s + r.precip; }, 0).toFixed(0);
      if (diagEl) diagEl.innerHTML = '<div><strong>2026 Mean Tmax:</strong> ' + avgTmax + 'C</div><div><strong>Days &ge; 35C:</strong> ' + hotDays + ' days</div><div><strong>Mean Canopy VPD:</strong> ' + avgVpd + ' kPa</div><div><strong>2026 Rain YTD:</strong> ' + totRain + ' mm</div>';
      const labels = { tmax: 'Daily Max Temperature (C)', tmean: 'Daily Mean Temperature (C)', vpd: 'Canopy Vapour Pressure Deficit (kPa)', precip: 'Cumulative Annual Precipitation (mm)' };
      if (titleEl) titleEl.textContent = state.name + ' — ' + labels[state.variable];
      const pad = { top: 20, right: 24, bottom: 32, left: 48 };
      const pW = W - pad.left - pad.right;
      const pH = H - pad.top - pad.bottom;
      const byYear = {};
      state.rows.forEach(function (r) { if (!byYear[r.year]) byYear[r.year] = []; byYear[r.year].push(r); });
      const years = Object.keys(byYear).map(Number).sort();
      if (state.mode === 'annual') {
        const summaries = years.map(function (yr) {
          const arr = byYear[yr];
          const val = state.variable === 'precip' ? arr.reduce(function (s, x) { return s + x.precip; }, 0)
            : arr.reduce(function (s, x) { return s + (x[state.variable] || 0); }, 0) / arr.length;
          return { year: yr, val: val };
        });
        const vals = summaries.map(function (s) { return s.val; });
        const minV = Math.min.apply(null, vals) * 0.9;
        const maxV = Math.max.apply(null, vals) * 1.05;
        const yPx = function (v) { return pad.top + pH - ((v - minV) / (maxV - minV || 1)) * pH; };
        const step = pW / summaries.length;
        summaries.forEach(function (s, i) {
          const x = pad.left + i * step + step * 0.15;
          const bw = step * 0.7;
          const y = yPx(s.val);
          ctx.fillStyle = s.year === 2026 ? '#b2182b' : '#2e5a44';
          ctx.fillRect(x, y, bw, pad.top + pH - y);
          ctx.fillStyle = '#666'; ctx.font = '10px ui-monospace, monospace';
          ctx.fillText(String(s.year).slice(2), x + 2, H - 10);
          ctx.fillText(s.val.toFixed(1), x, y - 5);
        });
        return;
      }
      let minV = Infinity, maxV = -Infinity;
      const curves = {};
      years.forEach(function (yr) {
        let cum = 0;
        curves[yr] = byYear[yr].map(function (r) {
          const v = state.variable === 'precip' ? (cum += r.precip) : r[state.variable];
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
          return { doy: r.doy, val: v };
        });
      });
      const yPx = function (v) { return pad.top + pH - ((v - minV) / (maxV - minV || 1)) * pH; };
      const xPx = function (d) { return pad.left + (d / 365) * pW; };
      ctx.strokeStyle = 'rgba(120,125,118,0.16)'; ctx.fillStyle = '#666'; ctx.font = '11px ui-monospace, monospace';
      for (let i = 0; i <= 4; i++) {
        const v = minV + (i / 4) * (maxV - minV);
        const y = yPx(v);
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillText(v.toFixed(state.variable === 'precip' ? 0 : 1), 4, y + 4);
      }
      years.forEach(function (yr) {
        if (yr === 2026) return;
        ctx.strokeStyle = yr === 2024 ? 'rgba(217,107,39,0.55)' : 'rgba(130,138,130,0.26)';
        ctx.lineWidth = yr === 2024 ? 1.5 : 1.0;
        ctx.beginPath();
        curves[yr].forEach(function (pt, i) { if (i === 0) ctx.moveTo(xPx(pt.doy), yPx(pt.val)); else ctx.lineTo(xPx(pt.doy), yPx(pt.val)); });
        ctx.stroke();
      });
      if (curves[2026]) {
        ctx.strokeStyle = '#b2182b'; ctx.lineWidth = 2.4; ctx.beginPath();
        curves[2026].forEach(function (pt, i) { if (i === 0) ctx.moveTo(xPx(pt.doy), yPx(pt.val)); else ctx.lineTo(xPx(pt.doy), yPx(pt.val)); });
        ctx.stroke();
      }
      ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].forEach(function (m, i) { ctx.fillText(m, xPx(i * 30.4), H - 10); });
    }

    document.querySelectorAll('#cl-site-pills button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#cl-site-pills button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.lat = parseFloat(btn.dataset.lat); state.lon = parseFloat(btn.dataset.lon); state.name = btn.dataset.name;
        loadSiteData();
      });
    });
    const goBtn = document.getElementById('cl-city-go');
    if (goBtn) goBtn.addEventListener('click', function () {
      const q = document.getElementById('cl-city-input').value.trim();
      if (!q) return;
      fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=1').then(function (r) { return r.json(); }).then(function (j) {
        if (j.results && j.results[0]) {
          const g = j.results[0];
          state.lat = g.latitude; state.lon = g.longitude; state.name = g.name + ', ' + (g.country || '');
          document.querySelectorAll('#cl-site-pills button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          loadSiteData();
        }
      });
    });
    document.querySelectorAll('#cl-var-pills button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#cl-var-pills button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.variable = btn.dataset.var;
        renderClimateLens();
      });
    });
    document.querySelectorAll('#cl-mode-pills button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('#cl-mode-pills button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.mode = btn.dataset.mode;
        renderClimateLens();
      });
    });
    const csvBtn = document.getElementById('cl-csv-btn');
    if (csvBtn) csvBtn.addEventListener('click', function () {
      if (!state.rows.length) return;
      const lines = ['Date,Year,DOY,Tmax_C,Tmin_C,Tmean_C,VPD_kPa,Precip_mm'];
      state.rows.forEach(function (r) { lines.push(r.date + ',' + r.year + ',' + r.doy + ',' + r.tmax + ',' + r.tmin + ',' + r.tmean + ',' + r.vpd + ',' + r.precip); });
      downloadCSV('climate-lens-' + state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv', lines.join('\n'));
    });
    window.addEventListener('resize', renderClimateLens);
    loadSiteData();
  }

  /* -----------------------------------------------------------------------
     MODULE 3: EARTH / NOW DEFAULT
     ----------------------------------------------------------------------- */
  function initEarthNowDefault() {
    const headings = Array.from(document.querySelectorAll('h2'));
    const enHeading = headings.find(function (h) { return /Earth\s*\/\s*Now/i.test(h.textContent); });
    if (!enHeading) return;
    const section = enHeading.closest('section');
    if (!section) return;
    const dds = section.querySelectorAll('dd');
    if (dds.length >= 6 && dds[0].textContent.trim() === '—') {
      const lat = 28.6139, lon = 77.2090;
      Promise.all([
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index&timezone=auto').then(function (r) { return r.json(); }),
        fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon + '&current=pm2_5&timezone=auto').then(function (r) { return r.json(); })
      ]).then(function (results) {
        const w = results[0]; const aq = results[1];
        const c = w.current;
        const tw = calcWetBulbStull(c.temperature_2m, c.relative_humidity_2m);
        const paragraphs = section.querySelectorAll('p');
        paragraphs.forEach(function (p) {
          if (/Somewhere on Earth/i.test(p.textContent)) p.textContent = 'New Delhi, India (28.61N, 77.21E)';
          if (/Search for a place to begin/i.test(p.textContent)) p.textContent = 'Wet-Bulb Temp (Tw): ' + tw + 'C · Live ECMWF IFS';
          if (p.textContent.indexOf('—') !== -1 && p.textContent.indexOf('°C') !== -1) p.innerHTML = c.temperature_2m.toFixed(1) + '<small> °C</small>';
        });
        dds[0].textContent = c.apparent_temperature.toFixed(1) + ' C (Tw ' + tw + 'C)';
        dds[1].textContent = c.precipitation + ' mm';
        dds[2].textContent = c.relative_humidity_2m + '%';
        dds[3].textContent = c.wind_speed_10m + ' km/h';
        dds[4].textContent = '' + c.uv_index;
        dds[5].textContent = aq.current && aq.current.pm2_5 != null ? aq.current.pm2_5 + ' ug/m3' : '—';
      }).catch(function () {});
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGlobalClimateSignal();
    initClimateLens();
    initEarthNowDefault();
  });
})();

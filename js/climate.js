/* ============================================================
   Climate Lens — historical annual climate series (NASA POWER
   monthly/point) + Biodiversity Pulse (GBIF, recent records in a
   defined box — labeled as public data, never research data).
   No keys, no polling, no stored location, stale responses
   discarded via request tokens.
   ============================================================ */
(function climateLens() {
  document.addEventListener("DOMContentLoaded", init);

  const VARS = {
    T2M: { label: "Air temperature", agg: "mean", unit: "°C", decimals: 1 },
    PRECTOTCORR: { label: "Precipitation", agg: "total", unit: "mm", decimals: 0 },
    RH2M: { label: "Relative humidity", agg: "mean", unit: "%", decimals: 1 },
    ALLSKY_SFC_SW_DWN: { label: "Solar radiation", agg: "mean", unit: "kWh/m²/day", decimals: 2 }
  };
  const START_YEAR = 2001;
  const FILL = -999.0;
  const DEFAULT = { lat: 12.97, lon: 77.59, label: "Bengaluru, India" };
  const BOX_HALF_DEG = 0.09; // ~10 km each side -> ~20 x 20 km box

  const cache = new Map(); // session-only: "lat,lon" -> { years, annual }
  let els = {};
  let requestSeq = 0;
  let state = { lat: DEFAULT.lat, lon: DEFAULT.lon, label: DEFAULT.label, example: true, variable: "T2M", started: false };

  function init() {
    els = {
      place: document.getElementById("lensPlace"),
      note: document.getElementById("lensPlaceNote"),
      form: document.getElementById("lensSearchForm"),
      input: document.getElementById("lensSearch"),
      results: document.getElementById("lensResults"),
      status: document.getElementById("lensStatus"),
      chart: document.getElementById("lensChart"),
      skeleton: document.getElementById("lensSkeleton"),
      meta: document.getElementById("lensMeta"),
      pulse: document.getElementById("pulseStrip"),
      pulseCount: document.getElementById("pulseCount"),
      pulseTaxa: document.getElementById("pulseTaxa"),
      pulseMeta: document.getElementById("pulseMeta"),
      pulseExamples: document.getElementById("pulseExamples")
    };
    if (!els.place || !els.chart) return;

    document.querySelectorAll(".var-btn").forEach((b) =>
      b.addEventListener("click", () => {
        state.variable = b.dataset.var;
        document.querySelectorAll(".var-btn").forEach((x) =>
          x.setAttribute("aria-pressed", x === b ? "true" : "false"));
        renderFromCache();
      })
    );

    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      searchPlaces(els.input.value.trim());
    });

    const section = els.chart.closest("section");
    if ("IntersectionObserver" in window && section) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && !state.started) {
            state.started = true;
            io.disconnect();
            load();
          }
        });
      }, { rootMargin: "0px 0px -10% 0px" });
      io.observe(section);
    } else {
      state.started = true;
      load();
    }
  }

  /* ----- Places (Open-Meteo geocoding, same as Earth / Now) ----- */
  async function searchPlaces(q) {
    els.results.innerHTML = "";
    if (q.length < 2) return;
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
      if (!res.ok) throw new Error("geocoding failed");
      const data = await res.json();
      const hits = (data && data.results) || [];
      if (!hits.length) { say(`No places found for “${q}”.`); return; }
      say("");
      els.results.innerHTML = hits.map((h, i) =>
        `<li><button type="button" data-i="${i}">${escapeHTML(h.name)} <small>${escapeHTML([h.admin1, h.country].filter(Boolean).join(", "))}</small></button>`
      ).join("");
      els.results.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => {
          const h = hits[Number(b.dataset.i)];
          els.results.innerHTML = "";
          els.input.value = h.name;
          state.lat = Math.round(h.latitude * 100) / 100;
          state.lon = Math.round(h.longitude * 100) / 100;
          state.label = [h.name, h.country].filter(Boolean).join(", ");
          state.example = false;
          load();
        })
      );
    } catch (e) {
      say("Place search is temporarily unavailable.");
    }
  }

  /* ----- NASA POWER monthly series -> complete-year annual values ----- */
  function parseAnnual(params) {
    // Strict YYYYMM keys only; a year counts when all 12 months are
    // present and real (no fill values) across every variable.
    const endYear = new Date().getFullYear();
    const years = [];
    const annual = { T2M: [], PRECTOTCORR: [], RH2M: [], ALLSKY_SFC_SW_DWN: [] };
    for (let y = START_YEAR; y <= endYear; y++) {
      const mvals = {};
      let ok = true;
      for (const v of Object.keys(annual)) {
        mvals[v] = [];
        for (let m = 1; m <= 12; m++) {
          const raw = params[v] && params[v][`${y}${String(m).padStart(2, "0")}`];
          if (typeof raw !== "number" || !Number.isFinite(raw) || raw === FILL) { ok = false; break; }
          mvals[v].push(raw);
        }
        if (!ok) break;
      }
      if (!ok) continue;
      years.push(y);
      annual.T2M.push(mean(mvals.T2M));
      annual.RH2M.push(mean(mvals.RH2M));
      annual.ALLSKY_SFC_SW_DWN.push(mean(mvals.ALLSKY_SFC_SW_DWN));
      annual.PRECTOTCORR.push(mvals.PRECTOTCORR.reduce((s, v, i) => s + v * daysInMonth(y, i + 1), 0));
    }
    return { years, annual };
  }

  function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  async function load() {
    const token = ++requestSeq;
    showSkeleton("Loading historical climate data…");
    say("");
    try {
      const key = `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`;
      let series = cache.get(key);
      if (!series) {
        const endYear = new Date().getFullYear();
        const url = `https://power.larc.nasa.gov/api/temporal/monthly/point` +
          `?parameters=T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN&community=AG` +
          `&longitude=${state.lon}&latitude=${state.lat}&format=JSON&start=${START_YEAR}&end=${endYear}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("power failed");
        const data = await res.json();
        const params = data && data.properties && data.properties.parameter;
        if (!params || !params.T2M) throw new Error("power empty");
        if (token !== requestSeq) return;
        series = parseAnnual(params);
        if (!series.years.length) throw new Error("power empty");
        cache.set(key, series);
      }
      if (token !== requestSeq) return;
      renderFromCache(series);
      loadPulse(token);
    } catch (e) {
      if (token !== requestSeq) return;
      els.chart.hidden = true;
      showSkeleton("Climate data is temporarily unavailable.");
    }
  }

  function renderFromCache(series) {
    series = series || cache.get(`${state.lat.toFixed(2)},${state.lon.toFixed(2)}`);
    if (!series || !series.years.length) return;
    const cfg = VARS[state.variable];
    const values = series.annual[state.variable];
    const years = series.years;
    els.skeleton.hidden = true;
    els.chart.hidden = false;
    els.chart.innerHTML = chartSVG(years, values, cfg);
    els.place.textContent = state.label;
    if (els.note) els.note.textContent = state.example
      ? "Example location — search for another place below."
      : `Showing data for ${state.label}.`;
    els.meta.textContent = `${state.label} · ${fmtLat(state.lat)}, ${fmtLon(state.lon)} · ` +
      `Annual ${cfg.agg} ${cfg.label.toLowerCase()} · ${years[0]}–${years[years.length - 1]} · ` +
      `${cfg.unit} · NASA POWER`;
  }

  function showSkeleton(text) {
    if (!els.skeleton) return;
    els.skeleton.hidden = false;
    els.skeleton.textContent = text;
  }

  function chartSVG(years, values, cfg) {
    const W = 620, H = 260, PL = 52, PR = 16, PT = 16, PB = 36;
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max - min) || 1;
    const lo = min - span * 0.15, hi = max + span * 0.15;
    const n = years.length;
    const x = (i) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
    const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const dots = values.map((v, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="currentColor"><title>${years[i]}: ${v.toFixed(cfg.decimals)} ${cfg.unit}</title></circle>`
    ).join("");
    // Year ticks: every 5th year plus the final year, never fabricated.
    const ticks = years.map((yr, i) => ({ yr, i })).filter(({ yr, i }) => yr % 5 === 0 || i === n - 1);
    const labels = ticks.map(({ yr, i }) =>
      `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.55" font-family="monospace">${yr}</text>`
    ).join("");
    const summary = `${years[0]} ${values[0].toFixed(cfg.decimals)}, ${years[n - 1]} ${values[n - 1].toFixed(cfg.decimals)} ${cfg.unit}`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Annual ${cfg.agg} ${cfg.label} for ${escapeHTML(state.label)}, ${years[0]} to ${years[n - 1]}. First year ${escapeHTML(summary.split(",")[0])}, last year ${escapeHTML(summary.split(",")[1] || "")}.">
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>
      <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>
      <text x="${PL - 8}" y="${y(max).toFixed(1) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6" font-family="monospace">${max.toFixed(cfg.decimals)}</text>
      <text x="${PL - 8}" y="${y(min).toFixed(1) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6" font-family="monospace">${min.toFixed(cfg.decimals)}</text>
      <path d="${line} L${x(n - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z" fill="currentColor" opacity="0.08"/>
      <path d="${line}" fill="none" stroke="currentColor" stroke-width="2"/>
      ${dots}${labels}
    </svg>`;
  }

  /* ----- Biodiversity Pulse: recent records in a defined box ----- */
  function boxWKT(lat, lon) {
    const h = BOX_HALF_DEG;
    const f = (v) => v.toFixed(3);
    return `POLYGON((${f(lon - h)} ${f(lat - h)}, ${f(lon + h)} ${f(lat - h)}, ` +
      `${f(lon + h)} ${f(lat + h)}, ${f(lon - h)} ${f(lat + h)}, ${f(lon - h)} ${f(lat - h)}))`;
  }

  async function loadPulse(token) {
    if (!els.pulse) return;
    const myLat = state.lat, myLon = state.lon;
    try {
      const endYear = new Date().getFullYear();
      const fromYear = endYear - 9;
      const base = `https://api.gbif.org/v1/occurrence/search?geometry=${encodeURIComponent(boxWKT(myLat, myLon))}` +
        `&year=${fromYear},${endYear}`;
      const [sRes, eRes] = await Promise.all([
        fetch(`${base}&limit=0&facet=scientificName&facetLimit=500`),
        fetch(`${base}&limit=3&hasCoordinate=true`)
      ]);
      if (token !== requestSeq || myLat !== state.lat || myLon !== state.lon) return;
      if (!sRes.ok) throw new Error("gbif failed");
      const summary = await sRes.json();
      const count = summary.count;
      if (typeof count !== "number") throw new Error("gbif empty");
      const taxa = ((summary.facets || [])[0] || {}).counts || [];
      const examples = eRes.ok ? (((await eRes.json()).results) || []) : [];
      if (token !== requestSeq || myLat !== state.lat || myLon !== state.lon) return;
      els.pulseCount.textContent = Number(count).toLocaleString("en");
      els.pulseTaxa.textContent = taxa.length >= 500 ? "500+ recorded taxa" : `${taxa.length} recorded taxa`;
      els.pulseMeta.textContent = `Observation period ${fromYear}–${endYear} · within a ~20 × 20 km box around the selected coordinates.`;
      els.pulseExamples.textContent = examples.length
        ? "Examples: " + examples
            .map((r) => `${r.scientificName || "Unidentified"}${r.year ? ` (${r.year})` : ""}`)
            .join(" · ")
        : "No example records with coordinates in this period.";
      els.pulse.hidden = false;
    } catch (e) {
      if (els.pulse) els.pulse.hidden = true;
    }
  }

  /* ----- Helpers ----- */
  function fmtLat(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "N" : "S"}`; }
  function fmtLon(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "E" : "W"}`; }
  function say(text) { if (els.status) els.status.textContent = text; }
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();

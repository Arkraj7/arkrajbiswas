/* ============================================================
   Climate Lens — long-term climate exploration (NASA POWER) +
   Biodiversity Pulse (GBIF public observations, clearly labeled
   as NOT research data). No keys, no polling, no stored location.
   ============================================================ */
(function climateLens() {
  document.addEventListener("DOMContentLoaded", init);

  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const VARS = {
    T2M: { label: "Air temperature", unit: "°C", decimals: 1 },
    PRECTOTCORR: { label: "Precipitation", unit: "mm/day", decimals: 2 },
    RH2M: { label: "Relative humidity", unit: "%", decimals: 1 },
    ALLSKY_SFC_SW_DWN: { label: "Solar radiation", unit: "kWh/m²/day", decimals: 2 }
  };
  const DEFAULT = { lat: 12.97, lon: 77.59, label: "Bengaluru, India" };

  const cache = new Map(); // session-only: "lat,lon" -> POWER parameter block
  let els = {};
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
      pulseText: document.getElementById("pulseText"),
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

    // Load the default example only when the section becomes visible
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

  /* ----- NASA POWER climatology ----- */
  async function load() {
    showSkeleton("Loading long-term climate data…");
    say("");
    try {
      const key = `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`;
      let params = cache.get(key);
      if (!params) {
        const url = `https://power.larc.nasa.gov/api/temporal/climatology/point` +
          `?parameters=T2M,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN&community=AG` +
          `&longitude=${state.lon}&latitude=${state.lat}&format=JSON`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("power failed");
        const data = await res.json();
        params = data && data.properties && data.properties.parameter;
        if (!params || !params.T2M) throw new Error("power empty");
        cache.set(key, params);
      }
      renderFromCache(params);
      loadPulse(); // independent; failures hide the strip silently
    } catch (e) {
      els.chart.hidden = true;
      showSkeleton("Climate data is temporarily unavailable.");
    }
  }

  function renderFromCache(params) {
    params = params || cache.get(`${state.lat.toFixed(2)},${state.lon.toFixed(2)}`);
    if (!params) return;
    const cfg = VARS[state.variable];
    const values = MONTHS.map((m) => Number(params[state.variable][m]));
    if (values.some((v) => !Number.isFinite(v))) {
      els.chart.hidden = true;
      showSkeleton("This variable is not available for the selected location.");
      return;
    }
    els.skeleton.hidden = true;
    els.chart.hidden = false;
    els.chart.innerHTML = chartSVG(values, cfg);
    els.place.textContent = state.label;
    if (els.note) els.note.textContent = state.example
      ? "Example location — search for another place below."
      : `Showing data for ${state.label}.`;
    els.meta.textContent = `${state.label} · ${cfg.label} · Long-term monthly means · ${cfg.unit} · NASA POWER`;
  }

  function showSkeleton(text) {
    if (!els.skeleton) return;
    els.skeleton.hidden = false;
    els.skeleton.textContent = text;
  }

  function chartSVG(values, cfg) {
    const W = 600, H = 260, PL = 46, PR = 14, PT = 16, PB = 34;
    const min = Math.min(...values), max = Math.max(...values);
    const span = (max - min) || 1;
    const lo = min - span * 0.15, hi = max + span * 0.15;
    const x = (i) => PL + (i * (W - PL - PR)) / 11;
    const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const dots = values.map((v, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.2" fill="currentColor"><title>${MONTHS[i]}: ${v.toFixed(cfg.decimals)} ${cfg.unit}</title></circle>`
    ).join("");
    const months = MONTHS.map((m, i) =>
      `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.55" font-family="monospace">${m[0]}</text>`
    ).join("");
    const summary = MONTHS.map((m, i) => `${m} ${values[i].toFixed(cfg.decimals)}`).join(", ");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly mean ${cfg.label} for ${escapeHTML(state.label)}: ${escapeHTML(summary)} ${escapeHTML(cfg.unit)}">
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>
      <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>
      <text x="${PL - 8}" y="${y(max).toFixed(1) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6" font-family="monospace">${max.toFixed(cfg.decimals)}</text>
      <text x="${PL - 8}" y="${y(min).toFixed(1) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6" font-family="monospace">${min.toFixed(cfg.decimals)}</text>
      <path d="${line} L${x(11).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z" fill="currentColor" opacity="0.08"/>
      <path d="${line}" fill="none" stroke="currentColor" stroke-width="2"/>
      ${dots}${months}
    </svg>`;
  }

  /* ----- Biodiversity Pulse (GBIF, public data — never research data) ----- */
  async function loadPulse() {
    if (!els.pulse) return;
    try {
      const base = `https://api.gbif.org/v1/occurrence/search?decimal_latitude=${state.lat}&decimal_longitude=${state.lon}`;
      const [cRes, eRes] = await Promise.all([
        fetch(`${base}&limit=0`),
        fetch(`${base}&limit=4&hasCoordinate=true`)
      ]);
      if (!cRes.ok) throw new Error("gbif failed");
      const count = (await cRes.json()).count;
      if (typeof count !== "number") throw new Error("gbif empty");
      const examples = eRes.ok ? ((await eRes.json()).results || []) : [];
      const names = [...new Set(examples.map((r) => r.scientificName).filter(Boolean))].slice(0, 3);
      els.pulseCount.textContent = count.toLocaleString("en");
      els.pulseText.textContent = "public occurrence records near these coordinates.";
      els.pulseExamples.textContent = names.length ? `Examples: ${names.join(" · ")}` : "";
      els.pulse.hidden = false;
    } catch (e) {
      els.pulse.hidden = true; // hide gracefully, never break the page
    }
  }

  /* ----- Helpers ----- */
  function say(text) { if (els.status) els.status.textContent = text; }
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();

/* ============================================================
   Climate Lens — historical climate from ERA5-Land reanalysis
   (Open-Meteo Historical Weather API, no key) + Biodiversity
   Pulse (GBIF public observations — never research data).
   View A: annual series 2001 -> latest complete year.
   View B: recent 30 valid days ending at latest available date.
   Stale responses discarded via request tokens; coordinates are
   session-memory only, never stored.
   ============================================================ */
(function climateLens() {
  document.addEventListener("DOMContentLoaded", init);

  const VARS = {
    temp: { label: "Temperature", unit: "°C", decimals: 1 },
    precip: { label: "Precipitation", unit: "mm", decimals: 0 },
    rh: { label: "Relative humidity", unit: "%", decimals: 1 },
    solar: { label: "Solar radiation", unit: "MJ/m²", decimals: 0 }
  };
  const START_YEAR = 2001;
  const FETCH_TIMEOUT_MS = 30000;
  const DEFAULT = { lat: 12.97, lon: 77.59, label: "Bengaluru, India" };
  const BOX_HALF_DEG = 0.09; // ~10 km each side -> ~20 x 20 km box

  const cache = new Map(); // session-only: "lat,lon" -> daily arrays
  let els = {};
  let requestSeq = 0;
  let state = { lat: DEFAULT.lat, lon: DEFAULT.lon, label: DEFAULT.label, example: true, variable: "temp", view: "annual", started: false };

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
    document.querySelectorAll(".view-btn").forEach((b) =>
      b.addEventListener("click", () => {
        state.view = b.dataset.view;
        document.querySelectorAll(".view-btn").forEach((x) =>
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

  /* ----- ERA5-Land daily history ----- */
  function withTimeout(ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done: () => clearTimeout(t) };
  }

  async function load() {
    const token = ++requestSeq;
    showSkeleton(state.view === "annual" ? "Loading annual climate history…" : "Loading recent conditions…");
    say("");
    try {
      const key = `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`;
      let daily = cache.get(key);
      if (!daily) {
        const endYear = new Date().getFullYear();
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${state.lat}&longitude=${state.lon}` +
          `&start_date=${START_YEAR}-01-01&end_date=${endYear}-12-31` +
          `&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean,shortwave_radiation_sum` +
          `&timezone=auto&models=era5_land`;
        const gate = withTimeout(FETCH_TIMEOUT_MS);
        let res;
        try {
          res = await fetch(url, { signal: gate.signal });
        } finally {
          gate.done();
        }
        if (!res.ok) throw new Error("archive failed");
        const data = await res.json();
        if (token !== requestSeq) return;
        daily = data && data.daily;
        if (!daily || !Array.isArray(daily.time) || !daily.time.length) throw new Error("archive empty");
        cache.set(key, daily);
      }
      if (token !== requestSeq) return;
      renderFromCache(daily);
      loadPulse(token);
    } catch (e) {
      if (token !== requestSeq) return;
      els.chart.hidden = true;
      showSkeleton(e && e.name === "AbortError"
        ? "Climate data request timed out — please try again."
        : "Climate data is temporarily unavailable.");
    }
  }

  function isValidDay(d, i) {
    return ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
      "precipitation_sum", "relative_humidity_2m_mean", "shortwave_radiation_sum"]
      .every((k) => typeof (d[k] || [])[i] === "number" && Number.isFinite(d[k][i]));
  }

  function completeYears(d) {
    // A year counts only when every calendar day is present and valid.
    const byYear = {};
    (d.time || []).forEach((iso, i) => {
      const y = Number(String(iso).slice(0, 4));
      if (!Number.isFinite(y)) return;
      (byYear[y] = byYear[y] || []).push(i);
    });
    return Object.keys(byYear).map(Number).sort((a, b) => a - b).filter((y) => {
      const idx = byYear[y];
      const days = new Date(y, 1, 29).getDate() === 29 ? 366 : 365;
      return idx.length === days && idx.every((i) => isValidDay(d, i));
    });
  }

  function latestValidIndex(d) {
    for (let i = (d.time || []).length - 1; i >= 0; i--) {
      if (isValidDay(d, i)) return i;
    }
    return -1;
  }

  function annualSeries(d, years, variable) {
    const idxByYear = {};
    (d.time || []).forEach((iso, i) => {
      const y = Number(String(iso).slice(0, 4));
      (idxByYear[y] = idxByYear[y] || []).push(i);
    });
    return years.map((y) => {
      const idx = idxByYear[y];
      if (variable === "temp") {
        return {
          mean: avg(idx.map((i) => d.temperature_2m_mean[i])),
          hi: avg(idx.map((i) => d.temperature_2m_max[i])),
          lo: avg(idx.map((i) => d.temperature_2m_min[i]))
        };
      }
      if (variable === "precip") return { mean: sum(idx.map((i) => d.precipitation_sum[i])) };
      if (variable === "rh") return { mean: avg(idx.map((i) => d.relative_humidity_2m_mean[i])) };
      return { mean: sum(idx.map((i) => d.shortwave_radiation_sum[i])) };
    });
  }

  function avg(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
  function sum(a) { return a.reduce((s, v) => s + v, 0); }

  function renderFromCache(daily) {
    daily = daily || cache.get(`${state.lat.toFixed(2)},${state.lon.toFixed(2)}`);
    if (!daily) return;
    const cfg = VARS[state.variable];
    if (state.view === "annual") {
      const years = completeYears(daily);
      if (!years.length) {
        els.chart.hidden = true;
        showSkeleton("No complete years available for this location yet.");
        return;
      }
      const series = annualSeries(daily, years, state.variable);
      const titles = {
        temp: "Annual mean of daily mean temperature",
        precip: "Annual total precipitation",
        rh: "Annual mean relative humidity",
        solar: "Annual total solar radiation"
      };
      els.skeleton.hidden = true;
      els.chart.hidden = false;
      els.chart.innerHTML = chartSVG(
        years.map(String), series.map((s) => s.mean),
        series.every((s) => s.hi !== undefined)
          ? [{ values: series.map((s) => s.hi), faint: true }, { values: series.map((s) => s.lo), faint: true }]
          : [],
        cfg, `${state.label}: ${titles[state.variable]}, ${years[0]}–${years[years.length - 1]}`
      );
      setMeta(`${state.label} · ${fmtLat(state.lat)}, ${fmtLon(state.lon)} · ${titles[state.variable]} · ` +
        `${years[0]}–${years[years.length - 1]} · ${cfg.unit} · ERA5-Land via Open-Meteo`);
    } else {
      const end = latestValidIndex(daily);
      if (end < 0) {
        els.chart.hidden = true;
        showSkeleton("No recent data available for this location yet.");
        return;
      }
      const start = Math.max(0, end - 29);
      const idx = [];
      for (let i = start; i <= end; i++) idx.push(i);
      const dates = idx.map((i) => daily.time[i]);
      const titles = {
        temp: "Daily mean temperature",
        precip: "Daily precipitation total",
        rh: "Daily mean relative humidity",
        solar: "Daily solar radiation total"
      };
      const pick = {
        temp: "temperature_2m_mean", precip: "precipitation_sum",
        rh: "relative_humidity_2m_mean", solar: "shortwave_radiation_sum"
      }[state.variable];
      const values = idx.map((i) => daily[pick][i]);
      if (values.some((v) => typeof v !== "number" || !Number.isFinite(v))) {
        els.chart.hidden = true;
        showSkeleton("Recent data is incomplete for this location.");
        return;
      }
      const extra = state.variable === "temp"
        ? [{ values: idx.map((i) => daily.temperature_2m_max[i]), faint: true, tag: "max" },
           { values: idx.map((i) => daily.temperature_2m_min[i]), faint: true, tag: "min" }]
        : [];
      els.skeleton.hidden = true;
      els.chart.hidden = false;
      els.chart.innerHTML = chartSVG(
        dates.map((dISO) => shortDate(dISO)), values, extra, cfg,
        `${state.label}: ${titles[state.variable]}, ${dates[0]} to ${dates[dates.length - 1]}`
      );
      setMeta(`${state.label} · ${fmtLat(state.lat)}, ${fmtLon(state.lon)} · ${titles[state.variable]} · ` +
        `Historical reanalysis · Data through ${dates[dates.length - 1]} · ${cfg.unit} · ERA5-Land via Open-Meteo`);
    }
    els.place.textContent = state.label;
    if (els.note) els.note.textContent = state.example
      ? "Example location — search for another place below."
      : `Showing data for ${state.label}.`;
  }

  function setMeta(text) { if (els.meta) els.meta.textContent = text; }

  function showSkeleton(text) {
    if (!els.skeleton) return;
    els.skeleton.hidden = false;
    els.skeleton.textContent = text;
  }

  function shortDate(iso) {
    const m = String(iso).slice(5, 7);
    const d = String(iso).slice(8, 10);
    return `${Number(m)}/${Number(d)}`;
  }

  function chartSVG(labels, values, extra, cfg, ariaSummary) {
    const W = 620, H = 260, PL = 56, PR = 16, PT = 16, PB = 36;
    const all = values.concat(...extra.map((e) => e.values));
    const min = Math.min(...all), max = Math.max(...all);
    const span = (max - min) || 1;
    const lo = min - span * 0.15, hi = max + span * 0.15;
    const n = values.length;
    const x = (i) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
    const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const pathOf = (vals) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const main = pathOf(values);
    const faintPaths = extra.map((e) =>
      `<path d="${pathOf(e.values)}" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.45" stroke-dasharray="4 3"/>`
    ).join("");
    const dots = values.map((v, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="currentColor"><title>${escapeHTML(labels[i])}: ${v.toFixed(cfg.decimals)} ${cfg.unit}</title></circle>`
    ).join("");
    // Ticks: annual years -> every 5th + last; daily -> ~6 evenly.
    const isYear = /^\d{4}$/.test(labels[0] || "");
    const tickIdx = labels.map((l, i) => i).filter((i) =>
      isYear ? (Number(labels[i]) % 5 === 0 || i === n - 1) : (i % Math.ceil(n / 6) === 0 || i === n - 1));
    const ticks = tickIdx.map((i) =>
      `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.55" font-family="monospace">${escapeHTML(labels[i])}</text>`
    ).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHTML(ariaSummary)}">
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>
      <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>
      <text x="${PL - 8}" y="${y(max).toFixed(1) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6" font-family="monospace">${max.toFixed(cfg.decimals)}</text>
      <text x="${PL - 8}" y="${y(min).toFixed(1) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.6" font-family="monospace">${min.toFixed(cfg.decimals)}</text>
      <path d="${main} L${x(n - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z" fill="currentColor" opacity="0.08"/>
      ${faintPaths}
      <path d="${main}" fill="none" stroke="currentColor" stroke-width="2"/>
      ${dots}${ticks}
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

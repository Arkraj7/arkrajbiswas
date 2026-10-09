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
      retry: document.getElementById("lensRetry"),
      chart: document.getElementById("lensChart"),
      skeleton: document.getElementById("lensSkeleton"),
      meta: document.getElementById("lensMeta"),
      dlPng: document.getElementById("lensDlPng"),
      dlCsv: document.getElementById("lensDlCsv"),
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
        load(); // fetches the needed model on first use, else instant
      })
    );
    document.querySelectorAll(".view-btn").forEach((b) =>
      b.addEventListener("click", () => {
        state.view = b.dataset.view;
        document.querySelectorAll(".view-btn").forEach((x) =>
          x.setAttribute("aria-pressed", x === b ? "true" : "false"));
        load();
      })
    );

    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      searchPlaces(els.input.value.trim());
    });
    if (els.dlPng) els.dlPng.addEventListener("click", exportPNG);
    if (els.dlCsv) els.dlCsv.addEventListener("click", exportCSV);
    if (els.retry) els.retry.addEventListener("click", () => { hideRetry(); load(); });
    updateDlButtons();

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

  /* ----- Daily history: ERA5-Land for temperature/humidity,
     ERA5 for precipitation/solar (ERA5-Land returns those null) ----- */
  function withTimeout(ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done: () => clearTimeout(t) };
  }

  /* One minimal request per model, carrying only the variables the
     selected chart needs (temperature brings max/min companions). */
  function archiveUrl(model, dailyVars) {
    const today = new Date().toISOString().slice(0, 10);
    return `https://archive-api.open-meteo.com/v1/archive?latitude=${state.lat}&longitude=${state.lon}` +
      `&start_date=${START_YEAR}-01-01&end_date=${today}` +
      `&daily=${dailyVars.join(",")}` +
      `&timezone=auto&models=${model}`;
  }

  async function fetchModel(model, dailyVars) {
    const gate = withTimeout(FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(archiveUrl(model, dailyVars), { signal: gate.signal });
      if (!res.ok) throw new Error(`${model} failed`);
      const data = await res.json();
      const daily = data && data.daily;
      if (!daily || !Array.isArray(daily.time) || !daily.time.length) throw new Error(`${model} empty`);
      for (const v of dailyVars) {
        if (!Array.isArray(daily[v]) || daily[v].length !== daily.time.length) {
          throw new Error(`${model} missing ${v}`);
        }
      }
      return daily;
    } finally {
      gate.done();
    }
  }

  function modelLabel(model) {
    return model === "era5_land" ? "ERA5-Land" : "ERA5";
  }

  async function load() {
    const token = ++requestSeq;
    lastExport = null;
    updateDlButtons();
    showSkeleton(state.view === "annual" ? "Loading annual climate history…" : "Loading recent conditions…");
    say("");
    hideRetry();
    try {
      const key = `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`;
      let entry = cache.get(key);
      if (!entry) {
        entry = { era5_land: undefined, era5: undefined };
        cache.set(key, entry);
      }
      // Fetch only the provider the selected variable needs, and only
      // once per session; a recorded null means it already failed.
      const need = VAR_MODEL[state.variable];
      if (entry[need] === undefined) {
        try {
          entry[need] = await fetchModel(need, varsFor(state.variable));
        } catch (e) {
          if (e && e.name === "AbortError") throw e;
          entry[need] = null;
        }
      }
        if (token !== requestSeq) return;
        if (!entry.era5_land && !entry.era5) {
          throw { name: "FetchError" };
        }
      if (token !== requestSeq) return;
      renderFromCache();
      loadPulse(token);
    } catch (e) {
      if (token !== requestSeq) return;
      els.chart.hidden = true;
      showSkeleton(e && e.name === "AbortError"
        ? "Climate data request timed out — please try again."
        : "Climate data is temporarily unavailable. Check your connection and try again.");
      showRetry();
    }
  }

  /* Per-variable models: ERA5-Land serves temperature/humidity but
     returns null precipitation and solar radiation (verified live);
     those come from ERA5. Each chart stays single-provider and the
     active model is always labeled. */
  const VAR_MODEL = { temp: "era5_land", rh: "era5_land", precip: "era5", solar: "era5" };
  const VAR_KEYS = {
    temp: ["temperature_2m_mean"],
    precip: ["precipitation_sum"],
    rh: ["relative_humidity_2m_mean"],
    solar: ["shortwave_radiation_sum"]
  };
  // Supplementary max/min accompany the temperature request only.
  const VAR_DAILY = {
    temp: ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean"],
    precip: ["precipitation_sum"],
    rh: ["relative_humidity_2m_mean"],
    solar: ["shortwave_radiation_sum"]
  };
  const MIN_COVERAGE = { temp: 0.98, rh: 0.98, precip: 1.0, solar: 1.0 };

  function varsFor(variable) {
    return VAR_DAILY[variable] || VAR_DAILY.temp;
  }

  function validNum(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  function varDaily() {
    const key = `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`;
    const entry = cache.get(key) || {};
    return entry[VAR_MODEL[state.variable]] || null;
  }

  function coverage(daily, year, keys) {
    const days = new Date(year, 1, 29).getDate() === 29 ? 366 : 365;
    let good = 0, seen = 0;
    (daily.time || []).forEach((iso, i) => {
      if (Number(String(iso).slice(0, 4)) !== year) return;
      seen++;
      if (keys.every((k) => validNum((daily[k] || [])[i]))) good++;
    });
    if (seen === 0) return 0;
    return good / days;
  }

  function completeYears(daily, variable) {
    // Years admitted only when the SELECTED variable meets its own
    // coverage rule: >=98% of expected days for means, 100% for totals.
    const endYear = new Date().getFullYear();
    const out = [];
    for (let y = START_YEAR; y <= endYear; y++) {
      if (coverage(daily, y, VAR_KEYS[variable]) >= MIN_COVERAGE[variable]) out.push(y);
    }
    return out;
  }

  function excludedYears(daily, variable, admitted) {
    const endYear = new Date().getFullYear();
    const set = new Set(admitted);
    const out = [];
    for (let y = START_YEAR; y < endYear; y++) {
      if (!set.has(y)) out.push(y);
    }
    return out;
  }

  function latestValidIndex(daily, variable) {
    const keys = VAR_KEYS[variable];
    const t = daily.time || [];
    for (let i = t.length - 1; i >= 0; i--) {
      if (keys.every((k) => validNum((daily[k] || [])[i]))) return i;
    }
    return -1;
  }

  function annualSeries(daily, years, variable) {
    const idxByYear = {};
    (daily.time || []).forEach((iso, i) => {
      const y = Number(String(iso).slice(0, 4));
      (idxByYear[y] = idxByYear[y] || []).push(i);
    });
    const num = (arr) => arr.filter(validNum);
    return years.map((y) => {
      const idx = idxByYear[y] || [];
      const cov = coverage(daily, y, VAR_KEYS[variable]);
      if (variable === "temp") {
        const m = num(idx.map((i) => daily.temperature_2m_mean[i]));
        const hi = num(idx.map((i) => daily.temperature_2m_max[i]));
        const lo = num(idx.map((i) => daily.temperature_2m_min[i]));
        return {
          mean: m.length ? avg(m) : null,
          hi: hi.length ? avg(hi) : null,
          lo: lo.length ? avg(lo) : null,
          cov
        };
      }
      if (variable === "precip") {
        const v = num(idx.map((i) => daily.precipitation_sum[i]));
        return { mean: v.length ? sum(v) : null, cov };
      }
      if (variable === "rh") {
        const v = num(idx.map((i) => daily.relative_humidity_2m_mean[i]));
        return { mean: v.length ? avg(v) : null, cov };
      }
      const v = num(idx.map((i) => daily.shortwave_radiation_sum[i]));
      return { mean: v.length ? sum(v) : null, cov };
    });
  }

  function avg(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
  function sum(a) { return a.reduce((s, v) => s + v, 0); }

  function renderFromCache() {
    const daily = varDaily();
    const model = modelLabel(VAR_MODEL[state.variable]);
    if (!daily) {
      els.chart.hidden = true;
      showSkeleton(`Climate data for this variable is temporarily unavailable — the ${model} request did not return data.`);
      showRetry();
      return;
    }
    hideRetry();
    const cfg = VARS[state.variable];
    if (state.view === "annual") {
      const years = completeYears(daily, state.variable);
      if (!years.length) {
        els.chart.hidden = true;
        showSkeleton(`Not enough complete observations for ${cfg.label.toLowerCase()} at this location ` +
          `(needs ≥${Math.round(MIN_COVERAGE[state.variable] * 100)}% of daily values per year). Try another variable.`);
        showRetry();
        return;
      }
      const series = annualSeries(daily, years, state.variable);
      if (series.some((s) => s.mean === null)) {
        els.chart.hidden = true;
        showSkeleton(`Annual values could not be calculated for ${cfg.label.toLowerCase()} at this location.`);
        showRetry();
        return;
      }
      const titles = {
        temp: "Annual mean of daily mean temperature",
        precip: "Annual total precipitation",
        rh: "Annual mean relative humidity",
        solar: "Annual total solar radiation"
      };
      const covMin = Math.min(...series.map((s) => s.cov));
      const excluded = excludedYears(daily, state.variable, years);
      const hasFaint = series.every((s) => s.hi !== undefined && s.hi !== null && s.lo !== null);
      els.skeleton.hidden = true;
      els.chart.hidden = false;
      els.chart.innerHTML = chartSVG(
        years.map(String), series.map((s) => s.mean),
        hasFaint
          ? [{ values: series.map((s) => s.hi), faint: true }, { values: series.map((s) => s.lo), faint: true }]
          : [],
        cfg, `${state.label}: ${titles[state.variable]}, ${years[0]}–${years[years.length - 1]}`
      );
      setExport({
        title: titles[state.variable], labels: years.map(String), model,
        cols: state.variable === "temp"
          ? [{ key: "mean", header: `annual_mean_${unitSlug(cfg.unit)}`, values: series.map((s) => s.mean) },
             { key: "hi", header: "annual_mean_max_c", values: series.map((s) => s.hi) },
             { key: "lo", header: "annual_mean_min_c", values: series.map((s) => s.lo) }]
          : [{ key: "mean", header: `annual_${state.variable === "precip" || state.variable === "solar" ? "total" : "mean"}_${unitSlug(cfg.unit)}`, values: series.map((s) => s.mean) }],
        unit: cfg.unit, decimals: cfg.decimals,
        period: `${years[0]}–${years[years.length - 1]}`,
        agg: state.variable === "precip" || state.variable === "solar"
          ? "sum of valid daily values (complete years only)" : "mean of valid daily values (years with ≥98% coverage)"
      });
      setMeta(`${state.label} · ${fmtLat(state.lat)}, ${fmtLon(state.lon)} · ${titles[state.variable]} · ` +
        `${years[0]}–${years[years.length - 1]} · daily coverage ${Math.floor(covMin * 100)}–100% · ` +
        `${cfg.unit} · ${model} via Open-Meteo` +
        (excluded.length ? ` · ${excluded.length} year${excluded.length === 1 ? "" : "s"} excluded (missing days)` : ""));
    } else {
      const end = latestValidIndex(daily, state.variable);
      if (end < 0) {
        els.chart.hidden = true;
        showSkeleton(`No recent ${cfg.label.toLowerCase()} data available for this location yet.`);
        showRetry();
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
      if (values.some((v) => !validNum(v))) {
        els.chart.hidden = true;
        showSkeleton(`Recent ${cfg.label.toLowerCase()} data is incomplete for this location.`);
        showRetry();
        return;
      }
      const hiAll = state.variable === "temp" ? idx.map((i) => daily.temperature_2m_max[i]) : [];
      const loAll = state.variable === "temp" ? idx.map((i) => daily.temperature_2m_min[i]) : [];
      const extra = (state.variable === "temp" && hiAll.every(validNum) && loAll.every(validNum))
        ? [{ values: hiAll, faint: true, tag: "max" }, { values: loAll, faint: true, tag: "min" }]
        : [];
      els.skeleton.hidden = true;
      els.chart.hidden = false;
      els.chart.innerHTML = chartSVG(
        dates.map((dISO) => shortDate(dISO)), values, extra, cfg,
        `${state.label}: ${titles[state.variable]}, ${dates[0]} to ${dates[dates.length - 1]}`
      );
      setExport({
        title: titles[state.variable], labels: dates.slice(), model,
        cols: state.variable === "temp"
          ? [{ key: "mean", header: `daily_mean_${unitSlug(cfg.unit)}`, values: values.slice() },
             { key: "hi", header: "daily_max_c", values: hiAll.length ? hiAll.slice() : idx.map(() => null) },
             { key: "lo", header: "daily_min_c", values: loAll.length ? loAll.slice() : idx.map(() => null) }]
          : [{ key: "mean", header: `daily_${unitSlug(cfg.unit)}`, values: values.slice() }],
        unit: cfg.unit, decimals: cfg.decimals,
        period: `${dates[0]} to ${dates[dates.length - 1]}`,
        agg: "daily values as returned (no aggregation)"
      });
      setMeta(`${state.label} · ${fmtLat(state.lat)}, ${fmtLon(state.lon)} · ${titles[state.variable]} · ` +
        `Historical reanalysis · Data through ${dates[dates.length - 1]} · ${cfg.unit} · ${model} via Open-Meteo`);
    }
    els.place.textContent = state.label;
    if (els.note) els.note.textContent = state.example
      ? "Example location — search for another place below."
      : `Showing data for ${state.label}.`;
  }

  function showRetry() { if (els.retry) els.retry.hidden = false; }
  function hideRetry() { if (els.retry) els.retry.hidden = true; }

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
    const clean = (a) => a.filter((v) => typeof v === "number" && Number.isFinite(v));
    const all = clean(values.concat(...extra.map((e) => e.values)));
    if (!all.length) return "";
    const min = Math.min(...all), max = Math.max(...all);
    const span = (max - min) || 1;
    const lo = min - span * 0.15, hi = max + span * 0.15;
    const n = values.length;
    const x = (i) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
    const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const pathOf = (vals) => {
      // Break the path across missing values instead of bridging them.
      let d = "", pen = false;
      vals.forEach((v, i) => {
        if (typeof v !== "number" || !Number.isFinite(v)) { pen = false; return; }
        d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
        pen = true;
      });
      return d.trim();
    };
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

  /* ----- Exports (PNG + CSV of exactly what is displayed) ----- */
  let lastExport = null;

  function setExport(obj) {
    lastExport = Object.assign({
      place: state.label, lat: state.lat, lon: state.lon,
      variable: state.variable, view: state.view
    }, obj);
    updateDlButtons();
  }

  function updateDlButtons() {
    const on = !!lastExport;
    [els.dlPng, els.dlCsv].forEach((b) => { if (b) b.disabled = !on; });
  }

  function unitSlug(u) {
    return String(u).toLowerCase().replace(/²/g, "2").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unit";
  }

  function varSlug() {
    return { temp: "temperature", precip: "precipitation", rh: "humidity", solar: "solar-radiation" }[state.variable] || state.variable;
  }

  function placeSlug() {
    return String(state.label).split(",")[0].toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "place";
  }

  function exportBase() {
    const first = String(lastExport.labels[0]).replace(/[^0-9]/g, "");
    const last = String(lastExport.labels[lastExport.labels.length - 1]).replace(/[^0-9]/g, "");
    return `climate-lens-${placeSlug()}-${varSlug()}-${first}-${last}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function csvCell(v) {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCSV() {
    if (!lastExport) return;
    const e = lastExport;
    const lines = [
      "# Climate Lens export (plotted data, UTF-8)",
      `# Location,${e.place}`,
      `# Latitude,${e.lat}`,
      `# Longitude,${e.lon}`,
      `# Variable,${VARS[e.variable].label}`,
      `# Unit,${e.unit}`,
      `# Period,${e.period}`,
      `# Model,${e.model || "ERA5-Land"}`,
      `# Source,Open-Meteo Historical Weather API (CC BY 4.0)`,
      `# Aggregation,${e.agg}`
    ];
    lines.push(["label"].concat(e.cols.map((c) => `${c.header} (${e.unit})`)).map(csvCell).join(","));
    for (let i = 0; i < e.labels.length; i++) {
      lines.push([e.labels[i]].concat(e.cols.map((c) => {
        const v = c.values[i];
        return csvCell(typeof v === "number" && Number.isFinite(v) ? v.toFixed(e.decimals) : "");
      })).join(","));
    }
    downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${exportBase()}.csv`);
  }

  function xmlEsc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function exportPNG() {
    if (!lastExport) return;
    const e = lastExport;
    const W = 1600, H = 900, PL = 150, PR = 80, PT = 210, PB = 170;
    const vals = e.cols[0].values;
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const lo = min - span * 0.12, hi = max + span * 0.12;
    const n = vals.length;
    const X = (i) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
    const Y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const line = vals.map((v, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
    const step = Math.max(1, Math.ceil(n / 12));
    let ticks = "";
    for (let i = 0; i < n; i += step) {
      ticks += `<text x="${X(i).toFixed(1)}" y="${H - 128}" text-anchor="middle" font-size="22" fill="#5a635c" font-family="monospace">${xmlEsc(e.labels[i])}</text>`;
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="#FAF8F2"/>` +
      `<text x="80" y="72" font-size="24" letter-spacing="4" fill="#33573F" font-family="monospace">CLIMATE LENS · ARKRAJ BISWAS</text>` +
      `<text x="80" y="128" font-size="46" fill="#1F2521" font-family="Georgia, serif">${xmlEsc(e.title)}</text>` +
      `<text x="80" y="172" font-size="28" fill="#49534C" font-family="Georgia, serif" font-style="italic">${xmlEsc(e.place)} · ${xmlEsc(fmtLat(e.lat))}, ${xmlEsc(fmtLon(e.lon))}</text>` +
      `<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="#1F2521" stroke-opacity="0.3" stroke-width="2"/>` +
      `<line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#1F2521" stroke-opacity="0.3" stroke-width="2"/>` +
      `<text x="${PL - 16}" y="${(Y(max) + 8).toFixed(1)}" text-anchor="end" font-size="24" fill="#5a635c" font-family="monospace">${max.toFixed(e.decimals)}</text>` +
      `<text x="${PL - 16}" y="${(Y(min) + 8).toFixed(1)}" text-anchor="end" font-size="24" fill="#5a635c" font-family="monospace">${min.toFixed(e.decimals)}</text>` +
      `<path d="${line}" fill="none" stroke="#33573F" stroke-width="5"/>` +
      ticks +
      `<text x="80" y="${H - 84}" font-size="23" fill="#49534C" font-family="Arial, sans-serif">${xmlEsc(e.period)} · ${xmlEsc(e.unit)} · ${xmlEsc(e.model || "ERA5-Land")} via Open-Meteo (CC BY 4.0)</text>` +
      `<text x="80" y="${H - 52}" font-size="21" fill="#83877F" font-family="Arial, sans-serif">Gridded reanalysis estimates, not local station observations. Exported ${new Date().toISOString().slice(0, 10)}.</text>` +
      `</svg>`;
    svgToPng(svg, W, H, `${exportBase()}.png`).catch(() => say("Chart export failed — please try again."));
  }

  function svgToPng(svgStr, w, h, filename) {
    return new Promise((resolve, reject) => {
      let url = null;
      try {
        const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
        url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            const ctx = c.getContext("2d");
            ctx.fillStyle = "#FAF8F2";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            url = null;
            c.toBlob((b) => {
              if (b) { downloadBlob(b, filename); resolve(true); }
              else reject(new Error("encode failed"));
            }, "image/png");
          } catch (err) {
            if (url) URL.revokeObjectURL(url);
            reject(err);
          }
        };
        img.onerror = () => { if (url) URL.revokeObjectURL(url); reject(new Error("render failed")); };
        img.src = url;
      } catch (err) {
        if (url) URL.revokeObjectURL(url);
        reject(err);
      }
    });
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

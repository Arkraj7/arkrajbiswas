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
      canvas: document.getElementById("lensCanvas"),
      presets: document.getElementById("lensPresets"),
      reset: document.getElementById("lensReset"),
      tableWrap: document.getElementById("lensTableWrap"),
      table: document.getElementById("lensTable"),
      tableCap: document.getElementById("lensTableCap"),
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
      }, { rootMargin: "0px 0px 300px 0px" });
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
      const chartSeries = [{ name: `Annual mean of daily ${state.variable === "temp" ? "means" : "values"}`, values: series.map((s) => s.mean), main: true }];
      if (state.variable === "temp" && hasFaint) {
        chartSeries.push(
          { name: "Annual mean of daily maxima", values: series.map((s) => s.hi) },
          { name: "Annual mean of daily minima", values: series.map((s) => s.lo) }
        );
      }
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
      els.skeleton.hidden = true;
      els.chart.hidden = false;
      buildChart(years.map(String), chartSeries, cfg,
        `${state.label}: ${titles[state.variable]}, ${years[0]} to ${years[years.length - 1]}`);
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
      const showExtra = state.variable === "temp" && hiAll.every(validNum) && loAll.every(validNum);
      const chartSeries = [{ name: `Daily ${state.variable === "temp" ? "mean temperature" : "values"}`, values, main: true }];
      if (showExtra) {
        chartSeries.push(
          { name: "Daily maximum temperature", values: hiAll },
          { name: "Daily minimum temperature", values: loAll }
        );
      }
      els.skeleton.hidden = true;
      els.chart.hidden = false;
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
      buildChart(
        dates.map((dISO) => shortDate(dISO)), chartSeries, cfg,
        `${state.label}: ${titles[state.variable]}, ${dates[0]} to ${dates[dates.length - 1]}`
      );
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

  /* ----- Interactive chart (Chart.js, native canvas) ----- */
  let chart = null;
  let chartThemeObs = null;

  function chartAvailable() {
    return typeof window.Chart !== "undefined";
  }

  function themeColors() {
    const cs = window.getComputedStyle(document.documentElement);
    const get = (n, fb) => (cs.getPropertyValue(n) || "").trim() || fb;
    return {
      ink: get("--ink", "#1f2521"),
      soft: get("--ink-soft", "#49534c"),
      muted: get("--muted", "#83877f"),
      line: get("--line-soft", "rgba(31,37,33,.12)"),
      accent: get("--accent", "#33573f")
    };
  }

  function withAlpha(rgb, a) {
    const m = String(rgb).match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
    return rgb;
  }

  // Subtle vertical crosshair at the hovered observation.
  const crosshairPlugin = {
    id: "ab-crosshair",
    afterDraw(c, args, opts) {
      const active = c.getActiveElements ? c.getActiveElements() : [];
      if (!active.length || !c.chartArea) return;
      const x = active[0].element.x;
      const ctx = c.ctx;
      ctx.save();
      ctx.strokeStyle = (opts && opts.color) || "rgba(128,128,128,.55)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, c.chartArea.top);
      ctx.lineTo(x, c.chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    }
  };

  function ensureChartLib() {
    if (!chartAvailable() || !window.Chart.__abPlugins) {
      if (chartAvailable() && !window.Chart.__abPlugins) {
        window.Chart.register(crosshairPlugin);
        if (window.ChartZoom) window.Chart.register(window.ChartZoom);
        window.Chart.__abPlugins = true;
        window.Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
        window.Chart.defaults.animation = { duration: 350 };
      }
    }
    return chartAvailable();
  }

  function destroyChart() {
    if (chart) { chart.destroy(); chart = null; }
  }

  function applyChartTheme() {
    if (!chart) return;
    const t = themeColors();
    chart.options.color = t.soft;
    chart.options.scales.x.ticks.color = t.muted;
    chart.options.scales.x.grid.color = t.line;
    chart.options.scales.y.ticks.color = t.muted;
    chart.options.scales.y.grid.color = t.line;
    chart.options.plugins.tooltip = tooltipOptions(t);
    chart.options.plugins.crosshair = { color: t.muted };
    chart.update("none");
  }

  function watchTheme() {
    if (chartThemeObs || !("MutationObserver" in window)) return;
    chartThemeObs = new MutationObserver((muts) => {
      if (muts.some((m) => m.attributeName === "data-theme")) applyChartTheme();
    });
    chartThemeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  function tooltipOptions(t) {
    return {
      enabled: true,
      backgroundColor: t.ink,
      titleColor: t.muted === t.ink ? t.ink : undefined,
      padding: 12,
      displayColors: false,
      callbacks: {
        title: (items) => (items.length ? String(items[0].label) : ""),
        label: (item) => {
          const v = item.parsed && typeof item.parsed.y === "number" ? item.parsed.y : null;
          const ds = item.dataset || {};
          const name = ds.abName || ds.label || "";
          return v === null ? name : `${name}: ${v.toFixed(ds.abDecimals != null ? ds.abDecimals : 1)} ${ds.abUnit || ""}`.trim();
        },
        footer: () => `${state.label} · ${VARS[state.variable].label}`
      }
    };
  }

  // Preset ranges over the loaded labels; returns null when N/A.
  function presetDefs(n) {
    if (state.view === "annual") {
      return [
        { key: "5y", label: "5Y", count: 5 },
        { key: "10y", label: "10Y", count: 10 },
        { key: "all", label: "All", count: n }
      ];
    }
    return [
      { key: "7d", label: "7D", count: 7 },
      { key: "14d", label: "14D", count: 14 },
      { key: "30d", label: "30D", count: 30 }
    ];
  }

  function renderPresets(n) {
    if (!els.presets) return;
    els.presets.innerHTML = "";
    presetDefs(n).forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "var-btn";
      b.textContent = p.label;
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", `Show last ${p.count} observations`);
      if (n < p.count && p.key !== "all") b.disabled = true;
      b.addEventListener("click", () => {
        if (!chart) return;
        const total = chart.data.labels.length;
        const c = Math.min(p.count, total);
        chart.options.scales.x.min = total - c;
        chart.options.scales.x.max = total - 1;
        chart.update();
        markPreset(b);
        renderTable();
      });
      els.presets.appendChild(b);
    });
    if (els.reset) {
      els.reset.hidden = false;
      els.reset.onclick = () => {
        if (!chart) return;
        chart.resetZoom();
        delete chart.options.scales.x.min;
        delete chart.options.scales.x.max;
        chart.update();
        markPreset(null);
        renderTable();
      };
    }
  }

  function markPreset(active) {
    if (!els.presets) return;
    els.presets.querySelectorAll("button").forEach((x) =>
      x.setAttribute("aria-pressed", x === active ? "true" : "false"));
  }

  function visibleRange() {
    if (!chart) return null;
    const n = chart.data.labels.length;
    const s = chart.scales.x;
    let lo = typeof s.min === "number" ? s.min : 0;
    let hi = typeof s.max === "number" ? s.max : n - 1;
    lo = Math.max(0, Math.min(n - 1, Math.round(lo)));
    hi = Math.max(0, Math.min(n - 1, Math.round(hi)));
    if (hi < lo) { const t = lo; lo = hi; hi = t; }
    return { lo, hi };
  }

  function buildChart(labels, series, cfg, ariaSummary) {
    // series: [{name, values, main, decimals, unit}]
    if (!ensureChartLib() || !els.canvas) {
      els.chart.hidden = true;
      showSkeleton("Interactive chart unavailable — the data table below still lists the values.");
      renderTableFallback(labels, series, cfg);
      return false;
    }
    watchTheme();
    destroyChart();
    const t = themeColors();
    const datasets = series.map((s, i) => ({
      label: s.name,
      data: s.values,
      borderColor: s.main ? t.accent : t.muted,
      backgroundColor: s.main ? withAlpha(t.accent, 0.1) : "transparent",
      fill: !!s.main,
      borderWidth: s.main ? 2.4 : 1.4,
      borderDash: s.main ? [] : [5, 4],
      pointRadius: s.main ? 2.6 : 0,
      pointHoverRadius: 5,
      tension: 0.15,
      spanGaps: true,
      abName: s.name,
      abDecimals: cfg.decimals,
      abUnit: cfg.unit
    }));
    chart = new window.Chart(els.canvas, {
      type: "line",
      data: { labels: labels.slice(), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: t.soft,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: series.length > 1,
            labels: { color: t.soft, usePointStyle: true, pointStyle: "line" },
            onClick: window.Chart.defaults.plugins.legend.onClick
          },
          title: { display: false },
          tooltip: tooltipOptions(t),
          crosshair: { color: t.muted },
          zoom: {
            limits: { x: { minRange: 2 } },
            pan: { enabled: true, mode: "x" },
            zoom: {
              drag: { enabled: true, mode: "x" },
              pinch: { enabled: true, mode: "x" },
              wheel: { enabled: false },
              mode: "x",
              onZoomComplete: () => { markPreset(null); renderTable(); }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: t.muted, maxTicksLimit: 8, maxRotation: 0 },
            grid: { color: t.line }
          },
          y: {
            ticks: { color: t.muted, maxTicksLimit: 6 },
            grid: { color: t.line }
          }
        },
        onHover: (e, els_) => {
          if (els.canvas) els.canvas.style.cursor = els_ && els_.length ? "crosshair" : "default";
        }
      }
    });
    els.canvas.setAttribute("role", "img");
    els.canvas.setAttribute("aria-label", ariaSummary);
    // Touch: let vertical page scroll pass through; horizontal goes to chart.
    els.canvas.style.touchAction = "pan-y";
    renderPresets(labels.length);
    renderTable();
    return true;
  }

  function currentSeries() {
    if (!lastExport) return null;
    return {
      labels: lastExport.labels.slice(),
      cols: lastExport.cols.map((c) => ({ header: c.header, values: c.values.slice() })),
      unit: lastExport.unit,
      decimals: lastExport.decimals
    };
  }

  function renderTable() {
    if (!els.table) return;
    const s = currentSeries();
    if (!s) { if (els.tableWrap) els.tableWrap.hidden = true; return; }
    const r = visibleRange();
    const lo = r ? r.lo : 0, hi = r ? r.hi : s.labels.length - 1;
    let html = `<caption id="lensTableCap">${escapeHTML(lastExport.title)} — ${escapeHTML(lastExport.place)}, ${escapeHTML(lastExport.period)}</caption><thead><tr><th scope="col">Date</th>`;
    s.cols.forEach((c) => { html += `<th scope="col">${escapeHTML(c.header)} (${escapeHTML(s.unit)})</th>`; });
    html += "</tr></thead><tbody>";
    for (let i = lo; i <= hi; i++) {
      html += `<tr><th scope="row">${escapeHTML(String(s.labels[i]))}</th>`;
      s.cols.forEach((c) => {
        const v = c.values[i];
        html += `<td>${typeof v === "number" && Number.isFinite(v) ? v.toFixed(s.decimals) : "Not available"}</td>`;
      });
      html += "</tr>";
    }
    html += "</tbody>";
    els.table.innerHTML = html;
    if (els.tableWrap) els.tableWrap.hidden = false;
  }

  function renderTableFallback(labels, series, cfg) {
    // No-chart path: still expose the values accessibly.
    if (!els.table) return;
    lastExport = lastExport || null;
    let html = `<caption>Values (${escapeHTML(cfg.unit)})</caption><thead><tr><th scope="col">Date</th><th scope="col">Value (${escapeHTML(cfg.unit)})</th></tr></thead><tbody>`;
    labels.forEach((l, i) => {
      const v = series[0] ? series[0].values[i] : null;
      html += `<tr><th scope="row">${escapeHTML(String(l))}</th><td>${typeof v === "number" && Number.isFinite(v) ? v.toFixed(cfg.decimals) : "Not available"}</td></tr>`;
    });
    els.table.innerHTML = html + "</tbody>";
    if (els.tableWrap) els.tableWrap.hidden = false;
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
    if (!lastExport || !chart) return;
    const e = lastExport;
    const r = visibleRange();
    const lo = r ? r.lo : 0, hi = r ? r.hi : e.labels.length - 1;
    const shown = hi > lo ? ` · visible ${e.labels[lo]} to ${e.labels[hi]}` : "";
    const lines = [
      "# Climate Lens export (plotted data, UTF-8)",
      `# Location,${e.place}`,
      `# Latitude,${e.lat}`,
      `# Longitude,${e.lon}`,
      `# Variable,${VARS[e.variable].label}`,
      `# Unit,${e.unit}`,
      `# Period,${e.period}${shown}`,
      `# Model,${e.model || "ERA5-Land"}`,
      `# Source,Open-Meteo Historical Weather API (CC BY 4.0)`,
      `# Aggregation,${e.agg}`
    ];
    lines.push(["label"].concat(e.cols.map((c) => `${c.header} (${e.unit})`)).map(csvCell).join(","));
    for (let i = lo; i <= hi; i++) {
      lines.push([e.labels[i]].concat(e.cols.map((c) => {
        const v = c.values[i];
        return csvCell(typeof v === "number" && Number.isFinite(v) ? v.toFixed(e.decimals) : "");
      })).join(","));
    }
    const base = exportBase() + (hi - lo + 1 === e.labels.length ? "" : "-window");
    downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
  }

  function exportPNG() {
    if (!lastExport || !chart) return;
    const e = lastExport;
    // Temporarily stamp export titles onto the live chart so the PNG
    // carries location, units, period, source and disclaimer.
    const prevTitle = chart.options.plugins.title;
    const prevSub = chart.options.plugins.subtitle;
    chart.options.plugins.title = {
      display: true,
      text: [`CLIMATE LENS · ${e.title}`, `${e.place} · ${fmtLat(e.lat)}, ${fmtLon(e.lon)}`],
      font: { size: 20, weight: "600" },
      padding: { top: 8, bottom: 2 }
    };
    chart.options.plugins.subtitle = {
      display: true,
      text: `${e.period} · ${e.unit} · ${e.model || "ERA5-Land"} via Open-Meteo (CC BY 4.0) · Gridded estimates, not station observations. Exported ${new Date().toISOString().slice(0, 10)}.`,
      font: { size: 12 },
      padding: { bottom: 10 }
    };
    chart.update("none");
    const finish = (ok) => {
      chart.options.plugins.title = prevTitle;
      chart.options.plugins.subtitle = prevSub;
      chart.update("none");
      if (!ok) say("Chart export failed — please try again.");
    };
    try {
      const url = chart.toBase64Image("image/png", 1);
      fetch(url)
        .then((r) => r.blob())
        .then((b) => { downloadBlob(b, `${exportBase()}.png`); finish(true); })
        .catch(() => finish(false));
    } catch (err) {
      finish(false);
    }
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

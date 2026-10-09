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
    if (els.dlPng) els.dlPng.addEventListener("click", exportPNG);
    if (els.dlCsv) els.dlCsv.addEventListener("click", exportCSV);
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

  /* ----- ERA5-Land daily history ----- */
  function withTimeout(ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done: () => clearTimeout(t) };
  }

  async function load() {
    const token = ++requestSeq;
    lastExport = null;
    updateDlButtons();
    showSkeleton(state.view === "annual" ? "Loading annual climate history…" : "Loading recent conditions…");
    say("");
    try {
      const key = `${state.lat.toFixed(2)},${state.lon.toFixed(2)}`;
      let daily = cache.get(key);
      if (!daily) {
        const today = new Date().toISOString().slice(0, 10);
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${state.lat}&longitude=${state.lon}` +
          `&start_date=${START_YEAR}-01-01&end_date=${today}` +
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
      setExport({
        title: titles[state.variable], labels: years.map(String),
        cols: state.variable === "temp"
          ? [{ key: "mean", header: `annual_mean_${unitSlug(cfg.unit)}`, values: series.map((s) => s.mean) },
             { key: "hi", header: "annual_mean_max_c", values: series.map((s) => s.hi) },
             { key: "lo", header: "annual_mean_min_c", values: series.map((s) => s.lo) }]
          : [{ key: "mean", header: `annual_${state.variable === "precip" || state.variable === "solar" ? "total" : "mean"}_${unitSlug(cfg.unit)}`, values: series.map((s) => s.mean) }],
        unit: cfg.unit, decimals: cfg.decimals,
        period: `${years[0]}–${years[years.length - 1]}`,
        agg: state.variable === "precip" || state.variable === "solar"
          ? "sum of valid daily values" : "mean of valid daily values"
      });
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
      setExport({
        title: titles[state.variable], labels: dates.slice(),
        cols: state.variable === "temp"
          ? [{ key: "mean", header: `daily_mean_${unitSlug(cfg.unit)}`, values: values.slice() },
             { key: "hi", header: "daily_max_c", values: idx.map((i) => daily.temperature_2m_max[i]) },
             { key: "lo", header: "daily_min_c", values: idx.map((i) => daily.temperature_2m_min[i]) }]
          : [{ key: "mean", header: `daily_${unitSlug(cfg.unit)}`, values: values.slice() }],
        unit: cfg.unit, decimals: cfg.decimals,
        period: `${dates[0]} to ${dates[dates.length - 1]}`,
        agg: "daily values as returned (no aggregation)"
      });
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
      `# Model,ERA5-Land`,
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
      `<text x="80" y="${H - 84}" font-size="23" fill="#49534C" font-family="Arial, sans-serif">${xmlEsc(e.period)} · ${xmlEsc(e.unit)} · ERA5-Land via Open-Meteo (CC BY 4.0)</text>` +
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

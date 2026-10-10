/* ============================================================
   Global Climate Signal — NASA GISTEMP v4 global-mean monthly
   Land-Ocean Temperature Index, bundled locally by
   scripts/update-gistemp.py (never fetched live, never fabricated).
   Monthly / annual Chart.js views + annual climate stripes.
   Baseline 1951-1980. Observed record only — no trends claimed.
   ============================================================ */
(function globalSignal() {
  document.addEventListener("DOMContentLoaded", init);

  const DATA_URL = "assets/data/gistemp-global-monthly.json";
  const FETCH_TIMEOUT_MS = 20000;

  let els = {};
  let requestSeq = 0;
  let data = null; // { meta, months: [{d, v}], years: [{y, v}] }
  let state = { view: "monthly", started: false };
  let chart = null;
  let chartThemeObs = null;
  let lastExport = null;

  function init() {
    els = {
      latest: document.getElementById("gcsLatest"),
      latestSub: document.getElementById("gcsLatestSub"),
      status: document.getElementById("gcsStatus"),
      retry: document.getElementById("gcsRetry"),
      chart: document.getElementById("gcsChart"),
      skeleton: document.getElementById("gcsSkeleton"),
      canvas: document.getElementById("gcsCanvas"),
      presets: document.getElementById("gcsPresets"),
      reset: document.getElementById("gcsReset"),
      meta: document.getElementById("gcsMeta"),
      dlPng: document.getElementById("gcsDlPng"),
      dlCsv: document.getElementById("gcsDlCsv"),
      tableWrap: document.getElementById("gcsTableWrap"),
      table: document.getElementById("gcsTable"),
      stripes: document.getElementById("gcsStripes"),
      stripeLegend: document.getElementById("gcsStripeLegend"),
      stripeScale: document.getElementById("gcsStripeScale")
    };
    if (!els.chart || !els.canvas) return;

    document.querySelectorAll("[data-gview]").forEach((b) =>
      b.addEventListener("click", () => {
        state.view = b.dataset.gview;
        document.querySelectorAll("[data-gview]").forEach((x) =>
          x.setAttribute("aria-pressed", x === b ? "true" : "false"));
        render();
      })
    );
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

  /* ----- Load + validate the bundled dataset ----- */
  function withTimeout(ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done: () => clearTimeout(t) };
  }

  function validMonth(m) {
    return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m.d) && typeof m.v === "number" && Number.isFinite(m.v);
  }

  function validYear(y) {
    return y && Number.isInteger(y.y) && typeof y.v === "number" && Number.isFinite(y.v);
  }

  async function load() {
    const token = ++requestSeq;
    lastExport = null;
    updateDlButtons();
    showSkeleton("Loading global temperature record…");
    say("");
    hideRetry();
    try {
      const gate = withTimeout(FETCH_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(DATA_URL, { signal: gate.signal });
      } finally {
        gate.done();
      }
      if (!res.ok) throw new Error("data file missing");
      const payload = await res.json();
      if (token !== requestSeq) return;
      const meta = payload && payload.metadata;
      const months = (payload && payload.monthly || []).filter(validMonth);
      const years = (payload && payload.annual || []).filter(validYear);
      if (!meta || !meta.baseline || months.length < 12 || !years.length) {
        throw new Error("data file invalid");
      }
      for (let i = 1; i < months.length; i++) {
        if (months[i].d <= months[i - 1].d) throw new Error("months out of order");
      }
      if (token !== requestSeq) return;
      data = { meta, months, years };
      render();
    } catch (e) {
      if (token !== requestSeq) return;
      els.chart.hidden = true;
      showSkeleton(e && e.name === "AbortError"
        ? "Global record request timed out — please try again."
        : "Global temperature record is temporarily unavailable.");
      showRetry();
    }
  }

  /* ----- Render ----- */
  function currentSeries() {
    if (state.view === "annual" || state.view === "stripes") {
      return {
        labels: data.years.map((r) => String(r.y)),
        values: data.years.map((r) => r.v),
        unit: "°C", decimals: 2,
        title: "Annual global land–ocean temperature anomaly",
        period: `${data.years[0].y}–${data.years[data.years.length - 1].y}`,
        kind: "annual"
      };
    }
    return {
      labels: data.months.map((r) => r.d),
      values: data.months.map((r) => r.v),
      unit: "°C", decimals: 2,
      title: "Monthly global land–ocean temperature anomaly",
      period: `${data.months[0].d} to ${data.months[data.months.length - 1].d}`,
      kind: "monthly"
    };
  }

  function render() {
    if (!data) return;
    const s = currentSeries();
    const latestM = data.months[data.months.length - 1];
    const latestY = data.years[data.years.length - 1];
    els.latest.textContent = `${fmtAnom(latestM.v)} °C`;
    els.latestSub.textContent = `${monthName(latestM.d)} · latest month · ${latestY.y} annual mean ${fmtAnom(latestY.v)} °C`;
    els.meta.textContent = `Global land–ocean temperature anomaly · °C vs 1951–1980 · ${s.period} · NASA GISTEMP v4`;
    lastExport = {
      place: "Global", lat: null, lon: null, variable: state.view,
      title: s.title, labels: s.labels.slice(), unit: s.unit, decimals: 2,
      cols: [{ key: "v", header: "anomaly_c", values: s.values.slice() }],
      period: s.period, agg: s.kind === "annual" ? "official annual means of complete years" : "monthly means as published",
      model: "NASA GISTEMP v4"
    };
    updateDlButtons();
    els.skeleton.hidden = true;
    els.chart.hidden = false;
    if (state.view === "stripes") {
      renderStripes();
      destroyChart();
      if (els.tableWrap) els.tableWrap.hidden = true;
      if (els.presets) els.presets.innerHTML = "";
      if (els.reset) els.reset.hidden = true;
      return;
    }
    if (els.stripes) els.stripes.hidden = true;
    if (els.stripeLegend) els.stripeLegend.hidden = true;
    buildChart(s);
    renderTable();
  }

  function fmtAnom(v) {
    return (v > 0 ? "+" : "") + v.toFixed(2);
  }

  function monthName(iso) {
    const names = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${names[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
  }

  /* ----- Stripes ----- */
  function stripeColor(v, maxAbs) {
    // Linear diverging scale around zero; custom palette, not NASA's.
    const t = Math.max(-1, Math.min(1, v / (maxAbs || 1)));
    const cool = [47, 109, 179], mid = [239, 233, 220], warm = [194, 94, 58];
    const lerp = (a, b, k) => Math.round(a + (b - a) * k);
    const c = t < 0
      ? cool.map((x, i) => lerp(x, mid[i], 1 + t))
      : mid.map((x, i) => lerp(x, warm[i], t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function renderStripes() {
    const ys = data.years;
    const maxAbs = Math.max(...ys.map((r) => Math.abs(r.v)), 0.01);
    els.stripes.innerHTML = ys.map((r) =>
      `<span style="background:${stripeColor(r.v, maxAbs)}" title="${r.y}: ${fmtAnom(r.v)} °C vs 1951–1980"></span>`
    ).join("");
    els.stripes.setAttribute("aria-label",
      `Annual climate stripes, ${ys[0].y} to ${ys[ys.length - 1].y}. ` +
      `Bluer stripes are cooler years, terracotta stripes warmer years, relative to 1951–1980. ` +
      `Range ${fmtAnom(Math.min(...ys.map((r) => r.v)))} to ${fmtAnom(Math.max(...ys.map((r) => r.v)))} °C.`);
    els.stripes.hidden = false;
    if (els.stripeLegend) els.stripeLegend.hidden = false;
    if (els.stripeScale) els.stripeScale.textContent =
      `${fmtAnom(-maxAbs)} to ${fmtAnom(maxAbs)} °C`;
  }

  /* ----- Chart.js (shared vendor build) ----- */
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
    return m ? `rgba(${m[1]},${m[2]},${m[3]},${a})` : rgb;
  }

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
    if (chartAvailable() && !window.Chart.__abPlugins) {
      window.Chart.register(crosshairPlugin);
      if (window.ChartZoom) window.Chart.register(window.ChartZoom);
      window.Chart.__abPlugins = true;
      window.Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
      const calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.Chart.defaults.animation = calm ? false : { duration: 350 };
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
      padding: 12,
      displayColors: false,
      callbacks: {
        title: (items) => {
          if (!items.length) return "";
          const raw = String(chart.data.labels[items[0].dataIndex] ?? items[0].label);
          return /^\d{4}-\d{2}$/.test(raw) ? monthName(raw) : raw;
        },
        label: (item) => {
          const v = item.parsed && typeof item.parsed.y === "number" ? item.parsed.y : null;
          return v === null ? "Not available" : `${fmtAnom(v)} °C vs 1951–1980`;
        },
        footer: () => "NASA GISTEMP v4 LOTI"
      }
    };
  }

  function presetDefs(n) {
    if (state.view === "annual") {
      return [
        { key: "30y", label: "30Y", count: 30 },
        { key: "all", label: "All", count: n }
      ];
    }
    return [
      { key: "10y", label: "10Y", count: 120 },
      { key: "30y", label: "30Y", count: 360 },
      { key: "all", label: "All", count: n }
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

  function buildChart() {
    const s = currentSeries();
    if (!ensureChartLib() || !els.canvas) {
      els.chart.hidden = true;
      showSkeleton("Interactive chart unavailable — the data table below still lists the values.");
      renderTableFallback(s);
      return false;
    }
    watchTheme();
    destroyChart();
    const t = themeColors();
    chart = new window.Chart(els.canvas, {
      type: "line",
      data: {
        labels: s.labels.slice(),
        datasets: [{
          label: s.title,
          data: s.values.slice(),
          borderColor: t.accent,
          backgroundColor: withAlpha(t.accent, 0.1),
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.15,
          spanGaps: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        color: t.soft,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          title: { display: false },
          tooltip: tooltipOptions(t),
          crosshair: { color: t.muted },
          zoom: {
            limits: { x: { minRange: 3 } },
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
    els.canvas.setAttribute("aria-label", `${s.title}, ${s.period}. Use the data table for exact values.`);
    els.canvas.style.touchAction = "pan-y";
    renderPresets(s.labels.length);
    renderTable();
    return true;
  }

  function currentSeries() {
    if (state.view === "annual") {
      return {
        labels: data.years.map((r) => String(r.y)),
        values: data.years.map((r) => r.v),
        unit: "°C", decimals: 2,
        title: "Annual global land–ocean temperature anomaly",
        period: `${data.years[0].y}–${data.years[data.years.length - 1].y}`,
        kind: "annual"
      };
    }
    return {
      labels: data.months.map((r) => r.d),
      values: data.months.map((r) => r.v),
      unit: "°C", decimals: 2,
      title: "Monthly global land–ocean temperature anomaly",
      period: `${data.months[0].d} to ${data.months[data.months.length - 1].d}`,
      kind: "monthly"
    };
  }

  function render() {
    if (!data) return;
    const s = currentSeries();
    const latestM = data.months[data.months.length - 1];
    const latestY = data.years[data.years.length - 1];
    els.latest.textContent = `${fmtAnom(latestM.v)} °C`;
    els.latestSub.textContent = `${monthName(latestM.d)} · latest month · ${latestY.y} annual mean ${fmtAnom(latestY.v)} °C`;
    els.meta.textContent = `Global land–ocean temperature anomaly · °C vs 1951–1980 · ${s.period} · NASA GISTEMP v4`;
    lastExport = {
      place: "Global", lat: null, lon: null, variable: state.view,
      title: s.title, labels: s.labels.slice(), unit: s.unit, decimals: 2,
      cols: [{ key: "v", header: "anomaly_c", values: s.values.slice() }],
      period: s.period, agg: s.kind === "annual" ? "official annual means of complete years" : "monthly means as published",
      model: "NASA GISTEMP v4"
    };
    updateDlButtons();
    els.skeleton.hidden = true;
    els.chart.hidden = false;
    if (state.view === "stripes") {
      renderStripes();
      destroyChart();
      if (els.tableWrap) els.tableWrap.hidden = true;
      if (els.presets) els.presets.innerHTML = "";
      if (els.reset) els.reset.hidden = true;
      return;
    }
    if (els.stripes) els.stripes.hidden = true;
    if (els.stripeLegend) els.stripeLegend.hidden = true;
    buildChart();
  }

  /* ----- Exports ----- */
  function updateDlButtons() {
    const on = !!lastExport;
    [els.dlPng, els.dlCsv].forEach((b) => { if (b) b.disabled = !on; });
  }

  function placeSlug() { return "global"; }

  function exportBase() {
    const e = lastExport;
    const clean = (s) => String(s).replace(/[^0-9]/g, "");
    return `global-signal-${state.view}-${clean(e.labels[0])}-${clean(e.labels[e.labels.length - 1])}`;
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
    const r = (chart && state.view !== "stripes") ? visibleRange() : null;
    const lo = r ? r.lo : 0, hi = r ? r.hi : e.labels.length - 1;
    const shown = hi > lo ? ` · visible ${e.labels[lo]} to ${e.labels[hi]}` : "";
    const lines = [
      "# Global Climate Signal export (plotted data, UTF-8)",
      `# Dataset,${data.meta.dataset}`,
      `# Baseline,${data.meta.baseline}`,
      `# Unit,${e.unit}`,
      `# Period,${e.period}${shown}`,
      `# Source,${data.meta.source_url}`,
      `# Retrieved,${data.meta.retrieved}`,
      `# Valid through,${data.meta.valid_through}`
    ];
    lines.push(["label", `${e.cols[0].header} (${e.unit})`].map(csvCell).join(","));
    for (let i = lo; i <= hi; i++) {
      const v = e.cols[0].values[i];
      lines.push([e.labels[i], csvCell(typeof v === "number" && Number.isFinite(v) ? v.toFixed(e.decimals) : "")].join(","));
    }
    downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${exportBase()}.csv`);
  }

  function exportPNG() {
    if (!lastExport || !chart || state.view === "stripes") return;
    const e = lastExport;
    const prevTitle = chart.options.plugins.title;
    const prevSub = chart.options.plugins.subtitle;
    chart.options.plugins.title = {
      display: true,
      text: ["GLOBAL CLIMATE SIGNAL", `${e.title} · ${e.period}`],
      font: { size: 20, weight: "600" },
      padding: { top: 8, bottom: 2 }
    };
    chart.options.plugins.subtitle = {
      display: true,
      text: `°C vs 1951–1980 · NASA GISTEMP v4 (CC0) · Gridded estimates, not weather. Exported ${new Date().toISOString().slice(0, 10)}.`,
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

  /* ----- Accessible data table ----- */
  function renderTable() {
    if (!els.table) return;
    const s = currentSeries();
    if (!s) { if (els.tableWrap) els.tableWrap.hidden = true; return; }
    const r = visibleRange();
    const lo = r ? r.lo : 0, hi = r ? r.hi : s.labels.length - 1;
    let html = `<caption>${escapeHTML(s.title)} — ${escapeHTML(s.period)}</caption>` +
      `<thead><tr><th scope="col">Date</th><th scope="col">Anomaly (°C)</th></tr></thead><tbody>`;
    for (let i = lo; i <= hi; i++) {
      html += `<tr><th scope="row">${escapeHTML(String(s.labels[i]))}</th>` +
        `<td>${s.values[i].toFixed(2)}</td></tr>`;
    }
    els.table.innerHTML = html + "</tbody>";
    if (els.tableWrap) els.tableWrap.hidden = false;
  }

  function renderTableFallback(s) {
    if (!els.table) return;
    let html = `<caption>Values (°C)</caption><thead><tr><th scope="col">Date</th><th scope="col">Anomaly (°C)</th></tr></thead><tbody>`;
    s.labels.forEach((l, i) => {
      html += `<tr><th scope="row">${escapeHTML(String(l))}</th><td>${s.values[i].toFixed(2)}</td></tr>`;
    });
    els.table.innerHTML = html + "</tbody>";
    if (els.tableWrap) els.tableWrap.hidden = false;
  }

  /* ----- Helpers ----- */
  function fmtLat(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "N" : "S"}`; }
  function fmtLon(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "E" : "W"}`; }
  function say(text) { if (els.status) els.status.textContent = text; }
  function showRetry() { if (els.retry) els.retry.hidden = false; }
  function hideRetry() { if (els.retry) els.retry.hidden = true; }
  function showSkeleton(text) {
    if (!els.skeleton) return;
    els.skeleton.hidden = false;
    els.skeleton.textContent = text;
  }
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
})();

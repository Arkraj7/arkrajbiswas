/* ============================================================
   Earth / Now — live environmental data (Open-Meteo, no key)
   Privacy: geolocation only on explicit click; coordinates live in
   memory for this page session only — never localStorage/cookies,
   never sent anywhere except api.open-meteo.com endpoints.
   ============================================================ */
(function earthNow() {
  document.addEventListener("DOMContentLoaded", init);

  // Session-only cache: "lat,lon" -> { at, place, wx, aq }
  const cache = new Map();
  const CACHE_MS = 10 * 60 * 1000;

  let els = {};
  let lastSnapshot = null;

  function init() {
    els = {
      place: document.getElementById("earthPlace"),
      coords: document.getElementById("earthCoords"),
      temp: document.getElementById("earthTemp"),
      cond: document.getElementById("earthCond"),
      status: document.getElementById("earthStatus"),
      locate: document.getElementById("earthLocate"),
      form: document.getElementById("earthSearchForm"),
      input: document.getElementById("earthSearch"),
      results: document.getElementById("earthResults"),
      forecast: document.getElementById("earthForecast"),
      mFeels: document.getElementById("mFeels"),
      mPrecip: document.getElementById("mPrecip"),
      mHumidity: document.getElementById("mHumidity"),
      mWind: document.getElementById("mWind"),
      mUv: document.getElementById("mUv"),
      mPm: document.getElementById("mPm"),
      chart: document.getElementById("earthChart"),
      dlPng: document.getElementById("earthDlPng"),
      dlForecast: document.getElementById("earthDlForecast"),
      dlSnap: document.getElementById("earthDlSnap")
    };
    if (!els.place || !els.locate) return; // section absent on other pages

    els.locate.addEventListener("click", onLocate);
    if (els.dlPng) els.dlPng.addEventListener("click", exportChartPNG);
    if (els.dlForecast) els.dlForecast.addEventListener("click", exportForecastCSV);
    if (els.dlSnap) els.dlSnap.addEventListener("click", exportSnapshotCSV);
    updateDlButtons();
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      searchPlaces(els.input.value.trim());
    });
    let t = null;
    els.input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => searchPlaces(els.input.value.trim()), 350);
    });
  }

  /* ----- Location ----- */
  function onLocate() {
    if (!("geolocation" in navigator)) {
      say("Geolocation is not available in this browser — try the search field.");
      return;
    }
    say("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = round2(pos.coords.latitude);
        const lon = round2(pos.coords.longitude);
        load(lat, lon, "Your location");
      },
      () => say("Location access was not granted. Use the search field to look up any place instead."),
      { timeout: 12000, maximumAge: 600000 }
    );
  }

  async function searchPlaces(q) {
    els.results.innerHTML = "";
    if (q.length < 2) return;
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("geocoding failed");
      const data = await res.json();
      const hits = (data && data.results) || [];
      if (!hits.length) {
        say(`No places found for “${q}”.`);
        return;
      }
      say("");
      els.results.innerHTML = hits.map((h, i) =>
        `<li><button type="button" data-i="${i}">${escapeHTML(h.name)} <small>${escapeHTML([h.admin1, h.country].filter(Boolean).join(", "))}</small></button>`
      ).join("");
      els.results.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          const h = hits[Number(b.dataset.i)];
          els.results.innerHTML = "";
          els.input.value = h.name;
          load(round2(h.latitude), round2(h.longitude), [h.name, h.country].filter(Boolean).join(", "));
        });
      });
    } catch (e) {
      say("Place search is temporarily unavailable.");
    }
  }

  /* ----- Data (ECMWF IFS HRES via Open-Meteo, standard fallback) ----- */
  let requestSeq = 0;

  function wxUrl(lat, lon, ecmwf) {
    return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m` +
      `&hourly=uv_index,precipitation_probability` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7` + (ecmwf ? `&models=ecmwf_ifs` : ``);
  }

  async function fetchWeather(lat, lon) {
    // Prefer ECMWF IFS HRES; fall back to the standard best-match model.
    try {
      const r = await fetch(wxUrl(lat, lon, true));
      if (!r.ok) throw new Error("ecmwf failed");
      return { wx: await r.json(), model: "ECMWF IFS HRES" };
    } catch (e) {
      const r = await fetch(wxUrl(lat, lon, false));
      if (!r.ok) throw new Error("weather failed");
      return { wx: await r.json(), model: "Open-Meteo" };
    }
  }

  async function load(lat, lon, label) {
    const token = ++requestSeq;
    lastSnapshot = null;
    updateDlButtons();
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      if (token !== requestSeq) return;
      render(label, lat, lon, hit.wx, hit.aq, hit.model);
      say("");
      return;
    }
    say("Reading the atmosphere…");
    setBusy(true);
    try {
      const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
        `&current=us_aqi,pm2_5&timezone=auto`;
      const [w, aqRes] = await Promise.all([fetchWeather(lat, lon), fetch(aqUrl)]);
      if (token !== requestSeq) return; // a newer search won — discard stale data
      let aq = null;
      if (aqRes.ok) { try { aq = await aqRes.json(); } catch (e) { aq = null; } }
      if (token !== requestSeq) return;
      cache.set(key, { at: Date.now(), wx: w.wx, aq, model: w.model });
      render(label, lat, lon, w.wx, aq, w.model);
      say("");
    } catch (e) {
      if (token !== requestSeq) return;
      say("Live environmental data is temporarily unavailable.");
    } finally {
      if (token === requestSeq) setBusy(false);
    }
  }

  /* ----- Render ----- */
  function render(label, lat, lon, wx, aq, model) {
    const c = (wx && wx.current) || {};
    const h = (wx && wx.hourly) || {};
    const d = (wx && wx.daily) || {};
    const hi = hourIndex(h.time, c.time);

    const t = num(c.temperature_2m);
    els.place.textContent = label || "Current conditions";
    if (els.coords) els.coords.textContent = `${fmtLat(lat)}, ${fmtLon(lon)} · Forecast: ${model || "Open-Meteo"}`;
    els.temp.innerHTML = t === null ? "—<small> °C</small>" : `${Math.round(t)}<small> °C</small>`;
    const feels = num(c.apparent_temperature);
    els.cond.textContent = `${weatherLabel(c.weather_code)}${feels === null ? "" : ` · Feels like ${Math.round(feels)}°`}`;

    setMeta(els.mFeels, feels === null ? "—" : `${Math.round(feels)} °C`);
    const pp = hi >= 0 && h.precipitation_probability ? num(h.precipitation_probability[hi]) : null;
    setMeta(els.mPrecip, pp === null ? "Not available" : `${Math.round(pp)} % chance`);
    const rh = num(c.relative_humidity_2m);
    setMeta(els.mHumidity, rh === null ? "—" : `${Math.round(rh)} %`);
    const w = num(c.wind_speed_10m);
    setMeta(els.mWind, w === null ? "—" : `${Math.round(w)} km/h`);
    const uv = hi >= 0 && h.uv_index ? num(h.uv_index[hi]) : null;
    els.mUv.innerHTML = uv === null ? "Not available" : `${uv.toFixed(1)}<small>${uvLabel(uv)}</small>`;

    const aqCur = (aq && aq.current) || {};
    const pm = num(aqCur.pm2_5);
    const aqi = num(aqCur.us_aqi);
    if (pm === null && aqi === null) {
      els.mPm.textContent = "Not available";
    } else {
      els.mPm.innerHTML =
        `${pm === null ? "—" : pm.toFixed(0) + " µg/m³"}` +
        `<small>${aqi === null ? "AQI not available" : `US AQI ${Math.round(aqi)} · ${aqiLabel(aqi)}`}</small>`;
    }

    if (d.time && d.time.length) {
      els.forecast.innerHTML = d.time.map((day, i) => {
        const mx = num((d.temperature_2m_max || [])[i]);
        const mn = num((d.temperature_2m_min || [])[i]);
        const p = num((d.precipitation_probability_max || [])[i]);
        return `<div class="forecast-day">
          <div class="dow">${i === 0 ? "Today" : weekday(day)}</div>
          <div class="tmax">${mx === null ? "—" : Math.round(mx) + "°"}</div>
          <div class="tmin">${mn === null ? "" : Math.round(mn) + "°"}${p !== null ? ` · ${Math.round(p)}%` : ""}</div>
          <div class="pp">${escapeHTML(weatherLabel((d.weather_code || [])[i]))}</div>
        </div>`;
      }).join("");
    }

    lastSnapshot = {
      label, lat, lon, model: model || "Open-Meteo",
      time: c.time || "",
      temp: num(c.temperature_2m), feels: num(c.apparent_temperature),
      humidity: num(c.relative_humidity_2m), wind: num(c.wind_speed_10m),
      precipProb: (hi >= 0 && h.precipitation_probability) ? num(h.precipitation_probability[hi]) : null,
      uv: (hi >= 0 && h.uv_index) ? num(h.uv_index[hi]) : null,
      pm25: num((aq && aq.current ? aq.current.pm2_5 : null)),
      aqi: num((aq && aq.current ? aq.current.us_aqi : null)),
      cond: weatherLabel(c.weather_code),
      days: (d.time || []).map((day, i) => ({
        date: day,
        tmax: num((d.temperature_2m_max || [])[i]),
        tmin: num((d.temperature_2m_min || [])[i]),
        pp: num((d.precipitation_probability_max || [])[i]),
        code: (d.weather_code || [])[i],
        cond: weatherLabel((d.weather_code || [])[i])
      }))
    };
    renderMiniChart();
    updateDlButtons();
  }

  function updateDlButtons() {
    const on = !!lastSnapshot;
    [els.dlPng, els.dlForecast, els.dlSnap].forEach((b) => { if (b) b.disabled = !on; });
  }

  /* ----- Compact 7-day range chart (from the held forecast) ----- */
  function renderMiniChart() {
    if (!els.chart || !lastSnapshot) return;
    const days = lastSnapshot.days.filter((x) => x.tmax !== null && x.tmin !== null);
    if (!days.length) { els.chart.innerHTML = ""; return; }
    const W = 620, H = 150, PL = 44, PR = 12, PT = 12, PB = 30;
    const min = Math.min(...days.map((x) => x.tmin));
    const max = Math.max(...days.map((x) => x.tmax));
    const span = (max - min) || 1;
    const lo = min - span * 0.2, hi = max + span * 0.2;
    const n = days.length;
    const X = (i) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
    const Y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    const bars = days.map((x, i) => {
      const cx = X(i).toFixed(1);
      return `<line x1="${cx}" y1="${Y(x.tmax).toFixed(1)}" x2="${cx}" y2="${Y(x.tmin).toFixed(1)}" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.55">` +
        `<title>${escapeHTML(x.date)}: ${Math.round(x.tmin)}° to ${Math.round(x.tmax)}°C${x.pp !== null ? `, ${Math.round(x.pp)}% precipitation` : ""}</title></line>` +
        `<circle cx="${cx}" cy="${Y(x.tmax).toFixed(1)}" r="3.4" fill="currentColor"/>`;
    }).join("");
    const dow = days.map((x, i) =>
      `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="currentColor" opacity="0.55" font-family="monospace">${i === 0 ? "Today" : weekday(x.date)}</text>`
    ).join("");
    els.chart.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Seven-day forecast temperature range for ${escapeHTML(lastSnapshot.label)}">` +
      `<line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="currentColor" opacity="0.25"/>${bars}${dow}</svg>`;
  }

  function setMeta(el, text) { if (el) el.textContent = text; }
  function fmtLat(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "N" : "S"}`; }
  function fmtLon(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "E" : "W"}`; }
  function say(text) { if (els.status) els.status.textContent = text; }
  function setBusy(b) { if (els.locate) els.locate.disabled = b; }

  /* ----- Exports (from the held forecast response — no extra calls) ----- */
  function placeSlug(s) {
    return String(s).split(",")[0].toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "place";
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

  function fmtVal(v, digits) {
    return (typeof v === "number" && Number.isFinite(v)) ? v.toFixed(digits) : "";
  }

  function exportSnapshotCSV() {
    if (!lastSnapshot) return;
    const s = lastSnapshot;
    const lines = [
      "# Earth / Now snapshot export (current conditions, UTF-8)",
      `# Place,${s.label}`,
      `# Latitude,${s.lat}`,
      `# Longitude,${s.lon}`,
      `# Data timestamp,${s.time}`,
      `# Model,${s.model}`,
      `# Source,Open-Meteo forecast + CAMS air quality`,
      `# Note,Forecast values for the selected place; not station observations`,
      ["metric", "value", "unit"].map(csvCell).join(","),
      ["condition", s.cond, ""].map(csvCell).join(","),
      ["temperature", fmtVal(s.temp, 1), "°C"].map(csvCell).join(","),
      ["apparent_temperature", fmtVal(s.feels, 1), "°C"].map(csvCell).join(","),
      ["relative_humidity", s.humidity === null ? "" : Math.round(s.humidity), "%"].map(csvCell).join(","),
      ["wind_speed_10m", fmtVal(s.wind, 1), "km/h"].map(csvCell).join(","),
      ["precipitation_probability", s.precipProb === null ? "" : Math.round(s.precipProb), "%"].map(csvCell).join(","),
      ["uv_index", fmtVal(s.uv, 1), ""].map(csvCell).join(","),
      ["pm2_5", fmtVal(s.pm25, 1), "µg/m³"].map(csvCell).join(","),
      ["us_aqi", s.aqi === null ? "" : Math.round(s.aqi), ""].map(csvCell).join(",")
    ];
    downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      `earth-now-${placeSlug(s.label)}-snapshot.csv`);
  }

  function exportForecastCSV() {
    if (!lastSnapshot) return;
    const s = lastSnapshot;
    const lines = [
      "# Earth / Now 7-day forecast export (UTF-8)",
      `# Place,${s.label}`,
      `# Latitude,${s.lat}`,
      `# Longitude,${s.lon}`,
      `# Model,${s.model}`,
      `# Source,Open-Meteo forecast`,
      `# Note,Forecast values for the selected place; not measured data or station observations`,
      ["date", "tmin_c", "tmax_c", "precipitation_probability_pct", "condition"].map(csvCell).join(",")
    ];
    s.days.forEach((d) => {
      lines.push([
        d.date,
        d.tmin === null ? "" : Math.round(d.tmin),
        d.tmax === null ? "" : Math.round(d.tmax),
        d.pp === null ? "" : Math.round(d.pp),
        d.cond || ""
      ].map(csvCell).join(","));
    });
    downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
      `earth-now-${placeSlug(s.label)}-forecast-7day.csv`);
  }

  function xmlEsc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function exportChartPNG() {
    if (!lastSnapshot) return;
    const s = lastSnapshot;
    const days = s.days.filter((x) => x.tmax !== null && x.tmin !== null);
    if (!days.length) { say("No forecast values available to export."); return; }
    const W = 1600, H = 900, PL = 170, PR = 90, PT = 250, PB = 210;
    const min = Math.min(...days.map((x) => x.tmin));
    const max = Math.max(...days.map((x) => x.tmax));
    const span = (max - min) || 1;
    const lo = min - span * 0.15, hi = max + span * 0.15;
    const n = days.length;
    const X = (i) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
    const Y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
    let bars = "", labels = "";
    days.forEach((x, i) => {
      const cx = X(i).toFixed(1);
      bars += `<line x1="${cx}" y1="${Y(x.tmax).toFixed(1)}" x2="${cx}" y2="${Y(x.tmin).toFixed(1)}" stroke="#33573F" stroke-width="14" stroke-linecap="round" opacity="0.65"/>` +
        `<circle cx="${cx}" cy="${Y(x.tmax).toFixed(1)}" r="9" fill="#33573F"/>` +
        `<text x="${cx}" y="${(Y(x.tmax) - 22).toFixed(1)}" text-anchor="middle" font-size="26" fill="#1F2521" font-family="monospace">${Math.round(x.tmax)}°</text>`;
      labels += `<text x="${cx}" y="${H - 168}" text-anchor="middle" font-size="22" fill="#5a635c" font-family="monospace">${i === 0 ? "Today" : xmlEsc(weekday(x.date))}</text>`;
    });
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<rect width="${W}" height="${H}" fill="#FAF8F2"/>` +
      `<text x="90" y="80" font-size="26" letter-spacing="4" fill="#33573F" font-family="monospace">EARTH / NOW · ARKRAJ BISWAS</text>` +
      `<text x="90" y="142" font-size="50" fill="#1F2521" font-family="Georgia, serif">7-day forecast: daily min–max temperature</text>` +
      `<text x="90" y="192" font-size="30" fill="#49534C" font-family="Georgia, serif" font-style="italic">${xmlEsc(s.label)} · ${xmlEsc(fmtLat(s.lat))}, ${xmlEsc(fmtLon(s.lon))}</text>` +
      `<line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="#1F2521" stroke-opacity="0.3" stroke-width="2"/>` +
      bars + labels +
      `<text x="90" y="${H - 92}" font-size="24" fill="#49534C" font-family="Arial, sans-serif">°C · ${xmlEsc(s.model)} via Open-Meteo · Air quality: CAMS (values shown where returned)</text>` +
      `<text x="90" y="${H - 58}" font-size="22" fill="#83877F" font-family="Arial, sans-serif">Forecast values for the selected place, not station observations. Exported ${new Date().toISOString().slice(0, 10)}.</text>` +
      `</svg>`;
    svgToPng(svg, W, H, `earth-now-${placeSlug(s.label)}-forecast-7day.png`)
      .catch(() => say("Chart export failed — please try again."));
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

  /* ----- Small factual mappings (standard scales) ----- */
  function weatherLabel(code) {
    const w = Number(code);
    if (Number.isNaN(w)) return "Current conditions";
    if (w === 0) return "Clear sky";
    if (w === 1) return "Mainly clear";
    if (w === 2) return "Partly cloudy";
    if (w === 3) return "Overcast";
    if (w === 45 || w === 48) return "Fog";
    if (w <= 57) return "Drizzle";
    if (w <= 67) return "Rain";
    if (w <= 77) return "Snow";
    if (w <= 82) return "Showers";
    if (w === 85 || w === 86) return "Snow showers";
    if (w >= 95) return "Thunderstorm";
    return "Current conditions";
  }

  // WHO-aligned UV bands, reported descriptively
  function uvLabel(uv) {
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very high";
    return "Extreme";
  }

  // US EPA AQI bands, reported descriptively
  function aqiLabel(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Sensitive groups take care";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very unhealthy";
    return "Hazardous";
  }

  /* ----- Helpers ----- */
  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function round2(v) { return Math.round(Number(v) * 100) / 100; }
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function weekday(iso) {
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString("en", { weekday: "short" });
    } catch (e) { return ""; }
  }
  function hourIndex(times, currentIso) {
    if (!times || !times.length || !currentIso) return -1;
    const prefix = String(currentIso).slice(0, 13); // "YYYY-MM-DDTHH"
    const i = times.findIndex((t) => String(t).slice(0, 13) === prefix);
    return i >= 0 ? i : times.length - 1;
  }
})();

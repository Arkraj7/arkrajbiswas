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
      mPm: document.getElementById("mPm")
    };
    if (!els.place || !els.locate) return; // section absent on other pages

    els.locate.addEventListener("click", onLocate);
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
  }

  function setMeta(el, text) { if (el) el.textContent = text; }
  function fmtLat(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "N" : "S"}`; }
  function fmtLon(v) { return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "E" : "W"}`; }
  function say(text) { if (els.status) els.status.textContent = text; }
  function setBusy(b) { if (els.locate) els.locate.disabled = b; }

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

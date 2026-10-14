/* ============================================================
   Earth / Now — live micrometeorology & CAMS air quality station.
   First paint: New Delhi telemetry (static fallback values in markup
   are replaced by live ECMWF IFS HRES + CAMS data on load).
   Psychrometrics: Stull (2011) wet-bulb, Tetens VPD, Magnus dew point.
   ============================================================ */
(function () {
  'use strict';

  var WMO_CODES = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Radiation fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Light rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with hail'
  };

  // Initial fallback state for New Delhi so the page is populated on frame 1
  var state = {
    lat: 28.6139,
    lon: 77.2090,
    label: 'New Delhi, India',
    unit: 'C', // 'C' or 'K'
    raw: null
  };

  /* --- Scientific Formulas --- */
  function calcWetBulbStull(T, RH) {
    var r = Math.max(1, Math.min(100, RH));
    return (
      T * Math.atan(0.151977 * Math.sqrt(r + 8.313659)) +
      Math.atan(T + r) -
      Math.atan(r - 1.676331) +
      0.00391838 * Math.pow(r, 1.5) * Math.atan(0.023101 * r) -
      4.686035
    );
  }

  function calcVPD(T, RH) {
    var es = 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
    var ea = es * (Math.max(0, Math.min(100, RH)) / 100);
    return Math.max(0, es - ea);
  }

  function calcDewPoint(T, RH) {
    var r = Math.max(1, Math.min(100, RH)) / 100;
    var gamma = (17.27 * T) / (237.3 + T) + Math.log(r);
    return (237.3 * gamma) / (17.27 - gamma);
  }

  function compassDir(deg) {
    if (deg == null) return '';
    var dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  function fmtTemp(tempC, includeUnit) {
    if (includeUnit === undefined) includeUnit = true;
    if (tempC == null || isNaN(tempC)) return '—';
    if (state.unit === 'K') {
      var k = (Number(tempC) + 273.15).toFixed(1);
      return includeUnit ? k + ' K' : k;
    }
    var c = Number(tempC).toFixed(1);
    return includeUnit ? c + ' °C' : c;
  }

  function fetchStationTelemetry(lat, lon, label) {
    state.lat = lat;
    state.lon = lon;
    state.label = label;

    var obsEl = document.getElementById('en-obs-time');
    if (obsEl) obsEl.textContent = 'SYNCING ECMWF + CAMS…';

    var weatherUrl =
      'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
      '&timezone=auto';

    var airUrl =
      'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon +
      '&current=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto';

    Promise.all([
      fetch(weatherUrl),
      fetch(airUrl).catch(function () { return null; })
    ]).then(function (results) {
      var wRes = results[0], aRes = results[1];
      if (!wRes.ok) throw new Error('Weather HTTP ' + wRes.status);
      return Promise.all([
        wRes.json(),
        aRes && aRes.ok ? aRes.json() : { current: {} }
      ]);
    }).then(function (parsed) {
      state.raw = { weather: parsed[0], air: parsed[1] };
      renderStation();
    }).catch(function () {
      if (obsEl) obsEl.textContent = 'CACHED SYNOPTIC BASELINE';
    });
  }

  function renderStation() {
    if (!state.raw) return;
    var weather = state.raw.weather, air = state.raw.air;
    var c = weather.current;
    var aq = air.current || {};

    var T = c.temperature_2m;
    var RH = c.relative_humidity_2m;
    var Tw = calcWetBulbStull(T, RH);
    var vpd = calcVPD(T, RH);
    var Td = calcDewPoint(T, RH);

    var ns = state.lat >= 0 ? 'N' : 'S';
    var ew = state.lon >= 0 ? 'E' : 'W';
    var elev = weather.elevation != null ? ' · Elev ' + Math.round(weather.elevation) + ' m' : '';

    document.getElementById('en-place-title').textContent = state.label;
    document.getElementById('en-coord-text').textContent =
      Math.abs(state.lat).toFixed(2) + '°' + ns + ', ' + Math.abs(state.lon).toFixed(2) + '°' + ew + elev;
    document.getElementById('en-obs-time').textContent = 'ECMWF IFS · ' + (weather.timezone_abbreviation || 'LOCAL');

    var unitStr = state.unit === 'K' ? ' K' : ' °C';
    document.getElementById('en-drybulb-val').innerHTML = fmtTemp(T, false) + '<small>' + unitStr + '</small>';
    document.getElementById('en-sky-desc').textContent =
      (WMO_CODES[c.weather_code] || 'Observed state') + ' · Dry-bulb air temperature (2 m)';

    // Wet-Bulb Readout & Physiological Threshold
    document.getElementById('en-wetbulb-val').textContent = fmtTemp(Tw, true);
    var twTag = document.getElementById('en-wetbulb-tag');
    if (Tw >= 30) {
      twTag.textContent = 'Extreme heat-stress threshold';
      twTag.style.color = '#b2182b';
    } else if (Tw >= 25) {
      twTag.textContent = 'Elevated thermal load';
      twTag.style.color = '#d96b27';
    } else {
      twTag.textContent = 'Normal evaporative cooling';
      twTag.style.color = '';
    }

    // VPD Readout & Canopy Stomatal Regime
    document.getElementById('en-vpd-val').textContent = vpd.toFixed(2) + ' kPa';
    var vpdTag = document.getElementById('en-vpd-tag');
    if (vpd > 1.6) {
      vpdTag.textContent = 'High demand (stomatal closure risk)';
      vpdTag.style.color = '#d96b27';
    } else if (vpd < 0.4) {
      vpdTag.textContent = 'Humid boundary (low transpiration)';
      vpdTag.style.color = '';
    } else {
      vpdTag.textContent = 'Optimal canopy conductance range';
      vpdTag.style.color = '#2e6b47';
    }

    // 8-Cell Telemetry Matrix
    document.getElementById('en-dd-feels').innerHTML =
      fmtTemp(c.apparent_temperature, true) + '<span class="en-dl-sub">Dew point: ' + fmtTemp(Td, true) + '</span>';

    var pm25 = aq.pm2_5;
    var whoRatio = pm25 != null ? (pm25 / 15).toFixed(1) : null;
    document.getElementById('en-dd-pm25').innerHTML =
      pm25 != null
        ? pm25.toFixed(1) + ' µg/m³<span class="en-dl-sub">' + whoRatio + '× WHO 24h guideline (15 µg/m³)</span>'
        : '—<span class="en-dl-sub">CAMS grid updating</span>';

    var pm10 = aq.pm10 != null ? aq.pm10.toFixed(0) + ' µg/m³' : '—';
    var no2 = aq.nitrogen_dioxide != null ? 'NO₂: ' + aq.nitrogen_dioxide.toFixed(1) + ' µg/m³' : 'O₃/NO₂ nominal';
    document.getElementById('en-dd-pm10').innerHTML = pm10 + '<span class="en-dl-sub">' + no2 + '</span>';

    document.getElementById('en-dd-rh').innerHTML =
      RH + ' %<span class="en-dl-sub">Cloud cover: ' + (c.cloud_cover != null ? c.cloud_cover : 0) + '%</span>';

    var wsMs = (c.wind_speed_10m / 3.6).toFixed(1);
    var wDir = compassDir(c.wind_direction_10m);
    document.getElementById('en-dd-wind').innerHTML =
      c.wind_speed_10m.toFixed(1) + ' km/h<span class="en-dl-sub">' + (c.wind_direction_10m != null ? c.wind_direction_10m : 0) + '° ' + wDir + ' · ' + wsMs + ' m/s</span>';

    document.getElementById('en-dd-precip').innerHTML =
      c.precipitation.toFixed(1) + ' mm<span class="en-dl-sub">Current synoptic hour</span>';

    var uv = c.uv_index != null ? c.uv_index.toFixed(1) : '—';
    var uvCat = c.uv_index >= 8 ? 'Very high photolysis' : c.uv_index >= 5 ? 'Moderate irradiance' : 'Low solar zenith';
    document.getElementById('en-dd-uv').innerHTML = uv + '<span class="en-dl-sub">' + uvCat + '</span>';

    var sp = c.surface_pressure != null ? c.surface_pressure.toFixed(1) + ' hPa' : '—';
    var msl = c.pressure_msl != null ? 'SLP: ' + c.pressure_msl.toFixed(1) + ' hPa' : '';
    document.getElementById('en-dd-press').innerHTML = sp + '<span class="en-dl-sub">' + msl + '</span>';

    // 7-Day Synoptic Diurnal Envelope
    var daily = weather.daily;
    if (daily && daily.time) {
      var allMin = Math.min.apply(null, daily.temperature_2m_min);
      var allMax = Math.max.apply(null, daily.temperature_2m_max);
      var span = Math.max(1, allMax - allMin);

      var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      var rowsHtml = daily.time.slice(0, 7).map(function (dateStr, i) {
        var dObj = new Date(dateStr + 'T00:00:00');
        var dLabel = i === 0 ? 'Today' : dayNames[dObj.getDay()];
        var tmin = daily.temperature_2m_min[i];
        var tmax = daily.temperature_2m_max[i];
        var rain = daily.precipitation_sum[i] || 0;
        var leftPct = ((tmin - allMin) / span) * 100;
        var widthPct = Math.max(6, ((tmax - tmin) / span) * 100);

        return (
          '<div class="en-fc-row">' +
            '<span class="en-fc-day">' + dLabel + '</span>' +
            '<span class="en-fc-min">' + fmtTemp(tmin, false) + '°</span>' +
            '<div class="en-fc-bar-track" aria-hidden="true">' +
              '<div class="en-fc-bar-fill" style="left:' + leftPct.toFixed(1) + '%;width:' + widthPct.toFixed(1) + '%"></div>' +
            '</div>' +
            '<span class="en-fc-max">' + fmtTemp(tmax, false) + '°</span>' +
            '<span class="en-fc-rain">' + (rain > 0 ? rain.toFixed(1) + ' mm' : '0.0 mm') + '</span>' +
          '</div>'
        );
      }).join('');
      document.getElementById('en-forecast-list').innerHTML = rowsHtml;
    }
  }

  /* --- UI Event Listeners --- */
  // 1. Station Preset Pills
  var presetBtns = document.querySelectorAll('#en-preset-group button[data-lat]');
  for (var i = 0; i < presetBtns.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var all = document.querySelectorAll('#en-preset-group button');
        for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-pressed', 'true');
        fetchStationTelemetry(
          parseFloat(btn.getAttribute('data-lat')),
          parseFloat(btn.getAttribute('data-lon')),
          btn.getAttribute('data-label')
        );
      });
    })(presetBtns[i]);
  }

  // 2. Browser Geolocation ("Use my location")
  var locateBtn = document.getElementById('en-locate-btn');
  if (locateBtn) {
    locateBtn.addEventListener('click', function () {
      if (!navigator.geolocation) return;
      locateBtn.textContent = '◎ Locating…';
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          var all = document.querySelectorAll('#en-preset-group button');
          for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', 'false');
          locateBtn.setAttribute('aria-pressed', 'true');
          locateBtn.textContent = '◎ Local Coordinates';
          fetchStationTelemetry(pos.coords.latitude, pos.coords.longitude, 'Local Atmospheric Station');
        },
        function () {
          locateBtn.textContent = '◎ Location blocked';
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    });
  }

  // 3. Unit Toggle (°C / K)
  var unitBtns = document.querySelectorAll('[data-en-unit]');
  for (var k = 0; k < unitBtns.length; k++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var all = document.querySelectorAll('[data-en-unit]');
        for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-pressed', 'true');
        state.unit = btn.getAttribute('data-en-unit');
        renderStation();
      });
    })(unitBtns[k]);
  }

  // 4. Debounced Geocoding Search
  var searchInput = document.getElementById('en-search-input');
  var searchList = document.getElementById('en-search-list');
  var debounceTimer = null;

  if (searchInput && searchList) {
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = searchInput.value.trim();
      if (q.length < 2) {
        searchList.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(function () {
        fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=5').then(function (res) {
          return res.json();
        }).then(function (data) {
          if (!data.results || !data.results.length) {
            searchList.innerHTML = '';
            return;
          }
          searchList.innerHTML = data.results.map(function (loc) {
            var region = [loc.admin1, loc.country].filter(Boolean).join(', ');
            return (
              '<li>' +
                '<button type="button" data-lat="' + loc.latitude + '" data-lon="' + loc.longitude + '" data-label="' + loc.name + ', ' + (loc.country || '') + '">' +
                  '<span><strong>' + loc.name + '</strong> <small style="opacity:0.7">' + region + '</small></span>' +
                  '<span style="font-family:ui-monospace,monospace;font-size:0.72rem;opacity:0.65">' + loc.latitude.toFixed(1) + '°, ' + loc.longitude.toFixed(1) + '°</span>' +
                '</button>' +
              '</li>'
            );
          }).join('');

          var itemBtns = searchList.querySelectorAll('button');
          for (var m = 0; m < itemBtns.length; m++) {
            (function (itemBtn) {
              itemBtn.addEventListener('click', function () {
                var all = document.querySelectorAll('#en-preset-group button');
                for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', 'false');
                searchList.innerHTML = '';
                searchInput.value = '';
                fetchStationTelemetry(
                  parseFloat(itemBtn.getAttribute('data-lat')),
                  parseFloat(itemBtn.getAttribute('data-lon')),
                  itemBtn.getAttribute('data-label')
                );
              });
            })(itemBtns[m]);
          }
        }).catch(function () {
          searchList.innerHTML = '';
        });
      }, 260);
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.en-search-wrap')) searchList.innerHTML = '';
    });
  }

  // Initialize New Delhi immediately on load
  fetchStationTelemetry(state.lat, state.lon, state.label);
})();

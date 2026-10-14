#!/usr/bin/env python3
"""Fetch daily historical weather data for 16 Indian cities from Open-Meteo ERA5
and store as validated local JSON bundles for the Climate Lens.

Cities (canonical names + verified coordinates):
  New Delhi, Bengaluru, Mumbai, Chennai, Kolkata, Hyderabad, Ahmedabad,
  Jaipur, Lucknow, Guwahati, Srinagar, Bhopal, Bhubaneswar, Kochi, Pune, Etawah

Source: Open-Meteo Historical Weather API (ERA5 model)
Period: 2001-01-01 to latest available date
Variables: temperature_2m_mean, precipitation_sum, relative_humidity_2m_mean, shortwave_radiation_sum
Timezone: Asia/Kolkata for local-day aggregation

Validation:
- Chronological dates, no duplicates
- Correct value counts per variable
- Humidity 0-100%, physically plausible ranges
- Coverage metrics per year
- Missing value tracking
"""
import datetime
import json
import os
import sys
import time
import urllib.request

# Cities already fetched: new-delhi, bengaluru, mumbai, chennai, hyderabad, jaipur, kochi, kolkata, etawah, pune, ahmedabad
# Missing: lucknow, guwahati, srinagar, bhopal, bhubaneswar
CITIES = [
    {"id": "lucknow", "name": "Lucknow", "lat": 26.8467, "lon": 80.9462, "state": "Uttar Pradesh"},
    {"id": "guwahati", "name": "Guwahati", "lat": 26.1445, "lon": 91.7362, "state": "Assam"},
    {"id": "srinagar", "name": "Srinagar", "lat": 34.0837, "lon": 74.7973, "state": "Jammu and Kashmir"},
    {"id": "bhopal", "name": "Bhopal", "lat": 23.2599, "lon": 77.4126, "state": "Madhya Pradesh"},
    {"id": "bhubaneswar", "name": "Bhubaneswar", "lat": 20.2961, "lon": 85.8245, "state": "Odisha"},
]

START_DATE = "2001-01-01"
VARIABLES = [
    "temperature_2m_mean",
    "precipitation_sum",
    "relative_humidity_2m_mean",
    "shortwave_radiation_sum",
]
TIMEZONE = "Asia/Kolkata"
MODEL = "era5"
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "data", "india-climate")

def fail(msg):
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)

def warn(msg):
    print(f"WARNING: {msg}", file=sys.stderr)

def fetch_city(city):
    today = datetime.date.today().isoformat()
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={city['lat']}&longitude={city['lon']}"
        f"&start_date={START_DATE}&end_date={today}"
        f"&daily={','.join(VARIABLES)}"
        f"&timezone={TIMEZONE}&models={MODEL}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "ArkrajBiswas-site/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            status = getattr(res, "status", None) or 200
            if status != 200:
                raise Exception(f"HTTP {status}")
            raw = res.read().decode("utf-8", "replace")
    except Exception as exc:
        raise Exception(f"download failed: {exc}")

    if "<html" in raw[:2000].lower():
        raise Exception("response looks like an error page")

    data = json.loads(raw)
    daily = data.get("daily", {})
    if not daily or "time" not in daily:
        raise Exception("no daily data in response")

    # Validate structure
    dates = daily.get("time", [])
    if not dates:
        raise Exception("empty date array")

    for v in VARIABLES:
        if v not in daily:
            raise Exception(f"missing variable {v}")
        if len(daily[v]) != len(dates):
            raise Exception(f"length mismatch for {v}")

    # Check for duplicate dates
    if len(dates) != len(set(dates)):
        raise Exception("duplicate dates found")

    # Check chronological order
    if dates != sorted(dates):
        raise Exception("dates not in chronological order")

    # Validate value ranges
    for i, d in enumerate(dates):
        # Temperature: -50 to 60 C
        t = daily["temperature_2m_mean"][i]
        if t is not None and (t < -50 or t > 60):
            raise Exception(f"implausible temperature {t} on {d}")

        # Precipitation: 0 to 1000 mm/day
        p = daily["precipitation_sum"][i]
        if p is not None and (p < 0 or p > 1000):
            raise Exception(f"implausible precipitation {p} on {d}")

        # Humidity: 0-100%
        h = daily["relative_humidity_2m_mean"][i]
        if h is not None and (h < 0 or h > 100):
            raise Exception(f"implausible humidity {h} on {d}")

        # Solar radiation: 0 to 50 MJ/m2/day
        s = daily["shortwave_radiation_sum"][i]
        if s is not None and (s < 0 or s > 50):
            raise Exception(f"implausible solar radiation {s} on {d}")

    # Calculate coverage metrics
    first_date = dates[0]
    last_date = dates[-1]

    # Annual coverage
    years = {}
    for i, d in enumerate(dates):
        y = int(d[:4])
        if y not in years:
            years[y] = {"total": 0, "temp": 0, "precip": 0, "rh": 0, "solar": 0}
        years[y]["total"] += 1
        if daily["temperature_2m_mean"][i] is not None:
            years[y]["temp"] += 1
        if daily["precipitation_sum"][i] is not None:
            years[y]["precip"] += 1
        if daily["relative_humidity_2m_mean"][i] is not None:
            years[y]["rh"] += 1
        if daily["shortwave_radiation_sum"][i] is not None:
            years[y]["solar"] += 1

    # Expected days per year (accounting for leap years)
    def is_leap(y):
        return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)

    annual_coverage = {}
    for y, counts in years.items():
        expected = 366 if is_leap(y) else 365
        annual_coverage[y] = {
            "expected_days": expected,
            "temp_pct": round(counts["temp"] / expected * 100, 1) if expected else 0,
            "precip_pct": round(counts["precip"] / expected * 100, 1) if expected else 0,
            "rh_pct": round(counts["rh"] / expected * 100, 1) if expected else 0,
            "solar_pct": round(counts["solar"] / expected * 100, 1) if expected else 0,
        }

    # Missing value counts
    missing = {v: sum(1 for x in daily[v] if x is None) for v in VARIABLES}

    # API returned grid cell coordinates (may differ slightly from requested)
    returned_lat = data.get("latitude", city["lat"])
    returned_lon = data.get("longitude", city["lon"])

    payload = {
        "metadata": {
            "city": city["name"],
            "city_id": city["id"],
            "state": city["state"],
            "requested_coordinates": {"lat": city["lat"], "lon": city["lon"]},
            "returned_coordinates": {"lat": returned_lat, "lon": returned_lon},
            "source": "Open-Meteo Historical Weather API",
            "model": MODEL,
            "timezone": TIMEZONE,
            "variables": {
                "temperature_2m_mean": "°C",
                "precipitation_sum": "mm",
                "relative_humidity_2m_mean": "%",
                "shortwave_radiation_sum": "MJ/m²",
            },
            "period": {"start": first_date, "end": last_date},
            "retrieved": datetime.date.today().isoformat(),
            "missing_counts": missing,
            "annual_coverage": annual_coverage,
            "notes": "ERA5 reanalysis at ~0.25° (~25 km) grid. Not station observations. "
                     "Daily values aggregated to local calendar day in Asia/Kolkata timezone. "
                     "Coverage percentages show valid days per year.",
        },
        "daily": {
            "date": dates,
            "temperature_2m_mean": daily["temperature_2m_mean"],
            "precipitation_sum": daily["precipitation_sum"],
            "relative_humidity_2m_mean": daily["relative_humidity_2m_mean"],
            "shortwave_radiation_sum": daily["shortwave_radiation_sum"],
        },
    }

    return payload

def write_city_file(city_id, payload):
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"{city_id}.json")
    tmp = out_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f)
        f.write("\n")
    # Idempotent: only replace if content actually changed
    if os.path.exists(out_path):
        with open(out_path, encoding="utf-8") as f:
            old = f.read()
        with open(tmp, encoding="utf-8") as f:
            new = f.read()
        if old == new:
            os.remove(tmp)
            return False
    os.replace(tmp, out_path)
    return True

def main():
    print("Fetching climate data for 16 Indian cities from Open-Meteo ERA5...")
    print(f"Output directory: {OUT_DIR}")
    print()

    success_count = 0
    for city in CITIES:
        print(f"  {city['name']} ({city['lat']:.4f}, {city['lon']:.4f})...", end=" ", flush=True)
        try:
            payload = fetch_city(city)
            changed = write_city_file(city["id"], payload)
            if changed:
                print(f"OK (updated)")
            else:
                print(f"OK (unchanged)")
            success_count += 1
        except Exception as exc:
            print(f"FAILED: {exc}")
        time.sleep(10)  # Rate limiting: be nice to the API

    print()
    print(f"Completed: {success_count}/{len(CITIES)} cities successful")

    if success_count == 0:
        fail("All cities failed — no data written")

    # Write catalog file (all 16 cities)
    ALL_CITIES = [
        {"id": "new-delhi", "name": "New Delhi", "lat": 28.6139, "lon": 77.2090, "state": "Delhi"},
        {"id": "bengaluru", "name": "Bengaluru", "lat": 12.9716, "lon": 77.5946, "state": "Karnataka"},
        {"id": "mumbai", "name": "Mumbai", "lat": 19.0760, "lon": 72.8777, "state": "Maharashtra"},
        {"id": "chennai", "name": "Chennai", "lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu"},
        {"id": "kolkata", "name": "Kolkata", "lat": 22.5726, "lon": 88.3639, "state": "West Bengal"},
        {"id": "hyderabad", "name": "Hyderabad", "lat": 17.3850, "lon": 78.4867, "state": "Telangana"},
        {"id": "ahmedabad", "name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714, "state": "Gujarat"},
        {"id": "jaipur", "name": "Jaipur", "lat": 26.9124, "lon": 75.7873, "state": "Rajasthan"},
        {"id": "lucknow", "name": "Lucknow", "lat": 26.8467, "lon": 80.9462, "state": "Uttar Pradesh"},
        {"id": "guwahati", "name": "Guwahati", "lat": 26.1445, "lon": 91.7362, "state": "Assam"},
        {"id": "srinagar", "name": "Srinagar", "lat": 34.0837, "lon": 74.7973, "state": "Jammu and Kashmir"},
        {"id": "bhopal", "name": "Bhopal", "lat": 23.2599, "lon": 77.4126, "state": "Madhya Pradesh"},
        {"id": "bhubaneswar", "name": "Bhubaneswar", "lat": 20.2961, "lon": 85.8245, "state": "Odisha"},
        {"id": "kochi", "name": "Kochi", "lat": 9.9312, "lon": 76.2673, "state": "Kerala"},
        {"id": "pune", "name": "Pune", "lat": 18.5204, "lon": 73.8567, "state": "Maharashtra"},
        {"id": "etawah", "name": "Etawah", "lat": 26.7700, "lon": 79.0000, "state": "Uttar Pradesh"},
    ]
    catalog = {
        "metadata": {
            "description": "India Climate Explorer — validated daily ERA5 reanalysis for 16 Indian cities",
            "source": "Open-Meteo Historical Weather API (ERA5 model)",
            "model": MODEL,
            "timezone": TIMEZONE,
            "period_start": START_DATE,
            "retrieved": datetime.date.today().isoformat(),
            "cities": [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "state": c["state"],
                    "coordinates": {"lat": c["lat"], "lon": c["lon"]},
                }
                for c in ALL_CITIES
            ],
            "variables": {
                "temperature_2m_mean": {"unit": "°C", "description": "Daily mean temperature"},
                "precipitation_sum": {"unit": "mm", "description": "Daily precipitation total"},
                "relative_humidity_2m_mean": {"unit": "%", "description": "Daily mean relative humidity"},
                "shortwave_radiation_sum": {"unit": "MJ/m²", "description": "Daily shortwave radiation total"},
            },
            "coverage_rules": {
                "temperature_annual_mean": ">=98% valid days",
                "humidity_annual_mean": ">=98% valid days",
                "precipitation_annual_total": "100% valid days (complete years only)",
                "solar_annual_total": "100% valid days (complete years only)",
            },
        },
        "cities": {c["id"]: f"{c['id']}.json" for c in ALL_CITIES},
    }
    catalog_path = os.path.join(OUT_DIR, "catalog.json")
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")
    print(f"Catalog written to {catalog_path}")

if __name__ == "__main__":
    main()
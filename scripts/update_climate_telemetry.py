#!/usr/bin/env python3
"""
Fetches NASA GISTEMP v4 (GLB.Ts+dSST.csv) server-side and updates
assets/data/climate-telemetry.json without browser CORS restrictions.

CSV layout (verified live):
  Year,Jan,Feb,...,Dec,J-D,D-N,DJF,...  values in deg C vs 1951-1980,
  "***" marks missing months.

Rules:
- Use monthly columns 1-12 only (never J-D / seasonal means).
- Only overwrite years with all 12 valid months (complete years).
- Preserve projection / partial-year rows (e.g. 2026) and all enso_oni.
- preind = gistemp + 0.26 (documented offset).
- Never fabricate a year; fail loudly on download/parse errors.
"""
import csv
import datetime
import json
import pathlib
import urllib.request

DATA_PATH = pathlib.Path("assets/data/climate-telemetry.json")
GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
PREIND_OFFSET = 0.26

def main():
    existing = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    series = existing.get("annual_series", [])
    if not series:
        raise SystemExit("existing annual_series empty; refusing to overwrite")
    enso_lookup = {row["year"]: row.get("enso_oni", 0.0) for row in series}
    old_by_year = {row["year"]: row for row in series}

    req = urllib.request.Request(
        GISTEMP_URL,
        headers={"User-Agent": "arkrajbiswas.com-research-telemetry/2.0"}
    )
    raw_csv = urllib.request.urlopen(req, timeout=25).read().decode("utf-8")
    lines = [line for line in raw_csv.splitlines() if line and line[:4].isdigit()]

    updated = 0
    for row in csv.reader(lines):
        try:
            yr = int(row[0])
        except ValueError:
            continue
        if yr < 1940:
            continue
        if len(row) < 13:
            continue
        monthly_cells = row[1:13]
        if any("*" in (c or "") for c in monthly_cells):
            continue  # partial year: keep existing projection row untouched
        try:
            monthly_vals = [float(c) for c in monthly_cells]
        except ValueError:
            continue
        gistemp_mean = round(sum(monthly_vals) / 12.0, 2)
        preind_mean = round(gistemp_mean + PREIND_OFFSET, 2)
        old = old_by_year.get(yr)
        if old is None:
            old_by_year[yr] = {"year": yr, "gistemp": gistemp_mean,
                               "preind": preind_mean,
                               "enso_oni": enso_lookup.get(yr, 0.0)}
            updated += 1
        elif abs(old.get("gistemp", 999) - gistemp_mean) > 0.001:
            old["gistemp"] = gistemp_mean
            old["preind"] = preind_mean
            updated += 1

    if updated:
        merged = [old_by_year[y] for y in sorted(old_by_year)]
        existing["annual_series"] = merged
        existing["metadata"]["updated_utc"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        DATA_PATH.write_text(json.dumps(existing, indent=2), encoding="utf-8")
        print(f"Updated {updated} complete year(s); series now {merged[0]['year']}->{merged[-1]['year']} ({len(merged)} rows).")
    else:
        print("No complete-year changes; existing file kept.")

if __name__ == "__main__":
    main()

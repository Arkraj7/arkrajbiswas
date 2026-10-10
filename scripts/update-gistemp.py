#!/usr/bin/env python3
"""Fetch NASA GISTEMP v4 global-mean monthly Land-Ocean Temperature Index
(LOTI) and normalize it into a compact JSON bundle for the website.

Source: https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt
Docs:   https://power.larc.nasa.gov/docs/  (no) -> https://data.giss.nasa.gov/gistemp/data_v4.html

Rules enforced here (not in the browser):
- Reject HTML error pages and unexpected layouts.
- Parse the real header: units 0.01 C, baseline 1951-1980.
- Read ONLY the twelve monthly columns; never seasonal/annual summaries.
- Reject "***" / "****" / "*****" sentinel values (missing months).
- Require unique, chronological YYYY-MM keys.
- Annual value = official J-D column when valid, else day-weighted mean
  of the twelve valid months; a year counts only with all 12 valid.
- Never fabricate a month or a year.

Usage:  python scripts/update-gistemp.py
Output: assets/data/gistemp-global-monthly.json (only replaced on success)
Stdlib only.
"""
import datetime
import json
import os
import sys
import urllib.request

SOURCE_URL = ("https://data.giss.nasa.gov/gistemp/tabledata_v4/"
              "GLB.Ts+dSST.txt")
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), "assets", "data",
    "gistemp-global-monthly.json")
DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def fail(msg):
    print("update-gistemp: ERROR: " + msg, file=sys.stderr)
    sys.exit(1)


def main():
    req = urllib.request.Request(
        SOURCE_URL, headers={"User-Agent": "ArkrajBiswas-site/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            # file:// and some handlers report no status; None means no HTTP error.
            status = getattr(res, "status", None) or 200
            if status != 200:
                fail(f"HTTP {status}")
            ctype = res.headers.get("Content-Type", "")
            raw = res.read().decode("utf-8", "replace")
    except Exception as exc:  # network failure: keep the old file
        fail(f"download failed ({exc}); existing file untouched")

    if "<html" in raw[:2000].lower():
        fail("response looks like an error page, not the dataset")

    lines = raw.splitlines()
    header_idx = next(
        (i for i, ln in enumerate(lines)
         if ln.startswith("Year") and "Jan" in ln and "Dec" in ln), None)
    if header_idx is None:
        fail("monthly header row (Year Jan..Dec) not found")
    header = lines[header_idx].split()
    try:
        mcols = [header.index(m) for m in MONTHS]
        jd_col = header.index("J-D")
    except ValueError:
        fail("expected month columns or J-D annual column missing")

    # Baseline + units come from the preamble, not assumptions.
    preamble = "\n".join(lines[:header_idx])
    if "1951-1980" not in preamble:
        fail("baseline 1951-1980 not found in preamble")
    if "0.01 degrees Celsius" not in preamble:
        fail("0.01 C units not found in preamble")

    monthly = {}   # "YYYY-MM" -> anomaly in degrees C
    annual_official = {}  # year -> J-D value in degrees C
    for ln in lines[header_idx + 1:]:
        parts = ln.split()
        if not parts or not parts[0].isdigit():
            continue
        year = int(parts[0])
        if len(parts) <= max(mcols + [jd_col]):
            continue
        for mi, col in enumerate(mcols):
            cell = parts[col]
            if "*" in cell:
                continue  # missing month: skip, never fabricate
            try:
                val = int(cell) / 100.0
            except ValueError:
                continue
            key = f"{year}-{mi + 1:02d}"
            if key in monthly:
                fail(f"duplicate month {key}")
            monthly[key] = val
        jdc = parts[jd_col]
        if "*" not in jdc:
            try:
                annual_official[year] = int(jdc) / 100.0
            except ValueError:
                pass

    keys = sorted(monthly.keys())
    if keys != sorted(set(keys)):
        fail("duplicate dates")
    if not keys or not keys[0].startswith("1880-01"):
        fail(f"series does not start at 1880-01 (starts {keys[0] if keys else None})")
    if int(keys[-1][:4]) < datetime.date.today().year - 1:
        fail(f"response looks truncated (ends {keys[-1]}); existing file untouched")

    # Complete years: all twelve valid months.
    complete = []
    for y in range(1880, int(keys[-1][:4]) + 1):
        if all(f"{y}-{m:02d}" in monthly for m in range(1, 13)):
            complete.append(y)
    if not complete:
        fail("no complete year found")

    def is_leap(y):
        return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)

    annual = {}
    for y in complete:
        vals = [monthly[f"{y}-{m:02d}"] for m in range(1, 13)]
        wsum = sum(v * (DAYS_IN_MONTH[m] + (1 if m == 1 and is_leap(y) else 0))
                   for m, v in enumerate(vals))
        days = 366 if is_leap(y) else 365
        derived = round(wsum / days, 3)
        official = annual_official.get(y)
        if official is not None and abs(official - derived) > 0.02:
            print(f"update-gistemp: note: J-D {official} vs derived "
                  f"{derived} for {y} (using official J-D)")
            annual[y] = official
        else:
            annual[y] = official if official is not None else derived

    latest_month = keys[-1]
    latest_year = complete[-1]
    today = datetime.date.today().isoformat()
    payload = {
        "metadata": {
            "dataset": "NASA GISS Surface Temperature Analysis (GISTEMP) v4, "
                       "global-mean monthly Land-Ocean Temperature Index",
            "source_url": SOURCE_URL,
            "baseline": "1951-1980",
            "units": "degrees Celsius anomaly",
            "valid_through": latest_month,
            "latest_complete_year": latest_year,
            "complete_years": [complete[0], latest_year],
            "retrieved": today,
            "notes": "Monthly values in 0.01 C as published; missing months "
                     "carry no value. Annual values prefer the official J-D "
                     "column; otherwise day-weighted mean of 12 valid months.",
        },
        "monthly": [{"date": k, "anomaly": monthly[k]} for k in keys],
        "annual": [{"year": y, "anomaly": annual[y]} for y in complete],
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    # Idempotency: if only the retrieval date would change, keep the old
    # file untouched so scheduled runs commit solely on real data changes.
    if os.path.exists(OUT_PATH):
        try:
            with open(OUT_PATH, encoding="utf-8") as fh:
                old = json.load(fh)
            old_cmp = dict(old)
            old_meta = dict(old_cmp.get("metadata", {}))
            old_meta.pop("retrieved", None)
            old_cmp["metadata"] = old_meta
            new_cmp = {"monthly": payload["monthly"], "annual": payload["annual"]}
            new_meta = dict(payload["metadata"])
            new_meta.pop("retrieved", None)
            new_cmp["metadata"] = new_meta
            if old_cmp == new_cmp:
                print("update-gistemp: data unchanged; existing file kept")
                return
        except (OSError, ValueError) as exc:
            print(f"update-gistemp: existing file unreadable ({exc}); regenerating")
    tmp = OUT_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)
        fh.write("\n")
    os.replace(tmp, OUT_PATH)
    print(f"update-gistemp: wrote {OUT_PATH}")
    print(f"  months: {keys[0]} -> {latest_month} ({len(keys)} valid)")
    print(f"  complete years: {complete[0]} -> {latest_year} ({len(complete)})")


if __name__ == "__main__":
    main()

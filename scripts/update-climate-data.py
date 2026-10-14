#!/usr/bin/env python3
"""Combined climate data refresh script.

Runs both:
1. NASA GISTEMP global temperature data update
2. India Climate Explorer city data update

Usage:
  python scripts/update-climate-data.py           # Full refresh
  python scripts/update-climate-data.py --validate-only  # Validate existing files only
"""
import argparse
import datetime
import json
import os
import sys
import importlib.util

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def load_module(name, path):
    """Load a Python module from a file path."""
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Load the update modules
gistemp_module = load_module("update_gistemp", os.path.join(SCRIPTS_DIR, "update-gistemp.py"))
india_module = load_module("update_india_climate", os.path.join(SCRIPTS_DIR, "update-india-climate.py"))


def validate_gistemp():
    """Validate existing GISTEMP data file."""
    out_path = gistemp_module.OUT_PATH
    if not os.path.exists(out_path):
        print("GISTEMP: No data file found")
        return False
    try:
        with open(out_path, encoding="utf-8") as f:
            data = json.load(f)
        meta = data.get("metadata", {})
        months = data.get("monthly", [])
        years = data.get("annual", [])
        assert meta.get("baseline") == "1951-1980"
        assert len(months) > 1000
        assert len(years) > 100
        print(f"GISTEMP: Valid — {months[0]['date']} to {months[-1]['date']}, {len(years)} complete years")
        return True
    except Exception as exc:
        print(f"GISTEMP: Validation failed — {exc}")
        return False


def validate_india_climate():
    """Validate existing India climate data files."""
    catalog_path = os.path.join(india_module.OUT_DIR, "catalog.json")
    if not os.path.exists(catalog_path):
        print("India Climate: No catalog found")
        return False
    try:
        with open(catalog_path, encoding="utf-8") as f:
            catalog = json.load(f)
        cities_meta = catalog.get("metadata", {}).get("cities", [])
        city_files = catalog.get("cities", {})

        found = 0
        missing = 0
        for city in cities_meta:
            cid = city["id"]
            fname = city_files.get(cid)
            if fname:
                fpath = os.path.join(india_module.OUT_DIR, fname)
                if os.path.exists(fpath):
                    found += 1
                else:
                    missing += 1
                    print(f"  Missing file: {fname}")
            else:
                missing += 1
                print(f"  No file mapping for: {cid}")

        print(f"India Climate: {found} cities present, {missing} missing")
        return found > 0
    except Exception as exc:
        print(f"India Climate: Validation failed — {exc}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Climate data refresh")
    parser.add_argument("--validate-only", action="store_true",
                        help="Validate existing data files without fetching")
    args = parser.parse_args()

    print("=" * 60)
    print("Climate Data Refresh")
    print(f"Time: {datetime.datetime.now().isoformat()}")
    print("=" * 60)

    if args.validate_only:
        print("\n--- Validation Only Mode ---\n")
        gistemp_ok = validate_gistemp()
        india_ok = validate_india_climate()
        if gistemp_ok and india_ok:
            print("\nAll validations passed.")
            return 0
        else:
            print("\nSome validations failed.")
            return 1

    print("\n--- Updating NASA GISTEMP ---\n")
    try:
        gistemp_module.main()
    except SystemExit as exc:
        if exc.code != 0:
            print("GISTEMP update failed")
            return exc.code
    except Exception as exc:
        print(f"GISTEMP update error: {exc}")
        return 1

    print("\n--- Updating India Climate Explorer ---\n")
    try:
        india_module.main()
    except SystemExit as exc:
        if exc.code != 0:
            print("India Climate update failed (some cities may have been updated)")
            # Don't fail completely if some cities worked
    except Exception as exc:
        print(f"India Climate update error: {exc}")

    print("\n" + "=" * 60)
    print("Refresh complete")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
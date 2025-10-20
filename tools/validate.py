#!/usr/bin/env python3

import sys, csv, pathlib

REQUIRED = {
  "calculus_topics.csv": ["calculus_id","calculus_name","calc_course","short_desc","display_order"],
  "cs_topics.csv": ["cs_id","cs_name","concentration","short_desc"],
  "connections.csv": ["cs_id","calculus_id","strength","rationale"],
  "prerequisites.csv": ["source_calculus_id","target_calculus_id"],
}

def read_csv(path):
  with open(path, newline='', encoding='utf-8') as f:
    rdr = csv.DictReader(f)
    rows = list(rdr)
  return rows, rdr.fieldnames

def ensure_fields(name, fields):
  missing = [c for c in REQUIRED[name] if c not in fields]
  if missing:
    raise SystemExit(f"[ERROR] {name} missing required columns: {missing}")

def main(root):
  root = pathlib.Path(root)
  data = root / "data"
  ok = True
  loaded = {}

  print(f"[INFO] Validating CSVs in: {data.resolve()}")

  for fname in REQUIRED:
    path = data / fname
    if not path.exists():
      print(f"[ERROR] Missing file: {fname}")
      ok = False
      continue
    rows, fields = read_csv(path)
    ensure_fields(fname, fields)
    loaded[fname] = rows
    print(f"[OK] {fname}: {len(rows)} rows, fields={fields}")

  if not ok: sys.exit(1)

  # Indexes
  calc_ids = {r["calculus_id"] for r in loaded["calculus_topics.csv"]}
  cs_ids = {r["cs_id"] for r in loaded["cs_topics.csv"]}

  # connections checks
  for i, r in enumerate(loaded["connections.csv"], 1):
    if r["calculus_id"] not in calc_ids:
      print(f"[ERROR] connections.csv row {i}: calculus_id '{r['calculus_id']}' not found in calculus_topics.csv")
      ok = False
    if r["cs_id"] not in cs_ids:
      print(f"[ERROR] connections.csv row {i}: cs_id '{r['cs_id']}' not found in cs_topics.csv")
      ok = False
    try:
      s = int(r["strength"])
      if s not in (0,1,2):
        print(f"[ERROR] connections.csv row {i}: strength must be 0/1/2, got '{r['strength']}'")
        ok = False
    except Exception:
      print(f"[ERROR] connections.csv row {i}: invalid strength '{r['strength']}'")
      ok = False
    if r["strength"] in ("1","2") and (not r.get("rationale","").strip()):
      print(f"[WARN] connections.csv row {i}: non-zero strength but empty rationale")

  # prerequisites checks
  for i, r in enumerate(loaded["prerequisites.csv"], 1):
    if r["source_calculus_id"] not in calc_ids:
      print(f"[ERROR] prerequisites.csv row {i}: unknown source_calculus_id '{r['source_calculus_id']}'")
      ok = False
    if r["target_calculus_id"] not in calc_ids:
      print(f"[ERROR] prerequisites.csv row {i}: unknown target_calculus_id '{r['target_calculus_id']}'")
      ok = False

  # orphan calc detection
  referenced_calcs = { r["calculus_id"] for r in loaded["connections.csv"] }
  orphan_calcs = sorted(calc_ids - referenced_calcs)
  if orphan_calcs:
    print(f"[INFO] {len(orphan_calcs)} calculus topics have no connections (ok if intentional): {', '.join(orphan_calcs[:10])}{'...' if len(orphan_calcs)>10 else ''}")

  # orphan cs detection
  referenced_cs = { r["cs_id"] for r in loaded["connections.csv"] }
  orphan_cs = sorted(cs_ids - referenced_cs)
  if orphan_cs:
    print(f"[INFO] {len(orphan_cs)} CS topics have no connections (ok if intentional): {', '.join(orphan_cs[:10])}{'...' if len(orphan_cs)>10 else ''}")

  if not ok:
    sys.exit(1)

  print("[SUCCESS] All checks passed.")

if __name__ == "__main__":
  # Usage: python tools/validate.py /path/to/ets-viz
  root = sys.argv[1] if len(sys.argv)>1 else "."
  main(root)

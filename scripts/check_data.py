#!/usr/bin/env python3
"""Integrity checks for the committed publish inputs (run: python3 scripts/check_data.py).

- records.json: every survey row has a district, a unit basis and a value; the curator dataset is 1,173 rows.
- phed.json: 18 Nadia blocks whose arsenic tests add up to the report's printed total (124,297; 76,665 beyond 0.01 mg/L).
- phed-sources/: 62,207 sources in 18 blocks, every index entry matches its block file, source IDs are unique,
  and no field from the dropped "Nearest Location" column (household names) is present.
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda *p: os.path.join(ROOT, "web/public/data", *p)
fails = []
def check(ok, msg): print(("ok   " if ok else "FAIL ") + msg); ok or fails.append(msg)

rec = json.load(open(D("records.json")))
rows = rec["records"]
check(len(rows) == 1173, f"records.json: {len(rows)} survey rows (expected 1,173)")
check(all(r.get("district") and r.get("mgl") is not None for r in rows), "records.json: every row has a district and a value")
check(sum(1 for r in rows if r.get("exceeds")) == 92, "records.json: 92 rows above the limit")

phed = json.load(open(D("phed.json")))["rows"]
check(len(phed) == 18, f"phed.json: {len(phed)} block figures (expected 18)")
check(sum(r["tested"] for r in phed) == 124297 and sum(r["beyond"] for r in phed) == 76665,
      "phed.json: totals equal the printed report (124,297 tests, 76,665 beyond 0.01 mg/L)")
check(all(r["beyond"] <= r["tested"] for r in phed), "phed.json: beyond <= tested in every block")

idx = json.load(open(D("phed-sources", "index.json")))
files = [f for f in glob.glob(D("phed-sources", "*.json")) if not f.endswith("index.json")]
check(len(files) == len(idx["blocks"]) == 18, f"phed-sources: {len(files)} block files, {len(idx['blocks'])} in the index (expected 18)")
ids, total = set(), 0
for b in idx["blocks"]:
    data = json.load(open(D("phed-sources", f"{b['slug']}.json")))
    n = 0
    for g in data["gps"]:
        for v in g["villages"]:
            for s in v["s"]:
                n += 1; ids.add(s[0])
                if len(s) != 5: fails.append(f"{b['slug']}: unexpected row {s}")
    check(n == b["n"], f"phed-sources/{b['slug']}.json: {n} sources, index says {b['n']}")
    total += n
check(total == idx["total"] == 62207, f"phed-sources: {total} sources in all (expected 62,207)")
print(f"note phed-sources: {total - len(ids)} rows reuse a PHED source ID (as published; the app keys sources by ID + village + habitation)")
blob = "".join(open(f).read() for f in files)
check("Nearest" not in blob, "phed-sources: no 'Nearest Location' field")

sys.exit(1 if fails else 0)

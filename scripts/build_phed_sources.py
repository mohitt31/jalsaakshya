#!/usr/bin/env python3
"""Split WB PHED's public Nadia source list into small per-block JSON files for the add-test picker.

Input:  the guest Excel download https://maps.wbphed.gov.in/wqmis/download/source-list-download.php?district=336
        (sheet "Source List"; pass its path as the first argument).
Output: web/public/data/phed-sources/index.json and one <block>.json per block.

Kept:    block, gram panchayat, village, habitation, source ID, source category, working status, "Surveyed on".
Dropped: "Nearest Location" (it names private households, e.g. "NHO <name>"), scheme, platform status.
The list stays off Arkiv on purpose: it is a public reference list; only a source somebody tests becomes an entity.
"""
import json, os, re, sys, collections
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "web/public/data/phed-sources")

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
def clean(s): return re.sub(r"\s+", " ", str(s or "")).strip().rstrip(".")

def main(path):
    ws = openpyxl.load_workbook(path, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    head = [clean(h) for h in next(rows)]
    col = {h: i for i, h in enumerate(head)}
    need = ["District", "Block", "Panchayat", "Village", "Habitation", "Source ID", "Working Status", "Source Category", "Surveyed on"]
    missing = [h for h in need if h not in col]
    if missing: sys.exit(f"missing columns: {missing}")
    blocks = collections.OrderedDict(); cats = []; prefix = {}; n = 0
    for r in rows:
        if not r or not r[col["Source ID"]]: continue
        if clean(r[col["District"]]).upper() != "NADIA": continue
        b, gp, v, hab = (clean(r[col[k]]).title() for k in ["Block", "Panchayat", "Village", "Habitation"])
        # the list spells some blocks two ways ("Ranaghat - I" / "Ranaghat-I", "Krishnagar" / "Krishnanagar",
        # "Santipur" / "Shantipur"); use the spelling of PHED's comprehensive report
        b = re.sub(r"\s*-\s*", "-", b)
        b = re.sub(r"-(i+)$", lambda m: "-" + m.group(1).upper(), b, flags=re.I)
        b = {"Krishnagar-I": "Krishnanagar-I", "Krishnagar-II": "Krishnanagar-II", "Santipur": "Shantipur"}.get(b, b)
        sid = clean(r[col["Source ID"]]); cat = clean(r[col["Source Category"]]).upper()
        if cat not in cats: cats.append(cat)
        working = 1 if clean(r[col["Working Status"]]).upper().startswith("WORKING") else 0
        surveyed = r[col["Surveyed on"]]
        surveyed = surveyed.strftime("%Y-%m-%d") if hasattr(surveyed, "strftime") else clean(surveyed)
        gp = gp or "(GP not given)"
        blk = blocks.setdefault(b, collections.OrderedDict())
        blk.setdefault(gp, collections.OrderedDict()).setdefault(v, []).append([sid, hab, cats.index(cat), working, surveyed])
        prefix[sid.split("-")[0]] = slug(b); n += 1
    os.makedirs(OUT, exist_ok=True)
    index = {"district": "Nadia", "source": "https://maps.wbphed.gov.in/wqmis/download/source-list-download.php?district=336",
             "fields": ["id", "habitation", "category", "working", "surveyed"], "cats": cats, "total": n, "blocks": [], "prefix": prefix}
    for b, gps in blocks.items():
        data = {"block": b, "cats": cats, "gps": [{"gp": gp, "villages": [{"v": v, "s": sorted(s)} for v, s in sorted(vs.items())]} for gp, vs in sorted(gps.items())]}
        json.dump(data, open(os.path.join(OUT, f"{slug(b)}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        index["blocks"].append({"slug": slug(b), "name": b, "n": sum(len(s) for vs in gps.values() for s in vs.values())})
    index["blocks"].sort(key=lambda x: x["name"])
    json.dump(index, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{n} sources, {len(blocks)} blocks, {len(cats)} categories -> {OUT}")

if __name__ == "__main__":
    main(sys.argv[1])

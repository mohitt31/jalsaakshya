#!/usr/bin/env python3
"""Build the curator's publish input for the official WB PHED block figures.

Input:  data/phed/nadia-comprehensive-*.json, the table extracted from WB PHED's public
        "Comprehensive Report" PDF (see data/phed/README.md for how it was fetched and read).
Output: web/public/data/phed.json, one row per block, arsenic tests and tests beyond 0.01 mg/L.

Checks: every row's safe + unsafe equals its total, and the block rows add up to the printed total.
Nothing is guessed: the report prints no date range, so each row carries the download date as "asof".
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    out = []
    for path in sorted(glob.glob(os.path.join(ROOT, "data/phed/*-comprehensive-*.json"))):
        src = json.load(open(path))
        cols = src["columns"]
        rows = [dict(zip(cols, r)) for r in src["rows"]]
        for r in rows:
            assert r["arsenic_safe"] + r["arsenic_unsafe"] == r["arsenic_total"], r
        sums = [sum(r[c] for r in rows) for c in cols[2:]]
        assert sums == src["total"], (sums, src["total"])
        district = "Nadia" if "NADIA" in src["report"] else sys.exit(f"unknown district in {path}")
        for r in rows:
            printed = " ".join(str(v) for v in [r["sl"], r["block"], *[r[c] for c in cols[2:]]])
            out.append({
                "id": f"wbphed/{district.lower()}/{r['block'].lower()}/arsenic/{src['downloaded']}",
                "district": district, "block": r["block"].title(), "contaminant": "arsenic",
                "tested": r["arsenic_total"], "beyond": r["arsenic_unsafe"], "limit_mgl": 0.01,
                "asof": src["downloaded"],
                "payload": {"report": src["report"], "url": src["url"], "form": src["form"], "pdf_sha256": src["pdf_sha256"],
                            "printed_date": src["printed_date"], "printed_date_range": src["printed_date_range"] or "not printed",
                            "scope": src["scope"], "remark": src["remark"], "row_text": printed,
                            "coliform": {"tested": r["bact_total"], "unsafe": r["bact_unsafe"]}},
            })
    dst = os.path.join(ROOT, "web/public/data/phed.json")
    json.dump({"rows": out}, open(dst, "w"), ensure_ascii=False, separators=(",", ":"))
    t = sum(r["tested"] for r in out); b = sum(r["beyond"] for r in out)
    print(f"{len(out)} block rows, {t} arsenic tests, {b} beyond 0.01 mg/L ({100*b/t:.1f}%) -> {dst}")

if __name__ == "__main__":
    main()

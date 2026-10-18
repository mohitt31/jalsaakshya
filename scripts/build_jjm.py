#!/usr/bin/env python3
"""Build web/public/data/jjm.json from the JJM WQMIS village-sample extract in data/jjm/.

The extract holds every arsenic-contaminated sample the Jal Jeevan Mission WQMIS contaminant-wise report
lists for Nadia, FY 2025-2026, as [SampleId, block, gram panchayat, village, source type, test date, mg/L].
The report's free-text "location" field is dropped on purpose: it can name a household or a person.
"""
import hashlib, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = json.loads((root / "data/jjm/nadia-arsenic-fy2025-26-2026-10-19.json").read_text())
rows = src["rows"]
canon = json.dumps(rows, separators=(",", ":"), ensure_ascii=False).encode()
assert hashlib.sha256(canon).hexdigest() == src["rows_sha256"], "extract does not match its recorded hash"
assert len({r[0] for r in rows}) == len(rows) == src["samples"]
out = []
for sid, block, gp, village, stype, date, val in rows:
    out.append({
        "id": f"jjm/{sid}", "sample": sid, "district": "Nadia", "block": block, "gp": gp, "village": village,
        "source_type": stype, "tested": date, "mgl": val, "limit_mgl": "0.01", "contaminant": "arsenic", "asof": src["asof"],
        "payload": {"report": src["report"], "url": src["url"], "filters": src["filters"], "sample_id": sid,
                    "block": block, "gram_panchayat": gp, "village": village, "source_type": stype,
                    "test_date": date, "total_arsenic_mgl": val, "permissible_limit_mgl": "0.01",
                    "extract_sha256": src["rows_sha256"]},
    })
(root / "web/public/data/jjm.json").write_text(json.dumps({"asof": src["asof"], "rows": out}, ensure_ascii=False))
print(len(out), "samples ->", "web/public/data/jjm.json")

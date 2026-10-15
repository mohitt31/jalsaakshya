"""Build the JalSaakshya dataset from the NeerTathya evidence snapshot.

Input:  data/source/neertathya-evidence.json.gz  (NeerTathya, commit b43d03f, MIT)
Output: web/public/data/records.json             (what the curator console publishes to Arkiv)

Only page-verified concentration rows with a district and an explicit unit are kept.
Rows whose unit is not printed on the cited page are dropped rather than guessed.
"""
import gzip, json, re, sys, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data/source/neertathya-evidence.json.gz"
OUT = ROOT / "web/public/data/records.json"

# Drinking-water limits, IS 10500:2012 (mg/L): arsenic acceptable = permissible 0.01; fluoride permissible 1.5
LIMITS = {"arsenic": 0.01, "fluoride": 1.5}
CONC_STATS = {"single", "max", "min", "range_min", "range_max", "mean"}


def unit_of(e):
    if e.get("unit"):
        return e["unit"], "column header"
    ctx = f"{e.get('context') or ''} {e.get('header') or ''}"
    if re.search(r"milligrams? per lit|mg\s*/\s*l\b|mg l-1|mg/litre", ctx, re.I):
        return "mg/L", "table note on the same page"
    if re.search(r"micrograms? per lit|µg\s*/\s*l|ug/l|\bppb\b", ctx, re.I):
        return "µg/L", "table note on the same page"
    return None, None


def to_mgl(v, unit):
    return {"mg/L": v, "ppm": v, "µg/L": v / 1000, "ppb": v / 1000}.get(unit)


def year_of(e):
    for s in (e.get("date"), e.get("period"), e.get("period_quote")):
        m = re.search(r"(19|20)\d\d", s or "")
        if m:
            return int(m.group(0))
    return None


def main():
    d = json.loads(gzip.decompress(SRC.read_bytes()))
    metas = d["metas"]
    docs, out, dropped = {}, [], collections.Counter()
    for e in d["evidence"]:
        if not e.get("page_verified"): dropped["page not re-verified"] += 1; continue
        if e["statistic"] not in CONC_STATS: dropped["not a concentration"] += 1; continue
        if e.get("non_detect"): dropped["below detection"] += 1; continue
        if not e.get("district"): dropped["no district"] += 1; continue
        unit, basis = unit_of(e)
        if not unit: dropped["unit not printed on page"] += 1; continue
        mgl = to_mgl(float(e["value"]), unit)
        if mgl is None or mgl < 0: dropped["unknown unit"] += 1; continue
        place = e.get("location") or (e.get("places") or [None])[0] or e["district"]
        limit = LIMITS[e["contaminant"]]
        out.append({
            "eid": e["id"], "doc": e["doc"], "district": e["district"], "place": place[:100],
            "contaminant": e["contaminant"], "stat": e["statistic"],
            "mgl": f"{mgl:.6f}".rstrip("0").rstrip("."), "exceeds": mgl > limit,
            "year": year_of(e), "page": int(e["page"] or 0),
            "payload": {
                "value_text": e["value_text"], "unit": unit, "unit_basis": basis,
                "places": e.get("places") or [], "well_id": e.get("well_id"), "source_type": e.get("source"),
                "period": e.get("period"), "period_quote": e.get("period_quote"), "header": e.get("header"),
                "row_text": e.get("row_text"), "row_verified": bool(e.get("row_verified")),
                "spatial_support": e.get("spatial_support"), "limit_mgl": limit,
            },
        })
        docs.setdefault(e["doc"], 0); docs[e["doc"]] += 1
    sources = []
    for doc, n in sorted(docs.items(), key=lambda t: -t[1]):
        m = metas[doc]
        sources.append({"doc": doc, "records": n, "publisher": (m.get("publisher") or "unknown")[:60],
                        "pub_year": m.get("year"), "payload": {"title": m.get("title"), "url": m.get("url"),
                        "publisher": m.get("publisher"), "year": m.get("year"), "authors": m.get("authors", [])[:6]}})
    data = {"generated_from": "NeerTathya evidence snapshot, commit b43d03f53fcce671d1b3114b11f3a3ada6ba3830",
            "limits_mgl": LIMITS, "sources": sources, "records": out, "dropped": dict(dropped)}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(len(out), "records from", len(sources), "documents;", dict(dropped), file=sys.stderr)
    print(collections.Counter(r["district"] for r in out).most_common(), file=sys.stderr)
    print(collections.Counter((r["contaminant"], r["exceeds"]) for r in out), file=sys.stderr)


if __name__ == "__main__":
    main()

# WB PHED: what is public, and what JalSaakshya uses

Checked 17–18 Oct 2026 as a guest (no login) on the **Nadia Water Quality Dashboard** of the West Bengal Public
Health Engineering Department, https://maps.wbphed.gov.in/wqmis/. The dashboard covers Nadia (district code 336)
and Uttar Dinajpur (330).

## What we looked for

Source-level arsenic results **with a test date**, so that each could become a dated official record with an
honest expiry. That is **not public**.

| Public page (guest) | What it has | Per-source arsenic value? | Test date? |
|---|---|---|---|
| `source-list.php`, Excel download `download/source-list-download.php?district=336` | 62,207 Nadia sources: block, GP, village, habitation, nearest location, source ID, site, scheme, working/platform status, category, "Surveyed on" | no | no |
| `download/booklet_pdf_list.php?district=336&block=…&panchayat=…` ("PDF with Synopsis", per GP) | GP general information, "Year of Survey" (e.g. Anulia GP, Ranaghat-I: JUNE, 2017), per-category counts of sources tested and within / beyond 0.01 mg/L, then a source list with latitude/longitude | no (counts only) | survey year only |
| `web_gis/report_all.php?district=336&block=02312&gp=2` (GP report) | GP infrastructure counts, block-level arsenic and iron test counts (> 0.05 / ≤ 0.05) | no | no |
| `comprehensive-report.php` → `download/pdf-comprehensive-report.php?type=district&district=336&…` | **Block-wise totals: arsenic tests, safe, unsafe (> 0.01 mg/L); bacteriological tests; sanitary survey risk categories** | no (block totals) | no date range printed |

Two more reasons not to import the per-source list:
- the *Nearest Location* column names private households ("NHO <name>", near house of …), which must not go
  on chain;
- without a result and a date, a source copied from the list could only ever read *test overdue*.

## What we use: the block-wise comprehensive report

`nadia-comprehensive-2026-10-17.json` is the table of the comprehensive report for Nadia, downloaded 17 Oct 2026
(78,868 bytes, SHA-256 `6f3e443b9cef0cc617712c0873a10515aaaf15d636105696166fb03d804e4ede`). The PDF was read with
pdf.js in the browser on the dashboard's own origin. The 18 block rows add up exactly to the printed total row,
and each row's safe + unsafe equals its total; `scripts/build_phed.py` re-checks both.

- 124,297 arsenic tests of public drinking-water sources in Nadia, **76,665 (61.7%) beyond 0.01 mg/L**.
- Worst blocks by share: Karimpur-II 90%, Karimpur-I 89%, Chapra 82%, Krishnanagar-II 82%.
- The report prints no date range (the field is empty), so the figures are labelled "as downloaded on
  17 Oct 2026" and expire 365 days after that date on Arkiv.

```bash
python3 scripts/build_phed.py     # -> web/public/data/phed.json, the curator console's input
```

The curator console's **Publish PHED block figures** button writes one read-only `blockstat` entity per block
(schema: [`arkiv/schema.md`](../../arkiv/schema.md), transactions: [`arkiv/onchain.md`](../../arkiv/onchain.md)).
The PDF itself is not committed; its URL and hash are kept with every entity.

## The public source list: used for the add-test picker

The guest Excel download `download/source-list-download.php?district=336` (downloaded 18 Oct 2026, 3,889,517 bytes,
SHA-256 `1363ecd3e597ad41fe346f2ad5b2c12c86e25c767c5702da11d6d92cf717b410`) lists **62,207 Nadia drinking-water
sources** in 18 blocks, 209 gram panchayats and 1,472 villages: source ID, habitation, category, working status and
"Surveyed on". 89% of the survey dates are 2020 or earlier; the list carries no test result.

`scripts/build_phed_sources.py <xlsx>` splits it into `web/public/data/phed-sources/<block>.json` (plus `index.json`):
- kept: block, gram panchayat, village, habitation, source ID, category, working status, survey date;
- dropped: *Nearest Location* (it names private households), scheme, platform status;
- block spellings unified to the comprehensive report's ("Ranaghat - I" → Ranaghat-I, Krishnagar → Krishnanagar,
  Santipur → Shantipur).

Data quality, as published by PHED: 169 source IDs appear more than once for different places (367 rows), 101 rows have
a malformed ID (e.g. `-000`), and 301 rows give no gram panchayat (shown as "(GP not given)"). We keep every row as
printed. The app keys a picked source by PHED ID + village + habitation, and an ID typed in the search box that matches
several places asks the tester to pick by block, GP and village instead.

The list stays off Arkiv on purpose: it is a public reference list. In the app's *Add a test result* form, a tester in
Nadia picks Block → Gram panchayat → Village → Source, or types the PHED source ID. Only a source somebody actually tests
becomes an Arkiv `site` entity, with `official_id` (the PHED ID) and `origin = "wbphed-list"`. The raw Excel is not
committed because of the household-names column.

## What this shows

The state already tests at scale: 124,297 arsenic tests in one district. What a field tester or a block officer
cannot get from the public pages is **the latest result of one particular source, and when it was taken**.
That is exactly the record JalSaakshya's `site`/`test` entities carry: signed by whoever tested, dated, and
expiring when the next mandated test is due.

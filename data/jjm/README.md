# Jal Jeevan Mission WQMIS lab samples, Nadia

**Source.** Jal Jeevan Mission Water Quality Management Information System (WQMIS), Ministry of Jal Shakti:
*Contaminant-wise* report, https://ejalshakti.gov.in/WQMIS/Report/Contaminantwise. Filters: financial year 2025-2026,
West Bengal, Nadia, all blocks, parameter *Total arsenic*, other filters at the report's defaults.

**What it lists.** For each village, the lab samples the report flags for the parameter: SampleId, source type,
a free-text location, test date, permissible limit and the value. It lists only flagged samples, so it shows where
arsenic was found, not which sources are safe.

**How it was read.** On 19 Oct 2026 (IST), from the report's own sample-detail request, which the page calls when you
open a village (all 3 pages at district level). The extract in `nadia-arsenic-fy2025-26-2026-10-19.json` keeps, per sample:
`[sample_id, block, gram_panchayat, village, source_type, test_date, total_arsenic_mgl]`, and the SHA-256 of that array
(`rows_sha256`), which matched a hash computed in the browser on the report's own data.

**What is left out.** The free-text location (for example "Near …"), because it can name a household or a person.

**Numbers.** 220 distinct SampleIds; 139 villages; 12 of Nadia's 18 blocks; values 0.01 to 0.86 mg/L (limit 0.01);
test dates 5 to 30 June 2025; every source type is *Deep Tubewell*. The report's per-village sample totals add up to 217;
its sample lists hold 220 distinct SampleIds; we publish the 220 as listed.

**On Arkiv.** `python3 scripts/build_jjm.py` writes `web/public/data/jjm.json`; the curator console publishes one
read-only `jjmsample` entity per sample and seals it ([schema](../../arkiv/schema.md), [transactions](../../arkiv/onchain.md)).
Live: https://mohitt31.github.io/jalsaakshya/jjm.html

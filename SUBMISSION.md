# JalSaakshya: submission

Answers to the Devfolio project form for *Arkiv: Global Tour Stop*, kept in the repo so judges and the form match.
Tracks entered: **Best Indian Use Case** (primary), **Security**, **Censorship Resistance**, **Open Source**, **Privacy**.

- **Live app:** https://mohitt31.github.io/jalsaakshya/
- **Repo:** https://github.com/mohitt31/jalsaakshya (MIT)
- **Schema:** [arkiv/schema.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/schema.md)
- **Friction:** [arkiv/friction.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/friction.md)
- **On-chain evidence:** [arkiv/onchain.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/onchain.md)
- **Demo video (2:58):** https://youtu.be/mJCgExx-z0E. The same file is in the repo at [media/jalsaakshya-demo.mp4](https://github.com/mohitt31/jalsaakshya/blob/main/media/jalsaakshya-demo.mp4). First cut (2:51): https://youtu.be/Ft-rx4UmQiE.

## Tagline

Signed village water tests that nobody can delete

(Devfolio limits the tagline to 50 characters. Longer: official arsenic and fluoride readings for West Bengal villages, cited to the report page, plus the current test status of each drinking-water source, kept honest by Arkiv.)

## The problem it solves

Under Jal Jeevan Mission, five women in every Indian village are trained to test drinking water with field test kits (24.64 lakh women as of 2024-25, [PIB](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/oct/doc2024107410701.pdf)). In West Bengal they work in some of the most arsenic- and fluoride-affected groundwater in the country. They hit two problems.

**The official numbers are out of reach.** CGWB publishes the measurements, but in annexure tables on page 100+ of 200-page PDFs, behind links that move. One report used here already sits under `cgwb.gov.in/old_website/`. A value forwarded on WhatsApp cannot be checked against its source.

**A kit reading gets treated as a verdict.** Field kits under-read near the limit:
- kits read wells at 10-27 µg/L arsenic as safe (George et al., ES&T 2012);
- kits read 21% of wells above 50 µg/L as safe (van Geen et al., ES&T 2005).

The rules say kit positives must be confirmed by a lab (UDWQMP 5.1.1), and every drinking-water source needs a chemical test every year (NRDWP/JJM). In practice, an old "safe" stays in use long after it stops being current.

JalSaakshya puts both problems in one phone page, in Hindi, Bengali and English.

1. **Official survey records.** It shows 1,173 survey values from 13 CGWB reports and published studies, across 21 districts. Each value has its report page and the table row as printed. The page shows a value as official only if the curator wallet created it on Arkiv.
2. **Drinking-water sources.** Testers add kit or lab readings against a named source. Each source shows one of four statuses:

   | Status | When |
   |---|---|
   | **Unsafe (lab)** | A registered lab's latest result is above the limit |
   | **Needs lab confirmation** | A kit reading is at or above half the limit, or a kit warning came after the last lab result |
   | **Test overdue** | No current test is left |
   | **Within limit** | The current results are below the limit |

   A source is never shown as safe on an expired test.
3. **Real official data for Nadia.** West Bengal's PHED tested 1,24,297 public drinking-water sources for arsenic in Nadia, and **76,665 (61.7%) were beyond 10 µg/L**. Its public dashboard gives these figures per block, but not the latest result or test date of any one source. The curator published the 18 block figures on Arkiv as read-only records citing the report, and the sources list sits right under them. That missing per-source, dated result is exactly what a JalSaakshya test is.

## Challenges I ran into

- **Batches failed with "Execution error without revert data".**
  - The real cause was an HTTP 413 from `eth_estimateGas`, one level down in the error's `cause`.
  - The limit turned out to be about 20 KB per batch, not a number of operations. 35 survey rows passed and 40 did not.
  - We published the 1,173 rows in 49 batches of up to 30 (friction #1).
- **An attribute named `sampleYear` passed the SDK's check, then the node rejected it.** The node's message lists uppercase letters as allowed. Every attribute is now lowercase `snake_case` (friction #2).
- **Our page went empty halfway through the challenge.**
  - Unauthenticated `arkiv_query` calls now draw on a per-network budget (`ANON_COST_LIMITED`), and every query costs 100 units (the `arkiv-cost` response header).
  - Our live feed re-queried on every chain-wide event, so it used up a network's budget in minutes.
  - We rebuilt the reads:
    - a page load is 3 queries;
    - the live feed and the district summary use free filtered counts;
    - an origin-restricted access key is only a header fallback;
    - the footer shows what a visit spent (friction #7, #8).
- **Trust without a backend.** Any wallet can copy our attributes. So "official" is decided by `createdBy(curator)`, and "lab result" by a curator-published lab registry. A spoof probe on chain confirms that a copied record is excluded.
- **Government data without per-source dates.** We wanted to import WB PHED's own source-level arsenic results. Its public pages list 62,207 Nadia sources but no per-source value or test date, and the "nearest location" column names private households. So we did not import sources: we published only the block totals the department prints, labelled "as downloaded on 17 Oct 2026" because the report prints no date range, and documented what is and is not public ([data/phed/README.md](https://github.com/mohitt31/jalsaakshya/blob/main/data/phed/README.md)).
- **Data honesty.** We dropped 1,386 extracted rows whose unit is not printed on the cited PDF page, rather than guess the unit.

## Why India?

**Who uses it:** Jal Jeevan Mission FTK testers (Pani Samiti / VWSC members, ASHAs), PHED block staff and NGO arsenic-mitigation workers in West Bengal. Gram panchayat members and local journalists use the records side.

**What changes for them:**

- **A tester** records a reading against a named well in Bengali or Hindi. If a reading of, say, 6 µg/L arsenic would pass on the kit's colour chart, the app shows straight away that it needs a lab (the half-limit rule). The test is signed by the tester's wallet, so nobody can edit or quietly delete it later, including us.
- **Block staff and NGOs** get one list of sources in their district, sorted by urgency, with the reason for each status. Their visit list is the *needs lab confirmation* and *test overdue* sources, not a spreadsheet of kit readings from several years ago. One button sends that list on WhatsApp, with a check link for each source.
- **A tester who reads little** taps 🔊 and hears the source's status and reason, or the "needs a lab" warning, in Hindi or Bengali (the phone's own text-to-speech; tested with the bn-IN and hi-IN voices).
- **A tester with no crypto wallet.** Publishing needs a funded wallet, and Arkiv's faucet needs a browser wallet and a captcha. So the block office makes a *tester kit* in the curator console: a fresh wallet with 0.05 test GLM and a WhatsApp link. The tester opens the link and publishes at once (tested 19 Oct: [tx](https://tiramisu.explorer.arkiv.network/tx/0x7e5bc62985ecb5b97137a1e3a11836bbe8ca8acb04037bb50af43d6199421c7a)).
- **A tester with no network** (common in rural Bengal) can still enter a reading. The site installs as an app and opens offline; the reading waits on the phone, marked "not on Arkiv yet", and is signed and sent when the network returns.
- **Anyone who receives a forwarded number** can check it. Every record and source card has *Share on WhatsApp*. The message carries a link that opens a *Checked on Arkiv* panel, read from the chain by entity key. It says:
  - whether the curator published the value, a registered lab signed it, or only a tester's own wallet did;
  - whether anyone can edit it;
  - how long it stays current.

  WhatsApp is how water results travel in a village. Today a forwarded screenshot cannot be checked. A JalSaakshya link can.
- **A panchayat member or journalist** can type a block name (for example "Raghunathpur" in Purulia, where fluoride reaches 4.30 mg/L in the CGWB aquifer report). They get the value, the PDF page and the row as printed, and can show the official number at a meeting.

**It works today:**
- **For every real source in Nadia.** A tester picks her actual source from WB PHED's own public list of **62,207 Nadia drinking-water sources** (18 blocks, 209 gram panchayats, 1,472 villages): Block → Gram panchayat → Village → Source, or by PHED source ID. The test is filed against that official ID. PHED's list gives each source a survey date (89% are 2020 or earlier) but no test result; JalSaakshya adds the signed, dated, expiring result.
- **On real government data.** In Nadia, the page shows WB PHED's official arsenic figures for all 18 blocks (1,24,297 tests, 76,665 beyond the limit; worst: Karimpur-II, 90%), each a curator-published Arkiv record with a check link, read in the same 3 queries as before.
- The app is live and needs no login to read.
- It runs on a phone, and the whole interface is in Bengali and Hindi, including statuses, reasons and district names.
- The full dataset is on Arkiv.

**Be clear about what is demo:**
- The four Nadia sources and the lab are synthetic, and they are labelled `demo` on chain and in the app.
- We have not run a field pilot, and no real lab is registered yet.
- A real lab joins with one curator transaction (`labCreate`).

## Why Arkiv?

The product is evidence. Its value is that a reading can be traced to who wrote it, and that it stops counting when it is no longer current. Here is what breaks on each alternative.

- **Postgres or our own API:** whoever operates the database can change an "unsafe" to "safe", delete a tester's reading, or edit a survey value, and nobody outside can tell.
  - On Arkiv, every survey row, source and test is a `readonly` entity. Its `$creator` is immutable.
  - The app decides what is official with `createdBy(curator)`. It decides who counts as a lab with a registry that is itself trusted only from the curator.
  - We cannot quietly edit or delete a reading either. `readonly` blocks edits; and every test and source is **sealed** in the transaction that creates it (ownership handed to `0x…dEaD`, an address nobody holds a key for), because an owner could otherwise still delete it. A correction has to be a new entity.
- **Results that should stop counting:** in a database, a three-year-old kit "safe" lives forever unless someone writes and runs a cleanup job.
  - On Arkiv, the lifetime is part of the entity: lab results 365 days (the annual test mandate), kit readings 90 days (screening), sources 365 days after their latest test.
  - Expiry is enforced by the network, not by our code.
- **IPFS:** gives integrity but no queries. We need `district = X AND contaminant = fluoride AND mgl > 1.5 AND year >= 2015`, a village prefix, and pagination, without running an indexer.
- **A subgraph:** needs contracts and an indexer we would operate. Arkiv's typed attributes are the index.
- **If our site goes down:** the data stays queryable by anyone at `app = "jalsaakshya/v1"`, following [schema.md](arkiv/schema.md). A district NGO can build its own view without asking us.

**What stays off Arkiv on purpose:**
- **The PDFs (100–270 pages each).** Entities carry the URL, the page and the exact row text, so anyone can check them.
- **The extraction pipeline.** It ran once, in NeerTathya.
- **Rows whose unit is not printed on the cited page.** They are dropped, not guessed.
- **Translations and the district list.** They are static assets.
- **Anything personal.** The form refuses phone numbers and emails, and testers are wallets, not names.

## Trust boundaries (part of "Why Arkiv?")

Arkiv moves trust from "whoever runs the database" to a few named wallets. It does not remove trust, so here is exactly where it sits.

**The curator wallet (`0x048A…3760`) can:**
- publish official records. Only entities it created show as official (`createdBy(curator)`);
- register a wallet as a lab, or delist one. A lab listing is not sealed, so the curator can delete it or let it lapse. The app reads the registry as it is now, so a delisted lab's past results drop back to kit-level screening;
- stop publishing. Its records then leave Arkiv when their lifetimes end, so the app stops showing them instead of showing a stale value.

**The curator wallet cannot:**
- edit or delete an official record. All 1,424 are owned by `0x…dEaD`, and none is still owned by the curator (`npm run verify`);
- edit or delete a tester's test, or a source. Testers create those; they are sealed in the transaction that creates them, and the curator never owned them;
- make a copied record look official, or change who created anything. `$creator` is set by the chain;
- stop anyone from renewing a source (`permissionlessExtension`).

**What Arkiv does not prove:**
- that a kit was used correctly, or that the water came from the source named. A signature proves which wallet published a reading and when, not the physical truth of the measurement;
- that two tester wallets are two people. The app says "different tester wallets", not "independent testers";
- that a registered lab is a real, accredited lab. That rests on the curator, which is why the registry is public and every lab's results are shown with its wallet.

What Arkiv adds is that none of these trust decisions can be changed quietly after the fact: a delisting, a new lab and every reading are public entities with a creator and a time.

## Evidence at a glance

| Claim | Code | On chain | Expected | Observed |
|---|---|---|---|---|
| Only the curator's records show as official | [main.ts#L143](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L143) | spoof probe tx `0xbfe422c5…3c45` | a copy with identical attributes is excluded by `createdBy(curator)` | 0 results with `createdBy`, found without it (17 Oct) |
| Official records cannot be deleted, even by the curator | [curator.ts#L139](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L139) | 13 seal txs in [onchain.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/onchain.md) | owner `0x…dEaD` | 1,424 of 1,424 sealed, 0 owned by the curator (`npm run verify`, 19 Oct) |
| A test and a new source are sealed in the transaction that creates them | [writes.ts#L62](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L62) | tx `0x421282c5…e904` | both owned by `0x…dEaD`; the creator's delete fails | both sealed; delete refused: "owned by 0x…dEaD, not 0x83EF…" (19 Oct) |
| Anyone can keep a sealed source alive | [writes.ts#L42](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L42) | tx `0x292a022e…92db` | another wallet extends it; owner unchanged | expiry block 753,649 → 755,458, owner still `0x…dEaD` (19 Oct) |
| `readonly` alone does not stop deletion | friction #9 | txs `0x0eaa40fa…0e91`, `0xf02255b3…5566` | the owner can delete | deleted by its own wallet (19 Oct) |
| WB PHED figures are as printed | [curator.ts#L100](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L100) | txs `0xa9b0c596…ae27`, `0xc986a812…71e9` | 18 blocks, 1,24,297 tests, 76,665 beyond 10 µg/L | same totals read back from chain (`npm run verify`, 19 Oct) |
| 220 government lab results from JJM WQMIS, as listed | [curator.ts#L304](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L304) | 22 create txs + 3 seal txs in [onchain.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/onchain.md) | 220 samples, 139 villages, 12 blocks, worst 0.86 mg/L; extract SHA-256 in [data/jjm/](https://github.com/mohitt31/jalsaakshya/tree/main/data/jjm) | 220 created by the curator, 220 sealed ([proof page](https://mohitt31.github.io/jalsaakshya/proof.html), 19 Oct) |
| A kit warning closes only with a later lab result for the same contaminant | [model.ts#L58](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/model.ts#L58) | — | a newer fluoride lab result does not clear an arsenic warning | 12 of 12 unit tests pass (`npm test`) |

All "observed" results above were produced by us. Anyone can re-run the chain checks with `cd web && npm ci && npm run verify`.

## How do you use Arkiv?

Each feature, what the user sees, and the code:

| Feature | How and why | Code |
|---|---|---|
| **`$creator` + `createdBy()`** | Official records, report list and lab registry are read only with `.createdBy(CURATOR)`. A copy of a survey row with identical attributes written by any other wallet never appears as official. Each card shows "created by curator 0x048A…3760 ✓". A "lab result" counts only if its `$creator` is a wallet in the curator's registry. Otherwise it is treated as a kit screening. | [main.ts#L143](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L143), [main.ts#L71](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L71), [model.ts#L58](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/model.ts#L58) |
| **Read by key, `$creator` and creation flags in the UX** | A shared link (`?e=<entity key>`) runs `getEntity(key)` and shows the reader what Arkiv itself says: the `$creator`, classified as curator, registered lab or community wallet; `creationFlags.readonly`; and the remaining lifetime from `expiresAt`. For a source, it also queries the source's live tests and shows the current status. | [main.ts#L177](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L177), [main.ts#L166](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L166) |
| **Typed attributes vs payload** | What we filter on is in attributes: `district`, `contaminant`, `place` (str), `mgl` (dec), `year`/`page` (i32), `exceeds` (bool), `tested` (u64), `wallet` (addr). What we only display is in the JSON payload: the printed value and unit, the unit's basis, the table row text, notes. | [writes.ts#L17](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L17), [schema.md](arkiv/schema.md) |
| **Compound queries and ranges** | The filter bar builds one `and([...])`; registry and district reads use `or(...)` to fetch two entity kinds in one query: `eq` on district and contaminant, `gt("mgl", dec(limit))` for "only above the limit", `gte("year", i32(…))` for "sampled since", and `startsWith("place", …)` for the village search. | [main.ts#L52](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L52) |
| **Cursor pagination pinned to a block** | The records query is pinned with `.atBlock(head)`, so "Load more" (`page.next()`) keeps working while someone reads (see friction #4). | [main.ts#L146](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L146) |
| **Entity Expiration per type** | Lifetimes follow the rules the data lives under: lab test 365 d (annual test mandate), kit test 90 d (screening), site 365 d, lab listing 365 d (renewed yearly by the curator), survey row 365 d, report 730 d. Status rule 3 depends on it: when every test of a source has expired, the source shows *test overdue*. | [model.ts#L22](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/model.ts#L22), [writes.ts#L30](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L30) |
| **Lifetime Extension + `permissionlessExtension`** | A source (`site`) is created with `permissionlessExtension: true`. Every new test of that source, by anyone, extends the site by another 365 days. A well stays listed while people keep testing it and drops off a year after its last test. In the demo, the lab wallet extended a site created by tester A. A source is also **sealed** in the batch that creates it, so its creator cannot delist it, and it still renews: tx `0x292a022e…92db` extended a sealed source from another wallet. Nobody owns it, and anyone can keep it alive. The card shows "listed for N days unless retested". | [writes.ts#L42](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L42), [writes.ts#L47](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L47) |
| **`readonly` creation flag** | Survey rows, reports, sites and tests are `readonly`. Lab listings are not, so the curator can delist a lab. | [writes.ts#L17](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L17) |
| **Atomic batch writes** | Adding a test is one `executeBatch`: either `[create site, create test]`, or `[create test]` plus the extension of the existing site. A test never lands without its site's renewal. Publishing also used batches: each report's `source` entity lands in the same transaction as its first rows (49 transactions for 1,186 entities). | [main.ts#L331](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L331), [curator.ts#L81](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L81) |
| **Filtered counts + the query budget** | Every `arkiv_query` costs a flat 100 units, and an anonymous network gets about 100 a window. So the page is designed around that:<br>• one `or(...)` query per registry and one per district, so a page load is 3 queries;<br>• free raw `arkiv_getEntityCount` calls with `[{ query }]` (built with the SDK's `render()`) for the district summary ("47 official records for Nadia, 27 above the limit · 1,173 across West Bengal");<br>• the same free count gates the live feed;<br>• the footer shows what the visit spent. | [main.ts#L499](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L499), [arkiv.ts#L44](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/arkiv.ts#L44) |
| **Access keys (Hub)** | Reads start anonymous, on the reader's own budget. Only after an `ANON_COST_LIMITED` answer does the page repeat the request with the site's access key in an `X-API-KEY` header. The key is restricted in the Hub to our origin, injected at build time and never committed. friction #8 explains the trade-off between the Hub's Origins tab and Arkiv's guidance to keep keys out of browser bundles. | [arkiv.ts#L27](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/arkiv.ts#L27) |
| **Official WB PHED figures as curator records** | 18 `blockstat` entities, one per Nadia block, read in the same `or(...)` registry query (still 3 queries a page load) and shown only from `createdBy(CURATOR)`. Each is `readonly`, carries the report URL, PDF hash and printed row, and expires 365 days after the day it was read, because the report prints no date range. Published in 2 atomic batches of 9, kept near 10 KB per transaction after friction #1. | [main.ts#L71](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L71), [curator.ts#L100](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L100), [main.ts#L96](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L96) |
| **Expiry counted from the test, offline** | A test entered offline waits on the phone and is sent later. Its expiry is the mandated lifetime minus the time it waited (in whole 2 s blocks), so a late send cannot make a reading count longer. | [writes.ts#L15](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L15), [main.ts#L323](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L323) |
| **`$owner` + ownership transfer: sealed tests and sources** | `readonly` stops edits, but the owner can still delete (friction #9, tested on chain). So a test, and a new source, is sealed in the same atomic batch that creates it: `predictEntityKeys` gives the key and salt, and `ownershipChanges` hands the test to `0x…dEaD`. A lab under pressure cannot withdraw an "unsafe" result, and neither can we. The *Checked on Arkiv* panel shows the owner ("Sealed: nobody can delete it") and each test row shows 🔒. The curator console sealed all 1,424 official records (and the demo tests and sources) the same way, resumably with `createdBy(w).ownedBy(w)`: 13 transactions of 100 ownership changes ([onchain.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/onchain.md)). Even our curator wallet can no longer delete an official record. | [writes.ts#L62](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L62), [curator.ts#L139](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L139), [main.ts#L172](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L172) |
| **WebSocket entity events** | `watchEntityEvents` on a `webSocket()` transport with no `fromBlock`, so it is a real subscription. A new test appears with "New test: …" and the status updates without a reload. The stream carries every entity on the chain, so an event only triggers a free filtered count for the district, at most every 15 s. The 100-unit query runs only when that count changed (friction #7 and #8). | [main.ts#L487](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L487) |

## Friction report

https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/friction.md

Eight issues, each with expected vs actual (including the per-query cost and the anonymous budget, measured from response headers), versions, steps to reproduce and a suggested fix, plus a table of eleven paths we tested that worked as documented. The probes that reproduce them run from the "Run probes" button on `/curator.html`.

## Wallet addresses that create our Arkiv entities

| Address | Role |
|---|---|
| `0x048A053E77e7771b212d04D906E7b70139fC3760` | Curator: all `source` (13) and `obs` (1,173) entities, and the `lab` registry |
| `0x690F95b7217AaF59017e2EfEA446e9af4e04a066` | Demo lab (synthetic), registered by the curator: lab `test` entities |
| `0xAac73CBEa8dc9D65B6B45A7550F675c579D043c5` | Demo field tester A (synthetic): `site` and kit `test` entities |
| `0x4B2799ff80Fe9cd3eF0f8d1d870d9927F52d767f` | Demo field tester B (synthetic): `site` and kit `test` entities |
| `0x83EF7A30e2cDbA2CC55a2B3B041805eb875C146d` | In-app test wallet used while recording the demo |

Any judge who adds a test from the app creates `site`/`test` entities from their own wallet. Every publishing transaction hash is in [onchain.md](arkiv/onchain.md).

## How can judges reproduce our Arkiv usage?

**Proof in one click:** https://mohitt31.github.io/jalsaakshya/proof.html checks every on-chain claim below live from Tiramisu in your browser, each linked to its transaction.

**One command, chain only.** `git clone https://github.com/mohitt31/jalsaakshya && cd jalsaakshya/web && npm ci && npm run verify` reads Tiramisu directly, with no app, no backend and no key of ours ([verify.mjs](web/verify.mjs)). It checks: 1,173 survey rows from the curator; 18 WB PHED block figures summing to 1,24,297 tests and 76,665 beyond the limit; 220 JJM WQMIS lab samples, sealed; all 1,424 official records sealed (0 still owned by the curator); every live test sealed; every source `readonly` + `permissionlessExtension` and sealed; and the query in step 2. Last run 19 Oct 2026: 8 of 8 PASS; the JJM check was added after it and passes on the [proof page](https://mohitt31.github.io/jalsaakshya/proof.html) (7 of 7).

1. **Records and `$creator`.** Open https://mohitt31.github.io/jalsaakshya/?district=Purulia and pick *Fluoride* with *Only above the drinking-water limit* ticked.
   - Every card is above 1.5 mg/L. This is the `gt("mgl", dec("1.5"))` range.
   - Open a card's *Show the table row*. It shows the Arkiv entity key and "created by curator 0x048A…3760 ✓".
   - The report link opens the PDF at the cited page.
2. **The same query without our app.** In any Node project, run:
   ```ts
   import { createPublicClient } from "@arkiv-network/sdk"
   import { http } from "viem"
   import { tiramisu } from "@arkiv-network/sdk/chains"
   import { str, dec } from "@arkiv-network/sdk/attr"
   import { eq, gt } from "@arkiv-network/sdk/query"
   const c = createPublicClient({ chain: tiramisu, transport: http() })
   const r = await c.select({ attributes: true, payload: true })
     .where(eq("app", str("jalsaakshya/v1")), eq("kind", str("obs")), eq("district", str("Purulia")),
            eq("contaminant", str("fluoride")), gt("mgl", dec("1.5")))
     .createdBy("0x048A053E77e7771b212d04D906E7b70139fC3760").limit(200).fetch()
   console.log(r.entities.length, r.entities[0].toJson())
   ```
   Page through all `kind = "obs"` rows from the curator and you get 1,173.
3. **Every status.** Open https://mohitt31.github.io/jalsaakshya/?district=Nadia and scroll to *Drinking-water sources*. You see:
   - **A**: *Unsafe (lab)*. The demo lab's result is 41 µg/L.
   - **B**: *Needs lab confirmation*. Two testers read 3–4 µg/L on kits, then our demo-video test read 6 µg/L, which is half the limit or more. B's listing was renewed to 365 days by that test.
   - **C**: *Needs lab confirmation*. A kit read 1.20 mg/L fluoride, close to the limit.
   - **D**: *Test overdue*. It is listed but has no current test.

   Open *current tests* on a card to see each test's creator, its method and when it fades.
4. **Add a test (write + atomic batch + extension + live).**
   - Open *Add a test result*. The page creates a test wallet in your browser.
   - Fund it from the [faucet](https://hub.arkiv.network/faucet) (or choose MetaMask).
   - Pick *Demo source D (synthetic)*, which is test overdue, and enter a kit reading of 3 µg/L arsenic. Enter 6 µg/L instead to see the "needs a lab" hint.
   - Click *Publish to Arkiv*. The transaction link opens on the explorer: one test create plus one extension of the source.
   - In a second tab on the same district, the live line shows the new test, and source D moves from *Test overdue* to *Within limit*. Its "listed for" days reset to 365.
5. **Spoofing does not work.** The curator console (`/curator.html` → *Run probes*) writes an `obs` entity with the curator's exact attributes from a different wallet. The probe output shows that the query finds it without `createdBy`, and finds 0 with `createdBy(curator)` (last run: tx `0xbfe422c5a3b4eaa3cc35292b7a8169bec3af1d93f0d1db90b115014287643c45`).
6. **Verify a shared link.** Click *Link* on any card. The *Checked on Arkiv* panel comes from `getEntity(key)`: a survey record reads "Published by the curator wallet"; a demo kit test, "Signed by a tester's own wallet". Change one hex digit of the key and it reads "does not point to a current JalSaakshya entity".
7. **Real WB PHED data.** On the Nadia page, the card *Official WB PHED arsenic tests, block by block* shows 76,665 of 1,24,297 tests beyond 10 µg/L. Click *Link* on any block, for example Nabadwip: https://mohitt31.github.io/jalsaakshya/?e=0x116cdd01b1925fa759e1b6eabb3a162f0a67b1c233e7cb76ec04417137f93777. The panel shows the curator as creator, the printed report row and about 365 days left.
8. **Visit list and offline.** On Nadia, *Share visit list on WhatsApp* opens a message listing sources A, B, C and D with their check links. To test offline: open the page once, switch the phone to airplane mode, reload (it still opens), add a test, and see "not on Arkiv yet". Turn the network back on and it is sent, with a transaction link.
9. **Sealed.** Every test row shows 🔒 sealed. First sealed test: tx `0x25696c897bf953f83e68d5ca866156d8830b9efcd373f70da03c9eeb2c1cd9ee` (create + source extension + ownership to `0x…dEaD` in one transaction). Official records too: the Nabadwip link in step 7 shows "🔒 Sealed … nobody can delete it".
10. **Pick a real PHED source.** On Nadia, open *Add a test result*: *Find your source in WB PHED's list* → Block *Ranaghat-I* → GP *Anulia* → Village *Anulia* → a source, or type `5260-089` in the ID box. The place fills in as "Anulia, Halder Para · PHED 5260-089" with its category and survey date. (Please don't publish a made-up reading against a real source; the demo sources are for that.)
11. **Languages.** Use the हिन्दी / বাংলা buttons at the top. Records, statuses, reasons, the form and district names switch, and the choice is remembered.

## Pre-existing work we reused

- **NeerTathya** ([github.com/mohitt31/jaldrishti](https://github.com/mohitt31/jaldrishti)), same author, built for the SerpApi India hackathon. **Baseline commit `b43d03f`.**
- **Reused:** its published evidence snapshot only (`data/source/neertathya-evidence.json.gz`). That snapshot has the report list, the extracted table rows, and the per-row page check.
- **New in JalSaakshya (9 to 18 October):** everything else.
  - The row filter that keeps only values whose unit is printed on the page (`scripts/build_records.py`).
  - The Arkiv schema and all Arkiv code.
  - The curator console and publishing.
  - The sources/tests/lab model and its tests.
  - The app, translations, friction probes and documentation.
- **Third-party:** `@arkiv-network/sdk`, `viem`, Vite (open-source libraries).

## Arkiv surfaces we used

TypeScript SDK, Direct JSON-RPC (to diagnose the query budget, friction #8), WebSocket events, Docs, Hub, Faucet, Access keys, Block Explorer.

## How long after we started did we write our first Arkiv entity?

**2 hours or less.**
- Our first commit was on 15 October at 14:21 IST.
- The curator's first entities (the friction probes) followed at about 14:58 IST.
- The first survey batch landed at 15:09 IST: block 603711, tx `0xac89676f82ec366ac74d337bef59a90f0e8319813e55d295e7a4e2b32d92d18c`.

## Which LLMs did we use?

Claude (Anthropic), through Claude Code, for research, code, documentation and the demo video's narration script (the voice is Kokoro text-to-speech). Every on-chain number and claim in this repo was checked against the chain or the cited source.

## The one thing Arkiv should improve first

Make write failures say what actually failed. In 0.8.1, an oversized batch surfaces as "Execution error without revert data" while the cause (HTTP 413) sits one level down. An uppercase attribute name passes the SDK's check and is rejected by the node with a message that lists uppercase as allowed. Both cost us the most time (friction #1 and #2). For a backend-free app the most urgent is friction #8. Since 17 October, unauthenticated queries draw on a per-network budget (`ANON_COST_LIMITED`), and our page went empty for everyone on the same network. The SDK has no access-key option, and the docs mention neither the budget nor keys. A close second: a filter on `watchEntityEvents` (friction #7).

## Security and Censorship Resistance (also entered)

- **Security:** the app filters by on-chain `$creator`, never by a field anyone can write.
  - Official records and the lab registry are read with `createdBy(curator)`.
  - A lab result counts only from a wallet the curator registered.
  - The spoof probe (step 5 above) shows a copied record is excluded.
  - Who is misled today without this: a village told "your well was tested safe" by a forwarded screenshot, with no way to check who tested it or when.
- **Censorship Resistance:** there is no backend.
  - Anyone can read and query the whole dataset from Arkiv with the documented contract in `schema.md` (step 2 above), without our site. `npm run verify` checks every on-chain claim the same way.
  - A district office that would rather the "unsafe" list disappeared cannot remove it. Neither can we.

## Privacy (also entered)

**Who is exposed today:** a Pani Samiti member or ASHA who records an "unsafe" reading for a hand pump that a contractor or the panchayat says is fine, and households whose names sit next to public water sources in government lists.

**What is on the explorer, and what is not:**
- **No names, phone numbers or addresses.** Testers are wallets made in their own browser. The note field refuses phone numbers and emails. A source is a place ("Anulia, Halder Para · PHED 5260-089"), never a person.
- **We remove personal data that the government list carries.** WB PHED's public source list names private households in its *Nearest Location* column ("NHO" + a householder's name, meaning near the house of). We drop that column before using the list, keep the raw file out of the repo, and key sources by PHED ID, village and habitation instead ([data/phed/README.md](data/phed/README.md)).
- **Few attributes, all about water:** site, district, place, contaminant, value, method, test date and, for PHED sources, the official ID ([schema.md](arkiv/schema.md)).
- **Nothing lingers past its use:** a kit reading leaves every query after 90 days and a lab result after 365 days.

**What we do not claim:** payloads are not encrypted, because readings are meant to be public evidence; a wallet is pseudonymous, not anonymous. A tester who wants unlinkable reports can use a fresh test wallet (the app makes one per browser, and MetaMask is optional).

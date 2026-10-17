# JalSaakshya: submission

Answers to the Devfolio project form for *Arkiv: Global Tour Stop*, kept in the repo so judges and the form match.
Tracks entered: **Best Indian Use Case** (primary), **Security**, **Censorship Resistance**.

- **Live app:** https://mohitt31.github.io/jalsaakshya/
- **Repo:** https://github.com/mohitt31/jalsaakshya (MIT)
- **Schema:** [arkiv/schema.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/schema.md)
- **Friction:** [arkiv/friction.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/friction.md)
- **On-chain evidence:** [arkiv/onchain.md](https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/onchain.md)
- **Demo video (2:51):** {{VIDEO}}. A copy is in the repo at [media/jalsaakshya-demo.mp4](https://github.com/mohitt31/jalsaakshya/blob/main/media/jalsaakshya-demo.mp4).

## Tagline

Official arsenic and fluoride readings for West Bengal villages, cited to the report page, plus the current test status of each drinking-water source, kept honest by Arkiv.

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
- **Data honesty.** We dropped 1,386 extracted rows whose unit is not printed on the cited PDF page, rather than guess the unit.

## Why India?

**Who uses it:** Jal Jeevan Mission FTK testers (Pani Samiti / VWSC members, ASHAs), PHED block staff and NGO arsenic-mitigation workers in West Bengal. Gram panchayat members and local journalists use the records side.

**What changes for them:**

- **A tester** records a reading against a named well in Bengali or Hindi. If a reading of, say, 6 µg/L arsenic would pass on the kit's colour chart, the app shows straight away that it needs a lab (the half-limit rule). The test is signed by the tester's wallet, so nobody can edit or quietly delete it later, including us.
- **Block staff and NGOs** get one list of sources in their district, sorted by urgency, with the reason for each status. Their visit list is the *needs lab confirmation* and *test overdue* sources, not a spreadsheet of kit readings from several years ago.
- **Anyone who receives a forwarded number** can check it. Every record and source card has *Share on WhatsApp*. The message carries a link that opens a *Checked on Arkiv* panel, read from the chain by entity key. It says:
  - whether the curator published the value, a registered lab signed it, or only a tester's own wallet did;
  - whether anyone can edit it;
  - how long it stays current.

  WhatsApp is how water results travel in a village. Today a forwarded screenshot cannot be checked. A JalSaakshya link can.
- **A panchayat member or journalist** can type a block name (for example "Raghunathpur" in Purulia, where fluoride reaches 4.30 mg/L in the CGWB aquifer report). They get the value, the PDF page and the row as printed, and can show the official number at a meeting.

**It works today:**
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
  - We cannot quietly edit a reading either. A correction has to be a new entity.
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

## How do you use Arkiv?

Each feature, what the user sees, and the code:

| Feature | How and why | Code |
|---|---|---|
| **`$creator` + `createdBy()`** | Official records, report list and lab registry are read only with `.createdBy(CURATOR)`. A copy of a survey row with identical attributes written by any other wallet never appears as official. Each card shows "created by curator 0x048A…3760 ✓". A "lab result" counts only if its `$creator` is a wallet in the curator's registry. Otherwise it is treated as a kit screening. | [main.ts#L115](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L115), [main.ts#L70](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L70), [model.ts#L56](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/model.ts#L56) |
| **Read by key, `$creator` and creation flags in the UX** | A shared link (`?e=<entity key>`) runs `getEntity(key)` and shows the reader what Arkiv itself says: the `$creator`, classified as curator, registered lab or community wallet; `creationFlags.readonly`; and the remaining lifetime from `expiresAt`. For a source, it also queries the source's live tests and shows the current status. | [main.ts#L148](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L148), [main.ts#L138](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L138) |
| **Typed attributes vs payload** | What we filter on is in attributes: `district`, `contaminant`, `place` (str), `mgl` (dec), `year`/`page` (i32), `exceeds` (bool), `tested` (u64), `wallet` (addr). What we only display is in the JSON payload: the printed value and unit, the unit's basis, the table row text, notes. | [writes.ts#L13](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L13), [schema.md](arkiv/schema.md) |
| **Compound queries and ranges** | The filter bar builds one `and([...])`; registry and district reads use `or(...)` to fetch two entity kinds in one query: `eq` on district and contaminant, `gt("mgl", dec(limit))` for "only above the limit", `gte("year", i32(…))` for "sampled since", and `startsWith("place", …)` for the village search. | [main.ts#L51](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L51) |
| **Cursor pagination pinned to a block** | The records query is pinned with `.atBlock(head)`, so "Load more" (`page.next()`) keeps working while someone reads (see friction #4). | [main.ts#L118](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L118) |
| **Entity Expiration per type** | Lifetimes follow the rules the data lives under: lab test 365 d (annual test mandate), kit test 90 d (screening), site 365 d, lab listing 365 d (renewed yearly by the curator), survey row 365 d, report 730 d. Status rule 3 depends on it: when every test of a source has expired, the source shows *test overdue*. | [model.ts#L20](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/model.ts#L20), [writes.ts#L25](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L25) |
| **Lifetime Extension + `permissionlessExtension`** | A source (`site`) is created with `permissionlessExtension: true`. Every new test of that source, by anyone, extends the site by another 365 days. A well stays listed while people keep testing it and drops off a year after its last test. In the demo, the lab wallet extended a site created by tester A, and the site's owner did not change. The card shows "listed for N days unless retested". | [writes.ts#L36](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L36), [writes.ts#L41](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L41) |
| **`readonly` creation flag** | Survey rows, reports, sites and tests are `readonly`. Lab listings are not, so the curator can delist a lab. | [writes.ts#L13](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/writes.ts#L13) |
| **Atomic batch writes** | Adding a test is one `executeBatch`: either `[create site, create test]`, or `[create test]` plus the extension of the existing site. A test never lands without its site's renewal. Publishing also used batches: each report's `source` entity lands in the same transaction as its first rows (49 transactions for 1,186 entities). | [main.ts#L303](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L303), [curator.ts#L81](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/curator.ts#L81) |
| **Filtered counts + the query budget** | Every `arkiv_query` costs a flat 100 units, and an anonymous network gets about 100 a window. So the page is designed around that:<br>• one `or(...)` query per registry and one per district, so a page load is 3 queries;<br>• free raw `arkiv_getEntityCount` calls with `[{ query }]` (built with the SDK's `render()`) for the district summary ("47 official records for Nadia, 27 above the limit · 1,173 across West Bengal");<br>• the same free count gates the live feed;<br>• the footer shows what the visit spent. | [main.ts#L340](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L340), [arkiv.ts#L44](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/arkiv.ts#L44) |
| **Access keys (Hub)** | Reads start anonymous, on the reader's own budget. Only after an `ANON_COST_LIMITED` answer does the page repeat the request with the site's access key in an `X-API-KEY` header. The key is restricted in the Hub to our origin, injected at build time and never committed. friction #8 explains the trade-off between the Hub's Origins tab and Arkiv's guidance to keep keys out of browser bundles. | [arkiv.ts#L27](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/arkiv.ts#L27) |
| **WebSocket entity events** | `watchEntityEvents` on a `webSocket()` transport with no `fromBlock`, so it is a real subscription. A new test appears with "New test: …" and the status updates without a reload. The stream carries every entity on the chain, so an event only triggers a free filtered count for the district, at most every 15 s. The 100-unit query runs only when that count changed (friction #7 and #8). | [main.ts#L328](https://github.com/mohitt31/jalsaakshya/blob/main/web/src/main.ts#L328) |

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

1. **Records and `$creator`.** Open https://mohitt31.github.io/jalsaakshya/?district=Purulia and pick *Fluoride* with *Only above the drinking-water limit* ticked.
   - Every card is above 1.5 mg/L. This is the `gt("mgl", dec("1.5"))` range.
   - Open a card's *Show the table row*. It shows the Arkiv entity key and "created by curator 0x048A…3760 ✓".
   - The report link opens the PDF at the cited page.
2. **The same query without our app.** In any Node project, run:
   ```ts
   import { createPublicClient, http } from "@arkiv-network/sdk"
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
6. **Verify a shared link.** On any card, click *Link* (or *Share on WhatsApp* and open the link from the message).
   - The *Checked on Arkiv* panel comes from `getEntity(key)`.
   - For a survey record, it reads "Published by the curator wallet", read-only, and current for N days.
   - For a demo kit test, it reads "Signed by a tester's own wallet. Nobody has verified it."
   - Change one hex digit of the key in the URL and it reads "does not point to a current JalSaakshya entity".
7. **Languages.** Use the हिन्दी / বাংলা buttons at the top. Records, statuses, reasons, the form and district names switch, and the choice is remembered.

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
  - Anyone can read and query the whole dataset from Arkiv with the documented contract in `schema.md` (step 2 above), without our site.
  - A district office that would rather the "unsafe" list disappeared cannot remove it. Neither can we.

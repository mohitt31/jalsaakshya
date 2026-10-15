# JalSaakshya data contract on Arkiv

Network: Tiramisu testnet (chain ID `7738577`), RPC `https://rpc.tiramisu.db-chain.testnet.arkiv.network`.
SDK: `@arkiv-network/sdk` 0.8.1. Every entity carries `app = "jalsaakshya/v1"`, so any client can find the
whole dataset with one predicate. No backend is involved: the web app runs these queries from the browser.

## Who writes what

| Role | Address | Writes |
|---|---|---|
| Curator | `0x048A053E77e7771b212d04D906E7b70139fC3760` | `source` and `obs` entities (the published survey dataset) |
| Curator | (same) | `lab` registry entities |
| Registered labs | wallets listed in `lab` entities | `test` entities with `method = lab` that the app treats as deciding |
| Anyone | any wallet | `site` and `test` entities, and Lifetime Extension of any `site` |

Trust is decided by `$creator`, which is immutable. The app shows a record as an official survey record
only when `$creator` is the curator address. Copying the attributes from another wallet does not work,
because the query filters with `createdBy(curator)`, not with a field anyone can set.

## Entity types

### `source`: one government report or published study

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `app` | str | `jalsaakshya/v1` | namespace |
| `kind` | str | `source` | |
| `doc` | str | `gwq_west_bengal` | stable document id, joins to `obs.doc` |
| `publisher` | str | `CGWB` | |
| `pub_year` | i32 | `2024` | 0 if unknown |
| `records` | i32 | `730` | number of `obs` rows published from this document |

Payload (JSON): `title`, `url` (the PDF or PubMed page), `publisher`, `year`, `authors`.
Flags: `readonly`. Expiration: 730 days (a report stays citable for two survey cycles).

### `obs`: one measured value, as printed on a cited page

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `app`, `kind` | str | `jalsaakshya/v1`, `obs` | |
| `eid` | str | `gwq_west_bengal:106:0:0:17` | document, page, table, row, column of the source cell |
| `doc` | str | `gwq_west_bengal` | joins to `source.doc` |
| `district` | str | `Purulia` | West Bengal district |
| `place` | str | `Hansla More` | village, block or site as printed (≤100 chars) |
| `contaminant` | str | `arsenic` / `fluoride` | |
| `stat` | str | `single`, `max`, `min`, `mean`, `range_min`, `range_max` | what the number is |
| `mgl` | dec | `0.41` | value converted to mg/L (ranges work on it) |
| `exceeds` | bool | `false` | `mgl` above the IS 10500:2012 limit (arsenic 0.01, fluoride 1.5 mg/L) |
| `year` | i32 | `2022` | sampling year when the source states it (attribute absent otherwise) |
| `page` | i32 | `106` | physical PDF page; `0` for an abstract |

Payload (JSON): `value_text` and `unit` exactly as printed, `unit_basis` (column header or table note on the
same page), `places`, `well_id`, `source_type`, `period`, `period_quote`, `header`, `row_text`,
`row_verified`, `spatial_support`, `limit_mgl`.
Flags: `readonly`. Expiration: 365 days (a survey row is evidence until the next published survey supersedes it).
Written in atomic batches: a document's `source` entity and its first `obs` rows land in the same transaction.

### `lab`: registry of labs whose results decide (curator only)

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `app`, `kind` | str | `jalsaakshya/v1`, `lab` | |
| `wallet` | addr | `0x690F…a066` | the lab's signing wallet |
| `name` | str | `Demo lab (synthetic, for judging)` | |
| `district` | str | `Nadia` | |
| `demo` | bool | `true` | present only on demo data |

Not readonly, so the curator can delete a listing. Expiration: 365 days, renewed yearly by the curator;
a lapsed listing drops the lab from the registry. The app treats a `test` as a lab result only when its
`$creator` is a `wallet` in this registry, and only registry entities whose `$creator` is the curator count.

### `site`: a drinking-water source (anyone)

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `app`, `kind` | str | `jalsaakshya/v1`, `site` | |
| `site` | str | `nadia/demo-source-a-synthetic` | stable slug of district and place; joins to `test.site` |
| `district`, `place` | str | `Nadia`, `Demo source A (synthetic)` | |
| `srctype` | str | `tube well` | tube well, dug well, hand pump, piped supply, community plant |
| `demo` | bool | `true` | present only on demo data |

Flags: `readonly`, `permissionlessExtension`. Expiration: 365 days. Every new test renews it for another
365 days with `extendEntity`, in the same atomic batch as the test, so a source stays listed while people
keep testing it and drops off a year after its last test. If two wallets create the same `site` slug, the
earliest-created entity is canonical.

### `test`: one test result for a source (anyone)

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `app`, `kind` | str | `jalsaakshya/v1`, `test` | |
| `site`, `district`, `place` | str | `nadia/demo-source-a-synthetic` | |
| `contaminant` | str | `arsenic` | |
| `mgl` | dec | `0.032` | reading converted to mg/L |
| `exceeds` | bool | `true` | |
| `method` | str | `kit` / `lab` | `lab` counts only from a registered lab wallet |
| `tested` | u64 | `1792060000` | unix seconds |
| `demo` | bool | `true` | present only on demo data |

Payload (JSON): `note` (≤200 chars; the form refuses phone numbers and emails), `kit`, `entered_value`,
`entered_unit`, and `synthetic` on demo data. Flags: `readonly`.
Expiration follows the rule the reading lives under:
- **lab result: 365 days.** NRDWP/JJM guidelines require a chemical test of every drinking-water source at
  least once a year, so a lab result is current until the next mandated test is due.
- **kit result: 90 days.** A field-kit reading is screening; UDWQMP 5.1.1 says kit positives must be referred
  to a lab. A reading nobody follows up fades instead of standing in for the annual test.

Status of a source, computed in the browser from its live tests (`web/src/model.ts`, unit-tested):
1. newest registered-lab result per contaminant decides: above the limit → **unsafe**, else **within limit**;
   a kit warning taken after the newest lab result re-opens it → **needs lab confirmation**;
2. otherwise kit readings screen: any reading at or above half the limit → **needs lab confirmation**
   (field kits under-read near the limit), else **within limit** with the number of independent testers
   (distinct `$creator`);
3. no live test → **test overdue**. A source is never shown as safe on an expired test.

No names, phone numbers or other personal data are stored. Demo data is synthetic and marked `demo = true`.

## Queries the app runs

```ts
// 1. Official records for a district (optionally one contaminant, above the limit, since a year, place prefix)
publicClient.select({ key: true, creator: true, expiresAt: true, payload: true, attributes: true })
  .where(and([eq("app", str("jalsaakshya/v1")), eq("kind", str("obs")), eq("district", str("Purulia")),
              eq("contaminant", str("fluoride")), gt("mgl", dec("1.5")), gte("year", i32(2015)),
              startsWith("place", "Raghu")]))
  .createdBy(CURATOR).limit(30).fetch()          // then page.next() for cursor pagination

// 2. The documents behind the records
publicClient.select({ key: true, payload: true, attributes: true })
  .where(eq("app", str("jalsaakshya/v1")), eq("kind", str("source"))).createdBy(CURATOR).limit(200).fetch()

// 3. Lab registry (trusted only from the curator)
publicClient.select({ key: true, expiresAt: true, attributes: true })
  .where(eq("app", str("jalsaakshya/v1")), eq("kind", str("lab"))).createdBy(CURATOR).limit(200).fetch()

// 4. Sources and their live tests in a district (any creator; status computed client-side)
publicClient.select({ key: true, creator: true, createdAt: true, expiresAt: true, attributes: true })
  .where(eq("app", str("jalsaakshya/v1")), eq("kind", str("site")), eq("district", str("Nadia"))).limit(200).fetch()
publicClient.select({ key: true, creator: true, expiresAt: true, attributes: true })
  .where(eq("app", str("jalsaakshya/v1")), eq("kind", str("test")), eq("district", str("Nadia"))).limit(200).fetch()

// 5. Adding a test: one atomic batch
wallet.executeBatch({ creates: [test], extensions: [{ entityKey: siteKey, expires: ExpirationTime.fromSeconds(365 * 86400) }] })
// (or { creates: [site, test] } for a new source)

// 6. Live feed: WebSocket transport, no fromBlock, so it is a real subscription
createPublicClient({ chain: tiramisu, transport: webSocket() })
  .watchEntityEvents({ onEntityCreated })   // new tests refresh the district without polling
```

The official-records query is pinned with `.atBlock(head)` so its cursor stays valid across pages.
Curator console (`curator.html`) also runs `createdBy(curator)` with `kind = "obs"` across all pages to
skip rows that are already published, so publishing can resume after an interruption.

## What stays off Arkiv on purpose

- The PDFs themselves (100–270 pages each). Entities keep the URL, page number and the exact row text.
- Extraction and page re-reading (done once by NeerTathya, commit `b43d03f`), and rows whose unit is not
  printed on the cited page: they are dropped, not guessed.
- Translation strings and the district list (static site).

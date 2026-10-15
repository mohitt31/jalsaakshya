# JalSaakshya data contract on Arkiv

Network: Tiramisu testnet (chain ID `7738577`), RPC `https://rpc.tiramisu.db-chain.testnet.arkiv.network`.
SDK: `@arkiv-network/sdk` 0.8.1. Every entity carries `app = "jalsaakshya/v1"`, so any client can find the
whole dataset with one predicate. No backend is involved: the web app runs these queries from the browser.

## Who writes what

| Role | Address | Writes |
|---|---|---|
| Curator | `0x048A053E77e7771b212d04D906E7b70139fC3760` | `source` and `obs` entities (the published survey dataset) |
| Anyone | any wallet | `field` entities (community field tests), and Lifetime Extension of any `field` entity |

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

### `field`: a community field test (kit or lab)

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `app`, `kind` | str | `jalsaakshya/v1`, `field` | |
| `district` | str | `Nadia` | |
| `place` | str | `Bhagwanpur tube well` | |
| `contaminant` | str | `arsenic` | |
| `mgl` | dec | `0.05` | reading converted to mg/L |
| `exceeds` | bool | `true` | |
| `method` | str | `kit` / `lab` | |
| `tested` | u64 | `1792060000` | unix seconds |

Payload (JSON): `note` (≤200 chars, the form refuses phone numbers and emails), `kit`, `entered_value`, `entered_unit`.
Flags: `readonly`, `permissionlessExtension`. Expiration: 90 days. Anyone who re-tests the same source can
extend it by another 90 days (`extendEntity`), so a report survives only while people keep confirming it.
No names, phone numbers or other personal data are stored.

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

// 3. Community field tests for a district (any creator, labelled with it)
publicClient.select({ key: true, creator: true, expiresAt: true, payload: true, attributes: true })
  .where(eq("app", str("jalsaakshya/v1")), eq("kind", str("field")), eq("district", str("Nadia"))).limit(50).fetch()

// 4. Live feed: WebSocket transport, no fromBlock, so it is a real subscription
createPublicClient({ chain: tiramisu, transport: webSocket() })
  .watchEntityEvents({ onEntityCreated, onExpiryExtended })
```

Curator console (`curator.html`) also runs `createdBy(curator)` with `kind = "obs"` across all pages to
skip rows that are already published, so publishing can resume after an interruption.

## What stays off Arkiv on purpose

- The PDFs themselves (100–270 pages each). Entities keep the URL, page number and the exact row text.
- Extraction and page re-reading (done once by NeerTathya, commit `b43d03f`), and rows whose unit is not
  printed on the cited page: they are dropped, not guessed.
- Translation strings and the district list (static site).

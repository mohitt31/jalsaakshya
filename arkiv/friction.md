# Friction report: building JalSaakshya on Arkiv

Environment for everything below, unless a line says otherwise:
- `@arkiv-network/sdk` **0.8.1**, `viem` **2.57.7**, bundled with Vite 5 and run in a Chromium-based browser (the Claude desktop app's browser pane), Tiramisu testnet (chain ID `7738577`), public RPC with no access key.
- Dates: 15 to 17 October 2026 (IST). Wallets: see [onchain.md](onchain.md).
- Every item was reproduced from our own code. The probes live in `web/src/curator.ts` (`probes()`), and
  the "Run probes" button on `/curator.html` re-runs them. Items marked **worked** are paths we tested that
  behaved as documented, written up with the same detail.

---

## 1. A batch larger than ~20 KB fails with a misleading "Execution error without revert data"

**Surface:** TypeScript SDK `executeBatch` → public JSON-RPC `eth_estimateGas`.

**Expected:** either the batch goes through, or the error says the request is too large and what the limit is.

**Actual:** the SDK throws `EntityMutationError: Transaction failed: Execution error without revert data`.
The real cause is only visible in the nested viem error: the RPC answered **HTTP 413** to `eth_estimateGas`.
The limit is on bytes, not on the number of operations:

| Batch | Payload bytes (sum) | Result |
|---|---|---|
| 40 tiny entities (`{"i":n}` payloads) | < 1 KB | ok |
| 80 tiny entities | < 2 KB | ok |
| 35 survey rows (our real `obs` entities) | 18,895 | ok |
| 40 survey rows | 21,661 | HTTP 413 on `eth_estimateGas` |

All four rows reproduced again on 17 October from the probe button (tiny batches in tx `0x912e07c4…` and `0x7439bf66…`).

Our first publishing attempt used 50 rows per batch and failed this way; 40 failed too; 30 worked. We published
the dataset in 49 batches of up to 30 rows.

**Steps to reproduce:** build 40 creates of ~540-byte JSON payloads with 11 attributes each, call
`walletClient.executeBatch({ creates })` against the public RPC.

**What would fix it:** surface the HTTP status in `EntityMutationError` (it is already in `cause`), document the
request-size limit next to "Batch writes", or have the SDK split or reject an oversized batch before sending.
A size check in the SDK could say "this batch is N bytes; the public RPC accepts about M".

## 2. Uppercase in an attribute name: the SDK accepts it, the node rejects it with a contradictory message

**Surface:** SDK attribute validation vs. node validation.

**Expected:** if `sampleYear` is not a valid attribute name, the SDK rejects it before signing, as it does for
reserved words and leading digits.

**Actual:** the SDK's own grammar (`attr/names.ts`, `/^[A-Za-z][A-Za-z0-9._-]*$/`) accepts it, the transaction is
built and sent, and the node rejects it:

```
Transaction failed: an attribute name holds "Y" (0x59) at byte 6, which is outside the name charset
("A"-"Z", "a"-"z", "0"-"9", ".", "-" and "_", with a letter first)
```

The message lists `"A"-"Z"` as allowed while rejecting `Y`.

**Steps to reproduce:** `createEntity({ attributes: { app: str("x"), sampleYear: i32(2024) }, ... })`.

**What would fix it:** make the SDK regex match the node (lowercase only), and fix the node message so the
charset it prints is the one it enforces. We use lowercase `snake_case` names everywhere (`pub_year`).

## 3. `ne()` and `exists()` are exported but the node rejects them; in a second run they hung instead

**Surface:** `@arkiv-network/sdk/query` predicates.

**Expected:** predicates exported by the SDK work on Tiramisu, or the docs mark them unsupported.

**Actual, first run (14:58 IST):** both rejected in about 0.3 s with
`Query rejected (type, -32002): Requested resource not available.. Query: app = str('jalsaakshya/v1') AND kind != str('obs')`
(and `... AND EXISTS(year)`).
**Second run (15:40 IST, same code):** both requests got no response within 25 s (our probe timeout), while
`eth_blockNumber` and normal `select()` queries on the same page answered in ~0.3 s.
**Third run (17 October, ~01:30 IST):** both rejected again with the first-run message, in 471 ms (`ne`) and 349 ms (`exists`).

**Steps to reproduce:** `publicClient.select({ key: true }).where(eq("app", str(APP)), ne("kind", str("obs"))).limit(1).fetch()`.

**What we did:** no `ne`/`exists` in the app. "Only above the limit" uses `gt("mgl", dec(limit))`; optional
attributes are filtered client-side.

## 4. A cursor at an unpinned head is rejected after a few seconds

**Surface:** `QueryResult.next()`.

**Expected:** `page.next()` keeps working while a user reads the first page.

**Actual:** fetching page 2 six seconds after page 1, without `.atBlock()`, failed with
`Query rejected (cursor, -32005): Request exceeds defined limit.` (first run). In the second run the same call
got no response within 25 s.

**What we did:** the official-records query is pinned with `.atBlock(head)`, read once on page load; "Load more"
then works. This is documented in the SDK source comment ("A cursor is bound to the query, block and …") but the
pagination example in the SDK README calls `result.next()` without `atBlock`.

## 5. Faucet needs a browser wallet sign-in, so a script or in-browser key can't be funded directly

**Surface:** Hub faucet (hub.arkiv.network/faucet).

**Expected:** paste an address, pass the human check, receive test GLM.

**Actual:** the faucet first requires "Sign in with Ethereum" from an injected wallet. Our curator key is
generated inside the page (no injected provider), so we installed MetaMask, signed in with it, and then used
the faucet's "Use a different address" option to send 10 GLM to the curator address. That option worked well;
it is just not reachable until you have a browser wallet.

**What would fix it:** allow the human check without SIWE for a pasted address, or mention in the Tiramisu
docs that a browser wallet is needed to use the faucet.

## 6. Small doc drift: SDK README shows `^0.6.0`

**Surface:** the README shipped inside `@arkiv-network/sdk@0.8.1` (`node_modules/@arkiv-network/sdk/README.md`).

**Actual:** the install section says `"@arkiv-network/sdk": "^0.6.0"`. Fix: update the snippet to `^0.8.1`.

## 7. `watchEntityEvents` has no filter, so "is this ours?" costs one RPC call per chain event

**Surface:** `watchEntityEvents` over the WebSocket transport, and the public HTTP RPC's rate limit.

**Expected:** a way to subscribe to the entities an app cares about (an attribute such as `app = "jalsaakshya/v1"`,
or a creator), as queries allow.

**Actual:** `WatchEntityEventsParameters` takes handlers, `fromBlock` and `pollingInterval`, and nothing to
filter by (`dist/index-DaNeJUw8.d.ts` in 0.8.1). `EntityCreatedEvent` carries `entityKey`, `owner`, `expiresAt`
and `creationFlags`, but no attributes. To tell whether a new entity is one of our `test` entities, our first
version called `getEntity(entityKey)` for every created event. On 17 October (IST), with other teams writing
to Tiramisu, one page load in the Nadia view logged **144 `HTTP 429` responses**. The RPC answers with
`ratelimit: limit=600, remaining=…, reset=10`, and once it starts returning 429s, the page's own district
queries fail too: the records list and the sources list stayed empty.

**Steps to reproduce:** subscribe with `createPublicClient({ chain: tiramisu, transport: webSocket() })
.watchEntityEvents({ onEntityCreated: (e) => publicClient.getEntity(e.entityKey) })` and leave the page open
while the chain is busy.

**What we did:** the event is now only a trigger. The app runs one query for the open district at most every
8 seconds and diffs the result (`refreshLive` in `web/src/main.ts`). After the change, the same page logged no
new 429s.

**What would fix it:** an attribute or creator filter on `watchEntityEvents` (the node already evaluates the
same predicates for queries), or attributes in `EntityCreatedEvent`. The rate limit (600 requests per 10 s)
could also be documented next to the public RPC URL.

## 8. The anonymous query budget arrived mid-challenge; the SDK has no way to pass an access key, and the docs don't mention either

**Surface:** public JSON-RPC (`arkiv_query`), `@arkiv-network/sdk` 0.8.1 `createPublicClient`, docs (JSON-RPC page), Hub access keys.

**Expected:** a backend-free browser app (what the challenge asks for: "someone outside the team can read and query
the data from Arkiv without the team's backend") keeps reading during judging. If reads need a key, the docs and
the SDK say how to pass one, and how to do it from a browser.

**Actual:**
- **On 17 October, ~01:00 IST,** responses carried `ratelimit: limit=600, remaining=…, reset=10`.
- **On 17 October, ~21:30 IST,** `eth_blockNumber` still answered 200 (`limit=600, remaining=599, reset=60`). Every `arkiv_query` answered **HTTP 429** with:
  ```
  ratelimit: limit=10000, remaining=0, reset=2769
  {"error":"ANON_COST_LIMITED","message":"unauthenticated query budget exhausted; get an API key at https://hub.arkiv.network for a monthly qu…
  ```
- The budget is per network, not per app. Our own testing from one laptop used it up, and everyone behind the same network would have hit it too (a college campus or a mobile carrier's NAT).
- Because `eth_blockNumber` still worked, our page loaded, read the head block, and then got nothing. The SDK surfaced the 429 only as viem's generic `HTTP request failed. Status: 429`. The useful `ANON_COST_LIMITED` text was in the response body.
- `createPublicClient` has no access-key option, and the SDK source contains no mention of keys or authorization headers.
- `docs.arkiv.network/json-rpc/querying-data/` mentions neither a budget nor keys. The three accepted forms (key in the URL path, an `X-API-KEY` header, a Bearer token) and the per-key **Origins** and **IP allowlist** settings appear only in the Hub, after connecting a wallet.

**Steps to reproduce:** from one IP, run enough `arkiv_query` calls (our curator probes plus a few dozen page loads
did it), then `curl --json '{"jsonrpc":"2.0","id":1,"method":"arkiv_query","params":["app = str(\'jalsaakshya/v1\')",{"limit":"0x1"}]}' https://rpc.tiramisu.db-chain.testnet.arkiv.network`.

**What we measured next (17 October, from the response headers):**
- Every `arkiv_query` carries `arkiv-cost: 100`, whether it returns 1 row or 200. So the anonymous budget is about 100 queries per network per window.
- `arkiv_getEntityCount` with a filter (`params: [{ query }]`) carries no `arkiv-cost` and kept answering while queries were refused.
- With a key, the response adds `arkiv-quota-used-percent` (2% after about 20 queries, so roughly 1,000 queries a month).
- The key is accepted as an `X-API-KEY` header from the browser. CORS allows it.

**What this showed about our own app:**
- Our first live feed re-ran the district query on every chain-wide `EntityCreated` event, at most every 8 s. That is up to ~900 queries an hour. Leaving the page open for a few minutes used up a network's budget, which is what happened to us.
- A page load cost 5 queries.

**What we did:**
- **One query per registry and per district.** The curator's `source` and `lab` registry is one `or(...)` query. A district's `site` and `test` entities are one query. A page load is now 3 queries (300 units).
- **Free counts gate the expensive reads.** The live feed now runs a free filtered count for the open district, at most every 15 s, and queries only when the count changed. The district summary ("47 official records for Nadia, 27 above the limit · 1,173 across West Bengal") comes from four free counts.
- **No retry loops.** The transport has `retryCount: 0`, as Arkiv's own skills advise for 429.
- **The key is a fallback, not the default.** Reads start anonymous, on the reader's own budget. Only after an `ANON_COST_LIMITED` answer does the page repeat the request with the site's access key in an `X-API-KEY` header (not the URL path). The key is restricted in the Hub to our origin, injected at build time and never committed.
- **The cost is visible.** The footer shows what the visit spent ("3 queries, 300 units") and says when the key took over.

**A tension worth resolving in the docs:**
- The Hub's Origins tab is written for keys that "ship in a web app".
- Arkiv's own agent skills (`arkiv-security-trust`, `arkiv-troubleshooting`) say to keep access keys out of browser bundles and URL paths.

A backend-free app, which this challenge rewards, sits between the two. We followed the Hub (key in the bundle, origin-restricted), followed the skills where we could (header rather than path, used only after the free budget is gone), and say so here.

**What would fix it:**
- Expose the budget to SDK users: `arkiv-cost` and the remaining budget on query results.
- Put an `accessKey` option (header form) on the SDK's clients.
- Accept a filter in the SDK's `getEntityCount()`. The node already does, and counts are the cheap way to watch for changes.
- Document the anonymous budget (cost units, window, scope) and the three key forms on the JSON-RPC page.
- Say explicitly that an origin-restricted key is the intended way for a static site to read.
- Surface `ANON_COST_LIMITED` as a typed SDK error.

---

## Paths that worked as documented

| Surface | What we did | Result |
|---|---|---|
| Typed attribute check in the SDK | `tested: Date.now()` as a bare number | Rejected before signing with a clear message: "use u64(...) for ... timestamps". Good. |
| `createdBy()` | official records and the lab registry are read only with `.createdBy(curator)` | Spoof probe (17 Oct): demo wallet `0xAac7…43c5` wrote an `obs` entity with the curator's exact attributes (tx `0xbfe422c5a3b4eaa3cc35292b7a8169bec3af1d93f0d1db90b115014287643c45`). The same query found it without `createdBy` (1 result, creator `0xAac7…43c5`) and returned 0 with `createdBy(curator)`. |
| `getEntity(key)` with `creationFlags` | shared links (`?e=<key>`) read one entity and show its `$creator`, `creationFlags.readonly` and `expiresAt` | Returns the flags as set at creation (`readonly: true` on survey rows); a wrong key throws, which the app shows as "not a current JalSaakshya entity". |
| Numeric ranges on `dec` and `i32` | `gt("mgl", dec("1.5"))`, `gte("year", i32(2015))` | Every returned row satisfied the range (checked in the app for Purulia fluoride). |
| `startsWith` | village prefix search | Works, case-sensitive (we upper-case the first letter). |
| `.atBlock()` + cursor | official records paged 30 at a time | Stable across pages. |
| `executeBatch` with creates + extensions | a test entity plus a Lifetime Extension of its site in one transaction | Atomic; both land or neither. |
| Permissionless Lifetime Extension | the demo lab wallet extended a `site` created by demo tester A | Allowed, as the creation flag promises; the site's owner is unchanged. |
| `readonly` creation flag | all `obs`, `source`, `site`, `test` entities | No patch path exists for them; corrections must be new entities. |
| Cost | 1,173 rows + 13 sources in 49 transactions | About 0.18 test GLM total; 26 entities cost ~0.0038 GLM. |
| `getEntityCount()` | SDK call, and raw `arkiv_getEntityCount` with `[{ query }]` | The SDK sends empty params and returns the chain-wide count (8,181, later 10,190). The raw method with a query object returns filtered counts (1,173 curator `obs` entities; 92 with `exceeds = true`), and it is not charged against the query budget. We use it for the district summary and to gate the live feed. |

## The one thing to improve first

Make failures say what actually failed. Items 1, 2 and 8 cost us the most time, and in all three the real reason
was one level down (`cause`, a response body) or hidden behind a contradictory message. For a backend-free app,
item 8 matters most: a budget the SDK cannot see turns into an empty page for every reader on the same network.

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

---

## Paths that worked as documented

| Surface | What we did | Result |
|---|---|---|
| Typed attribute check in the SDK | `tested: Date.now()` as a bare number | Rejected before signing with a clear message: "use u64(...) for ... timestamps". Good. |
| `createdBy()` | official records and the lab registry are read only with `.createdBy(curator)` | Records written by other wallets with identical attributes are not returned. |
| Numeric ranges on `dec` and `i32` | `gt("mgl", dec("1.5"))`, `gte("year", i32(2015))` | Every returned row satisfied the range (checked in the app for Purulia fluoride). |
| `startsWith` | village prefix search | Works, case-sensitive (we upper-case the first letter). |
| `.atBlock()` + cursor | official records paged 30 at a time | Stable across pages. |
| `executeBatch` with creates + extensions | a test entity plus a Lifetime Extension of its site in one transaction | Atomic; both land or neither. |
| Permissionless Lifetime Extension | the demo lab wallet extended a `site` created by demo tester A | Allowed, as the creation flag promises; the site's owner is unchanged. |
| `readonly` creation flag | all `obs`, `source`, `site`, `test` entities | No patch path exists for them; corrections must be new entities. |
| Cost | 1,173 rows + 13 sources in 49 transactions | About 0.18 test GLM total; 26 entities cost ~0.0038 GLM. |
| `getEntityCount()` | called with no filter | Returns the chain-wide count (8,181 then 8,197). It takes no filter, so it cannot count our namespace; we count with queries instead. |

## The one thing to improve first

Make write failures say what actually failed. Items 1 and 2 cost us the most time, and both had the real reason
one level down (`cause`) or hidden behind a contradictory message.

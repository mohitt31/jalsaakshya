// Curator console: publishes the survey dataset to Arkiv with a wallet that lives only in this browser.
import { bool, dec, i32, str } from "@arkiv-network/sdk/attr"
import { eq } from "@arkiv-network/sdk/query"
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils"
import { APP, LIFETIME, publicClient, burnerWallet, balanceOf, txLink, addrLink } from "./arkiv"
import { parseEther } from "viem"
import { ne, exists } from "@arkiv-network/sdk/query"
import { labCreate, testBatch } from "./writes"
import { siteId } from "./model"

const $ = (id: string) => document.getElementById(id)!
const log = (html: string) => { const li = document.createElement("li"); li.innerHTML = html; $("log").prepend(li) }
const wallet_ = burnerWallet("jalsaakshya.curator.v1")
const wallet = wallet_
const me = wallet.account!.address
const manifest: { txs: any[] } = { txs: [] }
;(window as any).jsqManifest = manifest

async function refresh() {
  $("addr").innerHTML = `<a href="${addrLink(me)}" target="_blank" rel="noopener">${me}</a>`
  $("bal").textContent = `${(await balanceOf(me)).toFixed(4)} GLM`
}

async function published(): Promise<Set<string>> {
  const seen = new Set<string>()
  let page = await publicClient.select({ attributes: { eid: true, doc: true } })
    .where(eq("app", str(APP)), eq("kind", str("obs"))).createdBy(me).limit(200).fetch()
  for (;;) {
    for (const e of page.entities as any[]) seen.add(e.attributes.eid.value)
    if (!page.hasNextPage()) break
    page = await page.next()
  }
  return seen
}

async function publishedSources(): Promise<Set<string>> {
  const page = await publicClient.select({ attributes: { doc: true } })
    .where(eq("app", str(APP)), eq("kind", str("source"))).createdBy(me).limit(200).fetch()
  return new Set((page.entities as any[]).map((e) => e.attributes.doc.value))
}

function obsCreate(r: any) {
  const attributes: Record<string, any> = {
    app: str(APP), kind: str("obs"), eid: str(r.eid), doc: str(r.doc), district: str(r.district),
    place: str(r.place), contaminant: str(r.contaminant), stat: str(r.stat), mgl: dec(r.mgl),
    exceeds: bool(r.exceeds), page: i32(r.page),
  }
  if (r.year) attributes.year = i32(r.year)
  return {
    payload: jsonToPayload(r.payload), contentType: "application/json", attributes,
    expires: ExpirationTime.fromSeconds(LIFETIME.obs), flags: { readonly: true },
  }
}

function sourceCreate(s: any) {
  return {
    payload: jsonToPayload(s.payload), contentType: "application/json",
    attributes: { app: str(APP), kind: str("source"), doc: str(s.doc), publisher: str(s.publisher),
      pub_year: i32(s.pub_year || 0), records: i32(s.records) },
    expires: ExpirationTime.fromSeconds(LIFETIME.source), flags: { readonly: true },
  }
}

async function publish() {
  const size = Math.max(1, Math.min(100, parseInt(($("batch") as HTMLInputElement).value) || 25))
  const limitTx = parseInt(($("maxtx") as HTMLInputElement).value) || 1000
  ;($("go") as HTMLButtonElement).disabled = true
  try {
    const data = await (await fetch(import.meta.env.BASE_URL + "data/records.json")).json()
    const done = await published(); const doneSrc = await publishedSources()
    log(`Already on Arkiv from this wallet: ${done.size} records, ${doneSrc.size} sources`)
    let sent = 0
    for (const s of data.sources) {
      const todo = data.records.filter((r: any) => r.doc === s.doc && !done.has(r.eid))
      let needSource = !doneSrc.has(s.doc)
      for (let i = 0; i < todo.length || needSource; i += size) {
        if (sent >= limitTx) { log("Stopped at the transaction limit."); return }
        const chunk = todo.slice(i, i + size)
        const creates = [...(needSource ? [sourceCreate(s)] : []), ...chunk.map(obsCreate)]
        const t0 = performance.now()
        const res = await wallet.executeBatch({ creates })
        const ms = Math.round(performance.now() - t0)
        manifest.txs.push({ doc: s.doc, txHash: res.txHash, created: res.createdEntities, eids: chunk.map((r: any) => r.eid), source: needSource })
        log(`${s.doc}: ${creates.length} entities in one batch, ${ms} ms · <a href="${txLink(res.txHash)}" target="_blank" rel="noopener">tx</a>`)
        needSource = false; sent++
        await refresh()
        if (!todo.length) break
      }
    }
    log("Done.")
  } catch (err: any) {
    log(`<b>Error:</b> ${String(err?.shortMessage || err?.message || err).slice(0, 400)}`)
    console.error(err)
  } finally {
    ;($("go") as HTMLButtonElement).disabled = false
  }
}

// ---- lab registry -----------------------------------------------------------------------------
async function registerLab() {
  const wallet = ($("lab-wallet") as HTMLInputElement).value.trim() as `0x${string}`
  const name = ($("lab-name") as HTMLInputElement).value.trim()
  const district = ($("lab-district") as HTMLInputElement).value.trim()
  const demo = ($("lab-demo") as HTMLInputElement).checked
  try {
    const r = await wallet_.createEntity(labCreate({ wallet, name, district, demo }) as any)
    manifest.txs.push({ kind: "lab", txHash: r.txHash, created: [r.entityKey], wallet, demo })
    log(`Lab registered: ${name} (${wallet}) · <a href="${txLink(r.txHash)}" target="_blank" rel="noopener">tx</a>`)
  } catch (err: any) { log(`<b>Error:</b> ${String(err?.shortMessage || err?.message || err).slice(0, 300)}`) }
}

// ---- synthetic demo data (clearly labelled) -------------------------------------------------
const demoWallets = { kitA: burnerWallet("jalsaakshya.demo.kitA"), kitB: burnerWallet("jalsaakshya.demo.kitB"), lab: burnerWallet("jalsaakshya.demo.lab") }

async function fundDemo() {
  for (const [name, w] of Object.entries(demoWallets)) {
    const a = w.account!.address
    if ((await balanceOf(a)) >= 0.05) { log(`${name} ${a} already funded`); continue }
    const hash = await (wallet_ as any).sendTransaction({ to: a, value: parseEther("0.1") })
    await publicClient.waitForTransactionReceipt({ hash })
    log(`Funded ${name} ${a} with 0.1 GLM · <a href="${txLink(hash)}" target="_blank" rel="noopener">tx</a>`)
  }
}

async function seedDemo() {
  const D = "Nadia"
  const day = 86400, now = Math.floor(Date.now() / 1000)
  const steps: [keyof typeof demoWallets, any][] = [
    ["kitA", { place: "Demo source A (synthetic)", contaminant: "arsenic", mgl: 0.032, method: "kit", kit: "demo kit", tested: now - 9 * day }],
    ["lab", { place: "Demo source A (synthetic)", contaminant: "arsenic", mgl: 0.041, method: "lab", kit: "Demo lab (synthetic)", tested: now - 2 * day }],
    ["kitA", { place: "Demo source B (synthetic)", contaminant: "arsenic", mgl: 0.003, method: "kit", kit: "demo kit", tested: now - 6 * day }],
    ["kitB", { place: "Demo source B (synthetic)", contaminant: "arsenic", mgl: 0.004, method: "kit", kit: "demo kit", tested: now - 1 * day }],
    ["kitB", { place: "Demo source C (synthetic)", contaminant: "fluoride", mgl: 1.2, method: "kit", kit: "demo kit", tested: now - 3 * day }],
  ]
  const known = new Map<string, `0x${string}`>()
  for (const [who, t] of steps) {
    const id = siteId(D, t.place)
    const res = await publicClient.select({ key: true, createdAt: true }).where(eq("app", str(APP)), eq("kind", str("site")), eq("site", str(id))).limit(10).fetch()
    const first = [...(res.entities as any[])].sort((a, b) => Number(a.createdAt - b.createdAt))[0]
    const key = known.get(id) || first?.key
    const r = await demoWallets[who].executeBatch(testBatch({ ...t, site: id, district: D, srctype: "tube well", demo: true }, key) as any)
    if (!key && r.createdEntities[0]) known.set(id, r.createdEntities[0])
    manifest.txs.push({ kind: "demo-test", who, wallet: demoWallets[who].account!.address, txHash: r.txHash, created: r.createdEntities, extended: r.extendedEntities, site: id })
    log(`demo ${who}: ${t.place} ${t.method} ${t.mgl} ${t.contaminant} · ${key ? "extended site" : "created site"} · <a href="${txLink(r.txHash)}" target="_blank" rel="noopener">tx</a>`)
  }
  // a listed source whose tests have all lapsed: it must read "test overdue", never "safe"
  const id = siteId(D, "Demo source D (synthetic)")
  const r = await demoWallets.kitA.executeBatch({ creates: [testBatch({ site: id, district: D, place: "Demo source D (synthetic)", contaminant: "arsenic", mgl: 0, method: "kit", srctype: "hand pump", demo: true }).creates[0]] } as any)
  manifest.txs.push({ kind: "demo-site-only", txHash: r.txHash, created: r.createdEntities, site: id })
  log(`demo: listed source D with no current test · <a href="${txLink(r.txHash)}" target="_blank" rel="noopener">tx</a>`)
}

// ---- friction probes: reproduce SDK/node behaviour for friction.md --------------------------
async function probes() {
  const out: any[] = []
  const run = async (name: string, f: () => Promise<any>) => {
    const t0 = performance.now()
    try { const v = await f(); out.push({ name, ok: true, ms: Math.round(performance.now() - t0), result: String(v).slice(0, 200) }) }
    catch (e: any) { out.push({ name, ok: false, ms: Math.round(performance.now() - t0), error: String(e?.shortMessage || e?.details || e?.message || e).slice(0, 400) }) }
  }
  await run("ne() predicate", async () => (await publicClient.select({ key: true }).where(eq("app", str(APP)), ne("kind", str("obs"))).limit(1).fetch()).entities.length)
  await run("exists() predicate", async () => (await publicClient.select({ key: true }).where(eq("app", str(APP)), exists("year")).limit(1).fetch()).entities.length)
  await run("cursor at unpinned head", async () => {
    let p = await publicClient.select({ key: true }).where(eq("app", str(APP)), eq("kind", str("obs"))).limit(5).fetch()
    await new Promise((r) => setTimeout(r, 6000))
    p = await p.next(); return p.entities.length
  })
  await run("getEntityCount()", async () => publicClient.getEntityCount())
  await run("camelCase attribute write", async () => (await wallet_.createEntity({ payload: jsonToPayload({ probe: true }), contentType: "application/json",
    attributes: { app: str(APP + "-probe"), kind: str("probe"), sampleYear: i32(2024) }, expires: ExpirationTime.fromSeconds(600) } as any)).txHash)
  await run("bare number attribute (ms timestamp)", async () => (await wallet_.createEntity({ payload: jsonToPayload({ probe: true }), contentType: "application/json",
    attributes: { app: str(APP + "-probe"), kind: str("probe"), tested: Date.now() }, expires: ExpirationTime.fromSeconds(600) } as any)).txHash)
  // how large can one atomic batch be? tiny entities vs. the real survey payloads
  for (const n of [40, 80]) {
    await run(`batch of ${n} tiny entities`, async () => {
      const creates = Array.from({ length: n }, (_, i) => ({ payload: jsonToPayload({ i }), contentType: "application/json",
        attributes: { app: str(APP + "-probe"), kind: str("probe"), n: i32(i) }, expires: ExpirationTime.fromSeconds(600) }))
      const r = await wallet_.executeBatch({ creates } as any); return `${r.txHash} ${r.createdEntities.length}`
    })
  }
  const data = await (await fetch(import.meta.env.BASE_URL + "data/records.json")).json()
  for (const n of [35, 40]) {
    await run(`batch of ${n} survey-sized entities (probe namespace)`, async () => {
      const creates = data.records.slice(0, n).map((r: any) => ({ ...obsCreate(r), attributes: { ...obsCreate(r).attributes, app: str(APP + "-probe") }, expires: ExpirationTime.fromSeconds(600) }))
      const bytes = creates.reduce((m: number, c: any) => m + c.payload.length, 0)
      try { const r = await wallet_.executeBatch({ creates } as any); return `ok ${r.createdEntities.length} entities, payload ${bytes} bytes` }
      catch (e: any) { throw new Error(`payload ${bytes} bytes: ${e?.shortMessage || e?.message} | ${String(e?.details || e?.cause?.message || "").slice(0, 200)}`) }
    })
  }
  ;(window as any).jsqProbes = out
  log(`<pre class="small">${JSON.stringify(out, null, 1).replace(/</g, "&lt;")}</pre>`)
}

$("go").addEventListener("click", publish)
$("lab-go").addEventListener("click", registerLab)
$("fund").addEventListener("click", () => fundDemo().catch((e) => log(String(e?.shortMessage || e?.message || e))))
$("seed").addEventListener("click", () => seedDemo().catch((e) => log(String(e?.shortMessage || e?.message || e))))
$("probe").addEventListener("click", () => probes())
$("demo-lab").textContent = demoWallets.lab.account!.address
$("refresh").addEventListener("click", refresh)
refresh().catch((e) => log(String(e)))

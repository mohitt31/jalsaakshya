// Curator console: publishes the survey dataset to Arkiv with a wallet that lives only in this browser.
import { bool, dec, i32, str } from "@arkiv-network/sdk/attr"
import { eq } from "@arkiv-network/sdk/query"
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils"
import { APP, LIFETIME, publicClient, burnerWallet, balanceOf, txLink, addrLink } from "./arkiv"

const $ = (id: string) => document.getElementById(id)!
const log = (html: string) => { const li = document.createElement("li"); li.innerHTML = html; $("log").prepend(li) }
const wallet = burnerWallet("jalsaakshya.curator.v1")
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

$("go").addEventListener("click", publish)
$("refresh").addEventListener("click", refresh)
refresh().catch((e) => log(String(e)))

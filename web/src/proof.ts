// Proof page: every on-chain claim, checked live from Arkiv Tiramisu in the reader's browser.
// Same checks as web/verify.mjs. Counts are free (arkiv_getEntityCount); three checks are 100-unit queries.
import { str, dec } from "@arkiv-network/sdk/attr"
import { and, eq, gt, or, render, type Expression } from "@arkiv-network/sdk/query"
import { APP, CURATOR as CUR, publicClient, countWhere, txLink, addrLink, readStats } from "./arkiv"
const CURATOR = CUR as `0x${string}`
import { SEAL } from "./writes"

const $ = (id: string) => document.getElementById(id)!
const fmt = (n: number) => n.toLocaleString("en-IN")
const kind = (k: string) => eq("kind", str(k))
const by = (a: string) => ` AND $creator = addr(${a})`
const owned = (a: string) => ` AND $owner = addr(${a})`
const count = (exprs: Expression[], extra = "") => countWhere(render(and([eq("app", str(APP)), ...exprs])) + extra)
const link = (href: string, text: string) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`
const TX = {
  spoof: "0xbfe422c5a3b4eaa3cc35292b7a8169bec3af1d93f0d1db90b115014287643c45",
  phed1: "0xa9b0c596533768e1f077777128ae4aedca87ccd201251e27dfe83e17f4ccae27",
  phed2: "0xc986a812f1e4e18238d64cf48ca9fe900304333d962be0226a0ecb2a209c71e9",
  seal1: "0x8ad8df239395a3fdd3777bb293660175bcf6d1ec5b0f4cca16c450a405153b69",
  test1: "0x25696c897bf953f83e68d5ca866156d8830b9efcd373f70da03c9eeb2c1cd9ee",
  site1: "0x421282c5cb7cfcd173e674ec3cb97f2baeda100efd965ab2f0ac7f9f3327e904",
  renew: "0x292a022e1b18618710a1bdb29f7234b62433423d2bed95d2614d71765ac692db",
}

type Result = { state: "pass" | "fail" | "note"; detail: string }
type Check = { title: string; evidence: string; run: () => Promise<Result> }
const pass = (ok: boolean, detail: string): Result => ({ state: ok ? "pass" : "fail", detail })

const checks: Check[] = [
  {
    title: "1,173 official survey rows, trusted only by their creator",
    evidence: `Curator ${link(addrLink(CURATOR), CURATOR)}. A copy with identical attributes from another wallet is excluded: spoof probe ${link(txLink(TX.spoof), "tx")}.`,
    run: async () => {
      const [cur, all] = await Promise.all([count([kind("obs")], by(CURATOR)), count([kind("obs")])])
      return pass(cur === 1173, `${fmt(cur)} rows with createdBy(curator). Rows with the same app and kind from any wallet: ${fmt(all)}; the app shows only the curator's.`)
    },
  },
  {
    title: "WB PHED's official arsenic figures for Nadia, as printed",
    evidence: `18 block records in two atomic batches: ${link(txLink(TX.phed1), "tx 1")}, ${link(txLink(TX.phed2), "tx 2")}.`,
    run: async () => {
      const r = await publicClient.select({ attributes: true }).where(eq("app", str(APP)), kind("blockstat")).createdBy(CURATOR).limit(50).fetch()
      const ents = r.entities as any[]
      const sum = (k: string) => ents.reduce((s, e) => s + Number(e.attributes?.[k]?.value ?? 0), 0)
      const t = sum("tested"), b = sum("beyond")
      return pass(ents.length === 18 && t === 124297 && b === 76665, `${ents.length} blocks: ${fmt(t)} arsenic tests, ${fmt(b)} beyond 10 µg/L.`)
    },
  },
  {
    title: "220 government lab results from Jal Jeevan Mission WQMIS, sealed",
    evidence: `Every Nadia sample the JJM WQMIS contaminant-wise report flags for arsenic (FY 2025-26), one readonly entity each; extract and SHA-256 in ${link("https://github.com/mohitt31/jalsaakshya/tree/main/data/jjm", "data/jjm/")}; listed on ${link("jjm.html", "this page")}.`,
    run: async () => {
      const [cur, sealed] = await Promise.all([count([kind("jjmsample")], by(CURATOR)), count([kind("jjmsample")], by(CURATOR) + owned(SEAL))])
      return pass(cur === 220 && sealed === 220, `${cur} samples created by the curator, ${sealed} owned by 0x…dEaD.`)
    },
  },
  {
    title: "No official record can be deleted, not even by the curator",
    evidence: `Each was handed to ${link(addrLink(SEAL), "0x…dEaD")} (no key exists for it), for example ${link(txLink(TX.seal1), "this seal tx")}.`,
    run: async () => {
      const k = [or([kind("obs"), kind("source"), kind("blockstat"), kind("jjmsample")])]
      const [all, still, sealed] = await Promise.all([count(k, by(CURATOR)), count(k, by(CURATOR) + owned(CURATOR)), count(k, by(CURATOR) + owned(SEAL))])
      return pass(all > 0 && still === 0 && sealed === all, `${fmt(sealed)} of ${fmt(all)} owned by 0x…dEaD; ${still} still owned by the curator.`)
    },
  },
  {
    title: "Every test result is sealed in the transaction that creates it",
    evidence: `First sealed test (create + source renewal + ownership change, one transaction): ${link(txLink(TX.test1), "tx")}.`,
    run: async () => {
      const [all, sealed] = await Promise.all([count([kind("test")]), count([kind("test")], owned(SEAL))])
      if (sealed === all) return pass(all > 0, `${sealed} of ${all} live tests owned by 0x…dEaD.`)
      return { state: "note", detail: `${sealed} of ${all} live tests sealed. Anyone can write our schema from their own script; such writes are listed here unsealed.` }
    },
  },
  {
    title: "Nobody can delist a source, and anyone can keep it alive",
    evidence: `A source is sealed with its first test (${link(txLink(TX.site1), "tx")}) and keeps permissionlessExtension: another wallet renewed a sealed source in ${link(txLink(TX.renew), "this tx")}.`,
    run: async () => {
      const r = await publicClient.select({ key: true, owner: true, creationFlags: true }).where(eq("app", str(APP)), kind("site")).limit(200).fetch()
      const ents = r.entities as any[]
      const flags = ents.filter((e) => e.creationFlags?.readonly && e.creationFlags?.permissionlessExtension).length
      const sealed = ents.filter((e) => String(e.owner).toLowerCase() === SEAL.toLowerCase()).length
      return pass(ents.length > 0 && flags === ents.length && sealed === ents.length, `${ents.length} sources: ${flags} readonly + permissionlessExtension, ${sealed} owned by 0x…dEaD.`)
    },
  },
  {
    title: "A range query anyone can run without our app",
    evidence: `Purulia fluoride above 1.5 mg/L: <span class="mono">gt("mgl", dec("1.5"))</span> with <span class="mono">createdBy(curator)</span>, the query in our reproduce steps.`,
    run: async () => {
      const r = await publicClient.select({ attributes: true, creator: true })
        .where(eq("app", str(APP)), kind("obs"), eq("district", str("Purulia")), eq("contaminant", str("fluoride")), gt("mgl", dec("1.5")))
        .createdBy(CURATOR).limit(200).fetch()
      const ents = r.entities as any[]
      const ok = ents.length > 0 && ents.every((e) => String(e.creator).toLowerCase() === CURATOR.toLowerCase() && Number(e.attributes?.mgl?.value) > 1.5)
      return pass(ok, `${ents.length} rows, all above 1.5 mg/L, all from the curator.`)
    },
  },
]

function row(c: Check, r?: Result) {
  const st = r ? r.state : "run"
  const label = { run: "…", pass: "PASS", fail: "FAIL", note: "NOTE" }[st]
  return `<div class="chk"><span class="st ${st}">${label}</span><div><h3>${c.title}</h3>${r ? `<p>${r.detail}</p>` : ""}<p class="small muted">${c.evidence}</p></div></div>`
}

async function main() {
  const results: (Result | undefined)[] = checks.map(() => undefined)
  const paint = () => { $("checks").innerHTML = checks.map((c, i) => row(c, results[i])).join("") }
  paint()
  let head = ""
  try { head = String(await publicClient.getBlockNumber()) } catch { /* shown below */ }
  await Promise.all(checks.map(async (c, i) => {
    try { results[i] = await c.run() } catch (e: any) { results[i] = { state: "fail", detail: `Could not read: ${String(e?.shortMessage || e?.message || e).slice(0, 160)}` } }
    paint()
  }))
  const passed = results.filter((r) => r?.state === "pass").length
  $("sum").textContent = `${passed} of ${checks.length} checks passed`
  $("meta").textContent = `Read from Arkiv Tiramisu just now${head ? ` (block ${fmt(Number(head))})` : ""}, ${new Date().toLocaleString()}. ${readStats.queries} queries, ${readStats.cost} units of read budget.`
}
main()

// Government lab results page: the JJM WQMIS arsenic samples for Nadia, read live from Arkiv.
// Trusted only by $creator (the curator); each is readonly and owned by 0x…dEaD.
import { str } from "@arkiv-network/sdk/attr"
import { eq } from "@arkiv-network/sdk/query"
import { APP, CURATOR as CUR, publicClient, addrLink, readStats } from "./arkiv"
import { SEAL } from "./writes"
const CURATOR = CUR as `0x${string}`

const $ = (id: string) => document.getElementById(id)!
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!))
type Row = { key: string; sealed: boolean; sample: string; block: string; gp: string; village: string; mgl: number; tested: number }

async function load(): Promise<Row[]> {
  const out: Row[] = []
  let page = await publicClient.select({ key: true, owner: true, attributes: { sid: true, block: true, gp: true, village: true, mgl: true, tested: true } })
    .where(eq("app", str(APP)), eq("kind", str("jjmsample"))).createdBy(CURATOR).limit(60).fetch()
  for (;;) {
    for (const e of page.entities as any[]) {
      const a = (k: string) => e.attributes?.[k]?.value
      out.push({ key: e.key, sealed: String(e.owner).toLowerCase() === SEAL.toLowerCase(), sample: String(a("sid")).replace(/^jjm\//, ""),
        block: a("block"), gp: a("gp"), village: a("village"), mgl: Number(a("mgl")), tested: Number(a("tested")) })
    }
    if (!page.hasNextPage()) break
    page = await page.next()
  }
  return out.sort((x, y) => y.mgl - x.mgl)
}

function paint(rows: Row[], block: string) {
  const sel = block ? rows.filter((r) => r.block === block) : rows
  $("rows").innerHTML = sel.map((r) => `<tr><td>${esc(r.village)}</td><td>${esc(r.gp)}</td><td>${esc(r.block)}</td>` +
    `<td class="n"><span class="x">${r.mgl}</span> mg/L · ${Math.round(r.mgl / 0.01 * 10) / 10}× limit</td>` +
    `<td class="n">${new Date(r.tested * 1000).toISOString().slice(0, 10)}</td><td class="mono small">${esc(r.sample)}</td></tr>`).join("")
}

async function main() {
  try {
    const rows = await load()
    const villages = new Set(rows.map((r) => `${r.block}/${r.gp}/${r.village}`)).size
    const blocks = [...new Set(rows.map((r) => r.block))].sort()
    const sealed = rows.filter((r) => r.sealed).length
    $("sum").textContent = `${rows.length} government lab samples flagged for arsenic in ${villages} villages across ${blocks.length} blocks${rows.length ? `; the worst is ${rows[0].mgl} mg/L, ${Math.round(rows[0].mgl / 0.01)}× the limit (${rows[0].village}, ${rows[0].block})` : ""}`
    $("meta").innerHTML = `Read from Arkiv Tiramisu just now: entities with kind "jjmsample" created by the curator <a href="${addrLink(CURATOR)}" target="_blank" rel="noopener">${CURATOR.slice(0, 6)}…${CURATOR.slice(-4)}</a>. ${sealed} of ${rows.length} owned by 0x…dEaD (sealed). ${readStats.queries} queries.`
    const s = $("block") as HTMLSelectElement
    s.innerHTML += blocks.map((b) => `<option>${esc(b)}</option>`).join("")
    s.addEventListener("change", () => paint(rows, s.value))
    paint(rows, "")
  } catch (e: any) {
    $("sum").textContent = `Could not read from Arkiv: ${String(e?.shortMessage || e?.message || e).slice(0, 160)}`
  }
}
main()

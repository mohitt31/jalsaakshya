// JalSaakshya: groundwater evidence for West Bengal, read straight from Arkiv. No backend.
import { bool, dec, i32, str } from "@arkiv-network/sdk/attr"
import { and, eq, gt, gte, startsWith, type Expression } from "@arkiv-network/sdk/query"
import {
  APP, CURATOR, LIMITS, publicClient, socketClient, burnerWallet, injectedWallet,
  balanceOf, txLink, addrLink, short, mgl, attr,
} from "./arkiv"
import { verdict, siteId, needsLab, type Test } from "./model"
import { DISTRICTS, LABELS, type Lang } from "./i18n"
import { testBatch } from "./writes"

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const BLOCK_SECONDS = 2
const NOW_YEAR = new Date().getFullYear()
let lang: Lang = "en"
let head = 0n
const sources = new Map<string, any>()
const labs = new Map<string, any>()          // lowercased wallet -> registry entity
let sites = new Map<string, any>()            // site id -> canonical site entity (earliest created)
let tests: any[] = []
let page: any = null

function t(k: keyof typeof LABELS.en): string { return (LABELS[lang] as any)[k] ?? LABELS.en[k] }
const district = () => $<HTMLSelectElement>("district").value
function daysLeft(expiresAt: bigint) {
  const d = Number(expiresAt - head) * BLOCK_SECONDS / 86400
  return d < 1 ? "<1 day" : `${Math.round(d)} days`
}
const errText = (e: any) => String(e?.shortMessage || e?.message || e).slice(0, 300)

// ---- official survey records ----------------------------------------------------------------
function filters() {
  const contaminant = $<HTMLSelectElement>("contaminant").value
  const above = $<HTMLInputElement>("above").checked
  const since = parseInt($<HTMLSelectElement>("since").value) || 0
  const place = $<HTMLInputElement>("place").value.trim()
  const preds: Expression[] = [eq("app", str(APP)), eq("kind", str("obs")), eq("district", str(district()))]
  if (contaminant) preds.push(eq("contaminant", str(contaminant)))
  // "above the limit" is a numeric range on the typed mgl attribute
  if (above && contaminant) preds.push(gt("mgl", dec(String(LIMITS[contaminant]))))
  else if (above) preds.push(eq("exceeds", bool(true)))
  if (since) preds.push(gte("year", i32(since)))
  if (place) preds.push(startsWith("place", place.charAt(0).toUpperCase() + place.slice(1)))
  return preds
}

async function loadRegistry() {
  if (!CURATOR) return
  const [src, lab] = await Promise.all([
    publicClient.select({ key: true, payload: true, attributes: true })
      .where(eq("app", str(APP)), eq("kind", str("source"))).createdBy(CURATOR).limit(200).fetch(),
    publicClient.select({ key: true, expiresAt: true, attributes: true })
      .where(eq("app", str(APP)), eq("kind", str("lab"))).createdBy(CURATOR).limit(200).fetch(),
  ])
  for (const e of src.entities as any[]) sources.set(attr(e, "doc"), { key: e.key, ...e.toJson(), records: attr(e, "records") })
  for (const e of lab.entities as any[]) labs.set(String(attr(e, "wallet")).toLowerCase(), e)
  $("sources").innerHTML = [...sources.values()].sort((a, b) => b.records - a.records).map((s) =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="muted">· ${esc(s.publisher)} ${esc(s.year ?? "")} · ${s.records} records</span></li>`).join("")
  $("src-count").textContent = String(sources.size)
  $("labs").innerHTML = labs.size ? [...labs.values()].map((e) =>
    `<li><b>${esc(attr(e, "name"))}</b>${attr(e, "demo") ? ' <span class="badge demo">demo</span>' : ""} · ${esc(attr(e, "district"))} · wallet <a class="mono" href="${addrLink(attr(e, "wallet"))}" target="_blank" rel="noopener">${short(attr(e, "wallet"))}</a> · listing renews in ${daysLeft(e.expiresAt)}</li>`).join("")
    : `<li class="muted">No labs registered yet.</li>`
}

function obsCard(e: any) {
  const p = e.toJson()
  const c = attr(e, "contaminant"), v = parseFloat(attr(e, "mgl")), lim = LIMITS[c]
  const s = sources.get(attr(e, "doc")) || {}
  const pg = attr(e, "page"), yr = attr(e, "year")
  const link = s.url ? `${s.url}${pg ? `#page=${pg}` : ""}` : "#"
  const over = v > lim
  return `<article class="rec ${over ? "over" : "ok"}">
    <div class="rec-top"><b>${esc(attr(e, "place"))}</b><span class="badge ${over ? "bad" : "good"}">${over ? t("above") : t("within")}</span></div>
    <div class="val"><span class="num">${mgl(v)}</span> ${esc(c)} <span class="muted">· ${t("limit")} ${mgl(lim)} · ${esc(attr(e, "stat"))}</span></div>
    <div class="small ${yr && NOW_YEAR - yr > 3 ? "warn" : "muted"}">${yr ? `${t("sampled")} ${yr} · ${NOW_YEAR - yr} ${t("years_old")}` : t("year_unknown")}</div>
    <div class="cite">${t("source")}: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(s.title || attr(e, "doc"))}${pg ? `, p. ${pg}` : ""}</a>${p.well_id ? ` · well ${esc(p.well_id)}` : ""}${p.source_type ? ` · ${esc(p.source_type)}` : ""}</div>
    <details><summary>${t("row")}</summary><p class="mono small">${esc(p.row_text)}</p>
      <p class="small muted">${esc(p.header || "")} · unit from ${esc(p.unit_basis)} (printed as “${esc(p.value_text)} ${esc(p.unit)}”)</p>
      <p class="small">Arkiv entity <span class="mono">${short(e.key)}</span> · ${t("creator")} <a class="mono" href="${addrLink(e.creator)}" target="_blank" rel="noopener">${short(e.creator)}</a> ✓ · read-only · expires in ${daysLeft(e.expiresAt)}</p></details>
  </article>`
}

async function search(append = false) {
  if (!CURATOR) { $("results").innerHTML = `<p class="warn">Curator wallet not configured yet.</p>`; return }
  $("status").textContent = t("loading")
  try {
    if (!append) {
      // Trust comes from $creator: only entities the curator wallet created count as official.
      // The query is pinned to one block so its cursor stays valid while we page.
      page = await publicClient.select({ key: true, creator: true, expiresAt: true, payload: true, attributes: true })
        .where(and(filters())).createdBy(CURATOR).atBlock(head).limit(30).fetch()
      $("results").innerHTML = ""
    } else page = await page.next()
    const ents = (page.entities as any[]).sort((a, b) => parseFloat(attr(b, "mgl")) - parseFloat(attr(a, "mgl")))
    $("results").insertAdjacentHTML("beforeend", ents.map(obsCard).join(""))
    const shown = $("results").children.length
    $("status").textContent = shown ? `${shown} ${t("shown")} · ${district()}` : t("none")
    $("more").hidden = !page.hasNextPage()
  } catch (err) { $("status").textContent = `Arkiv query failed: ${errText(err)}` }
}

// ---- drinking-water sources and their tests ---------------------------------------------------
function toTest(e: any): Test {
  return { key: e.key, creator: e.creator, site: attr(e, "site"), contaminant: attr(e, "contaminant"), mgl: parseFloat(attr(e, "mgl")),
    method: attr(e, "method"), tested: Number(attr(e, "tested")), expiresInDays: Number(e.expiresAt - head) * BLOCK_SECONDS / 86400 }
}

const STATE_LABEL: Record<string, keyof typeof LABELS.en> = { unsafe: "st_unsafe", safe: "st_safe", confirm: "st_confirm", overdue: "st_overdue" }

function siteCard(id: string, s: any) {
  const mine = tests.filter((x) => attr(x, "site") === id)
  const v = verdict(mine.map(toTest), new Set(labs.keys()))
  const lab = v.basis === "lab" && v.latest ? labs.get(v.latest.creator.toLowerCase()) : null
  const rows = [...mine].sort((a, b) => Number(attr(b, "tested")) - Number(attr(a, "tested"))).map((x) => {
    const reg = labs.get(String(x.creator).toLowerCase())
    const who = attr(x, "method") === "lab" && reg ? `lab ✓ ${esc(attr(reg, "name"))}` : `${esc(attr(x, "method"))} · ${short(x.creator)}`
    return `<li>${new Date(Number(attr(x, "tested")) * 1000).toLocaleDateString()} · <b>${mgl(attr(x, "mgl"))}</b> ${esc(attr(x, "contaminant"))} · ${who} · fades in ${daysLeft(x.expiresAt)}${attr(x, "demo") ? ' <span class="badge demo">demo</span>' : ""}</li>`
  }).join("")
  return `<article class="site st-${v.state}" data-site="${esc(id)}">
    <div class="rec-top"><b>${esc(attr(s, "place"))}</b><span class="badge st-${v.state}">${t(STATE_LABEL[v.state])}</span></div>
    <div class="small muted">${esc(attr(s, "srctype"))}${attr(s, "demo") ? ' · <span class="badge demo">demo data</span>' : ""} · listed for ${daysLeft(s.expiresAt)} unless retested</div>
    <div class="val">${v.mgl !== undefined ? `<span class="num">${mgl(v.mgl)}</span> ${esc(v.contaminant)} ` : ""}<span class="small">${esc(v.reason)}${lab ? ` · ${esc(attr(lab, "name"))}` : ""}</span></div>
    <details><summary>${mine.length} ${t("tests")}</summary><ul class="tests">${rows || `<li class="muted">${t("no_live")}</li>`}</ul></details>
  </article>`
}

async function loadSites() {
  try {
    const [s, tt] = await Promise.all([
      publicClient.select({ key: true, creator: true, createdAt: true, expiresAt: true, attributes: true })
        .where(eq("app", str(APP)), eq("kind", str("site")), eq("district", str(district()))).limit(200).fetch(),
      publicClient.select({ key: true, creator: true, expiresAt: true, attributes: true })
        .where(eq("app", str(APP)), eq("kind", str("test")), eq("district", str(district()))).limit(200).fetch(),
    ])
    sites = new Map()
    for (const e of [...(s.entities as any[])].sort((a, b) => Number(a.createdAt - b.createdAt))) if (!sites.has(attr(e, "site"))) sites.set(attr(e, "site"), e)
    tests = tt.entities as any[]
    renderSites()
  } catch (err) { $("sites").innerHTML = `<p class="warn">${esc(errText(err))}</p>` }
}

function renderSites() {
  const order: Record<string, number> = { unsafe: 0, confirm: 1, overdue: 2, safe: 3 }
  const cards = [...sites.entries()].map(([id, s]) => ({ id, s, v: verdict(tests.filter((x) => attr(x, "site") === id).map(toTest), new Set(labs.keys())) }))
    .sort((a, b) => order[a.v.state] - order[b.v.state])
  $("sites").innerHTML = cards.length ? cards.map((c) => siteCard(c.id, c.s)).join("") : `<p class="muted">${t("no_sites")}</p>`
  $("f-site").innerHTML = `<option value="">${t("new_site")}</option>` + [...sites.entries()].map(([id, s]) => `<option value="${esc(id)}">${esc(attr(s, "place"))}</option>`).join("")
  const counts = cards.reduce((m, c) => (m[c.v.state] = (m[c.v.state] || 0) + 1, m), {} as Record<string, number>)
  $("site-summary").textContent = cards.length ? `${cards.length} ${t("sources_listed")} · ${counts.unsafe || 0} ${t("st_unsafe")} · ${counts.confirm || 0} ${t("st_confirm")} · ${counts.overdue || 0} ${t("st_overdue")} · ${counts.safe || 0} ${t("st_safe")}` : ""
}

async function signer() { return $<HTMLSelectElement>("signer").value === "injected" ? injectedWallet() : burnerWallet() }

async function showSigner() {
  const box = $("signer-info")
  if ($<HTMLSelectElement>("signer").value === "injected") { box.textContent = t("injected_note"); return }
  const a = burnerWallet().account!.address
  const b = await balanceOf(a).catch(() => 0)
  const reg = labs.has(a.toLowerCase()) ? " · registered lab ✓" : ""
  box.innerHTML = `${t("burner_note")} <a class="mono" href="${addrLink(a)}" target="_blank" rel="noopener">${short(a)}</a> · ${b.toFixed(3)} GLM${reg} · <a href="https://hub.arkiv.network/faucet" target="_blank" rel="noopener">faucet</a>`
}

function updateHint() {
  const fd = new FormData($<HTMLFormElement>("test-form"))
  const raw = parseFloat(String(fd.get("value")))
  const box = $("hint")
  if (!(raw >= 0)) { box.textContent = ""; return }
  const value = fd.get("unit") === "ug" ? raw / 1000 : raw
  const c = String(fd.get("contaminant"))
  box.textContent = fd.get("method") === "kit" && needsLab({ contaminant: c, mgl: value })
    ? `${mgl(value)} is ${value > LIMITS[c] ? "above" : "close to"} the ${mgl(LIMITS[c])} limit. A kit result this high must be confirmed by a lab (UDWQMP 5.1.1), so it will show as "needs lab confirmation".`
    : ""
}

async function submitTest(ev: Event) {
  ev.preventDefault()
  const f = ev.target as HTMLFormElement
  const fd = new FormData(f)
  const raw = parseFloat(String(fd.get("value")))
  const note = String(fd.get("note") || "").slice(0, 200)
  if (!(raw >= 0)) return
  if (/\d{10}|@/.test(note)) { $("form-status").textContent = t("no_personal"); return }
  const contaminant = String(fd.get("contaminant"))
  const value = fd.get("unit") === "ug" ? raw / 1000 : raw
  const method = String(fd.get("method")) as "kit" | "lab"
  const chosen = String(fd.get("site") || "")
  const place = chosen ? attr(sites.get(chosen), "place") : String(fd.get("place") || "").trim().slice(0, 100)
  if (!place) { $("form-status").textContent = t("need_place"); return }
  const id = chosen || siteId(district(), place)
  const existing = sites.get(id)
  $("form-status").textContent = t("signing")
  try {
    const w = await signer()
    const batch = testBatch({ site: id, district: district(), place, contaminant, mgl: value, method, srctype: String(fd.get("srctype") || ""),
      note, kit: String(fd.get("kit") || "").slice(0, 60), entered: { value: raw, unit: fd.get("unit") === "ug" ? "µg/L" : "mg/L" } }, existing?.key)
    const { txHash } = await w.executeBatch(batch as any)
    $("form-status").innerHTML = `${t("saved")} <a href="${txLink(txHash)}" target="_blank" rel="noopener">tx</a>`
    f.reset(); updateHint(); showSigner(); loadSites()
  } catch (err) { $("form-status").textContent = errText(err) }
}

// Live: a WebSocket subscription, so new tests appear without a refresh loop.
function live() {
  try {
    socketClient().watchEntityEvents({
      onEntityCreated: async (ev: any) => {
        try {
          const e: any = await publicClient.getEntity(ev.entityKey)
          if (attr(e, "app") !== APP || attr(e, "kind") !== "test") return
          $("live").textContent = `${t("live_new")} ${mgl(attr(e, "mgl"))} ${attr(e, "contaminant")} at ${attr(e, "place")}, ${attr(e, "district")}`
          if (attr(e, "district") === district()) loadSites()
        } catch { /* not ours, or gone */ }
      },
      onError: () => { $("live").textContent = t("live_off") },
    })
    $("live").textContent = t("live_on")
  } catch { $("live").textContent = t("live_off") }
}

// ---- wiring ---------------------------------------------------------------------------------
function applyLang() {
  document.documentElement.lang = lang
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t as any) })
}

async function main() {
  $("district").innerHTML = DISTRICTS.map((d) => `<option>${d}</option>`).join("")
  const q = new URLSearchParams(location.search)
  $<HTMLSelectElement>("district").value = q.get("district") || "Purulia"
  $("curator").innerHTML = CURATOR ? `<a class="mono" href="${addrLink(CURATOR)}" target="_blank" rel="noopener">${short(CURATOR)}</a>` : "not set"
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.addEventListener("click", () => { lang = b.dataset.lang as Lang; applyLang(); renderSites() }))
  $("district").addEventListener("change", () => { search(); loadSites(); history.replaceState(null, "", `?district=${encodeURIComponent(district())}`) })
  ;["contaminant", "above", "since"].forEach((id) => $(id).addEventListener("change", () => search()))
  $("place").addEventListener("change", () => search())
  $("more").addEventListener("click", () => search(true))
  $("test-form").addEventListener("submit", submitTest)
  $("test-form").addEventListener("input", updateHint)
  $("signer").addEventListener("change", showSigner)
  $("f-site").addEventListener("change", () => { $("new-site").hidden = !!$<HTMLSelectElement>("f-site").value })
  applyLang()
  head = await publicClient.getBlockNumber()
  await loadRegistry().catch(() => {})
  search(); loadSites(); showSigner(); live()
}
main()

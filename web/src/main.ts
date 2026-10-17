// JalSaakshya: groundwater evidence for West Bengal, read straight from Arkiv. No backend.
import { bool, dec, i32, str } from "@arkiv-network/sdk/attr"
import { and, eq, gt, gte, startsWith, type Expression } from "@arkiv-network/sdk/query"
import {
  APP, CURATOR, LIMITS, publicClient, socketClient, burnerWallet, injectedWallet,
  balanceOf, txLink, addrLink, short, mgl, attr,
} from "./arkiv"
import { verdict, siteId, needsLab, type Test } from "./model"
import { DISTRICTS, DISTRICT_NAMES, LABELS, type Lang, type Labels } from "./i18n"
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
let shownEnts: any[] = []

function t(k: keyof Labels, vars: Record<string, unknown> = {}): string {
  const s = (LABELS[lang] as any)[k] ?? LABELS.en[k]
  return s.replace(/\{(\w+)\}/g, (_: string, v: string) => String(vars[v] ?? ""))
}
const tc = (c: string) => t(`c_${c}` as keyof Labels) || c
const dname = (d: string) => lang === "en" ? d : DISTRICT_NAMES[lang][DISTRICTS.indexOf(d)] ?? d
// Arsenic is read in µg/L (ppb) in the field and in IS 10500; fluoride in mg/L.
function amount(v: number | string, c?: string) {
  const n = typeof v === "string" ? parseFloat(v) : v
  if (c === "arsenic") { const u = Math.round(n * 10000) / 10; return `${u >= 100 || Number.isInteger(u) ? u.toFixed(0) : u.toFixed(1)} µg/L` }
  return c === "fluoride" ? `${n.toFixed(2)} mg/L` : mgl(n)
}
const statLabel = (s: string) => (LABELS.en as any)[`stat_${s}`] ? t(`stat_${s}` as keyof Labels) : s
const district = () => $<HTMLSelectElement>("district").value
function daysLeft(expiresAt: bigint) {
  const d = Number(expiresAt - head) * BLOCK_SECONDS / 86400
  return d < 1 ? t("lt_day") : t("days", { n: Math.round(d) })
}
const errText = (e: any) => {
  let raw = "", c = e
  for (let i = 0; c && i < 6; i++, c = c.cause) raw += ` ${c.details ?? ""} ${c.message ?? ""} ${c.body ? JSON.stringify(c.body) : ""}`
  if (raw.includes("ANON_COST_LIMITED")) return t("budget")
  return String(e?.shortMessage || e?.message || e).slice(0, 300)
}

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
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="muted">· ${esc(s.publisher)} ${esc(s.year ?? "")} · ${t("records", { n: s.records })}</span></li>`).join("")
  $("src-count").textContent = String(sources.size)
  $("labs").innerHTML = labs.size ? [...labs.values()].map((e) =>
    `<li><b>${esc(attr(e, "name"))}</b>${attr(e, "demo") ? ` <span class="badge demo">${t("demo")}</span>` : ""} · ${t("lab_line", { d: esc(dname(attr(e, "district"))),
      w: `<a class="mono" href="${addrLink(attr(e, "wallet"))}" target="_blank" rel="noopener">${short(attr(e, "wallet"))}</a>`, r: daysLeft(e.expiresAt) })}</li>`).join("")
    : `<li class="muted">${t("no_labs")}</li>`
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
    <div class="val"><span class="num">${amount(v, c)}</span> ${esc(tc(c))} <span class="muted">· ${t("limit")} ${amount(lim, c)} · ${esc(statLabel(attr(e, "stat")))}</span></div>
    <div class="small ${yr && NOW_YEAR - yr > 3 ? "warn" : "muted"}">${yr ? t("sampled", { y: yr, n: NOW_YEAR - yr }) : t("year_unknown")}</div>
    <div class="cite">${t("source")}: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(s.title || attr(e, "doc"))}${pg ? `, ${t("page")} ${pg}` : ""}</a>${p.well_id ? ` · ${t("well")} ${esc(p.well_id)}` : ""}${p.source_type ? ` · ${esc(p.source_type)}` : ""}</div>
    ${shareRow(e.key, `${where(e)}: ${amount(v, c)} ${tc(c)} (${t("limit")} ${amount(lim, c)}). ${t("source")}: ${s.title || attr(e, "doc")}${pg ? `, ${t("page")} ${pg}` : ""}`)}
    <details><summary>${t("row")}</summary><p class="mono small">${esc(p.row_text)}</p>
      <p class="small muted">${esc(p.header || "")} · ${t("unit_from", { b: esc(p.unit_basis), v: `${esc(p.value_text)} ${esc(p.unit)}` })}</p>
      <p class="small">${t("entity")} <span class="mono">${short(e.key)}</span> · ${t("creator")} <a class="mono" href="${addrLink(e.creator)}" target="_blank" rel="noopener">${short(e.creator)}</a> ✓ · ${t("readonly")} · ${t("expires", { d: daysLeft(e.expiresAt) })}</p></details>
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
      shownEnts = []
    } else page = await page.next()
    // worst first, as a multiple of each contaminant's limit
    const ratio = (e: any) => parseFloat(attr(e, "mgl")) / LIMITS[attr(e, "contaminant")]
    const ents = (page.entities as any[]).sort((a, b) => ratio(b) - ratio(a))
    shownEnts.push(...ents)
    $("results").insertAdjacentHTML("beforeend", ents.map(obsCard).join(""))
    renderStatus()
    $("more").hidden = !page.hasNextPage()
  } catch (err) { $("status").textContent = `${t("query_failed")} ${errText(err)}` }
}

function renderStatus() {
  $("status").textContent = shownEnts.length ? t("shown", { n: shownEnts.length, d: dname(district()) }) : t("none")
}
function rerenderRecords() { $("results").innerHTML = shownEnts.map(obsCard).join(""); if (page) renderStatus() }

// ---- share and verify ------------------------------------------------------------------------
// Numbers travel on WhatsApp. A shared link carries the Arkiv entity key, so whoever opens it sees
// who created that entity on chain, whether it can be edited, and how long it stays current.
const verifyUrl = (key: string) => `${location.origin}${location.pathname}?e=${key}&lang=${lang}`
function shareRow(key: string, text: string) {
  const url = verifyUrl(key)
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${t("verify_on")}: ${url}`)}`
  return `<div class="share small"><a href="${esc(url)}">${t("verify_link")}</a> · <a href="${esc(wa)}" target="_blank" rel="noopener">${t("whatsapp")}</a></div>`
}

const where = (e: any) => { const p = String(attr(e, "place") ?? ""), d = dname(attr(e, "district")); return p && p !== attr(e, "district") ? `${p}, ${d}` : d }
const KIND_LABEL: Record<string, keyof Labels> = { obs: "v_kind_obs", site: "v_kind_site", test: "v_kind_test", lab: "v_kind_lab", source: "v_kind_source" }

/** Read one entity by key and show what Arkiv says about it. Returns its district, if it has one. */
async function showVerify(key: `0x${string}`): Promise<string | undefined> {
  const box = $("verify")
  box.hidden = false
  box.innerHTML = `<p class="muted">${t("loading")}</p>`
  let e: any
  try { e = await publicClient.getEntity(key) } catch { e = null }
  if (!e || attr(e, "app") !== APP) {
    box.innerHTML = `<div class="card verify bad"><div class="rec-top"><h2>${t("v_title")}</h2><button id="v-close" class="secondary">${t("v_close")}</button></div><p>${t("v_missing")}</p><p class="mono small">${esc(key)}</p></div>`
    $("v-close").addEventListener("click", () => { box.hidden = true; history.replaceState(null, "", `?district=${encodeURIComponent(district())}`) })
    return
  }
  const kind = String(attr(e, "kind")), creator = String(e.creator || "")
  const lab = labs.get(creator.toLowerCase())
  let who: string, cls: string
  if (["obs", "source", "lab"].includes(kind)) {
    const ok = !!CURATOR && creator.toLowerCase() === CURATOR.toLowerCase()
    who = t(ok ? "v_official" : "v_not_official"); cls = ok ? "good" : "bad"
  } else if (kind === "test" && attr(e, "method") === "lab" && lab) { who = t("v_lab", { n: attr(lab, "name") }); cls = "good" }
  else if (kind === "site") { who = t("v_site_listed"); cls = "" }
  else { who = t("v_community"); cls = "warn" }
  const c = attr(e, "contaminant")
  let what = ""
  if (kind === "obs") {
    const src = sources.get(attr(e, "doc")) || {}, pg = attr(e, "page")
    const link = src.url ? `${src.url}${pg ? `#page=${pg}` : ""}` : "#"
    what = `<p class="val"><span class="num">${amount(attr(e, "mgl"), c)}</span> ${esc(tc(c))} · ${t("limit")} ${amount(LIMITS[c], c)}</p>
      <p>${esc(where(e))} · ${t("source")}: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(src.title || attr(e, "doc"))}${pg ? `, ${t("page")} ${pg}` : ""}</a></p>
      <p class="mono small">${esc(e.toJson()?.row_text ?? "")}</p>`
  } else if (kind === "test") {
    what = `<p class="val"><span class="num">${amount(attr(e, "mgl"), c)}</span> ${esc(tc(c))} · ${t(attr(e, "method") === "lab" ? "m_lab" : "m_kit")} · ${new Date(Number(attr(e, "tested")) * 1000).toLocaleDateString(LOCALE[lang])}</p>
      <p>${esc(where(e))}</p>`
  } else if (kind === "site") {
    const tt = await publicClient.select({ key: true, creator: true, expiresAt: true, attributes: true })
      .where(eq("app", str(APP)), eq("kind", str("test")), eq("site", str(attr(e, "site")))).limit(200).fetch()
    const v = verdict((tt.entities as any[]).map(toTest), new Set(labs.keys()))
    what = `<p><b>${esc(attr(e, "place"))}</b>, ${esc(dname(attr(e, "district")))} · ${esc(srcType(attr(e, "srctype")))}</p>
      <p>${t("v_status")}: <span class="badge st-${v.state}">${t(STATE_LABEL[v.state])}</span> ${v.mgl !== undefined ? `${amount(v.mgl, v.contaminant)} ${esc(tc(v.contaminant!))} · ` : ""}${esc(t(`r_${v.code}` as keyof Labels, { n: v.testers }))}</p>`
  } else if (kind === "lab") {
    what = `<p><b>${esc(attr(e, "name"))}</b> · ${esc(dname(attr(e, "district")))} · ${short(String(attr(e, "wallet")))}</p>`
  }
  const ro = e.creationFlags?.readonly
  box.innerHTML = `<div class="card verify ${cls}">
    <div class="rec-top"><h2>${t("v_title")}</h2><button id="v-close" class="secondary">${t("v_close")}</button></div>
    <p class="small muted">${t(KIND_LABEL[kind] ?? "v_kind_obs")}${attr(e, "demo") ? ` · <span class="badge demo">${t("demo_data")}</span>` : ""}</p>
    ${what}
    <ul class="checks">
      <li class="${cls}"><b>${who}</b></li>
      <li>${t("v_creator")} <a class="mono" href="${addrLink(creator)}" target="_blank" rel="noopener">${esc(creator)}</a></li>
      <li>${ro ? t("v_readonly") : t("v_editable")}</li>
      <li>${t("v_expires", { d: daysLeft(e.expiresAt) })}</li>
    </ul>
    <details><summary>${t("v_check")}</summary><pre class="mono small">publicClient.getEntity("${esc(key)}")</pre></details>
  </div>`
  $("v-close").addEventListener("click", () => { box.hidden = true; history.replaceState(null, "", `?district=${encodeURIComponent(district())}`) })
  const d = attr(e, "district")
  return DISTRICTS.includes(d) ? d : undefined
}

// ---- drinking-water sources and their tests ---------------------------------------------------
function toTest(e: any): Test {
  return { key: e.key, creator: e.creator, site: attr(e, "site"), contaminant: attr(e, "contaminant"), mgl: parseFloat(attr(e, "mgl")),
    method: attr(e, "method"), tested: Number(attr(e, "tested")), expiresInDays: Number(e.expiresAt - head) * BLOCK_SECONDS / 86400 }
}

const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", bn: "bn-IN" }
const SRC_TYPES: Record<string, keyof Labels> = { "tube well": "t_tube", "dug well": "t_dug", "hand pump": "t_hand", "piped supply": "t_piped", "community plant": "t_plant" }
const srcType = (s: string) => SRC_TYPES[s] ? t(SRC_TYPES[s]) : s
const STATE_LABEL: Record<string, keyof typeof LABELS.en> = { unsafe: "st_unsafe", safe: "st_safe", confirm: "st_confirm", overdue: "st_overdue" }

function siteCard(id: string, s: any) {
  const mine = tests.filter((x) => attr(x, "site") === id)
  const v = verdict(mine.map(toTest), new Set(labs.keys()))
  const lab = v.basis === "lab" && v.latest ? labs.get(v.latest.creator.toLowerCase()) : null
  const rows = [...mine].sort((a, b) => Number(attr(b, "tested")) - Number(attr(a, "tested"))).map((x) => {
    const reg = labs.get(String(x.creator).toLowerCase())
    const who = attr(x, "method") === "lab" && reg ? `${t("lab_ok")} ${esc(attr(reg, "name"))}` : `${t(attr(x, "method") === "lab" ? "m_lab" : "m_kit")} · ${short(x.creator)}`
    return `<li>${new Date(Number(attr(x, "tested")) * 1000).toLocaleDateString(LOCALE[lang])} · <b>${amount(attr(x, "mgl"), attr(x, "contaminant"))}</b> ${esc(tc(attr(x, "contaminant")))} · ${who} · ${t("fades", { d: daysLeft(x.expiresAt) })}${attr(x, "demo") ? ` <span class="badge demo">${t("demo")}</span>` : ""}</li>`
  }).join("")
  return `<article class="site st-${v.state}" data-site="${esc(id)}">
    <div class="rec-top"><b>${esc(attr(s, "place"))}</b><span class="badge st-${v.state}">${t(STATE_LABEL[v.state])}</span></div>
    <div class="small muted">${esc(srcType(attr(s, "srctype")))}${attr(s, "demo") ? ` · <span class="badge demo">${t("demo_data")}</span>` : ""} · ${t("listed", { d: daysLeft(s.expiresAt) })}</div>
    <div class="val">${v.mgl !== undefined ? `<span class="num">${amount(v.mgl, v.contaminant)}</span> ${esc(tc(v.contaminant!))} ` : ""}<span class="small">${esc(t(`r_${v.code}` as keyof Labels, { n: v.testers }))}${lab ? ` · ${esc(attr(lab, "name"))}` : ""}</span></div>
    ${shareRow(s.key, `${where(s)}: ${t(STATE_LABEL[v.state])}${v.mgl !== undefined ? ` · ${amount(v.mgl, v.contaminant)} ${tc(v.contaminant!)}` : ""} · ${t(`r_${v.code}` as keyof Labels, { n: v.testers })}`)}
    <details><summary>${t("tests", { n: mine.length })}</summary><ul class="tests">${rows || `<li class="muted">${t("no_live")}</li>`}</ul></details>
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
  $("site-summary").textContent = cards.length ? t("summary", { n: cards.length, u: counts.unsafe || 0, c: counts.confirm || 0, o: counts.overdue || 0, s: counts.safe || 0 }) : ""
}

async function signer() { return $<HTMLSelectElement>("signer").value === "injected" ? injectedWallet() : burnerWallet() }

async function showSigner() {
  const box = $("signer-info")
  if ($<HTMLSelectElement>("signer").value === "injected") { box.textContent = t("injected_note"); return }
  const a = burnerWallet().account!.address
  const b = await balanceOf(a).catch(() => 0)
  const reg = labs.has(a.toLowerCase()) ? ` · ${t("reg_lab")}` : ""
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
    ? t("hint_lab", { v: amount(value, c), rel: t(value > LIMITS[c] ? "rel_above" : "rel_close"), l: amount(LIMITS[c], c) })
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
// The subscription carries every entity on the chain, so an event is only a trigger: at most one
// query for this district's tests every few seconds, never one RPC call per chain event.
let liveTimer: ReturnType<typeof setTimeout> | null = null
async function refreshLive() {
  liveTimer = null
  const before = new Set(tests.map((x) => x.key))
  await loadSites()
  const fresh = tests.filter((x) => !before.has(x.key)).sort((a, b) => Number(attr(b, "tested")) - Number(attr(a, "tested")))[0]
  if (fresh) $("live").textContent = t("live_new", { v: amount(attr(fresh, "mgl"), attr(fresh, "contaminant")), c: tc(attr(fresh, "contaminant")), p: attr(fresh, "place"), d: dname(attr(fresh, "district")) })
}
function live() {
  try {
    socketClient().watchEntityEvents({
      onEntityCreated: () => { liveTimer ??= setTimeout(refreshLive, 8000) },
      onError: () => { $("live").textContent = t("live_off") },
    })
    $("live").textContent = t("live_on")
  } catch { $("live").textContent = t("live_off") }
}

// ---- wiring ---------------------------------------------------------------------------------
const LINKS: Record<string, string> = {
  arkiv: `<a href="https://arkiv.network" target="_blank" rel="noopener">Arkiv</a>`,
  schema: `<a href="https://github.com/mohitt31/jalsaakshya/blob/main/arkiv/schema.md" target="_blank" rel="noopener">arkiv/schema.md</a>`,
}
function applyLang() {
  document.documentElement.lang = lang
  try { localStorage.setItem("jalsaakshya.lang", lang) } catch { /* ignore */ }
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t as any) })
  // trusted strings from i18n.ts that carry markup or links
  document.querySelectorAll<HTMLElement>("[data-th]").forEach((el) => {
    el.innerHTML = t(el.dataset.th as any, { ...LINKS, curator: CURATOR ? `<a class="mono" href="${addrLink(CURATOR)}" target="_blank" rel="noopener">${short(CURATOR)}</a>` : "" })
  })
  document.querySelectorAll<HTMLInputElement>("[data-tp]").forEach((el) => { el.placeholder = t(el.dataset.tp as any) })
  document.querySelectorAll<HTMLElement>("[data-lang]").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang))
  const sel = $<HTMLSelectElement>("district"), cur = sel.value
  sel.innerHTML = DISTRICTS.map((d) => `<option value="${d}">${dname(d)}</option>`).join("")
  sel.value = cur || "Purulia"
}

async function main() {
  const q = new URLSearchParams(location.search)
  let saved: string | null = null
  try { saved = localStorage.getItem("jalsaakshya.lang") } catch { /* ignore */ }
  const want = q.get("lang") || saved
  if (want === "hi" || want === "bn" || want === "en") lang = want
  $("district").innerHTML = DISTRICTS.map((d) => `<option value="${d}">${d}</option>`).join("")
  $<HTMLSelectElement>("district").value = q.get("district") || "Purulia"
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang as Lang; applyLang(); renderSites(); rerenderRecords(); loadRegistry().catch(() => {}); showSigner(); updateHint()
  }))
  $("district").addEventListener("change", () => { search(); loadSites(); history.replaceState(null, "", `?district=${encodeURIComponent(district())}`) })
  ;["contaminant", "above", "since"].forEach((id) => $(id).addEventListener("change", () => search()))
  $("place").addEventListener("change", () => search())
  $("more").addEventListener("click", () => search(true))
  $("test-form").addEventListener("submit", submitTest)
  $("test-form").addEventListener("input", updateHint)
  $("signer").addEventListener("change", showSigner)
  $("f-site").addEventListener("change", () => { $("new-site").hidden = !!$<HTMLSelectElement>("f-site").value })
  applyLang()
  try { head = await publicClient.getBlockNumber() }
  catch (err) { $("status").textContent = `${t("query_failed")} ${errText(err)}`; return }
  await loadRegistry().catch(() => {})
  const ek = q.get("e")
  if (ek && /^0x[0-9a-fA-F]{64}$/.test(ek)) {
    const d = await showVerify(ek as `0x${string}`)
    if (d && !q.get("district")) $<HTMLSelectElement>("district").value = d
    $("verify").scrollIntoView()
  }
  search(); loadSites(); showSigner(); live()
}
main()

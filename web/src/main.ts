// JalSaakshya: groundwater survey records for West Bengal, read straight from Arkiv.
import { bool, dec, i32, str, u64 } from "@arkiv-network/sdk/attr"
import { and, eq, gt, gte, startsWith, type Expression } from "@arkiv-network/sdk/query"
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils"
import {
  APP, CURATOR, LIMITS, LIFETIME, EXPLORER, publicClient, socketClient, burnerWallet, injectedWallet,
  balanceOf, txLink, addrLink, short, mgl, attr,
} from "./arkiv"
import { DISTRICTS, LABELS, type Lang } from "./i18n"

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const BLOCK_SECONDS = 2
let lang: Lang = "en"
let head = 0n
const sources = new Map<string, any>()
let page: any = null

function t(k: keyof typeof LABELS.en) { return LABELS[lang][k] ?? LABELS.en[k] }

function daysLeft(expiresAt: bigint) {
  const d = Number(expiresAt - head) * BLOCK_SECONDS / 86400
  return d < 1 ? "<1 day" : `${Math.round(d)} days`
}

// ---- curated survey records -----------------------------------------------------------------
function filters() {
  const district = $<HTMLSelectElement>("district").value
  const contaminant = $<HTMLSelectElement>("contaminant").value
  const above = $<HTMLInputElement>("above").checked
  const since = parseInt($<HTMLSelectElement>("since").value) || 0
  const place = $<HTMLInputElement>("place").value.trim()
  const preds: Expression[] = [eq("app", str(APP)), eq("kind", str("obs")), eq("district", str(district))]
  if (contaminant) preds.push(eq("contaminant", str(contaminant)))
  // "above the limit" is a numeric range on the typed mgl attribute, not a stored flag we trust blindly
  if (above && contaminant) preds.push(gt("mgl", dec(String(LIMITS[contaminant]))))
  else if (above) preds.push(eq("exceeds", bool(true)))
  if (since) preds.push(gte("year", i32(since)))
  if (place) preds.push(startsWith("place", place.charAt(0).toUpperCase() + place.slice(1)))
  return { district, preds }
}

async function loadSources() {
  if (!CURATOR) return
  const res = await publicClient.select({ key: true, payload: true, attributes: true })
    .where(eq("app", str(APP)), eq("kind", str("source"))).createdBy(CURATOR).limit(200).fetch()
  for (const e of res.entities as any[]) sources.set(attr(e, "doc"), { key: e.key, ...e.toJson(), records: attr(e, "records") })
  $("sources").innerHTML = [...sources.values()].sort((a, b) => b.records - a.records).map((s) =>
    `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="muted">· ${esc(s.publisher)} ${esc(s.year ?? "")} · ${s.records} records</span></li>`).join("")
  $("src-count").textContent = String(sources.size)
}

function obsCard(e: any) {
  const p = e.toJson()
  const c = attr(e, "contaminant"), v = parseFloat(attr(e, "mgl")), lim = LIMITS[c]
  const s = sources.get(attr(e, "doc")) || {}
  const pg = attr(e, "page")
  const link = s.url ? `${s.url}${pg ? `#page=${pg}` : ""}` : "#"
  const over = v > lim
  return `<article class="rec ${over ? "over" : "ok"}">
    <div class="rec-top"><b>${esc(attr(e, "place"))}</b><span class="badge ${over ? "bad" : "good"}">${over ? t("above") : t("within")}</span></div>
    <div class="val"><span class="num">${mgl(v)}</span> ${esc(c)} <span class="muted">· ${t("limit")} ${mgl(lim)} · ${esc(attr(e, "stat"))}${attr(e, "year") ? " · " + attr(e, "year") : ""}</span></div>
    <div class="cite">${t("source")}: <a href="${esc(link)}" target="_blank" rel="noopener">${esc(s.title || attr(e, "doc"))}${pg ? `, p. ${pg}` : ""}</a>${p.well_id ? ` · well ${esc(p.well_id)}` : ""}${p.source_type ? ` · ${esc(p.source_type)}` : ""}</div>
    <details><summary>${t("row")}</summary><p class="mono small">${esc(p.row_text)}</p>
      <p class="small muted">${esc(p.header || "")} · unit from ${esc(p.unit_basis)} (printed as “${esc(p.value_text)} ${esc(p.unit)}”)</p>
      <p class="small">Arkiv entity <a class="mono" href="${EXPLORER}/entity/${e.key}" target="_blank" rel="noopener">${short(e.key)}</a> · ${t("creator")} <a class="mono" href="${addrLink(e.creator)}" target="_blank" rel="noopener">${short(e.creator)}</a> ✓ · read-only · expires in ${daysLeft(e.expiresAt)}</p></details>
  </article>`
}

async function search(append = false) {
  if (!CURATOR) { $("results").innerHTML = `<p class="warn">Curator wallet not configured yet.</p>`; return }
  const { district, preds } = filters()
  $("status").textContent = t("loading")
  try {
    if (!append) {
      // Trust comes from $creator: only entities the curator wallet created are shown as official.
      page = await publicClient.select({ key: true, creator: true, expiresAt: true, payload: true, attributes: true })
        .where(and(preds)).createdBy(CURATOR).limit(30).fetch()
      $("results").innerHTML = ""
    } else page = await page.next()
    const ents = (page.entities as any[]).sort((a, b) => parseFloat(attr(b, "mgl")) - parseFloat(attr(a, "mgl")))
    $("results").insertAdjacentHTML("beforeend", ents.map(obsCard).join(""))
    const shown = $("results").children.length
    $("status").textContent = shown ? `${shown} ${t("shown")} · ${district}` : t("none")
    $("more").hidden = !page.hasNextPage()
  } catch (err: any) {
    $("status").textContent = `Arkiv query failed: ${err?.shortMessage || err?.message || err}`
  }
  loadField()
}

// ---- community field tests ------------------------------------------------------------------
async function fieldCard(e: any) {
  const p = e.toJson()
  const c = attr(e, "contaminant"), v = parseFloat(attr(e, "mgl"))
  const over = v > LIMITS[c]
  return `<article class="rec field ${over ? "over" : "ok"}" data-key="${e.key}">
    <div class="rec-top"><b>${esc(attr(e, "place"))}</b><span class="badge ${over ? "bad" : "good"}">${over ? t("above") : t("within")}</span></div>
    <div class="val"><span class="num">${mgl(v)}</span> ${esc(c)} <span class="muted">· ${esc(attr(e, "method"))} · ${new Date(Number(attr(e, "tested")) * 1000).toLocaleDateString()}</span></div>
    <div class="small">${t("reported_by")} <a class="mono" href="${addrLink(e.creator)}" target="_blank" rel="noopener">${short(e.creator)}</a> · ${t("unverified")}${p.note ? ` · “${esc(p.note)}”` : ""}</div>
    <div class="small muted">${t("fades")} ${daysLeft(e.expiresAt)} · <button class="link confirm">${t("confirm")}</button></div>
  </article>`
}

async function loadField() {
  const district = $<HTMLSelectElement>("district").value
  try {
    const res = await publicClient.select({ key: true, creator: true, expiresAt: true, payload: true, attributes: true })
      .where(eq("app", str(APP)), eq("kind", str("field")), eq("district", str(district))).limit(50).fetch()
    const ents = (res.entities as any[]).sort((a, b) => Number(attr(b, "tested")) - Number(attr(a, "tested")))
    $("field").innerHTML = ents.length ? (await Promise.all(ents.map(fieldCard))).join("") : `<p class="muted">${t("no_field")}</p>`
  } catch (err: any) { $("field").innerHTML = `<p class="warn">${esc(err?.message || err)}</p>` }
}

async function signer() {
  return $<HTMLSelectElement>("signer").value === "injected" ? injectedWallet() : burnerWallet()
}

async function showSigner() {
  const box = $("signer-info")
  if ($<HTMLSelectElement>("signer").value === "injected") { box.textContent = t("injected_note"); return }
  const w = burnerWallet()
  const a = w.account!.address
  const b = await balanceOf(a).catch(() => 0)
  box.innerHTML = `${t("burner_note")} <a class="mono" href="${addrLink(a)}" target="_blank" rel="noopener">${short(a)}</a> · ${b.toFixed(3)} GLM · <a href="https://hub.arkiv.network/faucet" target="_blank" rel="noopener">faucet</a>`
}

async function submitField(ev: Event) {
  ev.preventDefault()
  const f = ev.target as HTMLFormElement
  const fd = new FormData(f)
  const raw = parseFloat(String(fd.get("value")))
  const unit = String(fd.get("unit"))
  const contaminant = String(fd.get("contaminant"))
  const note = String(fd.get("note") || "").slice(0, 200)
  if (!(raw >= 0)) return
  if (/\d{10}|@/.test(note)) { $("form-status").textContent = t("no_personal"); return }
  const value = unit === "ug" ? raw / 1000 : raw
  const place = String(fd.get("place")).trim().slice(0, 100)
  $("form-status").textContent = t("signing")
  try {
    const w = await signer()
    const { txHash } = await w.createEntity({
      payload: jsonToPayload({ note, kit: String(fd.get("kit") || "").slice(0, 60), entered_value: raw, entered_unit: unit === "ug" ? "µg/L" : "mg/L" }),
      contentType: "application/json",
      attributes: {
        app: str(APP), kind: str("field"), district: str(String(fd.get("district"))), place: str(place),
        contaminant: str(contaminant), mgl: dec(value.toFixed(6)), exceeds: bool(value > LIMITS[contaminant]),
        method: str(String(fd.get("method"))), tested: u64(Math.floor(Date.now() / 1000)),
      },
      expires: ExpirationTime.fromSeconds(LIFETIME.field),
      // anyone who re-tests the same source can keep this report alive; nobody but the author can edit it
      flags: { readonly: true, permissionlessExtension: true },
    })
    $("form-status").innerHTML = `${t("saved")} <a href="${txLink(txHash)}" target="_blank" rel="noopener">tx</a>`
    f.reset(); showSigner()
  } catch (err: any) { $("form-status").textContent = `${err?.shortMessage || err?.message || err}` }
}

async function confirm(key: `0x${string}`, btn: HTMLButtonElement) {
  btn.disabled = true; btn.textContent = t("signing")
  try {
    const w = await signer()
    // Lifetime Extension as a lease renewed by activity: a confirmation pushes expiry to 90 days from now
    const { txHash } = await w.extendEntity({ entityKey: key, expires: ExpirationTime.fromSeconds(LIFETIME.field) })
    btn.outerHTML = `<a href="${txLink(txHash)}" target="_blank" rel="noopener">${t("confirmed")}</a>`
  } catch (err: any) { btn.disabled = false; btn.textContent = String(err?.shortMessage || err?.message || err).slice(0, 120) }
}

// Live feed: a WebSocket subscription, so new reports appear without a refresh loop.
function live() {
  try {
    socketClient().watchEntityEvents({
      onEntityCreated: async (ev: any) => {
        try {
          const e: any = await publicClient.getEntity(ev.entityKey)
          if (attr(e, "app") !== APP || attr(e, "kind") !== "field") return
          if (attr(e, "district") === $<HTMLSelectElement>("district").value) {
            $("field").querySelector("p.muted")?.remove()
            $("field").insertAdjacentHTML("afterbegin", await fieldCard(e))
          }
          $("live").textContent = `${t("live_new")} ${attr(e, "place")}, ${attr(e, "district")}`
        } catch { /* not ours, or already expired */ }
      },
      onExpiryExtended: (ev: any) => {
        const card = document.querySelector(`[data-key="${ev.entityKey}"] .muted`)
        if (card) card.insertAdjacentHTML("afterbegin", `<b>${t("just_confirmed")}</b> · `)
      },
      onError: () => { $("live").textContent = t("live_off") },
    })
    $("live").textContent = t("live_on")
  } catch { $("live").textContent = t("live_off") }
}

// ---- wiring ---------------------------------------------------------------------------------
function applyLang() {
  document.querySelectorAll<HTMLElement>("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t as any) })
}

async function main() {
  const opts = DISTRICTS.map((d) => `<option>${d}</option>`).join("")
  $("district").innerHTML = opts; $("f-district").innerHTML = opts
  const q = new URLSearchParams(location.search)
  $<HTMLSelectElement>("district").value = q.get("district") || "Purulia"
  $("curator").innerHTML = CURATOR ? `<a class="mono" href="${addrLink(CURATOR)}" target="_blank" rel="noopener">${short(CURATOR)}</a>` : "not set"
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((b) => b.addEventListener("click", () => { lang = b.dataset.lang as Lang; applyLang() }))
  ;["district", "contaminant", "above", "since"].forEach((id) => $(id).addEventListener("change", () => search()))
  $("place").addEventListener("change", () => search())
  $("more").addEventListener("click", () => search(true))
  $("field-form").addEventListener("submit", submitField)
  $("signer").addEventListener("change", showSigner)
  $("field").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button.confirm") as HTMLButtonElement | null
    if (b) confirm(b.closest<HTMLElement>("[data-key]")!.dataset.key as `0x${string}`, b)
  })
  applyLang()
  head = await publicClient.getBlockNumber()
  await loadSources().catch(() => {})
  search(); showSigner(); live()
}
main()

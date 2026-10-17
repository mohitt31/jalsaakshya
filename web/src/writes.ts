// Write builders shared by the app and the curator console.
import { addr, bool, dec, str, u64 } from "@arkiv-network/sdk/attr"
import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils"
import { APP, publicClient } from "./arkiv"
import { LIFETIME, LIMITS } from "./model"

export type TestInput = {
  site: string; district: string; place: string; contaminant: string; mgl: number; method: "kit" | "lab"
  srctype?: string; note?: string; kit?: string; entered?: { value: number; unit: string }; demo?: boolean
  tested?: number
  official_id?: string   // the WB PHED source ID, when the source was picked from PHED's public list
}

// Arkiv lifetimes must be whole 2-second blocks
const evenSeconds = (s: number) => s - (s % 2)

function testCreate(t: TestInput) {
  const attributes: Record<string, any> = {
    app: str(APP), kind: str("test"), site: str(t.site), district: str(t.district), place: str(t.place),
    contaminant: str(t.contaminant), mgl: dec(t.mgl.toFixed(6)), exceeds: bool(t.mgl > LIMITS[t.contaminant]),
    method: str(t.method), tested: u64(t.tested ?? Math.floor(Date.now() / 1000)),
  }
  if (t.demo) attributes.demo = bool(true)
  return {
    payload: jsonToPayload({ note: t.note || "", kit: t.kit || "", entered_value: t.entered?.value ?? t.mgl, entered_unit: t.entered?.unit ?? "mg/L",
      ...(t.demo ? { synthetic: "demo data for judging; not a real measurement" } : {}) }),
    contentType: "application/json", attributes,
    // a lab result is current until the next mandated annual test; a kit screening fades in 90 days
    // counted from the day of the test, so a test sent later (offline queue) does not live longer
    expires: ExpirationTime.fromSeconds(evenSeconds(Math.max(3600, (t.method === "lab" ? LIFETIME.testLab : LIFETIME.testKit) - (t.tested ? Math.max(0, Math.floor(Date.now() / 1000) - t.tested) : 0)))),
    flags: { readonly: true },
  }
}

export function siteCreate(t: Pick<TestInput, "site" | "district" | "place" | "srctype" | "demo" | "official_id">) {
  const attributes: Record<string, any> = { app: str(APP), kind: str("site"), site: str(t.site), district: str(t.district), place: str(t.place), srctype: str(t.srctype || "tube well") }
  if (t.official_id) { attributes.official_id = str(t.official_id); attributes.origin = str("wbphed-list") }
  if (t.demo) attributes.demo = bool(true)
  return {
    payload: jsonToPayload({ described_by: t.demo ? "demo data for judging" : "community" }), contentType: "application/json", attributes,
    // listed for a year after its latest test; anyone may renew it, nobody but the author can edit it
    expires: ExpirationTime.fromSeconds(LIFETIME.site), flags: { readonly: true, permissionlessExtension: true },
  }
}

/** One atomic batch: the test, plus either a new site or a Lifetime Extension of the existing one. */
export function testBatch(t: TestInput, existingSiteKey?: `0x${string}`) {
  return existingSiteKey
    ? { creates: [testCreate(t)], extensions: [{ entityKey: existingSiteKey, expires: ExpirationTime.fromSeconds(LIFETIME.site) }] }
    : { creates: [siteCreate(t), testCreate(t)] }
}

// An address nobody holds a key for. An entity owned by it can no longer be deleted or transferred by
// anyone, including the wallet that created it: it stays on Arkiv until its lifetime ends.
export const SEAL = "0x000000000000000000000000000000000000dEaD" as const

/**
 * The same atomic batch, with the test sealed: its key is predicted before sending, and the batch that
 * creates it also hands its ownership to SEAL. A lab under pressure cannot quietly withdraw an "unsafe"
 * result, and neither can we. ($creator stays the tester; corrections are new tests.)
 */
export async function sealedTestBatch(t: TestInput, existingSiteKey: `0x${string}` | undefined, signer: `0x${string}`) {
  const b: any = testBatch(t, existingSiteKey)
  const keys = await (publicClient as any).predictEntityKeys({ owner: signer, count: b.creates.length })
  b.creates.forEach((c: any, i: number) => { c.salt = keys[i].salt })
  const testKey = keys[b.creates.length - 1].key as `0x${string}`   // the test is always the last create
  return { batch: { ...b, ownershipChanges: [{ entityKey: testKey, newOwner: SEAL }] }, testKey }
}

export function labCreate(l: { wallet: `0x${string}`; name: string; district: string; demo?: boolean }) {
  const attributes: Record<string, any> = { app: str(APP), kind: str("lab"), wallet: addr(l.wallet), name: str(l.name.slice(0, 100)), district: str(l.district) }
  if (l.demo) attributes.demo = bool(true)
  return {
    payload: jsonToPayload({ name: l.name, note: l.demo ? "demo lab for judging; not a real laboratory" : "" }), contentType: "application/json", attributes,
    // the curator renews a lab's listing yearly; letting it lapse removes the lab from the registry
    expires: ExpirationTime.fromSeconds(LIFETIME.lab),
  }
}

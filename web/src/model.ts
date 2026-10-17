// Pure product rules, kept free of network code so they can be unit-tested.

export const LIMITS: Record<string, number> = { arsenic: 0.01, fluoride: 1.5 } // IS 10500:2012, mg/L
// Readings at or above this share of the limit are too close to call with a field kit.
// Kits under-read near the limit: in George et al. (ES&T 2012) every error at 10 µg/L was a
// well truly at 10-27 µg/L read as safe; van Geen et al. (ES&T 2005) found 21% of wells above
// 50 µg/L read as safe. So a kit reading of half the limit or more is not treated as "safe".
export const KIT_GREY_FRACTION = 0.5

const DAY = 86400
// Lifetimes follow the rules the readings live under:
//  - lab test: NRDWP/JJM guidelines require a chemical test of every drinking-water source at least
//    once a year, so a lab result is current for 365 days, then the source is due again.
//  - kit test: a screening result. UDWQMP 5.1.1 says kit positives must go to a lab; a kit reading
//    nobody follows up fades after 90 days rather than standing in for the annual test.
//  - site: a drinking-water source stays listed while it keeps being tested; every new test renews
//    it for a year (permissionless Lifetime Extension), and an untested site drops off after a year.
//  - lab registry: a lab's listing is renewed yearly by the curator.
//  - obs / source: official survey rows and reports, see schema.md.
//  - blockstat: an official WB PHED block figure, current for a year from the day it was read from
//    the report (the report prints no date range); the curator re-reads it yearly.
export const LIFETIME = {
  source: 730 * DAY, obs: 365 * DAY, lab: 365 * DAY, site: 365 * DAY, blockstat: 365 * DAY,
  testLab: 365 * DAY, testKit: 90 * DAY,
}

export type Test = {
  key: string; creator: string; site: string; contaminant: string; mgl: number
  method: "kit" | "lab"; tested: number; expiresInDays?: number
}

export type Verdict = {
  state: "unsafe" | "safe" | "confirm" | "overdue"
  basis: "lab" | "kit" | "none"
  contaminant?: string
  mgl?: number
  testers: number
  latest?: Test
  code: "lab_over" | "lab_within" | "kit_after_lab" | "none" | "kit_over" | "kit_near" | "kit_safe_many" | "kit_safe_one"
  reason: string
}

export function siteId(district: string, place: string) {
  const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${slug(district)}/${slug(place)}`.slice(0, 120)
}

export function needsLab(t: Pick<Test, "contaminant" | "mgl">) {
  return t.mgl >= KIT_GREY_FRACTION * LIMITS[t.contaminant]
}

/**
 * Status of one drinking-water source from its live tests.
 * Lab results from registered labs decide; kit readings only screen; no live test means overdue.
 */
export function verdict(tests: Test[], labs: Set<string>): Verdict {
  const live = [...tests].sort((a, b) => b.tested - a.tested)
  const lab = live.filter((t) => t.method === "lab" && labs.has(t.creator.toLowerCase()))
  if (lab.length) {
    // the newest lab result per contaminant; the source is unsafe if any is above its limit
    const newest = new Map<string, Test>()
    for (const t of lab) if (!newest.has(t.contaminant)) newest.set(t.contaminant, t)
    const worst = [...newest.values()].sort((a, b) => b.mgl / LIMITS[b.contaminant] - a.mgl / LIMITS[a.contaminant])[0]
    const over = worst.mgl > LIMITS[worst.contaminant]
    // a kit warning taken after the newest lab result re-opens the question
    const newestLab = Math.max(...lab.map((t) => t.tested))
    const laterWarning = live.find((t) => t.tested > newestLab && !labs.has(t.creator.toLowerCase()) && needsLab(t))
    if (!over && laterWarning) {
      return { state: "confirm", basis: "kit", contaminant: laterWarning.contaminant, mgl: laterWarning.mgl,
        testers: 1, latest: laterWarning, code: "kit_after_lab", reason: "a kit warning came after the last lab result: needs a new lab test" }
    }
    return { state: over ? "unsafe" : "safe", basis: "lab", contaminant: worst.contaminant, mgl: worst.mgl,
      testers: new Set(lab.map((t) => t.creator.toLowerCase())).size, latest: worst,
      code: over ? "lab_over" : "lab_within", reason: over ? "registered lab result above the limit" : "registered lab result within the limit" }
  }
  // a "lab" result from a wallet that is not in the curator's lab registry counts only as screening
  const kits = live.filter((t) => t.method === "kit" || !labs.has(t.creator.toLowerCase()))
  if (!kits.length) return { state: "overdue", basis: "none", testers: 0, code: "none", reason: "no current test: annual test is due" }
  const testers = new Set(kits.map((t) => t.creator.toLowerCase())).size
  const worst = [...kits].sort((a, b) => b.mgl / LIMITS[b.contaminant] - a.mgl / LIMITS[a.contaminant])[0]
  if (needsLab(worst)) {
    return { state: "confirm", basis: "kit", contaminant: worst.contaminant, mgl: worst.mgl, testers, latest: worst,
      code: worst.mgl > LIMITS[worst.contaminant] ? "kit_over" : "kit_near",
      reason: worst.mgl > LIMITS[worst.contaminant] ? "kit reading above the limit: needs lab confirmation"
        : "kit reading close to the limit, where kits under-read: needs lab confirmation" }
  }
  return { state: "safe", basis: "kit", contaminant: worst.contaminant, mgl: worst.mgl, testers, latest: worst,
    code: testers > 1 ? "kit_safe_many" : "kit_safe_one",
    reason: testers > 1 ? `kit screening within the limit, ${testers} independent testers` : "kit screening within the limit, one tester" }
}

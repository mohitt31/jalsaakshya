// npm run verify — checks JalSaakshya's claims from Tiramisu alone: no app, no backend, no key of ours.
// Every number below is read from the chain when you run it. Most checks are free filtered counts
// (arkiv_getEntityCount); three are ordinary 100-unit queries, well inside an anonymous budget.
import { createPublicClient } from "@arkiv-network/sdk"
import { tiramisu } from "@arkiv-network/sdk/chains"
import { str, dec, bool } from "@arkiv-network/sdk/attr"
import { and, eq, gt, or, render } from "@arkiv-network/sdk/query"
import { http } from "viem"

const APP = "jalsaakshya/v1"
const CURATOR = "0x048A053E77e7771b212d04D906E7b70139fC3760"
const SEAL = "0x000000000000000000000000000000000000dEaD"
const c = createPublicClient({ chain: tiramisu, transport: http() })

let failed = 0
const check = (ok, what, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? `  (${detail})` : ""}`) }
const count = async (exprs, extra = "") =>
  Number(await c.request({ method: "arkiv_getEntityCount", params: [{ query: render(and([eq("app", str(APP)), ...exprs])) + extra }] }))
const by = (a) => ` AND $creator = addr(${a})`
const owned = (a) => ` AND $owner = addr(${a})`
const kind = (k) => eq("kind", str(k))

console.log(`JalSaakshya on Arkiv Tiramisu · app = "${APP}" · curator ${CURATOR}\n`)

// 1. The curated survey dataset, trusted only by $creator
const obsCur = await count([kind("obs")], by(CURATOR))
const obsAll = await count([kind("obs")])
check(obsCur === 1173, "1,173 survey rows created by the curator", `createdBy(curator): ${obsCur}`)
console.log(`      obs rows from any wallet: ${obsAll}; the app shows only the ${obsCur} from the curator`)

// 2. Official WB PHED block figures for Nadia
const bsCur = await count([kind("blockstat")], by(CURATOR))
check(bsCur === 18, "18 WB PHED block figures for Nadia, created by the curator", `${bsCur}`)
const reg = await c.select({ attributes: true }).where(eq("app", str(APP)), kind("blockstat")).createdBy(CURATOR).limit(50).fetch()
const sum = (k) => reg.entities.reduce((s, e) => s + Number(e.attributes?.[k]?.value ?? 0), 0)
const tested = sum("tested"), beyond = sum("beyond")
check(tested === 124297 && beyond === 76665, "PHED Nadia: 1,24,297 arsenic tests, 76,665 beyond 10 µg/L", `${tested.toLocaleString("en-IN")} / ${beyond.toLocaleString("en-IN")}`)

// 3. Sealed: the curator owns none of what it created; 0x…dEaD owns all of it
const curAll = await count([or([kind("obs"), kind("source"), kind("blockstat")])], by(CURATOR))
const curStillOwned = await count([or([kind("obs"), kind("source"), kind("blockstat")])], by(CURATOR) + owned(CURATOR))
const curSealed = await count([or([kind("obs"), kind("source"), kind("blockstat")])], by(CURATOR) + owned(SEAL))
check(curStillOwned === 0 && curSealed === curAll, "every official record is sealed: the curator can no longer delete any of them",
  `${curSealed} of ${curAll} owned by 0x…dEaD, ${curStillOwned} still owned by the curator`)

// 4. Community tests: sealed in the transaction that creates them
const tests = await count([kind("test")])
const testsSealed = await count([kind("test")], owned(SEAL))
// (anyone can write an entity in our schema from their own script; such a write is listed here, unsealed)
if (testsSealed === tests) check(tests > 0, "every live test result is sealed (owner 0x…dEaD)", `${testsSealed} of ${tests}`)
else console.log(`NOTE  ${testsSealed} of ${tests} live tests are sealed; the rest were written outside the app, by wallets the app does not seal`)

// 5. Creation flags as the schema says: sources renewable by anyone, nothing editable
const sites = await c.select({ key: true, creationFlags: true, owner: true }).where(eq("app", str(APP)), kind("site")).limit(200).fetch()
const flagsOk = sites.entities.length > 0 && sites.entities.every((e) => e.creationFlags?.readonly && e.creationFlags?.permissionlessExtension)
check(flagsOk, "every source (site) is readonly + permissionlessExtension", `${sites.entities.length} sources`)

// 6. The query from SUBMISSION.md step 2
const r = await c.select({ attributes: true, creator: true })
  .where(eq("app", str(APP)), kind("obs"), eq("district", str("Purulia")), eq("contaminant", str("fluoride")), gt("mgl", dec("1.5")))
  .createdBy(CURATOR).limit(200).fetch()
const allFromCurator = r.entities.every((e) => String(e.creator).toLowerCase() === CURATOR.toLowerCase())
check(r.entities.length > 0 && allFromCurator, "Purulia fluoride above 1.5 mg/L, from the curator only", `${r.entities.length} rows`)

console.log(`\n${failed ? `${failed} check(s) failed` : "All checks passed."} Explorer: https://tiramisu.explorer.arkiv.network/address/${CURATOR}`)
process.exitCode = failed ? 1 : 0

import { test } from "node:test"
import assert from "node:assert/strict"
import { verdict, needsLab, siteId, type Test } from "./model.ts"

const t = (o: Partial<Test>): Test => ({ key: "k", creator: "0xA", site: "s", contaminant: "arsenic", mgl: 0.002, method: "kit", tested: 1, ...o })
const labs = new Set(["0xlab"])

test("no live test means the source is overdue, not safe", () => {
  assert.equal(verdict([], labs).state, "overdue")
})

test("kit reading near the arsenic limit needs a lab, even if below it", () => {
  assert.equal(needsLab({ contaminant: "arsenic", mgl: 0.006 }), true)
  assert.equal(needsLab({ contaminant: "arsenic", mgl: 0.004 }), false)
  assert.equal(verdict([t({ mgl: 0.008 })], labs).state, "confirm")
})

test("kit reading above the limit is a lab referral, not a verdict", () => {
  const v = verdict([t({ mgl: 0.05 })], labs)
  assert.equal(v.state, "confirm"); assert.match(v.reason, /above the limit/); assert.equal(v.code, "kit_over")
})

test("low kit readings are safe screening and count independent testers", () => {
  const v = verdict([t({ creator: "0xA" }), t({ creator: "0xB", tested: 2 }), t({ creator: "0xa", tested: 3 })], labs)
  assert.equal(v.state, "safe"); assert.equal(v.testers, 2)
})

test("a registered lab result overrides older kit readings", () => {
  const v = verdict([t({ mgl: 0.05, tested: 1 }), t({ method: "lab", creator: "0xLAB", mgl: 0.004, tested: 3 })], labs)
  assert.equal(v.basis, "lab"); assert.equal(v.state, "safe")
})

test("a kit warning after the last lab result re-opens the question", () => {
  const v = verdict([t({ mgl: 0.05, tested: 5 }), t({ method: "lab", creator: "0xLAB", mgl: 0.004, tested: 3 })], labs)
  assert.equal(v.state, "confirm"); assert.match(v.reason, /after the last lab result/); assert.equal(v.code, "kit_after_lab")
})

test("a lab result from an unregistered wallet is treated as a kit-level claim", () => {
  const v = verdict([t({ method: "lab", creator: "0xNOTLAB", mgl: 0.004 })], labs)
  assert.equal(v.basis, "kit"); assert.equal(v.state, "safe")
})

test("newest lab result per contaminant decides; any over the limit makes it unsafe", () => {
  const v = verdict([
    t({ method: "lab", creator: "0xlab", mgl: 0.03, tested: 1 }),
    t({ method: "lab", creator: "0xlab", mgl: 0.005, tested: 9 }),
    t({ method: "lab", creator: "0xlab", contaminant: "fluoride", mgl: 2.1, tested: 4 }),
  ], labs)
  assert.equal(v.state, "unsafe"); assert.equal(v.contaminant, "fluoride")
})

test("site ids are stable slugs", () => {
  assert.equal(siteId("North 24 Parganas", "Bhagwanpur  Tube-well #2"), "north-24-parganas/bhagwanpur-tube-well-2")
})

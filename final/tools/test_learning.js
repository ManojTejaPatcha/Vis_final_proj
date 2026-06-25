#!/usr/bin/env node
/* ============================================================================
 * PlanPilot — Learning Engine Verification Harness
 * Confirms: data-store seeds, bandit recovers latent signal, logreg beats
 * baseline, k-NN + key-focus-points produce sensible output.
 * Run: node tools/test_learning.js
 * ==========================================================================*/
const fs = require("fs");
const path = require("path");

const F = require("../feature-engineering.js");
const Learn = require("../learning-engine.js");
const Model = require("../ml-model.js");
const { DataStore, MemoryBackend } = require("../data-store.js");

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "seed_interactions.json"), "utf8")
);

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}` + (extra ? `  → ${extra}` : "")); }
}

console.log("\n=== 1. DataStore seeding (MemoryBackend) ===");
const store = new DataStore(new MemoryBackend());
store.init(seed);
check("seeded flag set", store.isSeeded());
check("interactions loaded", store.getInteractions().length === seed.length, store.getInteractions().length);
const s = store.stats();
console.log(`  stats: total=${s.total} seeds=${s.seeds} live=${s.live} conv=${(s.conversionRate * 100).toFixed(1)}%`);
check("re-init does not duplicate", (store.init(seed), store.getInteractions().length === seed.length));

console.log("\n=== 2. Bandit recovers latent signal ===");
const bandit = Learn.buildBanditFromInteractions(seed);
store.saveBanditState(bandit);

// Find a well-populated high-budget segment; latent truth → framing/anchoring strong.
const segCounts = {};
seed.forEach((it) => (segCounts[it.segment] = (segCounts[it.segment] || 0) + 1));
const highSegs = Object.entries(segCounts)
  .filter(([k]) => k.includes("|high|"))
  .sort((a, b) => b[1] - a[1]);
console.log("  high-budget segments by volume:", highSegs.slice(0, 3));

if (highSegs.length) {
  const seg = highSegs[0][0];
  const stats = Learn.banditStats(bandit, seg);
  console.log(`  segment "${seg}" top angles:`);
  stats.slice(0, 4).forEach((a) => console.log(`     ${a.angle.padEnd(13)} mean=${(a.mean * 100).toFixed(0)}%  pulls=${a.pulls}`));
  const top3 = stats.slice(0, 3).map((a) => a.angle);
  check("framing OR anchoring in top-3 for high-budget", top3.includes("framing") || top3.includes("anchoring"), top3.join(","));
}

// Low-budget segment → authority/defaultEffect/socialProof expected strong.
const lowSegs = Object.entries(segCounts)
  .filter(([k]) => k.includes("|low|"))
  .sort((a, b) => b[1] - a[1]);
if (lowSegs.length) {
  const seg = lowSegs[0][0];
  const stats = Learn.banditStats(bandit, seg);
  const top3 = stats.slice(0, 3).map((a) => a.angle);
  console.log(`  segment "${seg}" top-3: ${top3.join(", ")}`);
  check("authority/default/socialProof in top-3 for low-budget",
    top3.some((a) => ["authority", "defaultEffect", "socialProof"].includes(a)), top3.join(","));
}

console.log("\n=== 3. Thompson sampling produces varied rankings ===");
const someSeg = highSegs[0] ? highSegs[0][0] : Object.keys(segCounts)[0];
const r1 = Learn.sampleAngleRanking(bandit, someSeg, 4);
const r2 = Learn.sampleAngleRanking(bandit, someSeg, 4);
console.log(`  draw1: ${r1.join(", ")}`);
console.log(`  draw2: ${r2.join(", ")}`);
check("ranking returns 4 angles", r1.length === 4);

console.log("\n=== 4. Logistic regression beats baseline ===");
const model = Model.trainModel(seed);
check("model trained", model.trained, model.reason);
if (model.trained) {
  console.log(`  n=${model.n}  baseRate=${(model.baseRate * 100).toFixed(1)}%  trainAcc=${(model.trainAccuracy * 100).toFixed(1)}%`);
  const baseline = Math.max(model.baseRate, 1 - model.baseRate);
  check("train accuracy beats majority-class baseline", model.trainAccuracy > baseline,
    `acc=${(model.trainAccuracy * 100).toFixed(1)}% vs baseline=${(baseline * 100).toFixed(1)}%`);
  console.log("  top feature importance:");
  Model.featureImportance(model, 6).forEach((f) =>
    console.log(`     ${f.feature.padEnd(22)} coef=${f.coef.toFixed(2)}  (${f.direction})`));
}

console.log("\n=== 5. k-NN + key focus points on a fresh customer ===");
const testCustomer = {
  name: "Test Patient", age: 71, ageBucket: "senior",
  state: "Texas", region: "South",
  conditions: ["Type 2 Diabetes", "Heart Failure"],
  medications: ["ozempic", "jardiance"], numMedications: 2,
  onMedsLong: true, budgetSensitivity: "high", valuesConvenience: true,
};
const neighbors = Learn.kNN(testCustomer, seed, 12);
check("kNN returns 12 neighbors", neighbors.length === 12);
console.log(`  nearest similarity: ${neighbors[0].similarity.toFixed(3)}  (${neighbors[0].interaction.customer.name})`);
const kfp = Learn.keyFocusPoints(testCustomer, bandit, seed, { K: 12 });
console.log(`  segment: ${kfp.segment}`);
console.log(`  cohort conversion: ${(kfp.cohort.conversionRate * 100).toFixed(0)}%`);
kfp.focus.forEach((f) => console.log(`     • ${f.title}: ${f.detail}`));
const pred = Model.predict(model, testCustomer);
console.log(`  model P(convert) for test customer: ${(pred * 100).toFixed(1)}%`);
check("prediction in [0,1]", pred >= 0 && pred <= 1);
check("key focus has lead angles", kfp.focus.some((f) => f.type === "leadAngles"));

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail ? 1 : 0);

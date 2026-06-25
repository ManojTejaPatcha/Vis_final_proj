#!/usr/bin/env node
/* ============================================================================
 * PlanPilot — Synthetic Customer & Interaction Generator
 * ----------------------------------------------------------------------------
 * Models "multiple small consuming agents": each PersonaAgent is a self-
 * contained generator that produces realistic people of one archetype, with
 * income grounded in real US pay structures:
 *   - Social Security avg benefit ~$1,900/mo (~$22.8k/yr)  (SSA 2024)
 *   - Median 65+ household income ~$50k; many seniors on fixed income <$35k
 *   - Employer/ACA working adults 50-64 earning $35k-$150k
 *   - Dual-eligible (Medicare+Medicaid) very low income, near-zero drug OOP
 *
 * Output: data/seed_interactions.json  (100 full interaction records:
 *   customer profile + financial structure + pitch + admin debrief + outcome)
 *
 * The outcomes embed a LEARNABLE latent signal (which persuasion angles work
 * for which segment) + noise, so the downstream bandit/k-NN/logreg can recover
 * it. Deterministic via seeded PRNG so regeneration is reproducible.
 *
 * Run:  node tools/generate_customers.js [count]
 * ==========================================================================*/

const fs = require("fs");
const path = require("path");

/* ----------------------------- seeded PRNG ------------------------------- */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260620);
const rand = () => rng();
const randInt = (a, b) => Math.floor(rand() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
function weightedPick(items) {
  // items: [{value, w}]
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = rand() * total;
  for (const it of items) { if ((r -= it.w) <= 0) return it.value; }
  return items[items.length - 1].value;
}
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function round2(x) { return Math.round(x * 100) / 100; }

/* ----------------------------- reference data ---------------------------- */
const PRICING = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "insurer_pricing.json"), "utf8")
);
// pricing[drug_id][insurer] = entry
const PRICE_MAP = {};
for (const e of PRICING) {
  (PRICE_MAP[e.drug_id] ||= {})[e.insurer] = e;
}
const INSURERS = [...new Set(PRICING.map((e) => e.insurer))];
const DRUG_IDS = [...new Set(PRICING.map((e) => e.drug_id))];

const ANGLES = [
  "anchoring", "lossAversion", "framing",
  "socialProof", "decoyEffect", "defaultEffect", "authority",
];

const CONDITION_DRUGS = {
  "Type 2 Diabetes": ["ozempic", "jardiance", "trulicity"],
  "Weight Management": ["ozempic"],
  "Heart Failure": ["jardiance"],
  "Atrial Fibrillation": ["eliquis", "xarelto"],
  "DVT/PE": ["eliquis", "xarelto"],
};
const CONDITION_GROUP = {
  "Type 2 Diabetes": "metabolic",
  "Weight Management": "metabolic",
  "Heart Failure": "cardiac",
  "Atrial Fibrillation": "cardiac",
  "DVT/PE": "cardiac",
};

const STATE_REGION = {
  "Maine": "Northeast", "New York": "Northeast", "Pennsylvania": "Northeast",
  "Massachusetts": "Northeast", "New Jersey": "Northeast",
  "Florida": "South", "Texas": "South", "Georgia": "South",
  "North Carolina": "South", "Virginia": "South", "Tennessee": "South",
  "Ohio": "Midwest", "Illinois": "Midwest", "Michigan": "Midwest",
  "Wisconsin": "Midwest", "Minnesota": "Midwest", "Missouri": "Midwest",
  "California": "West", "Arizona": "West", "Washington": "West",
  "Colorado": "West", "Oregon": "West", "Nevada": "West",
};
const STATES = Object.keys(STATE_REGION);

const FIRST_NAMES = [
  "Robert", "Mary", "James", "Patricia", "John", "Jennifer", "Michael",
  "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan",
  "Joseph", "Margaret", "Charles", "Dorothy", "Thomas", "Carol", "Maria",
  "Jose", "Carlos", "Rosa", "Wei", "Mei", "Aisha", "Omar", "Grace", "Frank",
  "Helen", "George", "Ruth", "Harold", "Betty", "Walter", "Joan", "Arthur",
];
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Lee", "Nguyen", "Patel", "Kim", "Chen",
  "Wright", "Walker", "Scott", "Adams", "Baker", "Nelson", "Carter",
];
const nameUsed = new Set();
function makeName() {
  let n;
  do { n = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; } while (nameUsed.has(n));
  nameUsed.add(n);
  return n;
}

function ageBucket(age) { return age >= 65 ? "senior" : age >= 50 ? "midlife" : "young"; }

/* income bracket label from a numeric income (for intake-style bracketing) */
function incomeBracket(income) {
  if (income < 20000) return "<$20k";
  if (income < 35000) return "$20-35k";
  if (income < 55000) return "$35-55k";
  if (income < 80000) return "$55-80k";
  if (income < 120000) return "$80-120k";
  return "$120k+";
}

/* ----------------------------- PERSONA AGENTS ---------------------------- */
/* Each agent: weight (population share) + generate() producing a customer
 * with realistic demographics, income source, insurance type & income. */
const PERSONA_AGENTS = [
  {
    id: "fixed_income_senior", label: "Fixed-Income Senior", weight: 28,
    generate() {
      const age = randInt(67, 86);
      // Social Security only: ~$14k-$34k/yr
      const income = randInt(14000, 34000);
      return {
        age, income, incomeSource: "Social Security only",
        insuranceType: "Medicare Part D",
        convenienceBias: 0.35, condBias: "cardiac",
      };
    },
  },
  {
    id: "comfortable_retiree", label: "Comfortable Retiree", weight: 24,
    generate() {
      const age = randInt(65, 80);
      // SS + pension: ~$38k-$80k
      const income = randInt(38000, 80000);
      return {
        age, income, incomeSource: "Social Security + pension",
        insuranceType: chance(0.5) ? "Medicare Advantage" : "Medicare Part D",
        convenienceBias: 0.55, condBias: "mixed",
      };
    },
  },
  {
    id: "affluent_retiree", label: "Affluent Retiree", weight: 12,
    generate() {
      const age = randInt(65, 82);
      // Investments/savings: $85k-$160k
      const income = randInt(85000, 160000);
      return {
        age, income, incomeSource: "Investments/savings",
        insuranceType: "Medicare Advantage",
        convenienceBias: 0.8, condBias: "mixed",
      };
    },
  },
  {
    id: "working_midlife", label: "Working Mid-Life", weight: 18,
    generate() {
      const age = randInt(50, 64);
      const income = randInt(55000, 130000);
      return {
        age, income, incomeSource: "Employment/salary",
        insuranceType: "Employer-sponsored",
        convenienceBias: 0.6, condBias: "metabolic",
      };
    },
  },
  {
    id: "marketplace_midlife", label: "Marketplace Mid-Life", weight: 10,
    generate() {
      const age = randInt(48, 63);
      const income = randInt(32000, 55000);
      return {
        age, income, incomeSource: "Employment/salary",
        insuranceType: "ACA Marketplace",
        convenienceBias: 0.45, condBias: "metabolic",
      };
    },
  },
  {
    id: "dual_eligible", label: "Dual-Eligible (Medicare+Medicaid)", weight: 8,
    generate() {
      const age = randInt(60, 85);
      const income = randInt(9000, 19000);
      return {
        age, income, incomeSource: chance(0.5) ? "Disability" : "Medicaid-assisted",
        insuranceType: "Dual-eligible",
        convenienceBias: 0.3, condBias: "cardiac",
      };
    },
  },
];

/* ----------------------- condition / medication ------------------------- */
function assignConditions(base) {
  const conditions = [];
  const wantCardiac = base.condBias === "cardiac" || base.condBias === "mixed";
  const wantMetabolic = base.condBias === "metabolic" || base.condBias === "mixed";
  if (wantMetabolic && chance(0.7)) conditions.push("Type 2 Diabetes");
  if (wantMetabolic && chance(0.25)) conditions.push("Weight Management");
  if (wantCardiac && chance(0.5)) conditions.push("Atrial Fibrillation");
  if (wantCardiac && chance(0.3)) conditions.push("DVT/PE");
  if (chance(0.25)) conditions.push("Heart Failure");
  if (conditions.length === 0) conditions.push(pick(Object.keys(CONDITION_DRUGS)));
  return [...new Set(conditions)];
}
function assignMedications(conditions) {
  const meds = new Set();
  for (const c of conditions) {
    const opts = CONDITION_DRUGS[c];
    meds.add(pick(opts));
    if (opts.length > 1 && chance(0.2)) meds.add(pick(opts));
  }
  return [...meds];
}

/* --------------------- financial / affordability ------------------------ */
function monthlyCopayFor(insurer, meds, preferMail) {
  let total = 0;
  for (const d of meds) {
    const e = PRICE_MAP[d][insurer];
    if (!e) continue;
    const useMail = preferMail && e.mail_order_available;
    total += useMail ? e.mail_order_copay : e.patient_copay;
  }
  return total;
}
// Dual-eligible patients pay ~$0-$12 (Medicaid covers most OOP)
function effectiveMonthlyCopay(raw, insuranceType) {
  if (insuranceType === "Dual-eligible") return Math.min(raw, randInt(0, 12));
  return raw;
}

/* ------------------ latent ground-truth angle effectiveness -------------- */
/* The "secret" the learning engine must recover. Returns per-angle weight. */
function trueAngleEffectiveness(profile) {
  const e = Object.fromEntries(ANGLES.map((a) => [a, 0]));
  if (profile.budgetSensitivity === "high") {
    e.framing += 1.0; e.anchoring += 0.8; e.decoyEffect += 0.4;
  } else if (profile.budgetSensitivity === "low") {
    e.authority += 0.7; e.defaultEffect += 0.6; e.socialProof += 0.4;
  } else {
    e.anchoring += 0.4; e.socialProof += 0.4; e.framing += 0.3;
  }
  if (profile.valuesConvenience) { e.lossAversion += 0.8; e.defaultEffect += 0.3; }
  if (profile.ageBucket === "senior") { e.socialProof += 0.6; e.authority += 0.5; }
  return e;
}

/* --------------------------- objection model ----------------------------- */
function sampleObjections(profile, burden, converted) {
  const obj = [];
  if (burden > 0.05 && chance(0.8)) obj.push("Too expensive");
  if (profile.onMedsLong && chance(0.5)) obj.push("Loyal to current plan");
  if (profile.ageBucket === "senior" && chance(0.3)) obj.push("Too complicated");
  if (chance(0.2)) obj.push("Don't trust insurer");
  if (chance(0.15)) obj.push("Doubts coverage");
  if (chance(0.15)) obj.push("Wants spouse/family input");
  if (converted && obj.length && chance(0.5)) obj.shift(); // converters raise fewer
  return obj.length ? [...new Set(obj)] : ["None"];
}

/* =============================== generate ================================= */
function generateInteraction(idx) {
  const agent = weightedPick(PERSONA_AGENTS.map((a) => ({ value: a, w: a.weight })));
  const base = agent.generate();

  const conditions = assignConditions(base);
  const medications = assignMedications(conditions);
  const primaryGroup = CONDITION_GROUP[conditions[0]];
  const valuesConvenience = chance(base.convenienceBias);
  const onMedsLong = chance(0.45);

  // Target insurer: admin tends to push higher-priced plans (the business goal),
  // weighted toward bigger insurers. Use total copay across meds as a proxy.
  const targetInsurer = weightedPick(
    INSURERS.map((ins) => {
      const c = monthlyCopayFor(ins, medications, false);
      const e0 = PRICE_MAP[medications[0]][ins];
      // bias toward expensive + high market share (what an admin would promote)
      return { value: ins, w: (c / 50) + (e0 ? e0.market_share / 10 : 0) };
    })
  );

  const rawMonthly = monthlyCopayFor(targetInsurer, medications, valuesConvenience);
  const monthlyCopay = effectiveMonthlyCopay(rawMonthly, base.insuranceType);
  const annualDrugCost = monthlyCopay * 12;
  const burden = annualDrugCost / base.income; // financial burden ratio
  const maxAffordableCopay = Math.round(
    (base.income * (base.insuranceType === "Dual-eligible" ? 0.005 : 0.04)) / 12
  );

  // budget sensitivity derived from burden + persona convenience bias
  let budgetSensitivity;
  if (burden > 0.06 || maxAffordableCopay < monthlyCopay * 0.6) budgetSensitivity = "high";
  else if (burden > 0.025) budgetSensitivity = "medium";
  else budgetSensitivity = "low";
  if (base.insuranceType === "Dual-eligible") budgetSensitivity = "high"; // mentally price-anxious

  const profile = {
    ageBucket: ageBucket(base.age), budgetSensitivity, valuesConvenience,
    onMedsLong,
  };
  const segment = `${primaryGroup}|${profile.ageBucket}|${budgetSensitivity}|${valuesConvenience ? "conv" : "noconv"}`;

  // PITCH: pick 4 angles with exploration (varied) so outcomes create contrast
  const shuffled = [...ANGLES].sort(() => rand() - 0.5);
  const anglesUsed = shuffled.slice(0, 4);

  // OUTCOME: latent truth + affordability + noise
  const truth = trueAngleEffectiveness(profile);
  const angleScore = anglesUsed.reduce((s, a) => s + truth[a], 0);
  const affordTerm = clamp((maxAffordableCopay - monthlyCopay) / 60, -1.5, 1.0);
  const personaBase = budgetSensitivity === "low" ? 0.25 : budgetSensitivity === "high" ? -0.4 : 0.0;
  const noise = (rand() - 0.5) * 1.2;
  const z = -1.55 + 0.45 * angleScore + 0.9 * affordTerm + personaBase + noise;
  const pConvert = sigmoid(z);
  const converted = rand() < pConvert;

  // DEBRIEF labels
  const resonatedAngles = anglesUsed.filter(
    (a) => truth[a] > 0.3 && chance(converted ? 0.85 : 0.4)
  );
  const objections = sampleObjections(profile, burden, converted);
  const priceConcern = clamp(
    Math.round(1 + burden * 40 + (budgetSensitivity === "high" ? 1.5 : 0)), 1, 5
  );
  const decisionSpeed = converted
    ? (budgetSensitivity === "low" ? "instant" : "deliberate")
    : (chance(0.5) ? "needs follow-up" : "deliberate");
  const competitorMentioned = chance(0.25)
    ? pick(INSURERS.filter((i) => i !== targetInsurer))
    : "none";

  const name = makeName();
  const state = pick(STATES);

  return {
    id: `seed-${String(idx + 1).padStart(3, "0")}`,
    timestamp: Date.UTC(2026, 0, 1) + idx * 86400000 * 1.5, // spread over time
    source: "seed",
    persona: agent.id,
    customer: {
      name, age: base.age, ageBucket: profile.ageBucket,
      state, region: STATE_REGION[state],
      conditions, medications, numMedications: medications.length,
      onMedsLong,
      budgetSensitivity, valuesConvenience,
    },
    financial: {
      incomeSource: base.incomeSource,
      annualIncome: base.income,
      incomeBracket: incomeBracket(base.income),
      insuranceType: base.insuranceType,
      monthlyDrugCopay: monthlyCopay,
      annualDrugCost,
      maxAffordableCopay,
      financialBurdenRatio: round2(burden),
    },
    segment,
    targetInsurer,
    pitch: {
      anglesUsed,
      insurerSuggested: targetInsurer,
      predictedConversion: round2(pConvert),
    },
    debrief: {
      converted,
      enrolledInsurer: converted ? targetInsurer : null,
      resonatedAngles,
      objections,
      priceConcern,
      decisionSpeed,
      competitorMentioned,
      notes: "",
    },
    outcome: { converted, reward: converted ? 1 : 0 },
  };
}

/* ================================ main =================================== */
const COUNT = parseInt(process.argv[2] || "100", 10);
const interactions = Array.from({ length: COUNT }, (_, i) => generateInteraction(i));

const outDir = path.join(__dirname, "..", "data");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "seed_interactions.json");
fs.writeFileSync(outPath, JSON.stringify(interactions, null, 2));

/* --------------------------- summary stats ------------------------------- */
const conv = interactions.filter((i) => i.outcome.converted).length;
const incomes = interactions.map((i) => i.financial.annualIncome).sort((a, b) => a - b);
const burdens = interactions.map((i) => i.financial.financialBurdenRatio);
const median = (arr) => arr[Math.floor(arr.length / 2)];
const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;
const countBy = (fn) => interactions.reduce((m, i) => ((m[fn(i)] = (m[fn(i)] || 0) + 1), m), {});

console.log(`\n✅ Generated ${COUNT} interactions → ${path.relative(process.cwd(), outPath)}\n`);
console.log(`Conversion rate      : ${(conv / COUNT * 100).toFixed(1)}%`);
console.log(`Median income        : $${median(incomes).toLocaleString()}`);
console.log(`<$35k income share   : ${(incomes.filter((x) => x < 35000).length / COUNT * 100).toFixed(0)}%`);
console.log(`Median age           : ${median(interactions.map((i) => i.customer.age).sort((a, b) => a - b))}`);
console.log(`Avg burden ratio     : ${(mean(burdens) * 100).toFixed(1)}% of income`);
console.log(`\nBy persona           :`, countBy((i) => i.persona));
console.log(`By insurance type    :`, countBy((i) => i.financial.insuranceType));
console.log(`By budget sensitivity:`, countBy((i) => i.customer.budgetSensitivity));
console.log(`Distinct segments    : ${new Set(interactions.map((i) => i.segment)).size}\n`);

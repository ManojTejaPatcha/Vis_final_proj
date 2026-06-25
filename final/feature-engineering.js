/* ============================================================================
 * PlanPilot — Feature Engineering
 * ----------------------------------------------------------------------------
 * Turns a customer profile into:
 *   - a normalized numeric feature vector (for k-NN distance + logistic reg)
 *   - a coarse segment key (for the contextual bandit)
 *
 * Segment key MUST match the synthetic generator:
 *   `${conditionGroup}|${ageBucket}|${budgetSensitivity}|${conv|noconv}`
 *
 * Works in the browser (attaches window.PPFeatures) and in Node (module.exports).
 * ==========================================================================*/
(function (global) {
  "use strict";

  const CONDITIONS = [
    "Type 2 Diabetes", "Weight Management", "Heart Failure",
    "Atrial Fibrillation", "DVT/PE",
  ];
  const MEDICATIONS = ["ozempic", "jardiance", "trulicity", "eliquis", "xarelto"];
  const REGIONS = ["Northeast", "South", "Midwest", "West"];

  const CONDITION_GROUP = {
    "Type 2 Diabetes": "metabolic",
    "Weight Management": "metabolic",
    "Heart Failure": "cardiac",
    "Atrial Fibrillation": "cardiac",
    "DVT/PE": "cardiac",
  };

  const CONDITION_DRUGS = {
    "Type 2 Diabetes": ["ozempic", "jardiance", "trulicity"],
    "Weight Management": ["ozempic"],
    "Heart Failure": ["jardiance"],
    "Atrial Fibrillation": ["eliquis", "xarelto"],
    "DVT/PE": ["eliquis", "xarelto"],
  };

  const AGE_MIN = 45, AGE_MAX = 86;

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function ageBucket(age) {
    return age >= 65 ? "senior" : age >= 50 ? "midlife" : "young";
  }

  /* Mirrors the generator's budget-sensitivity derivation so runtime intake
   * produces segments consistent with the seeded training data. */
  function deriveBudgetSensitivity(annualIncome, monthlyCopay, maxAffordableCopay, insuranceType) {
    if (insuranceType === "Dual-eligible") return "high";
    const burden = (monthlyCopay * 12) / Math.max(1, annualIncome);
    if (burden > 0.06 || maxAffordableCopay < monthlyCopay * 0.6) return "high";
    if (burden > 0.025) return "medium";
    return "low";
  }

  /* Suggest medications from selected conditions (used to auto-fill intake). */
  function suggestMedications(conditions) {
    const meds = new Set();
    (conditions || []).forEach((c) => (CONDITION_DRUGS[c] || []).forEach((d) => meds.add(d)));
    return [...meds];
  }

  function primaryConditionGroup(conditions) {
    if (!conditions || !conditions.length) return "metabolic";
    return CONDITION_GROUP[conditions[0]] || "metabolic";
  }

  /* Coarse cohort key for the bandit. */
  function deriveSegment(customer) {
    const bucket = customer.ageBucket || ageBucket(customer.age);
    const group = primaryConditionGroup(customer.conditions);
    const conv = customer.valuesConvenience ? "conv" : "noconv";
    return `${group}|${bucket}|${customer.budgetSensitivity}|${conv}`;
  }

  /* Ordered feature labels (stable order = stable vector indices). */
  const FEATURE_LABELS = [
    "age_norm", "budget_ordinal", "values_convenience", "num_meds_norm", "on_meds_long",
    ...CONDITIONS.map((c) => "cond:" + c),
    ...MEDICATIONS.map((m) => "med:" + m),
    ...REGIONS.map((r) => "region:" + r),
  ];

  /* Per-feature weights for k-NN distance (condition/med matches dominate). */
  const KNN_WEIGHTS = [
    0.6, 1.0, 0.7, 0.4, 0.3,                       // scalars
    ...CONDITIONS.map(() => 1.2),                   // conditions
    ...MEDICATIONS.map(() => 1.1),                  // medications
    ...REGIONS.map(() => 0.3),                      // region
  ];

  const budgetOrdinal = { low: 0, medium: 0.5, high: 1 };

  function vectorize(customer) {
    const age = customer.age != null ? customer.age : 65;
    const v = [];
    v.push(clamp((age - AGE_MIN) / (AGE_MAX - AGE_MIN), 0, 1));
    v.push(budgetOrdinal[customer.budgetSensitivity] ?? 0.5);
    v.push(customer.valuesConvenience ? 1 : 0);
    const nMeds = (customer.medications || []).length || 1;
    v.push(clamp((nMeds - 1) / 4, 0, 1));
    v.push(customer.onMedsLong ? 1 : 0);
    const conds = customer.conditions || [];
    CONDITIONS.forEach((c) => v.push(conds.includes(c) ? 1 : 0));
    const meds = customer.medications || [];
    MEDICATIONS.forEach((m) => v.push(meds.includes(m) ? 1 : 0));
    const region = customer.region;
    REGIONS.forEach((r) => v.push(region === r ? 1 : 0));
    return v;
  }

  /* Weighted Euclidean distance between two feature vectors. */
  function weightedDistance(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) {
      const d = (a[i] - b[i]) * KNN_WEIGHTS[i];
      s += d * d;
    }
    return Math.sqrt(s);
  }

  /* Similarity in (0,1]; 1 = identical. */
  function similarity(a, b) {
    return 1 / (1 + weightedDistance(a, b));
  }

  const api = {
    CONDITIONS, MEDICATIONS, REGIONS, CONDITION_GROUP, CONDITION_DRUGS,
    FEATURE_LABELS, KNN_WEIGHTS,
    ageBucket, deriveBudgetSensitivity, suggestMedications,
    primaryConditionGroup, deriveSegment,
    vectorize, weightedDistance, similarity,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PPFeatures = api;
})(typeof window !== "undefined" ? window : globalThis);

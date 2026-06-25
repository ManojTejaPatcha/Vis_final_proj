/* ============================================================================
 * PlanPilot — Learning Engine
 * ----------------------------------------------------------------------------
 * Three industry-standard techniques:
 *   1. k-NN cohort retrieval  → "customers like this one" (cold-start)
 *   2. Thompson-Sampling contextual bandit → which angles to use & in what order
 *      (online exploration/exploitation, Beta posteriors per segment×angle)
 *   3. Cohort + bandit insight synthesis → "key points to focus on" for admin
 *
 * Depends on PPFeatures (feature-engineering.js).
 * Works in browser (window.PPLearn) and Node (module.exports).
 * ==========================================================================*/
(function (global) {
  "use strict";

  const F = (typeof require !== "undefined")
    ? require("./feature-engineering.js")
    : global.PPFeatures;

  const ANGLES = [
    "anchoring", "lossAversion", "framing",
    "socialProof", "decoyEffect", "defaultEffect", "authority",
  ];

  const ANGLE_LABELS = {
    anchoring: "Anchoring (high reference price)",
    lossAversion: "Loss Aversion (cost of not enrolling)",
    framing: "Framing (daily cost)",
    socialProof: "Social Proof (popularity)",
    decoyEffect: "Decoy Effect (smart middle choice)",
    defaultEffect: "Default Effect (pre-selected)",
    authority: "Authority (clinical / CMS data)",
  };

  /* ----------------------------- RNG (Gamma/Beta) ------------------------- */
  // Marsaglia-Tsang gamma sampler → Beta sampler for Thompson sampling.
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function sampleGamma(k) {
    if (k < 1) {
      const u = Math.random();
      return sampleGamma(1 + k) * Math.pow(u, 1 / k);
    }
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = randn(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function sampleBeta(a, b) {
    const x = sampleGamma(a);
    const y = sampleGamma(b);
    return x / (x + y);
  }

  /* ----------------------------- bandit state ----------------------------- */
  // banditState = { [segment]: { [angle]: {alpha, beta} } }
  function ensureSegment(banditState, segment) {
    if (!banditState[segment]) {
      banditState[segment] = {};
      ANGLES.forEach((a) => (banditState[segment][a] = { alpha: 1, beta: 1 }));
    }
    return banditState[segment];
  }

  /* Credit assignment: each played angle gets reward; resonated angles get
   * full credit, non-resonated-but-in-winning-pitch get partial credit. */
  function updateBandit(banditState, segment, anglesUsed, resonatedAngles, converted) {
    const seg = ensureSegment(banditState, segment);
    const reson = new Set(resonatedAngles || []);
    (anglesUsed || []).forEach((a) => {
      if (!seg[a]) seg[a] = { alpha: 1, beta: 1 };
      if (converted) {
        seg[a].alpha += reson.has(a) ? 1 : 0.4;
      } else {
        seg[a].beta += reson.has(a) ? 0.3 : 1;
      }
    });
    return banditState;
  }

  /* Posterior mean win-rate + uncertainty per angle for a segment. */
  function banditStats(banditState, segment) {
    const seg = banditState[segment] || {};
    return ANGLES.map((a) => {
      const p = seg[a] || { alpha: 1, beta: 1 };
      const n = p.alpha + p.beta;
      const mean = p.alpha / n;
      const variance = (p.alpha * p.beta) / (n * n * (n + 1));
      return {
        angle: a, label: ANGLE_LABELS[a],
        mean, std: Math.sqrt(variance),
        alpha: p.alpha, beta: p.beta,
        pulls: Math.round(n - 2), // minus the Beta(1,1) prior
      };
    }).sort((x, y) => y.mean - x.mean);
  }

  /* Thompson sampling: draw from each angle's posterior, rank descending.
   * Returns top-`count` angle ids (balances proven winners vs exploration). */
  function sampleAngleRanking(banditState, segment, count) {
    const seg = ensureSegment(banditState, segment);
    const draws = ANGLES.map((a) => ({ angle: a, score: sampleBeta(seg[a].alpha, seg[a].beta) }));
    draws.sort((x, y) => y.score - x.score);
    const ranked = draws.map((d) => d.angle);
    return count ? ranked.slice(0, count) : ranked;
  }

  /* Bootstrap the bandit from historical interactions (seed replay). */
  function buildBanditFromInteractions(interactions) {
    const banditState = {};
    (interactions || []).forEach((it) => {
      const seg = it.segment || F.deriveSegment(it.customer);
      updateBandit(
        banditState, seg,
        it.pitch && it.pitch.anglesUsed,
        it.debrief && it.debrief.resonatedAngles,
        it.outcome ? it.outcome.converted : (it.debrief && it.debrief.converted)
      );
    });
    return banditState;
  }

  /* ----------------------------- k-NN retrieval --------------------------- */
  function kNN(customer, interactions, K) {
    const k = K || 12;
    const qv = F.vectorize(customer);
    const scored = (interactions || []).map((it) => ({
      interaction: it,
      similarity: F.similarity(qv, F.vectorize(it.customer)),
    }));
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, k);
  }

  /* Summarize what worked for similar customers. */
  function cohortSummary(neighbors) {
    const n = neighbors.length || 1;
    let converted = 0;
    const angleWins = {}, objections = {}, insurerWins = {};
    neighbors.forEach(({ interaction: it }) => {
      const conv = it.outcome ? it.outcome.converted : it.debrief.converted;
      if (conv) {
        converted++;
        (it.debrief.resonatedAngles || []).forEach((a) => (angleWins[a] = (angleWins[a] || 0) + 1));
        const ins = it.debrief.enrolledInsurer || it.targetInsurer;
        if (ins) insurerWins[ins] = (insurerWins[ins] || 0) + 1;
      }
      (it.debrief.objections || []).forEach((o) => {
        if (o !== "None") objections[o] = (objections[o] || 0) + 1;
      });
    });
    const sortDesc = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, count: v }));
    return {
      size: neighbors.length,
      conversionRate: converted / n,
      topAngles: sortDesc(angleWins),
      topObjections: sortDesc(objections),
      topInsurers: sortDesc(insurerWins),
    };
  }

  /* Recommend the best-converting insurer for a cohort (data-driven). */
  function suggestInsurer(neighbors) {
    const summary = cohortSummary(neighbors);
    return summary.topInsurers[0] ? summary.topInsurers[0].key : null;
  }

  /* ------------------- "Key Points to Focus On" synthesis ----------------- */
  function keyFocusPoints(customer, banditState, interactions, opts) {
    const segment = F.deriveSegment(customer);
    const neighbors = kNN(customer, interactions, (opts && opts.K) || 12);
    const cohort = cohortSummary(neighbors);
    const stats = banditStats(banditState, segment);

    const topAngles = stats.slice(0, 3);
    const focus = [];

    focus.push({
      type: "leadAngles",
      title: "Most likely tactics being used",
      detail: topAngles.map((s) => ANGLE_LABELS[s.angle]).join(" → "),
      evidence: topAngles.map((s) => ({
        angle: s.angle, winRate: +(s.mean * 100).toFixed(0), pulls: s.pulls,
      })),
    });

    if (cohort.topObjections.length) {
      focus.push({
        type: "objections",
        title: "Common consumer concerns for this segment",
        detail: cohort.topObjections.slice(0, 3).map((o) => o.key).join(", "),
        evidence: cohort.topObjections.slice(0, 3),
      });
    }

    if (cohort.topInsurers.length) {
      focus.push({
        type: "insurer",
        title: "Most commonly enrolled plan for this cohort",
        detail: cohort.topInsurers[0].key,
        evidence: cohort.topInsurers.slice(0, 3),
      });
    }

    focus.push({
      type: "cohort",
      title: "Similar consumer evidence",
      detail: `${neighbors.length} similar consumers · ${(cohort.conversionRate * 100).toFixed(0)}% enrolled`,
      evidence: { size: neighbors.length, conversionRate: cohort.conversionRate },
    });

    return { segment, cohort, banditStats: stats, focus, neighbors };
  }

  const api = {
    ANGLES, ANGLE_LABELS,
    sampleBeta,
    ensureSegment, updateBandit, banditStats, sampleAngleRanking,
    buildBanditFromInteractions,
    kNN, cohortSummary, suggestInsurer, keyFocusPoints,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PPLearn = api;
})(typeof window !== "undefined" ? window : globalThis);

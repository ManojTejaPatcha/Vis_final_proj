# PlanPilot — Decision Intelligence & Persuasion Defense
## Master Progress Tracker

**Single source of truth for build status.** Update the Status column after every work session.
Legend: ✅ Done · 🔄 In Progress · ⬜ Not Started · ⏸ Blocked

Last updated: **2026-06-25**

---

## 0. Build Order (high level)

| # | Milestone | Status | Notes |
|---|-----------|:---:|-------|
| A | Synthetic data (personas + pay structure) | ✅ | 6 persona agents + 100 seed interactions, realism verified |
| B | Data layer (`data-store.js`) | ✅ | localStorage/Memory backends, auto-seed, export/import |
| C | Learning engine (k-NN + bandit + logreg) | ✅ | Verified: 11/11 tests pass, bandit recovers signal, logreg 68% vs 40% baseline |
| D | Multi-page shell (landing + decoder + comparison) | ✅ | Landing page, pitch decoder, plan comparison all built with shared design system |
| E | Detection engine wired to learning | ✅ | Pitch decoder integrated with data-store, feature-engineering, learning-engine, ml-model; tactic detection from bandit, k-NN evidence, vulnerability scoring |
| F | Outcome logging + feedback loop | ✅ | Post-interaction outcome modal with enrollment, tactics felt, concerns; updates bandit state and retrains model |
| G | Detection analytics dashboard | ✅ | D3 visualizations: enrollment trend, vulnerability by segment, tactic heatmap, detection confidence, vulnerability factors; data controls (reseed/reset/export/import) |
| H | Project reframe: consumer protection | ✅ | All pages reframed from agent-sales tool to consumer-protection pitch decoder |
| I | UX overhaul: consumer empowerment layer | ✅ | Risk meter, best-plan banner, questions generator, tactic hints, annual cost headline, red warning styling, optional name field, cross-page CTA |
| J | Deploy to Netlify | ⬜ | Live link |

---

## 1. Detailed Task Status

### A. Synthetic Data
| Task | Status | File | Notes |
|------|:---:|------|-------|
| Persona "agents" defined (6 archetypes) | ✅ | `tools/generate_customers.js` | Realistic income & insurance type |
| Real pay-structure model | ✅ | same | SS / pension / employer / ACA / dual-eligible |
| Financial-burden → budget sensitivity | ✅ | same | copay ÷ income drives sensitivity |
| Pitch + outcome simulation w/ learnable signal | ✅ | same | latent angle-effectiveness + noise, seeds bandit + k-NN |
| Generate 100 records | ✅ | `data/seed_interactions.json` | output artifact (6470 lines) |
| Realism verification + stats | ✅ | this file §4 | distributions documented below |

**Regenerate command:** `node tools/generate_customers.js 100` (deterministic, seeded PRNG)

### B. Data Layer
| Task | Status | File | Notes |
|------|:---:|------|-------|
| Pluggable `DataStore` + backends | ✅ | `data-store.js` | LocalStorage (browser) + Memory (Node), auto-detect |
| Auto-seed from 100 interactions | ✅ | same | seeds only if empty; no duplication on re-init |
| CRUD + bandit/model persistence | ✅ | same | interactions, banditState, model, meta |
| export/import/reset/stats | ✅ | same | demo hygiene + dashboard counts |
| Supabase-ready interface | ✅ | same | single-file swap; schema in learning plan |

### C. Learning Engine
| Task | Status | File | Notes |
|------|:---:|------|-------|
| Feature vectorization (19 dims) | ✅ | `feature-engineering.js` | age, budget, conv, meds, conditions, region |
| Segment derivation (matches generator) | ✅ | same | `group|ageBucket|budget|conv` |
| k-NN cohort retrieval | ✅ | `learning-engine.js` | weighted Euclidean similarity |
| Thompson-Sampling bandit | ✅ | same | Beta posteriors per segment×angle, Gamma sampler |
| Bandit bootstrap from seed | ✅ | same | replays 100 interactions |
| Cohort summary + key focus points | ✅ | same | angles, objections, insurer, evidence |
| Logistic regression model | ✅ | `ml-model.js` | GD + L2 + standardization, feature importance |
| Verification harness | ✅ | `tools/test_learning.js` | **11/11 pass** |

**Verified results:** bandit recovers latent signal (high-budget→anchoring/framing top-3; low-budget→authority/default/socialProof); logreg train acc **68%** vs **40%** baseline; k-NN + focus points coherent. Run: `node tools/test_learning.js`

### D–H
See `.windsurf/plans/planpilot-learning-engine-01e439.md` and `planpilot-multipage-deploy-01e439.md` for full phase detail.

---

## 2. Customer Intake Questions (asked by admin during/before pitch)

These map directly to features used by the learning engine. Grouped by purpose.

### 2.1 Identity & Demographics
1. **Full name?** *(personalization in pitch)*
2. **Age?** → derives `ageBucket` (young <50, midlife 50–64, senior 65+)
3. **State of residence?** → derives `region` (Northeast/South/Midwest/West)

### 2.2 Health Profile (drives drug needs)
4. **Which conditions are you managing?** *(multi-select)*
   - Type 2 Diabetes · Weight Management · Heart Failure · Atrial Fibrillation · DVT/PE
5. **Which medications are you currently taking or were prescribed?** *(multi-select; auto-suggested from conditions)*
   - Ozempic · Trulicity · Jardiance · Eliquis · Xarelto
6. **How long have you been on these medications?** *(new / <1yr / 1yr+)* → status-quo/loyalty signal
7. **Any previous medications you switched away from, and why?** *(free text)* → objection/loyalty signal

### 2.3 Financial Profile (drives budget sensitivity — REALISTIC PAY STRUCTURE)
8. **What is your primary source of income?**
   - Social Security only · Social Security + pension · Employment/salary · Investments/savings · Disability · Medicaid-assisted
9. **Approximate annual household income?** *(bracket select)*
   - <$20k · $20–35k · $35–55k · $55–80k · $80–120k · $120k+
10. **What type of insurance do you currently have?**
    - Medicare Part D · Medicare Advantage · Employer-sponsored · ACA Marketplace · Dual-eligible (Medicare+Medicaid) · Uninsured
11. **Roughly how much can you comfortably spend on medications per month?** → `maxAffordableCopay`

### 2.4 Preferences (drives angle selection)
12. **Do you prefer mail-order delivery or in-person pharmacy pickup?** → `valuesConvenience`
13. **How important is keeping your current doctor / pharmacy network?** *(1–5)*
14. **When making decisions, are you more price-driven or convenience-driven?** → tie-breaker for budget sensitivity

> Derived (not asked): `budgetSensitivity` = f(income, maxAffordableCopay, financialBurdenRatio), `segment` key, `featureVector`.

---

## 3. Post-Interaction Debrief Questions (admin answers AFTER the pitch)

These generate the training labels that make the system learn. Fast to fill (chips/sliders).

### 3.1 Outcome (the reward signal)
1. **Did the customer enroll in the recommended plan?** *(Yes / No / Undecided-followup)* → `converted` (reward)
2. **If yes — did they take the target insurer or a different one?** *(target / switched to ___)*

### 3.2 What Happened (drives angle effectiveness)
3. **Which talking points clearly resonated?** *(multi-select of the angles used)* → boosts those angles' posteriors
4. **Which objections did the customer raise?** *(multi-select)*
   - Too expensive · Don't trust insurer · Too complicated · Loyal to current plan · Doubts coverage · Wants spouse/family input · None
5. **How price-sensitive did they seem?** *(1–5 slider)* → refines segment + logreg feature
6. **How quickly did they decide?** *(instant / deliberate / needs follow-up)*
7. **Did they mention a competitor plan?** *(none / which one)*

### 3.3 Admin Notes
8. **Free-text notes** *(anything the model should "see" next time — optional)*

> On submit → updates bandit Beta(α,β) for each angle used, appends to k-NN store, triggers logreg retrain check, regenerates "Key Points to Focus On" for similar future customers.

---

## 4. Synthetic Data Realism Notes (to be filled after generation)

| Metric | Target (real-world) | Generated | Status |
|--------|--------------------|-----------|:---:|
| Median age | ~68 (Medicare-skewed) | **70** | ✅ |
| Income <$35k share | ~35-45% | **36%** | ✅ |
| Median income | ~$50k (65+ household) | **$55,093** | ✅ |
| Avg financial-burden ratio | 3–8% of income on drugs | **3.3%** | ✅ |
| Overall conversion rate | 35–55% (sales realistic) | **40.0%** | ✅ |
| Insurance-type mix | Medicare-dominant | **70% Medicare** (43 Part D + 27 Advantage) | ✅ |
| Distinct learning segments | enough for bandit/k-NN | **21 segments** | ✅ |

**Persona mix (of 100):** fixed-income senior 28 · comfortable retiree 27 · affluent retiree 15 · working mid-life 14 · marketplace mid-life 10 · dual-eligible 6

**Each record contains:** identity, demographics, conditions+meds, full financial structure (income source, bracket, insurance type, monthly/annual drug cost, max affordable copay, burden ratio), derived segment, target insurer, pitch (angles used + predicted conversion), admin debrief (converted, resonated angles, objections, price concern, decision speed, competitor), and outcome reward.

---

## 5. Open Decisions / Parking Lot
- Supabase upgrade: deferred (localStorage first). Schema documented in learning plan.
- LLM-generated narratives: deferred (template + learned-evidence narratives first).
- Real auth for admin portal: deferred (demo uses a simple mode toggle).

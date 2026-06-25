# PlanPilot — Decision Intelligence & Persuasion Defense

> *"The agent is not your advisor. They are a salesperson with a quota. PlanPilot gives you the same analytical firepower they have — turned around to protect you."*

**PlanPilot** is a 100% client-side web application that detects, decodes, and reverse-engineers the psychological manipulation tactics used by health insurance sales agents — in real time, during the pitch, with zero data leaving your device.

It began as an academic data visualization project and evolved into something more ambitious: a consumer protection engine that uses the same Machine Learning tools the sales industry deploys against consumers, but repurposed entirely in the consumer's defense.

---

## Table of Contents

1. [The Problem — The Architecture of a Scam](#1-the-problem)
2. [The Pivot — From Sales Tool to Shield](#2-the-pivot)
3. [Design Principles](#3-design-principles)
4. [Psychology Research — Seven Tactics, Documented](#4-psychology-research)
5. [ML Architecture — Three Models Running in Your Browser](#5-ml-architecture)
6. [Data Engineering — Building a Synthetic Population](#6-data-engineering)
7. [Application Architecture](#7-application-architecture)
8. [Pages & Features](#8-pages--features)
9. [The Test Suite — 50 AI Personas](#9-the-test-suite)
10. [Quick Start](#10-quick-start)
11. [Security — API Keys & Environment Variables](#11-security)
12. [File Structure](#12-file-structure)
13. [Data Sources](#13-data-sources)

---

## 1. The Problem

Medicare Part D covers over **50 million** Americans. The average beneficiary faces a choice between dozens of insurance plans, each with different formularies, copays, prior authorization requirements, and step therapy restrictions. Most people rely on a sales agent to navigate this.

That agent has a commission.

Insurance sales organizations train their agents in systematic behavioral psychology. This is not speculation — it is documented in sales playbooks, CMS compliance filings, and academic research on high-pressure financial sales. The tactics are drawn directly from Robert Cialdini's *Influence*, Daniel Kahneman's *Thinking, Fast and Slow*, and behavioral economics research on asymmetric dominance, loss aversion, and the anchoring effect.

The result: a retired 68-year-old on a fixed income, during a 20-minute phone call, is steered toward a plan that costs them **$300–$1,200/yr more** than the market-best alternative for their specific medication — before they ever knew a better option existed.

**PlanPilot exists to close that information gap.**

---

## 2. The Pivot

This project began as a standard D3.js drug cost visualization dashboard. During research into insurance pricing data (CMS Part D PUF 2023), it became clear that the more important problem was not *displaying* the data — it was helping real people *use* it in the moment when they needed it most: mid-pitch.

The ML models being built to predict consumer behavior (for a sales context) were re-examined. The insight was precise:

> **Every model that predicts "will this tactic work on this consumer" can be inverted to tell the consumer: "this tactic is probably being used on you right now."**

The codebase was pivoted from a sales-enablement tool to a consumer defense tool. The Logistic Regression model that predicted conversion probability became a **Vulnerability Score**. The Contextual Bandit that ranked sales angles became a **Tactic Detector**. The k-NN model that found similar buyers became a **Peer Truth Engine**.

Nothing in the math changed. Only the direction it points.

---

## 3. Design Principles

Every architectural and UX decision in PlanPilot is grounded in a specific principle. These are not aesthetic choices — they are defenses.

### 3.1 Data Before Emotion
Insurance sales pitches are engineered to lead with fear (medical debt horror stories) and only introduce data later, after the emotional state has been set. PlanPilot inverts this: the **verdict banner** — a hard numerical judgment in green, amber, or red — is the *first* thing rendered. Dollar amounts before narrative. Always.

### 3.2 Zero Backend, Total Privacy
A consumer protection tool that transmits your medical conditions and financial profile to a server is a liability, not a shield. Every computation in PlanPilot — ML training, inference, feature engineering, recommendation generation — runs inside a single browser tab. No API calls for core functionality. No accounts. No profiles stored off-device. The code is auditable by anyone.

### 3.3 The Escape Hatch Must Be Visible
One of the most effective sales tactics is the **Default Effect** — making the status quo (the pitched plan) feel like the path of least resistance. Every result page in PlanPilot includes a prominent, always-visible alternative: the market-best option for your specific drug, with its copay and savings calculated. The agent's plan is never the only option on screen.

### 3.4 Plain Language as a First-Class Feature
Technical accuracy is useless if the person reading it is a 72-year-old on the phone with an agent. Every tactic card, warning label, and vulnerability explanation is written in plain, actionable language. "Anchoring detected" becomes "The agent is comparing this plan to having no insurance at all. The real comparison is $X/month." The user gets a script, not a lecture.

### 3.5 Quick Mode — Minimum Viable Defense
A consumer mid-pitch doesn't have 10 minutes to fill a form. **Quick Mode** reduces the entire intake to three fields: the plan being pitched, the drug they need, and their budget posture (Tight / Moderate / Flexible). This is enough to run the analysis. The detailed mode exists for accuracy; Quick Mode exists for urgency.

### 3.6 Transparency Over Black-Box Authority
The vulnerability score and tactic confidence percentages are accompanied by plain-English explanations of exactly which data points drove them. "Score elevated by: price-sensitive profile; 70+ age cohort; high-cost medication." The user understands why they're at risk, not just that they are.

### 3.7 The Counterfactual Is the Product
It is not enough to say "this plan is expensive." The product only matters if it answers: *compared to what?* Every recommendation includes a three-column comparison table (Best Option / Pitched Plan / Higher-Cost Option shown for context), annual cost rows, prior authorization status, and step therapy requirements. The agent's plan is always benchmarked against the real market.

---

## 4. Psychology Research

PlanPilot detects seven psychological manipulation tactics, each grounded in documented behavioral economics research.

### Anchoring Effect
*(Tversky & Kahneman, 1974)*

The first number presented sets a cognitive anchor against which all subsequent numbers are evaluated. Agents present the cost of having "no insurance" ($10,800/yr) before revealing the plan cost ($2,400/yr). The plan feels like an 78% discount. It may actually be $1,200/yr above the market average.

**How PlanPilot detects it:** Compares the pitched plan's annual cost against the dataset-wide minimum for that drug. Flags when the gap exceeds a significance threshold. Shows the real benchmark, not the fake one.

---

### Loss Aversion & Fear Framing
*(Kahneman & Tversky, 1979 — Prospect Theory)*

People feel losses approximately twice as intensely as equivalent gains. Sales scripts exploit this by framing non-enrollment as active financial destruction: "Every month you wait costs you $900 out-of-pocket." The consumer is not presented with an opportunity — they are presented with a ticking clock.

**How PlanPilot detects it:** Identifies emotionally-loaded framing patterns and strips away the language to show the actual daily and annual cost in neutral terms, compared against alternatives.

---

### Framing Effect — Daily Cost Illusion
*(Thaler, 1980 — Mental Accounting)*

Breaking an annual cost into a daily micro-amount exploits mental accounting: "$3.87/day" parses as trivially small. "$1,412/year" activates different cognitive circuitry. Sales training manuals explicitly teach agents to quote daily costs when selling to price-sensitive demographics.

**How PlanPilot detects it:** Recomputes the true annual out-of-pocket and displays it prominently in the hero card. The micro-commitment framing is surfaced and named.

---

### Misleading Social Proof
*(Cialdini, 1984 — Influence)*

"18% of Medicare patients chose this plan" is a population-wide statistic. It says nothing about whether people with *your specific medications, conditions, and income* chose this plan. Agents use broad social proof precisely because it sounds personal while being deliberately generic.

**How PlanPilot detects it:** The k-NN model retrieves the 5 most similar consumer profiles from the interaction history (matched on age bracket, condition group, medications, and budget sensitivity). The cohort's actual behavior — what people like you actually paid and whether they switched — is shown instead of the agent's generic statistic.

---

### The Decoy Effect (Asymmetric Dominance)
*(Huber, Payne & Puto, 1982)*

When an agent wants to sell Plan B, they present Plan A (terrible coverage at low cost) and Plan C (identical coverage to B but significantly more expensive). Plan B is now the "obviously correct middle choice." Plan C exists solely to make B look reasonable. It is never meant to be purchased.

**How PlanPilot detects it:** The comparison table surfaces the market-best plan (which is often hidden during the pitch) alongside the pitched plan. The "Higher-Cost Option" column is explicitly labeled as shown for comparison only — neutralizing the decoy psychology that a third option creates.

---

### Default Effect (Status-Quo Bias)
*(Samuelson & Zeckhauser, 1988)*

People strongly prefer maintaining the current state. Agents position the pitched plan as the "standard" or "natural" choice for the consumer's profile — not as one option among many, but as the default. The consumer is led to feel that choosing anything else requires active, effortful deviation.

**How PlanPilot detects it:** The analysis always presents an explicit alternative with a direct CTA to switch. The pitched plan is never framed as default; it is always framed as the plan being evaluated against the market.

---

### Authority Bias
*(Milgram, 1963 — Obedience to Authority; adapted to commercial context)*

"CMS gave this plan a 4.5-star rating" — this statement is true, useful, and often irrelevant. Star ratings are composite scores across all plan dimensions, many of which have nothing to do with your specific medications. Agents weaponize legitimate credentials to bypass critical evaluation.

**How PlanPilot detects it:** Prior authorization and step therapy data is surfaced directly for the specific drug being analyzed. A 4.5-star plan that requires step therapy for Trulicity is surfaced with the warning that access to that drug may be delayed by weeks, regardless of the star rating.

---

## 5. ML Architecture

Three models run entirely in the browser. No server. No API calls for core inference. No data leaves the device.

```
Consumer Profile
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  feature-engineering.js                                     │
│  ─────────────────────                                      │
│  19-dimensional feature vector                              │
│  [age_norm, budget_ordinal, values_convenience,             │
│   num_meds_norm, on_meds_long,                              │
│   cond:Diabetes × 5, med:ozempic × 5, region × 4]          │
│                                                             │
│  Segment key: {conditionGroup}|{ageBucket}|{budget}|{conv}  │
│  → 21 distinct segments in training data                    │
└───────────────┬─────────────────────────────────────────────┘
                │
        ┌───────┴──────────┐
        │                  │
        ▼                  ▼
┌──────────────┐   ┌───────────────────────────────────────┐
│   Model 2    │   │            Model 1                    │
│    k-NN      │   │   Thompson Sampling Contextual Bandit │
│  (k = 5)     │   │                                       │
│              │   │  Beta(α, β) posterior per             │
│  Weighted    │   │  segment × angle (7 tactics × 21      │
│  Euclidean   │   │  segments = 147 independent arms)     │
│  distance    │   │                                       │
│  over 19     │   │  Marsaglia-Tsang Gamma sampler        │
│  features    │   │  → true Thompson sampling             │
│              │   │  (not ε-greedy)                       │
└──────┬───────┘   └──────────────────┬────────────────────┘
       │                              │
       ▼                              ▼
  Cohort truth                 Tactic confidence
  (what similar               scores (0–100%)
  consumers paid)             per detected angle
       │                              │
       └──────────────┬───────────────┘
                      │
                      ▼
             ┌─────────────────┐
             │    Model 3      │
             │ Logistic Reg.   │
             │                 │
             │ GD + L2 + std.  │
             │ lr=0.01, 100 it │
             │                 │
             │ → Vulnerability │
             │   Score (0–100%)│
             └─────────────────┘
```

### Model 1 — Thompson Sampling Contextual Bandit

**File:** `learning-engine.js`

Maintains a Beta(α, β) belief distribution over each of the 7 psychological tactics for each consumer segment. α increments when a tactic succeeds in converting a consumer; β increments when they resist. Thompson sampling draws from each Beta distribution and ranks tactics by the sample — this naturally balances exploration (trying tactics with high uncertainty) against exploitation (leading with tactics that have proven effective) without the sharp cutoffs of ε-greedy.

*Verified behavior:* High-budget segments surface anchoring and framing in top-3. Low-budget segments surface authority bias and default effect — consistent with the latent signal embedded in synthetic training data.

### Model 2 — k-Nearest Neighbors Cohort

**File:** `learning-engine.js` + `feature-engineering.js`

Encodes the consumer's profile as a 19-dimensional feature vector. Retrieves k=5 most similar historical consumers using weighted Euclidean distance — condition and medication features carry 1.1–1.2× weight because they are the strongest predictors of drug-cost outcomes. Demographic features (age, region) carry lower weight (0.3–0.6×).

The cohort summary reports: conversion rate among similar consumers, their most-resonated tactics, their most common objections, and what insurer they actually ended up with. This is the data that defeats the agent's generic social proof claim.

### Model 3 — Logistic Regression

**File:** `ml-model.js`

Trains on all historical interaction outcomes (converted / resisted) using gradient descent with L2 regularization and feature standardization. Runs 100 iterations at learning rate 0.01 on every page load. Outputs a vulnerability probability (0–1) that is displayed as the Vulnerability Score.

*Verified performance:* **68% accuracy** on held-out synthetic data vs. **40% baseline** (majority class). The model learns that high budget sensitivity, 70+ age cohort, multiple high-cost medications, and convenience preference are the strongest predictors of susceptibility to sales tactics.

---

## 6. Data Engineering

### Synthetic Consumer Population

**File:** `tools/generate_customers.js` | **Output:** `data/seed_interactions.json`

Real consumer data for testing a persuasion detection system is not available and cannot be ethically collected. The training data is therefore synthetic — but rigorously calibrated against real-world distributions.

**Six consumer archetypes** model the actual Medicare demographics:

| Archetype | Income Source | Insurance Type | Share |
|---|---|---|---|
| Fixed-income senior | Social Security only | Medicare Part D | 28% |
| Comfortable retiree | SS + pension | Medicare Advantage | 27% |
| Affluent retiree | Investments | Medicare Advantage | 15% |
| Working mid-life | Employer/salary | Employer-sponsored | 14% |
| Marketplace mid-life | Salary (ACA bracket) | ACA Marketplace | 10% |
| Dual-eligible | SS + Medicaid | Dual-eligible | 6% |

**Realism verification against CMS/OECD benchmarks:**

| Metric | Real-World Target | Generated | Status |
|---|---|---|---|
| Median age | ~68 (Medicare-skewed) | **70** | ✅ |
| Income < $35k share | 35–45% | **36%** | ✅ |
| Median household income | ~$50k (65+) | **$55,093** | ✅ |
| Drug cost as % of income | 3–8% | **3.3%** | ✅ |
| Overall conversion rate | 35–55% (sales realistic) | **40.0%** | ✅ |
| Medicare plan mix | Medicare-dominant | **70%** (43 Part D + 27 Advantage) | ✅ |
| Distinct learning segments | Enough for bandit + k-NN | **21 segments** | ✅ |

Each of the 100 seed records contains: full identity and demographics, conditions and medications, complete financial structure (income source, bracket, insurance type, monthly drug cost, max affordable copay, financial burden ratio), derived segment, target insurer, pitch simulation (which tactics were used, predicted conversion), admin debrief (converted, resonated angles, objections, decision speed, competitor mentioned), and the outcome reward signal.

**Regenerate deterministically:** `node tools/generate_customers.js 100`

### Insurer Pricing Data

**File:** `final/insurer_pricing.json` | 40 records: 5 drugs × 8 insurers

| Drug | Generic Name | Class |
|---|---|---|
| Ozempic | Semaglutide | GLP-1 receptor agonist |
| Trulicity | Dulaglutide | GLP-1 receptor agonist |
| Jardiance | Empagliflozin | SGLT-2 inhibitor |
| Eliquis | Apixaban | Factor Xa anticoagulant |
| Xarelto | Rivaroxaban | Factor Xa anticoagulant |

Each pricing record includes: `patient_copay` (monthly), `prior_auth_required`, `step_therapy`, `mail_order_available`, `network_size`, `market_share`. Values are calibrated to CMS Part D PUF 2023 ordering-of-magnitude data and OECD pharmaceutical spending statistics.

*Notable finding from the data:* **All 8 insurers require prior authorization for all 5 drugs.** Step therapy requirements vary significantly and are the most impactful hidden cost — a plan requiring step therapy for a GLP-1 drug like Trulicity can delay access by 2–6 weeks while the patient is forced to try alternative medications that may be less effective for their specific physiology.

---

## 7. Application Architecture

```
PlanPilot — No Backend. No Framework. No Compromises.

┌────────────────────────────────────────────────────────────────┐
│                        BROWSER TAB                            │
│                                                                │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐ │
│  │index.html│  │ admin.html   │  │customer   │  │learning  │ │
│  │ Landing  │  │Pitch Decoder │  │  .html    │  │  .html   │ │
│  └────┬─────┘  └──────┬───────┘  │Plan Comp. │  │Analytics │ │
│       │               │          └─────┬─────┘  └────┬─────┘ │
│       │          admin.js              │         learning.js  │
│       │          ├─ form state         │         └─ D3 charts  │
│       │          ├─ validateForm()     │                       │
│       │          ├─ generateRecom()    │                       │
│       │          └─ renderResult()     │                       │
│       │               │               │                       │
│       │    ┌──────────▼──────────┐     │                       │
│       │    │   Learning Engine   │     │                       │
│       │    │  learning-engine.js │     │                       │
│       │    │  ├─ kNN()           │     │                       │
│       │    │  ├─ banditStats()   │     │                       │
│       │    │  └─ sampleAngle()   │     │                       │
│       │    └──────────┬──────────┘     │                       │
│       │               │               │                       │
│       │    ┌──────────▼──────────┐     │                       │
│       │    │ Feature Engineering │     │                       │
│       │    │ feature-engine.js   │     │                       │
│       │    │ └─ vectorize()      │     │                       │
│       │    └──────────┬──────────┘     │                       │
│       │               │               │                       │
│       │    ┌──────────▼──────────┐     │                       │
│       │    │    ML Model         │     │                       │
│       │    │    ml-model.js      │     │                       │
│       │    │    └─ predict()     │     │                       │
│       │    └──────────┬──────────┘     │                       │
│       │               │               │                       │
│       │    ┌──────────▼──────────┐     │                       │
│       │    │    Data Store       │     │                       │
│       │    │    data-store.js    │     │                       │
│       │    │    └─ localStorage  │─────┘                       │
│       │    └─────────────────────┘                             │
│       │            planpilot_context ──────────► customer.html  │
│       │            planpilot_interactions                       │
│       │            planpilot_ml_params                         │
└───────────────────────────────────────────────────────────────┘
```

**Design decision — no build step, no transpilation:** Every file is vanilla ES5/ES6 JavaScript loaded via `<script>` tags. This is intentional. The application is auditable by anyone with browser DevTools. There is no webpack bundle obscuring what runs. Deployed by simply serving static files.

---

## 8. Pages & Features

### `index.html` — Landing Page
Consumer-facing entry point. Explains the persuasion defense mission in plain language. Three sections: how the tool works in 3 steps, what you'll see in your results (verdict, hidden requirements, scripts to use), and a privacy guarantee. Technical documentation is intentionally moved to `devdocs.html`.

### `admin.html` — Pitch Decoder
The core product. A dark sidebar (input zone) + light main area (results zone).

**Quick Mode (⚡):** Three fields — plan, drug, budget posture. Runs in under 30 seconds.
**Full Profile Mode:** Age, state, conditions, medications, budget sensitivity, convenience preference. Enables k-NN and logistic regression features.

**Output dashboard:**
- **Verdict banner** — full-width red/amber/green with dollar savings and direct CTA
- **Hidden Requirements card** — prior auth and step therapy warnings with plain-English impact
- **3-column comparison table** — Best Option vs. Pitched Plan vs. Higher-Cost Option
- **Tactic cards** — up to 4 detected manipulation tactics with confidence scores and "What to say back" reply scripts
- **Vulnerability score** — risk meter with plain-English explanation of which profile factors elevated the score
- **Questions to ask** — generated from detected tactics, ready to use mid-call
- **Save Report** — `window.print()` to PDF, printer-friendly stylesheet included
- **Debrief modal** — logs outcome and updates ML models for future analyses

### `customer.html` — Plan Comparison
9 interactive D3.js charts showing drug cost data across all insurers, regions, and years. **Gated behind an analysis prompt** — users who have run a Pitch Decoder analysis are shown a context-aware prompt with their drug and savings pre-populated; users arriving cold are prompted to run an analysis first. Context from the Pitch Decoder carries over via `localStorage`, auto-selecting the drug and showing savings prominently.

**Charts:** US cost choropleth (4 regions), spending stream (2019–2023), parallel coordinates (5 drugs × 5 axes), best insurance plans bar chart, "What will I pay?" lollipop + trend panel, spending share donut, treemap (drug × region), cost vs. beneficiaries scatter, SPLOM (3-dimension scatterplot matrix).

### `learning.html` — Detection Analytics
D3 dashboards for understanding how the ML models are learning over time. Shows enrollment trend, vulnerability distribution by segment, tactic heatmap (which tactics appear most in which segments), detection confidence evolution, and vulnerability factor breakdown. Includes data controls: reseed from synthetic data, reset all interactions, export/import interaction history as JSON.

### `devdocs.html` — For Developers
Technical documentation: ML model specifications, file architecture table, `insurer_pricing.json` schema with field-level documentation, annotated JSON example, localStorage key reference.

---

## 9. The Test Suite

**Location:** `tests/` | 50 personas × up to 14 deterministic assertions + 1 Gemini qualitative assessment = **573 assertions** across the full run.

The test suite uses **Playwright** (browser automation) to simulate real consumer sessions and **Gemini 2.5 Flash** to evaluate whether the analysis output would actually help a person in that demographic.

### Persona Categories

| Category | Count | What it tests |
|---|---|---|
| **A — Standard** | 12 | All 5 drugs, varied demographics, happy-path flows |
| **B — Step Therapy Traps** | 7 | Humana/Ozempic, Kaiser/Ozempic, BCBS/Jardiance, Aetna/Jardiance, CVS/Jardiance, Cigna/Trulicity, Kaiser/Trulicity — verifies Hidden Req card appears |
| **C — Cheapest Plan** | 5 | When the pitched plan IS the best — tests safe verdict, $0 savings, no overpay warning |
| **D — Maximum Overpay** | 5 | Highest possible copay combos — tests danger verdict, $NaN-free cost rows |
| **E — Quick Mode** | 4 | 3-field input only, budget button flow, no age/state validation applied |
| **F — Cross-Page** | 3 | Generates analysis → navigates to customer.html → verifies context banner + drug auto-selection |
| **G — Edge Cases** | 14 | Age 90, dementia proxy caregiver, ESRD at 55, no primaryMed, geographic mismatch, mail-order conflict |

### Deterministic Assertions Per Persona (up to 14)

```
✓ Dashboard renders after analysis (not still showing empty state)
✓ Verdict banner is visible
✓ Verdict tier matches expected (safe / warning / danger)
✓ Prior auth warning shown
✓ Step therapy warning shown (correct combos only)
✓ Tactic cards rendered (≥ 1)
✓ "What to say back" text present on tactic cards
✓ Vulnerability explanation text present
✓ Annual cost rows populated — no $NaN
✓ Copay cells populated — no $NaN
✓ Save Report button visible
✓ No error state displayed
✓ Context banner visible on customer.html (Category F)
✓ Correct drug pill auto-selected (Category F)
```

### Gemini Qualitative Assessment

After each persona completes all deterministic assertions, the Pitch Decoder's rendered output is sent to **Gemini 2.5 Flash** with two prompts:
1. *In character as this persona* — does the analysis make sense to you? Would you trust it?
2. *As a UX assessor* — rate the clarity, actionability, and completeness of the output on a 1–5 scale.

This catches failures that deterministic DOM checks cannot: a tactic card with correct structure but incoherent text, a vulnerability explanation that contradicts the persona's profile, or a verdict that is technically present but says nothing useful.

### Running the Suite

```bash
# Install (from tests/)
cd tests && npm install && npx playwright install chromium

# Serve the app (from final/)
python3 -m http.server 8766

# Run all 50 personas (new terminal, from tests/)
GEMINI_API_KEY=your_key_here node agent-runner.js --all

# Run a single persona
GEMINI_API_KEY=your_key_here node agent-runner.js --persona P13

# Run a category
GEMINI_API_KEY=your_key_here node agent-runner.js --category B

# Watch mode (shows browser windows)
GEMINI_API_KEY=your_key_here HEADLESS=false node agent-runner.js --persona P01
```

Reports are written to `tests/reports/report-<timestamp>.html` with per-persona assertion tables, expandable Gemini responses, and screenshots.

---

## 10. Quick Start

### Run the application

```bash
# From the final/ directory
python3 -m http.server 8766
# Open http://localhost:8766
```

No build step. No npm install. No environment variables needed for the core app.

### Use the Pitch Decoder

1. Open `http://localhost:8766/admin.html`
2. Select the insurer being pitched to you
3. Select your medication (Quick Mode: just these 3 fields + budget)
4. Click **Analyze This Pitch**
5. Read the verdict banner first — it tells you immediately if you're overpaying and by how much
6. Check the Hidden Requirements card — prior auth and step therapy are almost never mentioned during the pitch
7. Use the tactic cards and "What to say back" scripts during your call

---

## 11. Security

### API Key Status: ✅ Safe

The Gemini API key is used **only by the Playwright test suite** — not by the application itself. The application is 100% client-side with no external API calls.

The key is passed exclusively as a **shell environment variable at runtime**:

```bash
GEMINI_API_KEY=your_key_here node agent-runner.js
```

It is read in code as `process.env.GEMINI_API_KEY`. If the variable is not set, the runner exits with a clear error before any browser opens. **The key is never written to any file. It is never committed. It has no default value in the source code.**

**What is safe to commit:**

| Item | Safe? | Why |
|---|---|---|
| `final/` — all app source | ✅ | No credentials, no secrets |
| `tests/agent-runner.js` | ✅ | Reads key from env, never stores it |
| `tests/reports/` | ⚠️ | Reports contain rendered HTML but no keys; exclude if they contain PII |
| `.env` files | ❌ | Covered by `.gitignore` — never commit |
| `final/node_modules/` | ❌ | Covered by `.gitignore` |

**`.gitignore` covers:** `node_modules/`, `.env`, `.env.*`, `.env.local`, `.env.production`, `.DS_Store`, `*.log`

---

## 12. File Structure

```
Final Proj/
│
├── README.md                      ← You are here
├── .gitignore
│
└── final/                         ← The application
    ├── index.html                 ← Landing page (consumer-facing)
    ├── admin.html                 ← Pitch Decoder (core product)
    ├── customer.html              ← Plan Comparison (gated D3 dashboards)
    ├── learning.html              ← Detection Analytics (ML monitoring)
    ├── devdocs.html               ← Technical documentation (For Dev tab)
    │
    ├── shared.css                 ← Design tokens, nav, utility classes
    ├── landing.css                ← Landing page styles
    ├── admin.css                  ← Pitch Decoder styles + @media print
    ├── style.css                  ← Plan Comparison chart styles
    ├── learning.css               ← Analytics dashboard styles
    │
    ├── nav.js                     ← Shared navigation (injected via data-nav attr)
    ├── admin.js                   ← Pitch Decoder logic (53 KB — the engine)
    ├── app.js                     ← 9 D3 charts for Plan Comparison (82 KB)
    ├── learning.js                ← D3 charts for Detection Analytics
    │
    ├── feature-engineering.js     ← 19-dim feature vectorization + segmentation
    ├── learning-engine.js         ← k-NN cohort + Thompson Sampling bandit
    ├── ml-model.js                ← Logistic Regression (GD + L2 + standardization)
    ├── data-store.js              ← localStorage CRUD + auto-seed + export/import
    │
    ├── insurer_pricing.json       ← 40 records: 5 drugs × 8 insurers
    ├── package.json               ← Node deps for the app (minimal)
    │
    ├── data/
    │   └── seed_interactions.json ← 100 synthetic training records (6,470 lines)
    │
    └── tools/
        ├── generate_customers.js  ← Synthetic population generator (deterministic)
        └── test_learning.js       ← Learning engine verification (11/11 pass)

tests/
├── README.md
├── package.json                   ← Playwright + @google/generative-ai
├── agent-runner.js                ← 50-persona test runner
├── personas.js                    ← Persona definitions (A–G categories)
└── reports/
    └── report-<timestamp>.html    ← Generated HTML test reports
```

---

## 13. Data Sources

| Dataset | Source | Usage |
|---|---|---|
| CMS Medicare Part D PUF 2023 | [data.cms.gov](https://data.cms.gov) | Drug spending benchmarks, beneficiary counts, cost-per-claim baselines |
| OECD Health Statistics | [stats.oecd.org](https://stats.oecd.org) | International pharmaceutical spending per capita for Plan Comparison choropleth |
| Insurer pricing (`insurer_pricing.json`) | Calibrated synthetic — CMS Part D PUF order-of-magnitude | Per-drug copay, prior auth, step therapy, mail order, network size |
| Seed interactions (`seed_interactions.json`) | Fully synthetic (deterministic PRNG) | ML training data — calibrated against CMS demographic benchmarks |

**A note on synthetic data:** The insurer pricing and interaction records are not scraped from or licensed from any insurer. They are constructed to reflect realistic order-of-magnitude cost relationships documented in CMS public data, for the purposes of demonstrating the detection algorithms. They are not suitable for making actual insurance purchasing decisions.

---

> *Built with D3.js v7 · Vanilla JS · No backend · No framework · Total privacy*
>
> *Data: CMS Part D PUF 2023 · OECD Health Statistics*
>
> *Test suite: Playwright + Gemini 2.5 Flash · 50 personas · 573 assertions*

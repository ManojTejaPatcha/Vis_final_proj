# PlanPilot: Persuasion Defense & Decision Intelligence Engine

## Project Transformation Plan

**From:** Admin-facing persuasion engine that helps sales agents push target insurance plans  
**To:** Consumer protection tool ("The Pitch Decoder") that detects, exposes, and reverse-engineers psychological manipulation tactics used by insurance agents, while revealing the objectively best plan.

**Date:** June 20, 2026  
**Stack:** HTML + D3.js v7 + Vanilla JS (no backend, no frameworks, 100% client-side ML)

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Target Vision: The Pitch Decoder](#2-target-vision)
3. [Reverse-Engineering Psychology Principles](#3-reverse-engineering-psychology-principles)
4. [Data Architecture Changes](#4-data-architecture-changes)
5. [Implementation Phases](#5-implementation-phases)
6. [Testing Checklist](#6-testing-checklist)

---

## 1. Current State Audit

### What Exists

| Component | File | Description |
|-----------|------|-------------|
| Dashboard UI | `index.html` | 3 rows × 3 columns of chart cards, KPI bar, drug pills |
| All chart logic | `app.js` (1967 lines) | 9 charts: geo map, stream, parallel coords, plans bar, lollipop, donut, treemap, scatter, SPLOM |
| Styling | `style.css` (200 lines) | CSS variables, grid layout, card system, tooltips |
| Insurer pricing | `insurer_pricing.json` (602 lines) | 40 entries: 5 drugs × 8 insurers with copay, tier, mail order, prior auth, step therapy |
| Machine Learning | `learning-engine.js` | Contextual Bandit, k-NN, Logistic Regression |

### The Pivot Requirement
The ML models and data structures are mathematically sound, but their *purpose* must be inverted. Instead of generating a pitch to manipulate a consumer, they must decode a pitch to protect the consumer. 

---

## 2. Target Vision: The Pitch Decoder

### User Flow

```
CONSUMER DEFENSE MODE
    │
    ├─ Step A: Consumer inputs the plan they are CURRENTLY BEING PITCHED (e.g., "Humana")
    │
    ├─ Step B: Consumer enters their own data
    │          - Name, Age, State
    │          - Medical Conditions
    │          - Current Medications
    │
    ├─ Step C: Click "Decode This Pitch"
    │
    └─ Step D: Dashboard transforms into Split-Screen:
              - LEFT (The Pitch): Reconstructs what the agent is likely telling them
              - RIGHT (The Truth): The objective data exposing the manipulation
              - TACTICS DETECTED: Alerts for Decoy Effect, Anchoring, etc.
              - REAL RECOMMENDATION: "Here is the plan you actually need."
```

### Two Modes
1. **The Objective Truth (`admin.html`)** — Neutral comparison, ranking plans purely on math and coverage.
2. **The Pitch Decoder (`decoder.html`)** — Consumer protection view that analyzes a specific plan being pushed on the user.

---

## 3. Reverse-Engineering Psychology Principles

The system must detect the following tactics and explain them to the consumer:

### Principle 1: Anchoring Effect
**How it's used against consumers:** Agents show a massive "No Insurance: $10,800/yr" number first, making an overpriced $2,000/yr plan look like a bargain.
**How PlanPilot Decodes it:** "Warning: Anchoring Detected. The agent is comparing this plan to having no insurance at all. The *real* comparison should be to the market average ($1,200/yr)."

### Principle 2: Loss Aversion
**How it's used against consumers:** Agents frame not buying as a massive loss ("Every month without this specific coverage costs you $900").
**How PlanPilot Decodes it:** "Warning: Fear-based Framing. They are highlighting worst-case scenario costs to create urgency."

### Principle 3: The Decoy Effect (Asymmetric Dominance)
**How it's used against consumers:** Agents present three options: a terrible cheap plan, the target plan, and an identical but way more expensive plan (the Decoy). This makes the target look like the "smart middle."
**How PlanPilot Decodes it:** "Warning: Decoy Effect Detected. They are intentionally comparing this plan to an artificially expensive alternative to make it look like a good deal. We found 3 better plans they hid from you."

### Principle 4: Social Proof
**How it's used against consumers:** Agents use market share to imply quality ("18% of people chose this").
**How PlanPilot Decodes it:** "Context check: While 18% of people chose this, our k-NN algorithm shows that for people with *your specific medications*, a different plan is actually 40% cheaper."

---

## 4. Data Architecture Changes

### ML Repurposing (No new models needed, just new outputs)

1. **Logistic Regression:** Previously predicted "Conversion Probability" (will the agent make the sale?). Now predicts "Vulnerability Score" (how likely is a consumer in this demographic to fall for this specific pitch?).
2. **Contextual Bandit:** Previously recommended the best psychological angle to use. Now predicts *which angle the agent is most likely currently using on the customer*, so the user knows what to look out for.
3. **k-NN (Nearest Neighbors):** Used to find similar users to prove that the "social proof" the agent is using might be statistically invalid for this specific consumer.

---

## 5. Implementation Phases

### Phase 1: Reframe Existing UI
- Update `index.html` to clearly state the consumer protection mission.
- Rename navigation links from "Sales Advisor" to "The Pitch Decoder".

### Phase 2: Build The Pitch Decoder (`decoder.html`)
- Create the split-screen UI (Left: What You're Being Told vs. Right: The Objective Truth).
- Build the "Tactics Detected" alert system.

### Phase 3: Repurpose ML Outputs
- Update `admin.js` / `decoder.js` to call `PPLearn` and map the output to warning messages rather than sales scripts.

### Phase 4: Data Cleansing
- Update `data/seed_interactions.json` to reframe "converted" outcomes as "Vulnerability/Manipulation Success" events for training purposes.

---

## 6. Testing Checklist
- [ ] No sales enablement scripts exist anywhere in the UI.
- [ ] The user flow starts by inputting a *pitched* plan, not a *target* plan.
- [ ] The ML models successfully output explanations of psychological tactics rather than instructions on how to use them.
- [ ] The application remains 100% client-side with zero external API calls.

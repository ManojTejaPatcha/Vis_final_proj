# Pitch Deck Outline: PlanPilot v2

**Title:** PlanPilot — Decision Intelligence & Persuasion Defense
**Subtitle:** Exposing psychological manipulation in health insurance sales through in-browser Machine Learning.

---

### Slide 1: The Problem (The Illusion of Choice)
*   **The Reality:** The health insurance market is extremely complex. Consumers rely on sales agents to guide them.
*   **The Catch:** Agents are heavily incentivized to sell specific, high-commission plans, even if they aren't the best fit for the consumer.
*   **The Weapon:** To sell suboptimal plans, agents use advanced behavioral psychology (Anchoring, Loss Aversion, Decoy Effect, Misleading Social Proof) to bypass logic and trigger emotional buying. 
*   **The Result:** Consumers are manipulated into overpaying for inferior coverage.

---

### Slide 2: The Solution (PlanPilot v2)
*   **What it is:** PlanPilot is a dual-sided web application that acts as a "Persuasion Defense Engine."
*   **How it works:** It allows consumers to input the insurance plan an agent is aggressively pitching them. The system then reverse-engineers the pitch, exposing the psychological manipulation tactics being used against them.
*   **The Goal:** To strip away emotional framing and return the consumer to objective, data-driven reality.

---

### Slide 3: Core Architecture (The Split-Screen Paradigm)
*   Our UI is built around a powerful split-screen concept:
    *   **LEFT PANEL: What You're Being Told (The Pitch).** We reconstruct the agent's persuasive arguments.
    *   **RIGHT PANEL: The Objective Truth (The Data).** We show the raw, unmanipulated data, exposing hidden costs and better alternatives.
*   *Visual:* Mockup of the split-screen, showing a red "Warning: Anchoring Detected" alert over the pitched plan, pointing to a much cheaper alternative on the right.

---

### Slide 4: Reverse-Engineering Psychology (The Mechanics)
*   PlanPilot actively detects specific sales methodologies:
    *   **Anchoring Bias:** Shows when an agent compares a plan to an artificially high "No Insurance" number instead of the market average.
    *   **The Decoy Effect:** Detects when an agent shows an overpriced, terrible plan just to make their target plan look like a "smart compromise."
    *   **Loss Aversion/Fear Framing:** Strips out emotional language to reveal actual out-of-pocket maximums.

---

### Slide 5: The Technology (100% Client-Side Intelligence)
*   PlanPilot doesn't just use static rules. It uses advanced Machine Learning running *entirely* in the user's browser (no backend, no API keys, total privacy).
    *   **Contextual Bandits (Thompson Sampling):** Predicts *which* psychological angle an agent is most likely using on a specific demographic.
    *   **k-Nearest Neighbors (k-NN):** Finds mathematically similar customer profiles to generate true "Social Proof," exposing when an agent is using fake or generalized statistics.
    *   **Logistic Regression:** Calculates a "Vulnerability Score"—highlighting which specific data points in the consumer's profile make them a prime target for manipulation.

---

### Slide 6: The "Objective Truth" Engine
*   Behind the defense mechanisms sits a powerful, unbiased scoring engine.
*   **How it ranks:** It takes the consumer's specific medications, health conditions, and budget, and runs deterministic math against a massive pricing dataset (copays, mail-order availability, step-therapy restrictions).
*   **The Result:** It doesn't just tear down a bad pitch; it immediately presents the objectively best plan available, calculating the exact dollar amount the consumer will save by ignoring the agent.

---

### Slide 7: Why This Matters (The "So What?")
*   **For the Consumer:** Saves thousands of dollars and protects against predatory sales tactics.
*   **For the Developer/Engineer:** Demonstrates a profound understanding of how data can be manipulated in the real world. It proves advanced full-stack engineering, edge-computing ML, and deep Product UX design. It's not just a dashboard; it's a system that understands human behavior.

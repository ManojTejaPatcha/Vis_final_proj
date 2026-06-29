/* ============================================================================
 * PlanPilot — Pitch Decoder Logic
 * Reverse-engineers insurance sales pitches to expose manipulation tactics.
 * ==========================================================================*/

(function () {
  "use strict";

  // ============================================================================
  // State Management
  // ============================================================================
  const state = {
    targetInsurer: null,
    customer: {
      age: null,
      region: "",
      primaryMed: "",
      budgetSensitivity: "",
      valuesConvenience: false,
      contextQ1: "",
      contextQ2: "",
      contextQ3: ""
    },
    recommendation: null,
    pricingData: null
  };

  // Reverse map: drug ID → conditions (derived from feature-engineering CONDITION_DRUGS)
  const DRUG_CONDITIONS = {
    ozempic: ["Type 2 Diabetes", "Weight Management"],
    jardiance: ["Type 2 Diabetes", "Heart Failure"],
    trulicity: ["Type 2 Diabetes"],
    eliquis: ["Atrial Fibrillation", "DVT/PE"],
    xarelto: ["Atrial Fibrillation", "DVT/PE"]
  };

  // ============================================================================
  // Example Scenarios (realistic pitches a consumer might encounter)
  // ============================================================================
  const DEMO_PROFILES = [
    {
      age: 67,
      region: "Midwest",
      budgetSensitivity: "medium",
      valuesConvenience: true,
      primaryMed: "eliquis",
      targetInsurer: "WellCare",
      contextQ1: "yes",
      contextQ2: "yes",
      contextQ3: "no"
    },
    {
      age: 72,
      region: "West",
      budgetSensitivity: "high",
      valuesConvenience: false,
      primaryMed: "ozempic",
      targetInsurer: "Blue Cross Blue Shield",
      contextQ1: "yes",
      contextQ2: "unsure",
      contextQ3: "yes"
    },
    {
      age: 58,
      region: "South",
      budgetSensitivity: "low",
      valuesConvenience: true,
      primaryMed: "ozempic",
      targetInsurer: "UnitedHealthcare",
      contextQ1: "no",
      contextQ2: "yes",
      contextQ3: "no"
    }
  ];

  // ============================================================================
  // DOM Elements
  // ============================================================================
  const elements = {
    // Form inputs
    targetInsurer: document.getElementById("targetInsurer"),
    customerAge: document.getElementById("customerAge"),
    customerRegion: document.getElementById("customerRegion"),
    valuesConvenience: document.getElementById("valuesConvenience"),
    primaryMed: document.getElementById("primaryMed"),

    // Buttons
    generateBtn: document.getElementById("generateBtn"),
    loadDemoBtn: document.getElementById("loadDemoBtn"),
    debriefBtn: document.getElementById("debriefBtn"),

    // Modal elements
    debriefModal: document.getElementById("debriefModal"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    cancelDebriefBtn: document.getElementById("cancelDebriefBtn"),
    submitDebriefBtn: document.getElementById("submitDebriefBtn"),
    priceConcern: document.getElementById("priceConcern"),
    decisionSpeed: document.getElementById("decisionSpeed"),
    competitorMentioned: document.getElementById("competitorMentioned"),
    adminNotes: document.getElementById("adminNotes"),

    // Views
    emptyState: document.getElementById("emptyState"),
    recommendationDashboard: document.getElementById("recommendationDashboard"),

    // Dashboard elements (for updating)
    heroInsurerBadge: document.getElementById("heroInsurerBadge"),
    heroTitle: document.getElementById("heroTitle"),
    heroNarrative: document.getElementById("heroNarrative"),
    heroDailyCost: document.getElementById("heroDailyCost"),
    heroBestAlt: document.getElementById("heroBestAlt"),
    heroMarketShare: document.getElementById("heroMarketShare"),
    heroPrediction: document.getElementById("heroPrediction"),
    metricCopay: document.getElementById("metricCopay"),
    metricOOP: document.getElementById("metricOOP"),
    metricConvenience: document.getElementById("metricConvenience"),
    metricNetwork: document.getElementById("metricNetwork"),
    anglesGrid: document.getElementById("anglesGrid"),
    profileSummary: document.getElementById("profileSummary"),

    // Comparison table elements
    economyInsurer: document.getElementById("economyInsurer"),
    economyCopay: document.getElementById("economyCopay"),
    economyMailOrder: document.getElementById("economyMailOrder"),
    economyPriorAuth: document.getElementById("economyPriorAuth"),
    economyStepTherapy: document.getElementById("economyStepTherapy"),
    economyNetwork: document.getElementById("economyNetwork"),

    recommendedInsurer: document.getElementById("recommendedInsurer"),
    recommendedCopay: document.getElementById("recommendedCopay"),
    recommendedMailOrder: document.getElementById("recommendedMailOrder"),
    recommendedPriorAuth: document.getElementById("recommendedPriorAuth"),
    recommendedStepTherapy: document.getElementById("recommendedStepTherapy"),
    recommendedNetwork: document.getElementById("recommendedNetwork"),

    premiumInsurer: document.getElementById("premiumInsurer"),
    premiumCopay: document.getElementById("premiumCopay"),
    premiumMailOrder: document.getElementById("premiumMailOrder"),
    premiumPriorAuth: document.getElementById("premiumPriorAuth"),
    premiumStepTherapy: document.getElementById("premiumStepTherapy"),
    premiumNetwork: document.getElementById("premiumNetwork"),

    // New elements
    riskMeterFill: document.getElementById("riskMeterFill"),
    riskMeterStatus: document.getElementById("riskMeterStatus"),
    bestPlanName: document.getElementById("bestPlanName"),
    bestPlanDetail: document.getElementById("bestPlanDetail"),
    bestPlanSavings: document.getElementById("bestPlanSavings"),
    questionsList: document.getElementById("questionsList"),
    verdictBanner: document.getElementById("verdictBanner"),
    verdictAmount: document.getElementById("verdictAmount"),
    verdictText: document.getElementById("verdictText"),
    verdictCta: document.getElementById("verdictCta"),
    hiddenReqCard: document.getElementById("hiddenReqCard"),
    hiddenReqList: document.getElementById("hiddenReqList"),
    saveReportBtn: document.getElementById("saveReportBtn"),
    economyAnnual: document.getElementById("economyAnnual"),
    recommendedAnnual: document.getElementById("recommendedAnnual"),
    premiumAnnual: document.getElementById("premiumAnnual"),
    nextStepsList: document.getElementById("nextStepsList"),
    quickFeedbackBar: document.getElementById("quickFeedbackBar"),
    quickFeedbackBtn: document.getElementById("quickFeedbackBtn")
  };

  // ============================================================================
  // Form Handling
  // ============================================================================
  function updateStateFromForm() {
    state.targetInsurer = elements.targetInsurer.value || null;
    state.customer.age = elements.customerAge.value ? parseInt(elements.customerAge.value, 10) : null;
    state.customer.region = elements.customerRegion ? elements.customerRegion.value : "";
    state.customer.valuesConvenience = elements.valuesConvenience.checked;
    state.customer.primaryMed = elements.primaryMed ? elements.primaryMed.value : "";
    state.customer.budgetSensitivity = state.customer.budgetSensitivity || "";
  }

  function validateForm() {
    const errors = [];

    if (!state.targetInsurer) {
      errors.push("Please select the plan being pitched to you");
    }
    if (!state.customer.budgetSensitivity) {
      errors.push("Please select your budget priority (Tight / Moderate / Flexible)");
    }
    if (!state.customer.primaryMed) {
      errors.push("Please select your primary medication");
    }

    return errors;
  }

  function showError(message) {
    // Use inline error display instead of alert
    let errorEl = document.getElementById("inlineError");
    if (!errorEl) {
      errorEl = document.createElement("div");
      errorEl.id = "inlineError";
      errorEl.style.cssText = "position:fixed;top:70px;right:20px;background:#b3261e;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;z-index:200;box-shadow:0 4px 20px rgba(0,0,0,0.15);max-width:400px;";
      document.body.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = "block";
    setTimeout(() => { errorEl.style.display = "none"; }, 5000);
  }

  // ============================================================================
  // Demo Profile Loading
  // ============================================================================
  function loadDemoProfile(index = 0) {
    const profile = DEMO_PROFILES[index];
    if (!profile) return;

    elements.targetInsurer.value = profile.targetInsurer;
    elements.customerAge.value = profile.age;
    if (elements.customerRegion) elements.customerRegion.value = profile.region;
    elements.valuesConvenience.checked = profile.valuesConvenience;
    if (elements.primaryMed) elements.primaryMed.value = profile.primaryMed || "";
    state.customer.budgetSensitivity = profile.budgetSensitivity;
    state.customer.contextQ1 = profile.contextQ1 || "";
    state.customer.contextQ2 = profile.contextQ2 || "";
    state.customer.contextQ3 = profile.contextQ3 || "";

    // Highlight active budget button
    document.querySelectorAll(".qb-btn").forEach(b => {
      b.classList.toggle("qb-btn--active", b.dataset.budget === profile.budgetSensitivity);
    });

    // Highlight active context buttons
    ["q1", "q2", "q3"].forEach(q => {
      const group = document.querySelector(`[data-context="${q}"]`);
      if (group) {
        group.querySelectorAll(".ctx-btn").forEach(b => {
          b.classList.toggle("ctx-btn--active", b.dataset.value === state.customer["context" + q.toUpperCase()]);
        });
      }
    });

    updateStateFromForm();
  }

  // ============================================================================
  // Learning Engine Integration
  // ============================================================================
  let dataStore = null;
  let mlModelParams = null;

  async function initializeLearningEngine() {
    try {
      // Check if learning modules are loaded
      if (!window.PPStore || !window.PPFeatures || !window.PPLearn || !window.PPModel) {
        console.warn("Learning modules not loaded, using mock mode");
        return;
      }

      // Load seed data
      let seedInteractions = [];
      try {
        const response = await fetch('./data/seed_interactions.json');
        if (response.ok) {
          seedInteractions = await response.json();
          console.log("Loaded", seedInteractions.length, "seed interactions");
        }
      } catch (e) {
        console.warn("Could not load seed data:", e);
      }

      // Initialize DataStore (will auto-seed if empty)
      dataStore = new window.PPStore.DataStore();
      await dataStore.init(seedInteractions);

      // Train model on existing data
      const interactions = dataStore.getInteractions();
      if (interactions.length > 0) {
        mlModelParams = window.PPModel.trainModel(interactions);
      }

      console.log("Learning engine initialized with", interactions.length, "interactions");
    } catch (error) {
      console.error("Failed to initialize learning engine:", error);
      // Fall back to mock mode if learning engine fails
      dataStore = null;
    }
  }

  // ============================================================================
  // Insurer Pricing Data — Real lookups from insurer_pricing.json
  // ============================================================================
  async function loadPricingData() {
    try {
      const response = await fetch('./insurer_pricing.json');
      if (response.ok) {
        state.pricingData = await response.json();
        console.log("Loaded pricing data:", state.pricingData.length, "entries");
      }
    } catch (e) {
      console.warn("Could not load pricing data:", e);
    }
  }

  function getPricingEntry(drugId, insurerName) {
    if (!state.pricingData || !drugId || !insurerName) return null;
    return state.pricingData.find(d => d.drug_id === drugId && d.insurer === insurerName) || null;
  }

  function getBestPlanEntry(drugId, excludeInsurer) {
    if (!state.pricingData || !drugId) return null;
    const options = state.pricingData
      .filter(d => d.drug_id === drugId && d.insurer !== excludeInsurer)
      .sort((a, b) => a.patient_copay - b.patient_copay);
    return options[0] || null;
  }

  function getPremiumPlanEntry(drugId, excludeInsurer, excludeInsurer2) {
    if (!state.pricingData || !drugId) return null;
    const options = state.pricingData
      .filter(d => d.drug_id === drugId && d.insurer !== excludeInsurer && d.insurer !== (excludeInsurer2 || ""))
      .sort((a, b) => b.patient_copay - a.patient_copay);
    return options[0] || null;
  }

  // ============================================================================
  // Verdict Banner + Hidden Requirements Renderers
  // ============================================================================
  function renderVerdictBanner(rec) {
    if (!elements.verdictBanner) return;
    const savings = rec.annualSavings;
    const bestPlan = rec.decoys.economy.insurer;
    const drugName = rec.primaryDrugName || "your medication";

    let cls = "verdict-banner--safe";
    if (savings > 500) cls = "verdict-banner--danger";
    else if (savings > 100) cls = "verdict-banner--warning";

    elements.verdictBanner.className = "verdict-banner " + cls;
    elements.verdictBanner.classList.remove("hidden");

    if (savings > 100) {
      elements.verdictAmount.textContent = "$" + savings.toLocaleString() + "/yr more expensive";
      elements.verdictText.textContent = "This plan costs $" + savings.toLocaleString() + " more per year than " + bestPlan + " for " + drugName + ". That's $" + Math.round(savings / 12) + "/month in avoidable overspend.";
      if (elements.verdictCta) {
        elements.verdictCta.textContent = "Switch to " + bestPlan + " \u2192";
        elements.verdictCta.href = "customer.html";
      }
    } else {
      elements.verdictAmount.textContent = "You're on a competitive plan";
      elements.verdictText.textContent = rec.targetInsurer + " is among the lower-cost options for " + drugName + ". Still review the hidden requirements and questions below.";
      if (elements.verdictCta) {
        elements.verdictCta.textContent = "Compare All Plans \u2192";
        elements.verdictCta.href = "customer.html";
      }
    }
  }

  function renderHiddenRequirements(rec) {
    if (!elements.hiddenReqCard || !elements.hiddenReqList) return;
    const items = [];
    const drugName = rec.primaryDrugName || "your medication";

    if (rec.pitchedPriorAuth) {
      items.push({
        title: "Prior Authorization Required",
        detail: "This plan requires prior authorization for " + drugName + ". Your agent may not have mentioned this — it can delay access by 2\u20136 weeks and requires your doctor's written approval."
      });
    }
    if (rec.pitchedStepTherapy) {
      items.push({
        title: "Step Therapy Required",
        detail: "This plan requires step therapy for " + drugName + ". You may be forced to try cheaper, potentially less effective drugs first before this plan will cover it."
      });
    }

    if (items.length === 0) {
      elements.hiddenReqCard.classList.add("hidden");
      return;
    }
    elements.hiddenReqCard.classList.remove("hidden");
    elements.hiddenReqList.innerHTML = items.map(item => `
      <div class="hidden-req-item">
        <div class="hidden-req-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="hidden-req-body">
          <div class="hidden-req-title">${item.title}</div>
          <div class="hidden-req-detail">${item.detail}</div>
        </div>
      </div>`).join("");
  }

  function generateVulnExplanation(score, customer) {
    const factors = [];
    if (customer.budgetSensitivity === "high") factors.push("price-sensitive profile (makes anchoring more effective)");
    if (customer.age && customer.age >= 70) factors.push("70+ age cohort (frequently targeted)");
    if (customer.primaryMed) factors.push("high-cost medication (increases urgency framing)");
    if (customer.valuesConvenience) factors.push("convenience preference (can be exploited via mail-order upsells)");
    if (customer.contextQ1 === "yes") factors.push("agent used daily-cost framing (classic micro-commitment tactic)");
    if (customer.contextQ2 === "yes") factors.push("agent claimed social proof (\"most people choose this\")");
    if (factors.length === 0) return "Your profile has average exposure to sales pressure.";
    return "Intensity elevated by: " + factors.join("; ") + ".";
  }

  // ============================================================================
  // Auto-Detect Tactics from Data + Context Answers
  // ============================================================================
  function autoDetectTactics(pitchedEntry, bestEntry, copay, bestCopay, marketShare) {
    const detected = {};

    // Anchoring: pitched copay is higher than best alternative
    detected.anchoring = copay > bestCopay;

    // Framing: user said agent quoted daily/weekly cost, or prior auth wasn't mentioned
    detected.framing = state.customer.contextQ1 === "yes" ||
      (pitchedEntry && pitchedEntry.prior_auth_required && state.customer.contextQ1 !== "no");

    // Social Proof: user said agent claimed "most people choose this", or market share is high
    detected.socialProof = state.customer.contextQ2 === "yes" ||
      (marketShare && marketShare >= 15);

    // Decoy Effect: user said agent showed a worse plan, or there's a clear premium decoy in data
    detected.decoy = state.customer.contextQ3 === "yes";

    // Authority: step therapy required (CMS star rating doesn't reflect this burden)
    detected.authority = pitchedEntry ? pitchedEntry.step_therapy : false;

    // Loss Aversion: always include if savings exist (fear of losing coverage)
    detected.lossAversion = copay > bestCopay;

    // Default Effect: pitched plan has high market share (positioned as "standard")
    detected.default = marketShare && marketShare >= 20;

    return detected;
  }

  // ============================================================================
  // Recommendation Generation (Learning-Powered)
  // ============================================================================
  async function generateRecommendation() {
    updateStateFromForm();

    const errors = validateForm();
    if (errors.length > 0) {
      showError(errors.join("\n"));
      return;
    }

    // Show loading state
    elements.generateBtn.textContent = "Decoding pitch...";
    elements.generateBtn.disabled = true;

    try {
      if (dataStore && window.PPFeatures && window.PPLearn && window.PPModel) {
        // Use learning engine for real recommendation
        state.recommendation = await generateLearningRecommendation();
      } else {
        // Fall back to mock recommendation
        state.recommendation = generateMockRecommendation();
      }
      renderRecommendation();
    } catch (error) {
      console.error("Recommendation generation failed:", error);
      showError("Analysis failed. Using fallback mode.");
      state.recommendation = generateMockRecommendation();
      renderRecommendation();
    } finally {
      elements.generateBtn.textContent = "Analyze This Pitch";
      elements.generateBtn.disabled = false;
    }
  }

  async function generateLearningRecommendation() {
    // Derive conditions and medications from primary drug selection
    const drugId = state.customer.primaryMed;
    const conditions = DRUG_CONDITIONS[drugId] || ["Type 2 Diabetes"];
    const medications = drugId ? [drugId] : [];
    const region = state.customer.region || "South";

    // Build customer profile for feature engineering
    const customerProfile = {
      name: "You",
      age: state.customer.age,
      state: "",
      region: region,
      conditions: conditions,
      medications: medications,
      budgetSensitivity: state.customer.budgetSensitivity,
      valuesConvenience: state.customer.valuesConvenience
    };

    // Derive segment
    const segment = window.PPFeatures.deriveSegment(customerProfile);

    // Get k-NN similar customers
    const neighbors = window.PPLearn.kNN(customerProfile, dataStore.getInteractions(), 5);

    // Build bandit state from all interactions (returns new state)
    const banditState = window.PPLearn.buildBanditFromInteractions(dataStore.getInteractions());

    // Get bandit stats for this segment (posterior mean per angle)
    const stats = window.PPLearn.banditStats(banditState, segment);

    // Thompson-sample angle rankings (returns array of angle ID strings)
    const rankedAngles = window.PPLearn.sampleAngleRanking(banditState, segment, 7);

    // Get cohort summary for key focus points
    const cohortSummary = window.PPLearn.cohortSummary(neighbors);

    // Predict conversion probability (takes customer object, not feature vector)
    const prediction = mlModelParams ? window.PPModel.predict(mlModelParams, customerProfile) : null;

    // Build recommendation object using real pricing data where available
    const insurer = state.targetInsurer;
    const pitchedEntry = getPricingEntry(drugId, insurer);
    const copay = pitchedEntry ? pitchedEntry.patient_copay : Math.floor(Math.random() * 40) + 120;
    const dailyCost = (copay / 30).toFixed(2);
    const annualCost = copay * 12;
    const bestEntry = getBestPlanEntry(drugId, insurer);
    const premiumEntry = getPremiumPlanEntry(drugId, insurer, bestEntry ? bestEntry.insurer : null);
    const bestCopay = bestEntry ? bestEntry.patient_copay : Math.max(copay - 25, 60);
    const savings = Math.max(0, (copay - bestCopay) * 12);
    const marketShareReal = pitchedEntry ? pitchedEntry.market_share : Math.floor(Math.random() * 15) + 8;
    const networkReal = pitchedEntry ? pitchedEntry.network_size : "Nationwide";
    const drugName = pitchedEntry ? pitchedEntry.drug_name : (drugId || "your medication");

    // Describe detected tactics in consumer-protection language
    const angleDescriptions = {
      anchoring: "The agent may be comparing this plan to an artificially high \"no insurance\" cost instead of the market average, making a mediocre deal look like a bargain.",
      lossAversion: "Fear framing detected: the pitch likely emphasizes what you stand to LOSE rather than presenting objective cost comparisons.",
      framing: "Micro-commitment trick: breaking the cost into a tiny daily amount ($X/day) to obscure the true annual financial impact.",
      socialProof: "The agent may cite general adoption statistics that do not apply to your specific profile and medications.",
      decoy: "A worse plan is likely shown alongside this one to make it look like the smart, obvious choice — a deliberate comparison trick.",
      default: "This plan is being positioned as the \"standard\" or \"default\" choice for your profile to make switching away feel like extra effort.",
      authority: "CMS ratings or formulary rankings are being cited to sound official — check whether those ratings actually apply to your specific medication."
    };

    // Auto-detect tactics from data + context answers
    const detectedTactics = autoDetectTactics(pitchedEntry, bestEntry, copay, bestCopay, marketShareReal);

    // Map stats to detected tactic cards, filtered by auto-detection
    const topAngleKeys = cohortSummary.topAngles.map(a => a.key);
    const angles = stats
      .filter(s => detectedTactics[s.angle])
      .slice(0, 4)
      .map(s => ({
        principle: toDisplayName(s.angle),
        score: Math.round(s.mean * 100),
        description: angleDescriptions[s.angle] || "",
        evidence: topAngleKeys.includes(s.angle)
          ? "High-confidence detection: this tactic worked on similar consumers"
          : "Pattern detected from segment analysis"
      }));

    // If no tactics detected from bandit stats, build from auto-detected directly
    if (angles.length === 0) {
      Object.keys(detectedTactics).forEach(angle => {
        if (detectedTactics[angle] && angleDescriptions[angle]) {
          angles.push({
            principle: toDisplayName(angle),
            score: 75,
            description: angleDescriptions[angle],
            evidence: "Auto-detected from your sales call answers and plan data"
          });
        }
      });
    }

    // Build analysis narrative
    const predText = prediction != null ? `${Math.round(prediction * 100)}%` : "N/A";
    const narrative = `Analysis (${segment} segment): ${insurer} is being pitched at $${copay}/month. ${neighbors.length > 0 ? `Of ${neighbors.length} similar consumers who were pitched this way, ${Math.round(cohortSummary.conversionRate * 100)}% ended up enrolling — many before seeing better alternatives.` : ""} The sales intensity is ${predText} — this measures how aggressively the pitch uses psychological framing to steer your decision based on your profile.`;

    return {
      targetInsurer: insurer,
      segment: segment,
      dailyCost: dailyCost,
      monthlyCopay: copay,
      annualOOP: annualCost,
      annualSavings: savings,
      marketShare: marketShareReal,
      convenienceScore: (Math.random() * 2 + 7).toFixed(1),
      network: networkReal,
      predictedConversion: prediction,
      narrative: narrative,
      pitchedPriorAuth: pitchedEntry ? pitchedEntry.prior_auth_required : false,
      pitchedStepTherapy: pitchedEntry ? pitchedEntry.step_therapy : false,
      pitchedMailOrder: pitchedEntry ? pitchedEntry.mail_order_available : true,
      primaryDrugName: drugName,
      primaryDrugId: drugId || "",
      angles: angles,
      similarCustomers: neighbors.map(n => ({
        name: n.interaction.customer.name,
        converted: n.interaction.debrief.converted,
        angles: n.interaction.pitch.anglesUsed
      })),
      decoys: {
        economy: {
          insurer: bestEntry ? bestEntry.insurer : "CVS Caremark",
          copay: bestCopay,
          mailOrder: bestEntry ? bestEntry.mail_order_available : false,
          priorAuth: bestEntry ? bestEntry.prior_auth_required : true,
          stepTherapy: bestEntry ? bestEntry.step_therapy : true,
          network: bestEntry ? bestEntry.network_size : "Limited"
        },
        premium: {
          insurer: premiumEntry ? premiumEntry.insurer : "UnitedHealthcare",
          copay: premiumEntry ? premiumEntry.patient_copay : copay + 35,
          mailOrder: premiumEntry ? premiumEntry.mail_order_available : true,
          priorAuth: premiumEntry ? premiumEntry.prior_auth_required : false,
          stepTherapy: premiumEntry ? premiumEntry.step_therapy : false,
          network: premiumEntry ? premiumEntry.network_size : "Nationwide"
        }
      }
    };
  }

  function generateMockRecommendation() {
    // Fallback pitch analysis when learning modules aren't available
    const insurer = state.targetInsurer;
    const drugId = state.customer.primaryMed;
    const pitchedEntry = getPricingEntry(drugId, insurer);
    const copay = pitchedEntry ? pitchedEntry.patient_copay : Math.floor(Math.random() * 80) + 100;
    const dailyCost = (copay / 30).toFixed(2);
    const annualCost = copay * 12;
    const bestEntry = getBestPlanEntry(drugId, insurer);
    const premiumEntry = getPremiumPlanEntry(drugId, insurer, bestEntry ? bestEntry.insurer : null);
    const bestCopay = bestEntry ? bestEntry.patient_copay : Math.max(copay - 20, 60);
    const savings = Math.max(0, (copay - bestCopay) * 12);
    const marketShare = pitchedEntry ? pitchedEntry.market_share : Math.floor(Math.random() * 20) + 5;
    const drugName = pitchedEntry ? pitchedEntry.drug_name : (drugId || "your medication");

    // Auto-detect tactics from data + context answers
    const detectedTactics = autoDetectTactics(pitchedEntry, bestEntry, copay, bestCopay, marketShare);

    const angleDescriptions = {
      anchoring: `The agent is likely comparing the $${copay}/month copay against a catastrophic "no insurance" number. The real benchmark is ~$${bestCopay}/month (${bestEntry ? bestEntry.insurer : "market average"}).`,
      lossAversion: `Fear framing detected: the pitch may emphasize you'll lose $${savings}/year without this plan, instead of showing you cheaper alternatives that exist.`,
      framing: "Micro-commitment trick: breaking the cost into a tiny daily amount ($X/day) to obscure the true annual financial impact.",
      socialProof: `The agent may claim ${marketShare}% of people chose this plan — but that statistic likely doesn't account for your specific medications and profile.`,
      decoy: "A worse plan is likely shown alongside this one to make it look like the smart, obvious choice — a deliberate comparison trick.",
      default: "This plan is being positioned as the \"standard\" or \"default\" choice for your profile to make switching away feel like extra effort.",
      authority: "CMS star ratings may be cited, but verify they apply to YOUR specific drugs, not the plan overall."
    };

    const angles = Object.keys(detectedTactics)
      .filter(a => detectedTactics[a])
      .slice(0, 4)
      .map(a => ({
        principle: toDisplayName(a),
        score: 75 + Math.floor(Math.random() * 20),
        description: angleDescriptions[a] || "",
        evidence: "Auto-detected from your sales call answers and plan data"
      }));

    return {
      targetInsurer: insurer,
      segment: "fallback",
      dailyCost: dailyCost,
      monthlyCopay: copay,
      annualOOP: annualCost,
      annualSavings: savings,
      marketShare: marketShare,
      convenienceScore: (Math.random() * 3 + 6).toFixed(1),
      network: pitchedEntry ? pitchedEntry.network_size : "Nationwide",
      predictedConversion: null,
      pitchedPriorAuth: pitchedEntry ? pitchedEntry.prior_auth_required : false,
      pitchedStepTherapy: pitchedEntry ? pitchedEntry.step_therapy : false,
      pitchedMailOrder: pitchedEntry ? pitchedEntry.mail_order_available : true,
      primaryDrugName: drugName,
      primaryDrugId: drugId || "",
      narrative: `Analysis: ${insurer} is being pitched at $${copay}/month for ${drugName}. The best alternative is $${bestCopay}/month — a difference of $${savings}/year. ${state.customer.valuesConvenience ? "The pitch may emphasize mail-order convenience to distract from price." : "The pitch may emphasize network breadth to justify a premium."} With ${state.customer.budgetSensitivity} budget sensitivity, the sales tactics are ${state.customer.budgetSensitivity === "high" ? "especially" : "moderately"} likely to influence your decision.`,
      angles: angles.length > 0 ? angles : [
        {
          principle: "Anchoring",
          score: 92,
          description: angleDescriptions.anchoring,
          evidence: "Auto-detected: pitched copay exceeds best alternative"
        }
      ],
      decoys: {
        economy: {
          insurer: bestEntry ? bestEntry.insurer : "CVS Caremark",
          copay: bestCopay,
          mailOrder: bestEntry ? bestEntry.mail_order_available : false,
          priorAuth: bestEntry ? bestEntry.prior_auth_required : true,
          stepTherapy: bestEntry ? bestEntry.step_therapy : true,
          network: bestEntry ? bestEntry.network_size : "Limited"
        },
        premium: {
          insurer: premiumEntry ? premiumEntry.insurer : "UnitedHealthcare",
          copay: premiumEntry ? premiumEntry.patient_copay : copay + 40,
          mailOrder: premiumEntry ? premiumEntry.mail_order_available : true,
          priorAuth: premiumEntry ? premiumEntry.prior_auth_required : false,
          stepTherapy: premiumEntry ? premiumEntry.step_therapy : false,
          network: premiumEntry ? premiumEntry.network_size : "Nationwide"
        }
      }
    };
  }

  // ============================================================================
  // Question Generator — "Questions to ask the agent"
  // ============================================================================

  // Convert camelCase angle key to display name: "lossAversion" → "Loss Aversion"
  function toDisplayName(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, c => c.toUpperCase())
      .trim();
  }

  const tacticQuestions = {
    Anchoring: [
      "What is the market average monthly copay for my specific medications, not the no-insurance price?",
      "Can you show me the actual CMS Part D pricing for my drugs across all plans?",
    ],
    "Loss Aversion": [
      "Instead of telling me what I'll lose, can you show me a side-by-side cost comparison of all available plans?",
      "What are the actual out-of-pocket costs for someone with my conditions across different plans?",
    ],
    Framing: [
      "What is the total annual cost, not the daily or monthly amount?",
      "Can you break down the full yearly cost including premiums, deductibles, and copays?",
    ],
    "Social Proof": [
      "What percentage of people with my exact medications and conditions chose this plan — not just general statistics?",
      "Can you show me enrollment data specific to my demographic and drug regimen?",
    ],
    Decoy: [
      "Are there other plans that cover my medications at a lower cost that you haven't mentioned?",
      "Why are you only showing me these three options? What's the cheapest plan that covers all my drugs?",
    ],
    Default: [
      "Is this actually the default plan for my profile, or is that just your recommendation?",
      "What would happen if I chose a different plan — would my coverage actually be worse?",
    ],
    Authority: [
      "Do those CMS star ratings apply specifically to my medications, or is that the plan's overall rating?",
      "Can you show me the formulary tier for each of my specific drugs on this plan vs. others?",
    ],
  };

  const tacticReplyBack = {
    Anchoring: '"Can you show me the actual market average for my specific medications, not a general no-insurance comparison?"',
    "Loss Aversion": '"I\'d like to see objective cost comparisons side by side, not just what I stand to lose."',
    Framing: '"What is the total annual cost — not the daily or monthly breakdown?"',
    "Social Proof": '"Can you share the data source for that statistic and confirm it applies to my exact drug regimen?"',
    Decoy: '"I\'d like to see all plans covering my medications, not just the three you\'ve shown me."',
    Default: '"I\'d like 48 hours to compare at least one other plan before I decide."',
    Authority: '"Do those CMS ratings apply specifically to my medications, or is that the plan\'s overall rating?"',
  };

  // Scenario examples shown on each detected tactic card so the user can confirm
  // without knowing the technical name. Keys match the internal angle keys.
  const TACTIC_SCENARIOS = {
    anchoring: {
      quote: '"Without insurance, this would cost you $900/month"',
      summary: 'They compared the plan price to a scary full-price number to make it look like a great deal'
    },
    lossAversion: {
      quote: '"You\'ll lose coverage if you don\'t sign up today"',
      summary: 'They made you feel like you\'d lose something important if you didn\'t enroll now'
    },
    framing: {
      quote: '"It\'s only about $4 a day"',
      summary: 'They broke the cost into a tiny daily or weekly amount instead of telling you the yearly total'
    },
    socialProof: {
      quote: '"Most people in your area choose this plan"',
      summary: 'They claimed the plan is popular in your area or age group to make it seem like the obvious choice'
    },
    decoy: {
      quote: 'They showed me another plan that was clearly worse',
      summary: 'A bad option was presented alongside this one to make it look like the smart pick by comparison'
    },
    default: {
      quote: '"This is the standard plan for someone in your situation"',
      summary: 'They positioned this as the default or automatic choice, making switching feel like extra effort'
    },
    authority: {
      quote: '"This plan has a 4.5-star CMS rating"',
      summary: 'They cited official-sounding ratings or rankings — but those may not apply to your specific medication'
    }
  };

  // Map display name back to internal angle key for quick feedback
  const DISPLAY_TO_KEY = {
    "Anchoring": "anchoring",
    "Loss Aversion": "lossAversion",
    "Framing": "framing",
    "Social Proof": "socialProof",
    "Decoy": "decoy",
    "Default": "default",
    "Authority": "authority"
  };

  function generateQuestions(angles) {
    const questions = [];
    const seen = new Set();
    angles.forEach(angle => {
      const qs = tacticQuestions[angle.principle] || [];
      qs.forEach(q => {
        if (!seen.has(q)) {
          seen.add(q);
          questions.push(q);
        }
      });
    });
    if (questions.length === 0) {
      questions.push("Can you show me a side-by-side comparison of all plans that cover my specific medications?");
      questions.push("What is the total annual cost for this plan, including all copays and premiums?");
    }
    return questions.slice(0, 6);
  }

  // ============================================================================
  // Rendering
  // ============================================================================
  function renderRecommendation() {
    const rec = state.recommendation;

    // Show dashboard, hide empty state
    elements.emptyState.classList.add("hidden");
    elements.recommendationDashboard.classList.remove("hidden");

    // Render verdict banner + hidden requirements (P3 + P5)
    renderVerdictBanner(rec);
    renderHiddenRequirements(rec);

    // Update hero card
    elements.heroInsurerBadge.textContent = rec.targetInsurer;
    elements.heroTitle.textContent = `Pitch Analysis: ${rec.targetInsurer}`;
    elements.heroNarrative.textContent = rec.narrative;
    elements.heroDailyCost.textContent = `$${rec.annualOOP.toLocaleString()}`;
    elements.heroBestAlt.textContent = rec.decoys.economy.insurer;
    elements.heroMarketShare.textContent = `${rec.marketShare}%`;
    elements.heroPrediction.textContent = rec.predictedConversion ? `${Math.round(rec.predictedConversion * 100)}%` : "N/A";  // sales intensity

    // Update metrics row
    elements.metricCopay.textContent = `$${rec.monthlyCopay}`;
    elements.metricOOP.textContent = `$${rec.annualOOP.toLocaleString()}`;
    elements.metricConvenience.textContent = `${rec.convenienceScore}/10`;
    elements.metricNetwork.textContent = rec.network;

    // Update comparison table
    elements.economyInsurer.textContent = rec.decoys.economy.insurer;
    elements.economyCopay.textContent = `$${rec.decoys.economy.copay}`;
    elements.economyMailOrder.textContent = rec.decoys.economy.mailOrder ? "Yes" : "No";
    elements.economyPriorAuth.textContent = rec.decoys.economy.priorAuth ? "Required" : "Not Required";
    elements.economyStepTherapy.textContent = rec.decoys.economy.stepTherapy ? "Yes" : "No";
    elements.economyNetwork.textContent = rec.decoys.economy.network;

    elements.recommendedInsurer.textContent = rec.targetInsurer;
    elements.recommendedCopay.textContent = `$${rec.monthlyCopay}`;
    elements.recommendedMailOrder.textContent = rec.pitchedMailOrder ? "Yes" : "No";
    elements.recommendedPriorAuth.textContent = rec.pitchedPriorAuth ? "⚠ Required" : "Not Required";
    elements.recommendedStepTherapy.textContent = rec.pitchedStepTherapy ? "⚠ Yes" : "No";
    elements.recommendedNetwork.textContent = rec.network;

    // Annual cost cells
    if (elements.economyAnnual) elements.economyAnnual.textContent = `$${(rec.decoys.economy.copay * 12).toLocaleString()}`;
    if (elements.recommendedAnnual) elements.recommendedAnnual.textContent = `$${rec.annualOOP.toLocaleString()}`;
    if (elements.premiumAnnual) elements.premiumAnnual.textContent = `$${(rec.decoys.premium.copay * 12).toLocaleString()}`;

    elements.premiumInsurer.textContent = rec.decoys.premium.insurer;
    elements.premiumCopay.textContent = `$${rec.decoys.premium.copay}`;
    elements.premiumMailOrder.textContent = rec.decoys.premium.mailOrder ? "Yes" : "No";
    elements.premiumPriorAuth.textContent = rec.decoys.premium.priorAuth ? "Required" : "Not Required";
    elements.premiumStepTherapy.textContent = rec.decoys.premium.stepTherapy ? "Yes" : "No";
    elements.premiumNetwork.textContent = rec.decoys.premium.network;

    // Update detected manipulation tactics (with scenario examples + confirm checkbox)
    const angleKey = (displayName) => DISPLAY_TO_KEY[displayName] || displayName.toLowerCase();
    elements.anglesGrid.innerHTML = rec.angles
      .map((angle) => {
        const reply = tacticReplyBack[angle.principle] || null;
        const key = angleKey(angle.principle);
        const scenario = TACTIC_SCENARIOS[key] || null;
        return `
      <div class="angle-card" data-angle="${key}">
        <div class="angle-header">
          <span class="angle-title">⚠ ${angle.principle}</span>
          <span class="angle-score">${angle.score}% confidence</span>
        </div>
        ${scenario ? `
        <div class="angle-scenario">
          <div class="angle-scenario-quote">${scenario.quote}</div>
          <div class="angle-scenario-summary">${scenario.summary}</div>
        </div>` : ""}
        <p class="angle-description">${angle.description}</p>
        <p class="angle-evidence">${angle.evidence}</p>
        ${reply ? `<div class="tactic-say-back"><span class="say-back-label">What to say:</span> <span class="say-back-text">${reply}</span></div>` : ""}
        <label class="angle-confirm">
          <input type="checkbox" class="angle-confirm-check" data-angle="${key}">
          <span>Yes, this happened to me</span>
        </label>
      </div>`;
      })
      .join("");

    // Show quick feedback bar
    if (elements.quickFeedbackBar) elements.quickFeedbackBar.classList.remove("hidden");

    // Update profile summary
    elements.profileSummary.innerHTML = `
      <div class="profile-item">
        <span class="profile-item-label">Age</span>
        <span class="profile-item-value">${state.customer.age || '—'}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Region</span>
        <span class="profile-item-value">${state.customer.region || '—'}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Medication</span>
        <span class="profile-item-value">${rec.primaryDrugName || '—'}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Budget</span>
        <span class="profile-item-value">${({high:"Tight (price-sensitive)", medium:"Moderate", low:"Flexible"})[state.customer.budgetSensitivity] || state.customer.budgetSensitivity || "\u2014"}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Mail Order</span>
        <span class="profile-item-value">${state.customer.valuesConvenience ? "Prefers" : "Neutral"}</span>
      </div>
    `;

    // Update risk meter
    const vulnScore = rec.predictedConversion ? Math.round(rec.predictedConversion * 100) : 50;
    if (elements.riskMeterFill) {
      elements.riskMeterFill.style.width = `${vulnScore}%`;
      if (vulnScore >= 70) {
        elements.riskMeterFill.style.background = "var(--risk)";
        if (elements.riskMeterStatus) elements.riskMeterStatus.textContent = "High Sales Pressure";
        elements.riskMeterStatus.style.color = "var(--risk)";
      } else if (vulnScore >= 40) {
        elements.riskMeterFill.style.background = "#e8a317";
        if (elements.riskMeterStatus) elements.riskMeterStatus.textContent = "Moderate Sales Pressure";
        elements.riskMeterStatus.style.color = "#e8a317";
      } else {
        elements.riskMeterFill.style.background = "var(--accent)";
        if (elements.riskMeterStatus) elements.riskMeterStatus.textContent = "Low Sales Pressure";
        elements.riskMeterStatus.style.color = "var(--accent)";
      }
    }

    // Update best plan banner
    if (elements.bestPlanName) {
      const medLabel = rec.primaryDrugName || "your medication";
      elements.bestPlanName.textContent = rec.decoys.economy.insurer;
      elements.bestPlanSavings.textContent = rec.annualSavings > 0 ? `Save $${rec.annualSavings.toLocaleString()}/yr` : "Competitive pricing";
      elements.bestPlanDetail.textContent = `Based on ${medLabel}, ${rec.decoys.economy.insurer} offers comparable coverage at $${rec.decoys.economy.copay}/month vs. $${rec.monthlyCopay}/month for ${rec.targetInsurer}. That's $${rec.annualSavings.toLocaleString()} less per year.`;
    }

    // Generate questions to ask the agent
    if (elements.questionsList) {
      const questions = generateQuestions(rec.angles);
      elements.questionsList.innerHTML = questions.map(q => `
        <div class="question-item">
          <span class="question-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <span class="question-text">${q}</span>
        </div>
      `).join("");
    }

    // Render "What Do I Do Next?" section — 3 specific action steps
    if (elements.nextStepsList) {
      const steps = [
        {
          title: "Get it in writing",
          detail: "Ask the agent to email you a Summary of Benefits for this plan. If they hesitate, that itself is a red flag."
        },
        {
          title: "Verify on Medicare.gov",
          detail: "Go to medicare.gov/plan-compare and enter your drug to see all available plans in your ZIP code ranked by your actual out-of-pocket cost."
        },
        {
          title: "Wait 24 hours",
          detail: "Medicare Open Enrollment runs Oct 15 – Dec 7. You are never required to decide on the spot. Any agent who pressures you to sign today is using a high-pressure tactic."
        }
      ];

      elements.nextStepsList.innerHTML = steps.map((s, i) => `
        <div class="next-step-item">
          <span class="next-step-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
            </svg>
          </span>
          <div class="next-step-body">
            <div class="next-step-title">Step ${i + 1} — ${s.title}</div>
            <div class="next-step-detail">${s.detail}</div>
          </div>
        </div>`).join("");
    }

    // Sales intensity plain-English explanation (P8)
    const riskMeterEl = document.querySelector(".risk-meter");
    if (riskMeterEl) {
      let vulnEl = riskMeterEl.querySelector(".vuln-explanation");
      if (!vulnEl) {
        vulnEl = document.createElement("p");
        vulnEl.className = "vuln-explanation";
        riskMeterEl.appendChild(vulnEl);
      }
      vulnEl.textContent = generateVulnExplanation(vulnScore, state.customer);
    }

    // Cross-page localStorage persistence (P7) — full context for Plan Comparison page
    try {
      localStorage.setItem("planpilot_context", JSON.stringify({
        primaryMed: rec.primaryDrugId,
        primaryMedName: rec.primaryDrugName,
        pitchedInsurer: rec.targetInsurer,
        pitchedCopay: rec.monthlyCopay,
        pitchedAnnual: rec.annualOOP,
        pitchedPriorAuth: rec.pitchedPriorAuth,
        pitchedStepTherapy: rec.pitchedStepTherapy,
        pitchedMailOrder: rec.pitchedMailOrder,
        pitchedNetwork: rec.network,
        bestInsurer: rec.decoys.economy.insurer,
        bestCopay: rec.decoys.economy.copay,
        bestMailOrder: rec.decoys.economy.mailOrder,
        bestPriorAuth: rec.decoys.economy.priorAuth,
        bestStepTherapy: rec.decoys.economy.stepTherapy,
        bestNetwork: rec.decoys.economy.network,
        premiumInsurer: rec.decoys.premium.insurer,
        premiumCopay: rec.decoys.premium.copay,
        premiumMailOrder: rec.decoys.premium.mailOrder,
        premiumPriorAuth: rec.decoys.premium.priorAuth,
        premiumStepTherapy: rec.decoys.premium.stepTherapy,
        premiumNetwork: rec.decoys.premium.network,
        savings: rec.annualSavings,
        segment: rec.segment,
        riskScore: rec.predictedConversion ? Math.round(rec.predictedConversion * 100) : null,
        topAngles: rec.angles.slice(0, 3).map(a => a.principle),
        timestamp: Date.now()
      }));
    } catch (e) { /* localStorage not available */ }

    // Show debrief + save report buttons
    elements.debriefBtn.classList.remove("hidden");
    if (elements.saveReportBtn) elements.saveReportBtn.classList.remove("hidden");

    // Scroll to top of dashboard
    elements.recommendationDashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ============================================================================
  // Quick Feedback (inline on tactic cards)
  // ============================================================================
  function submitQuickFeedback() {
    if (!state.recommendation) {
      showError("Please analyze a pitch first.");
      return;
    }

    // Collect confirmed tactics from checkboxes
    const confirmedAngles = Array.from(
      document.querySelectorAll(".angle-confirm-check:checked")
    ).map(cb => cb.dataset.angle);

    if (confirmedAngles.length === 0) {
      showError("Check at least one tactic that happened to you, or skip this step.");
      return;
    }

    try {
      // Build a minimal interaction record for the bandit update
      const drugId = state.customer.primaryMed;
      const conditions = DRUG_CONDITIONS[drugId] || ["Type 2 Diabetes"];
      const medications = drugId ? [drugId] : [];
      const region = state.customer.region || "South";
      const interaction = {
        id: `interaction-${Date.now()}`,
        timestamp: Date.now(),
        source: "admin-quick",
        customer: {
          name: "You",
          age: state.customer.age,
          state: "",
          region: region,
          conditions: conditions,
          medications: medications,
          budgetSensitivity: state.customer.budgetSensitivity,
          valuesConvenience: state.customer.valuesConvenience,
          numMedications: medications.length
        },
        segment: state.recommendation.segment,
        targetInsurer: state.targetInsurer,
        pitch: {
          anglesUsed: state.recommendation.angles.map(a => DISPLAY_TO_KEY[a.principle] || a.principle.toLowerCase()),
          insurerSuggested: state.targetInsurer,
          predictedConversion: state.recommendation.predictedConversion || 0.5
        },
        debrief: {
          converted: null,
          resonatedAngles: confirmedAngles,
          objections: [],
          priceConcern: 3,
          decisionSpeed: "deliberate",
          competitorMentioned: "none",
          notes: ""
        },
        outcome: {
          converted: null,
          reward: 0.5
        }
      };

      if (dataStore) {
        dataStore.addInteraction(interaction);

        // Update bandit with confirmed angles (credit assignment)
        if (window.PPLearn) {
          const banditState = dataStore.getBanditState();
          window.PPLearn.updateBandit(
            banditState,
            interaction.segment,
            interaction.pitch.anglesUsed,
            confirmedAngles,
            true // treat confirmation as a soft positive signal
          );
          dataStore.saveBanditState(banditState);
        }

        // Retrain model periodically
        if (window.PPModel && dataStore.getInteractions().length % 10 === 0) {
          mlModelParams = window.PPModel.trainModel(dataStore.getInteractions());
        }
      }

      // Show success toast
      showError("Thank you — your feedback helps PlanPilot improve its detection accuracy.");
      const errorEl = document.getElementById("inlineError");
      if (errorEl) {
        errorEl.style.background = "#0f6b58";
        setTimeout(() => { errorEl.style.background = "#b3261e"; }, 5000);
      }

      // Hide the feedback bar, show thank-you state
      if (elements.quickFeedbackBar) {
        elements.quickFeedbackBar.innerHTML = "<span style=\"color:var(--accent);font-size:13px\">✓ Feedback recorded — thank you for helping improve detection accuracy.</span>";
      }

    } catch (error) {
      console.error("Quick feedback failed:", error);
      showError("Failed to submit feedback. Please try again.");
    }
  }

  // ============================================================================
  // Debrief Modal
  // ============================================================================
  function openDebriefModal() {
    if (!state.recommendation) {
      showError("Please analyze a pitch first.");
      return;
    }
    elements.debriefModal.classList.remove("hidden");
  }

  function closeDebriefModal() {
    elements.debriefModal.classList.add("hidden");
    // Reset form
    document.querySelectorAll('input[name="converted"]').forEach(r => r.checked = false);
    document.querySelectorAll('#resonatedAngles input').forEach(c => c.checked = false);
    document.querySelectorAll('#objections input').forEach(c => c.checked = false);
    elements.priceConcern.value = 3;
    elements.decisionSpeed.value = "deliberate";
    elements.competitorMentioned.value = "";
    elements.adminNotes.value = "";
  }

  function getDebriefData() {
    // Get conversion status
    const convertedRadio = document.querySelector('input[name="converted"]:checked');
    const convertedValue = convertedRadio ? convertedRadio.value : null;

    // Get resonated angles
    const resonatedAngles = Array.from(
      document.querySelectorAll('#resonatedAngles input:checked')
    ).map(input => input.value);

    // Get objections
    const objections = Array.from(
      document.querySelectorAll('#objections input:checked')
    ).map(input => input.value);

    return {
      converted: convertedValue === "true" ? true : convertedValue === "false" ? false : null,
      resonatedAngles: resonatedAngles,
      objections: objections,
      priceConcern: parseInt(elements.priceConcern.value, 10),
      decisionSpeed: elements.decisionSpeed.value,
      competitorMentioned: elements.competitorMentioned.value.trim(),
      notes: elements.adminNotes.value.trim()
    };
  }

  async function submitDebrief() {
    const debriefData = getDebriefData();

    if (debriefData.converted === null) {
      showError("Please select whether you enrolled in the pitched plan");
      return;
    }

    if (!state.recommendation) {
      showError("Please analyze a pitch first before logging an outcome.");
      return;
    }

    try {
      // Create interaction record
      const drugId = state.customer.primaryMed;
      const conditions = DRUG_CONDITIONS[drugId] || ["Type 2 Diabetes"];
      const medications = drugId ? [drugId] : [];
      const region = state.customer.region || "South";
      const interaction = {
        id: `interaction-${Date.now()}`,
        timestamp: Date.now(),
        source: "admin",
        customer: {
          name: "You",
          age: state.customer.age,
          state: "",
          region: region,
          conditions: conditions,
          medications: medications,
          budgetSensitivity: state.customer.budgetSensitivity,
          valuesConvenience: state.customer.valuesConvenience,
          numMedications: medications.length
        },
        segment: state.recommendation.segment,
        targetInsurer: state.targetInsurer,
        pitch: {
          anglesUsed: state.recommendation.angles.map(a => a.principle.toLowerCase()),
          insurerSuggested: state.targetInsurer,
          predictedConversion: state.recommendation.predictedConversion || 0.5
        },
        debrief: {
          converted: debriefData.converted,
          resonatedAngles: debriefData.resonatedAngles,
          objections: debriefData.objections,
          priceConcern: debriefData.priceConcern,
          decisionSpeed: debriefData.decisionSpeed,
          competitorMentioned: debriefData.competitorMentioned || "none",
          notes: debriefData.notes
        },
        outcome: {
          converted: debriefData.converted,
          reward: debriefData.converted ? 1 : 0
        }
      };

      // Save to data store
      if (dataStore) {
        dataStore.addInteraction(interaction);

        // Update bandit state
        if (window.PPLearn) {
          const banditState = dataStore.getBanditState();
          window.PPLearn.updateBandit(
            banditState,
            interaction.segment,
            interaction.pitch.anglesUsed,
            debriefData.resonatedAngles,
            debriefData.converted
          );
          dataStore.saveBanditState(banditState);
        }

        // Retrain model periodically
        if (window.PPModel && dataStore.getInteractions().length % 10 === 0) {
          mlModelParams = window.PPModel.trainModel(dataStore.getInteractions());
        }

        console.log("Outcome logged and detection model updated");
      }

      closeDebriefModal();
      showError("Thank you — your feedback helps PlanPilot improve its detection accuracy.");
      // Change error color to green for success
      const errorEl = document.getElementById("inlineError");
      if (errorEl) {
        errorEl.style.background = "#0f6b58";
        setTimeout(() => { errorEl.style.background = "#b3261e"; }, 5000);
      }

    } catch (error) {
      console.error("Failed to submit debrief:", error);
      showError("Failed to submit debrief. Please try again.");
    }
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================
  function initEventListeners() {
    elements.generateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      generateRecommendation();
    });
    elements.loadDemoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Cycle through demo profiles
      const currentDemo = DEMO_PROFILES.findIndex(
        (p) => p.primaryMed === state.customer.primaryMed && p.targetInsurer === state.targetInsurer
      );
      const nextIndex = (currentDemo + 1) % DEMO_PROFILES.length;
      loadDemoProfile(nextIndex);
    });

    // Debrief modal listeners
    elements.debriefBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openDebriefModal();
    });
    elements.closeModalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDebriefModal();
    });
    elements.cancelDebriefBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDebriefModal();
    });
    elements.submitDebriefBtn.addEventListener("click", (e) => {
      e.preventDefault();
      submitDebrief();
    });

    // Close modal on backdrop click (check if element exists first)
    const backdrop = elements.debriefModal.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        closeDebriefModal();
      });
    }

    // Add input change listeners for real-time state updates
    const inputs = [
      elements.targetInsurer,
      elements.customerAge,
      elements.customerRegion,
      elements.valuesConvenience,
      elements.primaryMed
    ].filter(Boolean);

    inputs.forEach((input) => {
      input.addEventListener("change", updateStateFromForm);
      input.addEventListener("input", updateStateFromForm);
      // Prevent Enter key from triggering form submission
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      });
    });

    // Quick budget buttons
    document.querySelectorAll(".qb-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".qb-btn").forEach(b => b.classList.remove("qb-btn--active"));
        btn.classList.add("qb-btn--active");
        state.customer.budgetSensitivity = btn.dataset.budget;
        updateStateFromForm();
      });
    });

    // Context question buttons (Step 3)
    document.querySelectorAll("[data-context]").forEach(group => {
      const qKey = group.dataset.context; // "q1", "q2", "q3"
      group.querySelectorAll(".ctx-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          group.querySelectorAll(".ctx-btn").forEach(b => b.classList.remove("ctx-btn--active"));
          btn.classList.add("ctx-btn--active");
          state.customer["context" + qKey.toUpperCase()] = btn.dataset.value;
        });
      });
    });

    // Save Report = browser print (P6)
    if (elements.saveReportBtn) {
      elements.saveReportBtn.addEventListener("click", () => window.print());
    }

    // Quick feedback submit (inline tactic confirmation)
    if (elements.quickFeedbackBtn) {
      elements.quickFeedbackBtn.addEventListener("click", (e) => {
        e.preventDefault();
        submitQuickFeedback();
      });
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================
  async function init() {
    initEventListeners();
    await loadPricingData();
    await initializeLearningEngine();
    console.log("Pitch Decoder initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

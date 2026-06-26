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
      name: "",
      age: null,
      state: "",
      conditions: "",
      medications: "",
      primaryMed: "",
      budgetSensitivity: "",
      valuesConvenience: false
    },
    principles: {
      anchoring: true,
      lossAversion: true,
      framing: true,
      socialProof: true,
      decoy: true,
      default: true,
      authority: true
    },
    recommendation: null,
    pricingData: null
  };

  // ============================================================================
  // Example Scenarios (realistic pitches a consumer might encounter)
  // ============================================================================
  const DEMO_PROFILES = [
    {
      name: "Grace Williams",
      age: 67,
      state: "OH",
      conditions: "Type 2 Diabetes, Atrial Fibrillation",
      medications: "Jardiance, Eliquis",
      budgetSensitivity: "medium",
      valuesConvenience: true,
      primaryMed: "eliquis",
      targetInsurer: "WellCare"
    },
    {
      name: "Robert Chen",
      age: 72,
      state: "CA",
      conditions: "Hypertension, High Cholesterol",
      medications: "Lisinopril, Atorvastatin",
      budgetSensitivity: "high",
      valuesConvenience: false,
      primaryMed: "",
      targetInsurer: "Blue Cross Blue Shield"
    },
    {
      name: "Maria Garcia",
      age: 58,
      state: "FL",
      conditions: "Type 2 Diabetes",
      medications: "Ozempic, Metformin",
      budgetSensitivity: "low",
      valuesConvenience: true,
      primaryMed: "ozempic",
      targetInsurer: "UnitedHealthcare"
    }
  ];

  // ============================================================================
  // DOM Elements
  // ============================================================================
  const elements = {
    // Form inputs
    targetInsurer: document.getElementById("targetInsurer"),
    customerName: document.getElementById("customerName"),
    customerAge: document.getElementById("customerAge"),
    customerState: document.getElementById("customerState"),
    customerConditions: document.getElementById("customerConditions"),
    customerMeds: document.getElementById("customerMeds"),
    budgetSensitivity: document.getElementById("budgetSensitivity"),
    valuesConvenience: document.getElementById("valuesConvenience"),
    primaryMed: document.getElementById("primaryMed"),

    // Principle toggles
    principleAnchoring: document.getElementById("principle-anchoring"),
    principleLossAversion: document.getElementById("principle-lossAversion"),
    principleFraming: document.getElementById("principle-framing"),
    principleSocialProof: document.getElementById("principle-socialProof"),
    principleDecoy: document.getElementById("principle-decoy"),
    principleDefault: document.getElementById("principle-default"),
    principleAuthority: document.getElementById("principle-authority"),

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
    nextStepsList: document.getElementById("nextStepsList")
  };

  // ============================================================================
  // Form Handling
  // ============================================================================
  function updateStateFromForm() {
    state.targetInsurer = elements.targetInsurer.value || null;
    state.customer.name = elements.customerName.value.trim();
    state.customer.age = elements.customerAge.value ? parseInt(elements.customerAge.value, 10) : null;
    state.customer.state = elements.customerState.value;
    state.customer.conditions = elements.customerConditions.value.trim();
    state.customer.medications = elements.customerMeds.value.trim();
    state.customer.budgetSensitivity = elements.budgetSensitivity.value;
    state.customer.valuesConvenience = elements.valuesConvenience.checked;
    state.customer.primaryMed = elements.primaryMed ? elements.primaryMed.value : "";

    state.principles.anchoring = elements.principleAnchoring.checked;
    state.principles.lossAversion = elements.principleLossAversion.checked;
    state.principles.framing = elements.principleFraming.checked;
    state.principles.socialProof = elements.principleSocialProof.checked;
    state.principles.decoy = elements.principleDecoy.checked;
    state.principles.default = elements.principleDefault.checked;
    state.principles.authority = elements.principleAuthority.checked;
  }

  function validateForm() {
    const errors = [];

    if (!state.targetInsurer) {
      errors.push("Please select the plan being pitched to you");
    }
    if (!state.customer.name) {
      state.customer.name = "You";
    }
    const isQuickMode = document.querySelector(".sidebar.mode--quick") !== null;
    if (!state.customer.age && !isQuickMode) {
      errors.push("Please enter your age");
    }
    if (!state.customer.budgetSensitivity) {
      errors.push("Please select your budget sensitivity (Tight / Moderate / Flexible)");
    }
    if (!state.customer.medications && !state.customer.primaryMed) {
      errors.push("Please select a primary drug or enter your medications");
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
    elements.customerName.value = profile.name;
    elements.customerAge.value = profile.age;
    elements.customerState.value = profile.state;
    elements.customerConditions.value = profile.conditions;
    elements.customerMeds.value = profile.medications;
    elements.budgetSensitivity.value = profile.budgetSensitivity;
    elements.valuesConvenience.checked = profile.valuesConvenience;
    if (elements.primaryMed) elements.primaryMed.value = profile.primaryMed || "";

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
    const medCount = (customer.medications || "").split(",").filter(s => s.trim()).length;
    if (medCount >= 2 || customer.primaryMed) factors.push("high-cost or multiple medications (increases urgency framing)");
    if (customer.valuesConvenience) factors.push("convenience preference (can be exploited via mail-order upsells)");
    if (factors.length === 0) return "Your profile has average exposure to sales pressure.";
    return "Intensity elevated by: " + factors.join("; ") + ".";
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
    // Build customer profile for feature engineering
    const STATE_REGIONS = {
      CA: "West", TX: "South", FL: "South", NY: "Northeast",
      OH: "Midwest", PA: "Northeast", IL: "Midwest", GA: "South",
      NC: "South", MI: "Midwest"
    };
    const customerProfile = {
      name: state.customer.name,
      age: state.customer.age,
      state: state.customer.state,
      region: STATE_REGIONS[state.customer.state] || "South",
      conditions: state.customer.conditions.split(",").map(s => s.trim()).filter(s => s),
      medications: state.customer.medications.split(",").map(s => s.trim()).filter(s => s),
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
    const drugId = state.customer.primaryMed;
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

    // Map stats to detected tactic cards, filter by enabled scans
    const topAngleKeys = cohortSummary.topAngles.map(a => a.key);
    const angles = stats
      .filter(s => state.principles[s.angle])
      .slice(0, 4)
      .map(s => ({
        principle: toDisplayName(s.angle),
        score: Math.round(s.mean * 100),
        description: angleDescriptions[s.angle] || "",
        evidence: topAngleKeys.includes(s.angle)
          ? "High-confidence detection: this tactic worked on similar consumers"
          : "Pattern detected from segment analysis"
      }));

    // Build analysis narrative
    const predText = prediction != null ? `${Math.round(prediction * 100)}%` : "N/A";
    const narrative = `Analysis for ${state.customer.name} (${segment} segment): ${insurer} is being pitched at $${copay}/month. ${neighbors.length > 0 ? `Of ${neighbors.length} similar consumers who were pitched this way, ${Math.round(cohortSummary.conversionRate * 100)}% ended up enrolling — many before seeing better alternatives.` : ""} The sales intensity is ${predText} — this measures how aggressively the pitch uses psychological framing to steer your decision based on your profile.`;

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
      narrative: `Analysis for ${state.customer.name}: ${insurer} is being pitched at $${copay}/month for your medications (${state.customer.medications}). The market average for comparable coverage is significantly lower. ${state.customer.valuesConvenience ? "The pitch may emphasize mail-order convenience to distract from price." : "The pitch may emphasize network breadth to justify a premium."} With ${state.customer.budgetSensitivity} budget sensitivity, the sales tactics are ${state.customer.budgetSensitivity === "high" ? "especially" : "moderately"} likely to influence your decision.`,
      angles: [
        {
          principle: "Anchoring",
          score: 92,
          description: `The agent is likely comparing the $${copay}/month copay against a catastrophic "no insurance" number. The real benchmark is ~$${bestCopay}/month (${bestEntry ? bestEntry.insurer : "market average"}).`,
          evidence: "Industry average for similar medications is $215/month"
        },
        {
          principle: "Loss Aversion",
          score: 88,
          description: `Fear framing detected: the pitch may emphasize you'll lose $${savings}/year without this plan, instead of showing you cheaper alternatives that exist.`,
          evidence: `Better alternatives could save you $${savings}/year`
        },
        {
          principle: "Social Proof",
          score: 85,
          description: `The agent may claim ${marketShare}% of people chose this plan — but that statistic likely doesn't account for your specific medications and profile.`,
          evidence: `General adoption rate for age ${state.customer.age} demographic, not your specific drug regimen`
        },
        {
          principle: "Authority",
          score: 78,
          description: "CMS star ratings may be cited, but verify they apply to YOUR specific drugs, not the plan overall.",
          evidence: "Formulary placement varies by specific medication — check individually"
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

    // Update detected manipulation tactics (P9: adds 'What to say back')
    elements.anglesGrid.innerHTML = rec.angles
      .map((angle) => {
        const reply = tacticReplyBack[angle.principle] || null;
        return `
      <div class="angle-card">
        <div class="angle-header">
          <span class="angle-title">⚠ ${angle.principle}</span>
          <span class="angle-score">${angle.score}% confidence</span>
        </div>
        <p class="angle-description">${angle.description}</p>
        <p class="angle-evidence">${angle.evidence}</p>
        ${reply ? `<div class="tactic-say-back"><span class="say-back-label">What to say:</span> <span class="say-back-text">${reply}</span></div>` : ""}
      </div>`;
      })
      .join("");

    // Update profile summary
    elements.profileSummary.innerHTML = `
      <div class="profile-item">
        <span class="profile-item-label">Name</span>
        <span class="profile-item-value">${state.customer.name}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Age / State</span>
        <span class="profile-item-value">${state.customer.age || '—'} / ${state.customer.state || '—'}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Medications</span>
        <span class="profile-item-value">${state.customer.medications || rec.primaryDrugName || '—'}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Conditions</span>
        <span class="profile-item-value">${state.customer.conditions || "None specified"}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Budget</span>
        <span class="profile-item-value">${({high:"Tight (price-sensitive)", medium:"Moderate", low:"Flexible"})[state.customer.budgetSensitivity] || state.customer.budgetSensitivity || "\u2014"}</span>
      </div>
      <div class="profile-item">
        <span class="profile-item-label">Convenience</span>
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
      const medLabel = rec.primaryDrugName || state.customer.medications || "your medications";
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

    // Render "What Do I Do Next?" section (Fix #10)
    if (elements.nextStepsList) {
      const bestInsurer = rec.decoys.economy.insurer;
      const drugName = rec.primaryDrugName || "your medication";
      const steps = [];

      if (rec.annualSavings > 100) {
        steps.push({
          icon: "compare",
          title: "Compare the pitched plan side-by-side with " + bestInsurer,
          detail: "Use the Plan Comparison tool to see exactly how " + rec.targetInsurer + " stacks up against " + bestInsurer + " for " + drugName + ". You could save $" + rec.annualSavings.toLocaleString() + "/year.",
          cta: "Open Plan Comparison \u2192",
          ctaHref: "customer.html"
        });
      }

      steps.push({
        icon: "ask",
        title: "Ask your agent these " + generateQuestions(rec.angles).length + " questions",
        detail: "The questions above are designed to shift the conversation back to objective data. Print them out or screenshot them before your next call.",
        cta: null
      });

      if (rec.pitchedPriorAuth || rec.pitchedStepTherapy) {
        steps.push({
          icon: "warn",
          title: "Verify hidden requirements with your doctor",
          detail: (rec.pitchedPriorAuth ? "This plan requires prior authorization" : "This plan requires step therapy") + " for " + drugName + ". Ask your doctor if they'll support the approval process, or if " + bestInsurer + " would be simpler.",
          cta: null
        });
      }

      steps.push({
        icon: "time",
        title: "Take 48 hours before deciding",
        detail: "You are not obligated to enroll during the sales call. Tell the agent you need time to review the options. Any plan that pressures you to decide immediately is a red flag.",
        cta: null
      });

      steps.push({
        icon: "enroll",
        title: "Ready to switch? Here's how.",
        detail: "Visit Medicare Plan Finder at medicare.gov/find-plans to compare and enroll in " + bestInsurer + " or any other plan. You can also call 1-800-MEDICARE (1-800-633-4227) for free, unbiased help.",
        cta: "Go to medicare.gov \u2192",
        ctaHref: "https://www.medicare.gov/find-plans"
      });

      elements.nextStepsList.innerHTML = steps.map(s => `
        <div class="next-step-item">
          <span class="next-step-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
            </svg>
          </span>
          <div class="next-step-body">
            <div class="next-step-title">${s.title}</div>
            <div class="next-step-detail">${s.detail}</div>
            ${s.cta ? `<a class="btn btn-primary btn-sm" href="${s.ctaHref}" target="${s.ctaHref.startsWith('http') ? '_blank' : ''}" rel="${s.ctaHref.startsWith('http') ? 'noopener' : ''}" style="margin-top:8px">${s.cta}</a>` : ""}
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

    // Cross-page localStorage persistence (P7)
    try {
      localStorage.setItem("planpilot_context", JSON.stringify({
        primaryMed: rec.primaryDrugId,
        primaryMedName: rec.primaryDrugName,
        pitchedInsurer: rec.targetInsurer,
        bestInsurer: rec.decoys.economy.insurer,
        bestCopay: rec.decoys.economy.copay,
        savings: rec.annualSavings,
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
      const STATE_REGIONS = {
        CA: "West", TX: "South", FL: "South", NY: "Northeast",
        OH: "Midwest", PA: "Northeast", IL: "Midwest", GA: "South",
        NC: "South", MI: "Midwest"
      };
      const interaction = {
        id: `interaction-${Date.now()}`,
        timestamp: Date.now(),
        source: "admin",
        customer: {
          name: state.customer.name,
          age: state.customer.age,
          state: state.customer.state,
          region: STATE_REGIONS[state.customer.state] || "South",
          conditions: state.customer.conditions.split(",").map(s => s.trim()).filter(s => s),
          medications: state.customer.medications.split(",").map(s => s.trim()).filter(s => s),
          budgetSensitivity: state.customer.budgetSensitivity,
          valuesConvenience: state.customer.valuesConvenience,
          numMedications: state.customer.medications.split(",").filter(s => s.trim()).length
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
        (p) => p.name === state.customer.name && p.targetInsurer === state.targetInsurer
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
      elements.customerName,
      elements.customerAge,
      elements.customerState,
      elements.customerConditions,
      elements.customerMeds,
      elements.budgetSensitivity,
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

    // Principle toggle listeners
    const toggles = [
      elements.principleAnchoring,
      elements.principleLossAversion,
      elements.principleFraming,
      elements.principleSocialProof,
      elements.principleDecoy,
      elements.principleDefault,
      elements.principleAuthority
    ];

    toggles.forEach((toggle) => {
      toggle.addEventListener("change", updateStateFromForm);
    });

    // Quick / Full Mode toggle (P4)
    const quickModeBtn = document.getElementById("quickModeBtn");
    const fullModeBtn = document.getElementById("fullModeBtn");
    const sidebarEl = document.querySelector(".sidebar");
    if (quickModeBtn && fullModeBtn && sidebarEl) {
      quickModeBtn.addEventListener("click", () => {
        sidebarEl.classList.add("mode--quick");
        sidebarEl.classList.remove("mode--full");
        quickModeBtn.classList.add("mode-btn--active");
        fullModeBtn.classList.remove("mode-btn--active");
      });
      fullModeBtn.addEventListener("click", () => {
        sidebarEl.classList.remove("mode--quick");
        sidebarEl.classList.add("mode--full");
        fullModeBtn.classList.add("mode-btn--active");
        quickModeBtn.classList.remove("mode-btn--active");
      });
    }

    // Quick budget buttons (P4)
    document.querySelectorAll(".qb-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".qb-btn").forEach(b => b.classList.remove("qb-btn--active"));
        btn.classList.add("qb-btn--active");
        if (elements.budgetSensitivity) {
          elements.budgetSensitivity.value = btn.dataset.budget;
          updateStateFromForm();
        }
      });
    });

    // Save Report = browser print (P6)
    if (elements.saveReportBtn) {
      elements.saveReportBtn.addEventListener("click", () => window.print());
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================
  async function init() {
    initEventListeners();
    // Initialize sidebar in Quick Mode
    const sidebarEl = document.querySelector(".sidebar");
    if (sidebarEl) sidebarEl.classList.add("mode--quick");
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

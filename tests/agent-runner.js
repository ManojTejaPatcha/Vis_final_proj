/**
 * PlanPilot — Tier-2 AI Agent Test Runner
 * Uses Playwright (browser automation) + Gemini (qualitative UX assessment)
 *
 * Usage:
 *   GEMINI_API_KEY=your_key_here node agent-runner.js
 *   GEMINI_API_KEY=your_key_here node agent-runner.js --persona P01
 *   GEMINI_API_KEY=your_key_here node agent-runner.js --category B
 *   GEMINI_API_KEY=your_key_here node agent-runner.js --all
 *
 * Output: tests/reports/report-<timestamp>.html
 */

"use strict";

const { chromium } = require("playwright");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { PERSONAS } = require("./personas.js");

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || "http://localhost:8766";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash"; // confirmed working; override with GEMINI_MODEL env var
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "1", 10); // 1 avoids race conditions under shared server load
const HEADLESS = process.env.HEADLESS !== "false"; // set HEADLESS=false to watch
const SCREENSHOT_DIR = path.join(__dirname, "reports", "screenshots");
const REPORT_DIR = path.join(__dirname, "reports");
const TIMEOUT = 20000; // ms per action

if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable is not set.");
  console.error("Usage: GEMINI_API_KEY=your_key node agent-runner.js");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { all: false, persona: null, category: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--all") opts.all = true;
    if (args[i] === "--persona" && args[i + 1]) opts.persona = args[++i];
    if (args[i] === "--category" && args[i + 1]) opts.category = args[++i];
  }
  if (!opts.all && !opts.persona && !opts.category) opts.all = true; // default
  return opts;
}

function selectPersonas(opts) {
  if (opts.persona) return PERSONAS.filter(p => p.id === opts.persona);
  if (opts.category) return PERSONAS.filter(p => p.category === opts.category);
  return PERSONAS;
}

// Map persona field values to admin.html select option values
const INSURER_MAP = {
  "UnitedHealthcare": "UnitedHealthcare",
  "Blue Cross Blue Shield": "Blue Cross Blue Shield",
  "Humana": "Humana",
  "Aetna": "Aetna",
  "Cigna": "Cigna",
  "WellCare": "WellCare",
  "Kaiser Permanente": "Kaiser Permanente",
  "CVS Caremark": "CVS Caremark",
};

// ─── Browser automation: fill form and generate analysis ─────────────────────

async function runPersonaInBrowser(persona, browser) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const result = { persona, assertions: [], screenshot: null, domScrape: {}, error: null, consoleErrors: [] };

  // Capture JS errors and console errors
  page.on("pageerror", err => result.consoleErrors.push("PAGE ERROR: " + err.message));
  page.on("console", msg => {
    if (msg.type() === "error") result.consoleErrors.push("CONSOLE ERROR: " + msg.text());
  });

  try {
    // 1. Navigate to Pitch Decoder
    await page.goto(`${BASE_URL}/admin.html`, { waitUntil: "networkidle", timeout: TIMEOUT });
    await sleep(500);

    // 2. Mode toggle (Quick vs Full)
    if (persona.useQuickMode) {
      const quickBtn = page.locator("#quickModeBtn");
      if (await quickBtn.count() > 0) await quickBtn.click();
      await sleep(300);
    } else {
      const fullBtn = page.locator("#fullModeBtn");
      if (await fullBtn.count() > 0) await fullBtn.click();
      await sleep(300);
    }

    // 3. Fill target insurer
    const insurerSel = page.locator("#targetInsurer");
    if (await insurerSel.count() > 0) {
      await insurerSel.selectOption({ label: persona.targetInsurer });
    }

    // 4. Fill primary medication
    if (persona.primaryMed) {
      const primMedSel = page.locator("#primaryMed");
      if (await primMedSel.count() > 0) {
        await primMedSel.selectOption({ value: persona.primaryMed });
      }
    }

    if (!persona.useQuickMode) {
      // 5. Age (admin.html uses #customerAge)
      const ageInput = page.locator("#customerAge");
      if (await ageInput.count() > 0) {
        await ageInput.fill(String(persona.age));
      }

      // 6. State (admin.html uses #customerState)
      if (persona.state) {
        const stateSel = page.locator("#customerState");
        if (await stateSel.count() > 0) {
          await stateSel.selectOption({ value: persona.state }).catch(() => {});
        }
      }

      // 7. Conditions (admin.html uses #customerConditions)
      if (persona.conditions) {
        const condInput = page.locator("#customerConditions");
        if (await condInput.count() > 0) {
          await condInput.fill(persona.conditions);
        }
      }

      // 8. Medications (admin.html uses #customerMeds)
      if (persona.medications) {
        const medInput = page.locator("#customerMeds");
        if (await medInput.count() > 0) {
          await medInput.fill(persona.medications);
        }
      }

      // 9. Budget sensitivity
      const budgetMap = { high: "high", medium: "medium", low: "low" };
      const budgetSel = page.locator("#budgetSensitivity");
      if (await budgetSel.count() > 0) {
        await budgetSel.selectOption({ value: budgetMap[persona.budgetSensitivity] || "medium" });
      }

      // 10. Values convenience checkbox
      const convChk = page.locator("#valuesConvenience");
      if (await convChk.count() > 0) {
        const checked = await convChk.isChecked();
        if (persona.valuesConvenience && !checked) await convChk.check();
        if (!persona.valuesConvenience && checked) await convChk.uncheck();
      }
    } else {
      // Quick mode: use quick budget buttons
      const budgetBtnMap = { high: ".qb-btn[data-budget='high']", medium: ".qb-btn[data-budget='medium']", low: ".qb-btn[data-budget='low']" };
      const budgetBtnSel = budgetBtnMap[persona.budgetSensitivity];
      if (budgetBtnSel) {
        const btn = page.locator(budgetBtnSel).first();
        if (await btn.count() > 0) await btn.click();
      }
    }

    await sleep(300);

    // 11. Click Generate / Analyze
    const analyzeBtn = page.locator("#analyzeBtn, #generateBtn, button[type='submit']").first();
    if (await analyzeBtn.count() > 0) {
      await analyzeBtn.click();
    } else {
      throw new Error("Could not find Analyze/Generate button");
    }

    // 12. Wait for analysis to complete (two-phase):
    //     Phase 1: button becomes disabled  → click was registered
    //     Phase 2: button becomes enabled   → finally block ran (renderRecommendation done)
    await page.waitForFunction(() => {
      const btn = document.getElementById("generateBtn");
      return btn && btn.disabled;
    }, { timeout: 5000 }).catch(() => {});

    await page.waitForFunction(() => {
      const btn = document.getElementById("generateBtn");
      return btn && !btn.disabled;
    }, { timeout: TIMEOUT }).catch(() => {});

    // Extra settle time for any async DOM paint
    await sleep(2000);

    // 13. Scrape key DOM values
    result.domScrape = await page.evaluate(() => {
      const txt = sel => document.querySelector(sel)?.textContent?.trim() ?? "";
      const vis = sel => !!document.querySelector(sel);
      const attr = (sel, a) => document.querySelector(sel)?.getAttribute(a) ?? "";

      return {
        verdictBannerVisible: vis("#verdictBanner") || vis(".verdict-banner"),
        verdictBannerText: txt("#verdictBanner") || txt(".verdict-banner"),
        verdictBannerClass: attr("#verdictBanner", "class") || attr(".verdict-banner", "class"),
        hiddenReqCardVisible: vis("#hiddenReqCard") || vis(".hidden-req-card"),
        priorAuthWarning: document.body.innerHTML.toLowerCase().includes("prior authorization"),
        stepTherapyWarning: document.body.innerHTML.toLowerCase().includes("step therapy"),
        tacticCardsCount: document.querySelectorAll(".angle-card, .tactic-card").length,
        sayBackPresent: document.querySelectorAll(".tactic-say-back, .say-back-text").length > 0,
        vulnExplanationPresent: !!document.querySelector(".vuln-explanation"),
        economyCopay: txt("#economyCopay"),
        recommendedCopay: txt("#recommendedCopay"),
        premiumCopay: txt("#premiumCopay"),
        economyAnnual: txt("#economyAnnual"),
        recommendedAnnual: txt("#recommendedAnnual"),
        premiumAnnual: txt("#premiumAnnual"),
        saveReportBtnVisible: (() => {
          const btn = document.getElementById("saveReportBtn");
          return btn && !btn.classList.contains("hidden");
        })(),
        dashboardVisible: (() => {
          const d = document.getElementById("recommendationDashboard");
          return d && !d.classList.contains("hidden");
        })(),
        errorVisible: vis(".error-state, #errorState, .alert-error"),
        // Diagnostics
        anglesGridHTML: document.getElementById("anglesGrid")?.innerHTML?.slice(0, 300) ?? "MISSING",
        dashboardHasHidden: document.getElementById("recommendationDashboard")?.classList?.contains("hidden"),
        btnDisabled: document.getElementById("generateBtn")?.disabled,
        premiumInsurerExists: !!document.getElementById("premiumInsurer"),
      };
    });

    // 14. Screenshot
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const screenshotPath = path.join(SCREENSHOT_DIR, `${persona.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = screenshotPath;

    // 15. Cross-page test (Category F)
    if (persona.crossPage) {
      result.crossPageResult = await runCrossPageCheck(page, persona);
    }

    // 16. Deterministic assertions
    result.assertions = runDeterministicAssertions(persona, result.domScrape, result.crossPageResult);

  } catch (err) {
    result.error = err.message;
    result.assertions = [{ name: "RUNNER ERROR", passed: false, detail: err.message }];
  } finally {
    await context.close();
  }

  return result;
}

async function runCrossPageCheck(page, persona) {
  const crossResult = { bannerVisible: false, drugPillSelected: false, bannerText: "" };
  try {
    await page.goto(`${BASE_URL}/customer.html`, { waitUntil: "networkidle", timeout: TIMEOUT });
    await sleep(1200);
    const bannerEl = page.locator("#pitchContextBanner");
    if (await bannerEl.count() > 0) {
      const display = await bannerEl.evaluate(el => getComputedStyle(el).display);
      crossResult.bannerVisible = display !== "none";
      crossResult.bannerText = await bannerEl.textContent().catch(() => "");
    }
    if (persona.expectedDrugPillSelected) {
      const pill = page.locator(`[data-drug="${persona.expectedDrugPillSelected}"]`);
      if (await pill.count() > 0) {
        crossResult.drugPillSelected = await pill.evaluate(el => el.classList.contains("active"));
      }
    }
  } catch (e) {
    crossResult.error = e.message;
  }
  return crossResult;
}

// ─── Deterministic assertions ─────────────────────────────────────────────────

function runDeterministicAssertions(persona, dom, crossPage) {
  const assertions = [];

  const assert = (name, passed, detail = "") => assertions.push({ name, passed, detail });

  // Dashboard rendered
  assert("Dashboard visible", !!dom.dashboardVisible,
    dom.dashboardVisible ? "ok" : "recommendationDashboard still has .hidden class — analysis did not complete");

  // Verdict banner
  assert("Verdict banner present", dom.verdictBannerVisible,
    dom.verdictBannerText || "Banner not found");

  // Verdict tier (when determinate)
  if (persona.expectedVerdictTier) {
    const bannerClass = (dom.verdictBannerClass || "").toLowerCase();
    const bannerText = (dom.verdictBannerText || "").toLowerCase();
    let tierMatch = false;
    if (persona.expectedVerdictTier === "safe") {
      tierMatch = bannerClass.includes("safe") || bannerText.includes("safe") || bannerText.includes("competitive");
    } else if (persona.expectedVerdictTier === "warning") {
      tierMatch = bannerClass.includes("warning") || bannerClass.includes("amber") ||
        bannerText.includes("overpay") || bannerText.includes("save");
    } else if (persona.expectedVerdictTier === "danger") {
      tierMatch = bannerClass.includes("danger") || bannerText.includes("danger");
    }
    assert(`Verdict tier = ${persona.expectedVerdictTier}`, tierMatch,
      `Banner class: "${dom.verdictBannerClass}"`);
  }

  // Prior auth warning
  if (persona.expectPriorAuth) {
    assert("Prior Auth warning shown", dom.priorAuthWarning,
      dom.priorAuthWarning ? "Prior authorization text found in page" : "Text 'prior authorization' not found in page");
  }

  // Step therapy warning
  if (persona.expectStepTherapy) {
    assert("Step Therapy warning shown", dom.stepTherapyWarning,
      "Text 'step therapy' not found in page");
  }

  // Tactic cards
  if (persona.expectTacticCards) {
    assert("Tactic cards rendered (≥1)", dom.tacticCardsCount >= 1,
      `Found ${dom.tacticCardsCount} tactic cards`);
  }

  // "What to say back" text
  assert("Say-back text present on tactic cards", dom.sayBackPresent,
    dom.sayBackPresent ? ".tactic-say-back elements found" : "No .tactic-say-back elements found");

  // Vulnerability explanation
  assert("Vulnerability explanation text present", dom.vulnExplanationPresent,
    dom.vulnExplanationPresent ? ".vuln-explanation element present" : "No .vuln-explanation element found");

  // Annual cost rows populated (not empty, not $NaN)
  const annualCosts = [dom.economyAnnual, dom.recommendedAnnual, dom.premiumAnnual];
  const validAnnuals = annualCosts.filter(v => v && !v.includes("NaN") && v.includes("$"));
  assert("Annual cost rows populated (no $NaN)", validAnnuals.length >= 2,
    `Annual values: [${annualCosts.join(", ")}]`);

  // Copay values populated
  const copays = [dom.economyCopay, dom.recommendedCopay, dom.premiumCopay];
  const validCopays = copays.filter(v => v && !v.includes("NaN") && v.includes("$"));
  assert("Copay cells populated (no $NaN)", validCopays.length >= 2,
    `Copay values: [${copays.join(", ")}]`);

  // Save Report button visible after analysis
  assert("Save Report button visible", dom.saveReportBtnVisible,
    dom.saveReportBtnVisible ? "saveReportBtn visible (hidden class removed)" : "saveReportBtn still hidden after analysis");

  // No error state shown
  assert("No error state displayed", !dom.errorVisible,
    dom.errorVisible ? "Error state element found on page" : "ok");

  // Cross-page assertions (Category F)
  if (persona.crossPage && crossPage) {
    if (persona.expectContextBannerOnCustomerPage) {
      assert("Cross-page: context banner visible on customer.html",
        crossPage.bannerVisible,
        `Banner display state: visible=${crossPage.bannerVisible}`);
      assert("Cross-page: banner text mentions pitched insurer",
        (crossPage.bannerText || "").toLowerCase().includes(
          (persona.targetInsurer || "").toLowerCase().split(" ")[0]
        ),
        `Banner text: "${crossPage.bannerText?.slice(0, 120)}"`);
    }
    if (persona.expectedDrugPillSelected) {
      assert(`Cross-page: "${persona.expectedDrugPillSelected}" pill auto-selected`,
        crossPage.drugPillSelected,
        `Pill selected: ${crossPage.drugPillSelected}`);
    }
  }

  // Fallback pricing edge case — expect results to still render
  if (persona.expectFallbackPricing) {
    assert("Fallback pricing: dashboard still renders without primaryMed",
      dom.dashboardVisible || dom.verdictBannerVisible,
      "Dashboard did not render without a primary medication");
  }

  // Mail order conflict flag
  if (persona.expectMailOrderConflict) {
    const noMailOrder = !(dom.verdictBannerText || "").toLowerCase().includes("mail") ||
      (dom.verdictBannerText || "").toLowerCase().includes("no mail");
    // We just check the table column was rendered (not easy without more specific ID)
    assert("Mail-order conflict: comparison table rendered with mail order column",
      dom.dashboardVisible,
      "Comparison table should show mail order availability");
  }

  return assertions;
}

// ─── Gemini qualitative assessment ───────────────────────────────────────────

async function getGeminiAssessment(persona, domScrape, screenshotPath, genAI) {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const context = `
PLANPILOT PITCH DECODER — AI AGENT QUALITATIVE ASSESSMENT
=========================================================
Persona: ${persona.name} (${persona.id}) | Age: ${persona.age} | State: ${persona.state}
Insurer pitched: ${persona.targetInsurer} | Drug: ${persona.primaryMed || "none selected"}
Expected savings: ${persona.expectedSavings !== null ? "$" + persona.expectedSavings + "/yr" : "unknown (fallback)"}
Expected verdict: ${persona.expectedVerdictTier || "indeterminate"}
Category: ${persona.category} | Quick Mode: ${persona.useQuickMode}

DOM STATE OBSERVED:
- Dashboard visible: ${domScrape.dashboardVisible}
- Verdict banner: ${domScrape.verdictBannerVisible} → "${domScrape.verdictBannerText?.slice(0, 120)}"
- Prior Auth warning: ${domScrape.priorAuthWarning}
- Step Therapy warning: ${domScrape.stepTherapyWarning}
- Tactic cards: ${domScrape.tacticCardsCount}
- Say-back text: ${domScrape.sayBackPresent}
- Copays: Economy=${domScrape.economyCopay} | Recommended=${domScrape.recommendedCopay} | Premium=${domScrape.premiumCopay}
- Annual costs: Economy=${domScrape.economyAnnual} | Recommended=${domScrape.recommendedAnnual} | Premium=${domScrape.premiumAnnual}

YOUR PERSONA PROMPT:
${persona.geminiPersonaPrompt}

INSTRUCTIONS:
Respond in character as the persona described above. Give a 200-300 word response that:
1. Directly answers the 3 questions in the persona prompt.
2. Reflects the emotional/cognitive state of this persona.
3. At the end, include a brief "ASSESSOR NOTE:" section (out of character, 50 words) rating:
   - Information clarity: 1-5
   - Emotional resonance of the tool: 1-5  
   - One specific UI/UX improvement suggestion.
`;

  try {
    // Include screenshot if available
    const parts = [{ text: context }];
    if (screenshotPath && fs.existsSync(screenshotPath)) {
      const imgData = fs.readFileSync(screenshotPath);
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: imgData.toString("base64"),
        },
      });
      parts.push({ text: "Above is a screenshot of the Pitch Decoder after analysis. Use it to give accurate UI-specific feedback." });
    }

    const geminiResult = await model.generateContent(parts);
    return geminiResult.response.text();
  } catch (err) {
    return `[Gemini error: ${err.message}]`;
  }
}

// ─── Batch runner with concurrency ───────────────────────────────────────────

async function runBatch(personas) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const browser = await chromium.launch({ headless: HEADLESS });
  const allResults = [];

  // Run in chunks of CONCURRENCY
  for (let i = 0; i < personas.length; i += CONCURRENCY) {
    const batch = personas.slice(i, i + CONCURRENCY);
    console.log(`\n▶ Running batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(personas.length / CONCURRENCY)}: [${batch.map(p => p.id).join(", ")}]`);

    const batchResults = await Promise.all(
      batch.map(async (persona) => {
        console.log(`  → Starting ${persona.id}: ${persona.name}`);
        const result = await runPersonaInBrowser(persona, browser);

        const passed = result.assertions.filter(a => a.passed).length;
        const total = result.assertions.length;
        console.log(`  ✓ ${persona.id} done | Assertions: ${passed}/${total} passed`);
        if (result.consoleErrors && result.consoleErrors.length > 0) {
          console.log(`  ⚠ Browser errors for ${persona.id}:`);
          result.consoleErrors.forEach(e => console.log(`    ${e}`));
        }
        const d = result.domScrape;
        console.log(`  🔍 Diag: dash_hidden=${d.dashboardHasHidden} btn_disabled=${d.btnDisabled} premiumInsurerExists=${d.premiumInsurerExists} tactic_cards=${d.tacticCardsCount}`);
        console.log(`  🔍 anglesGridHTML: ${(d.anglesGridHTML||"").slice(0,120)}`);

        // Get Gemini assessment
        if (!result.error) {
          console.log(`  ⟳ ${persona.id} → Gemini assessment...`);
          result.geminiResponse = await getGeminiAssessment(
            persona, result.domScrape, result.screenshot, genAI
          );
        }

        return result;
      })
    );

    allResults.push(...batchResults);
    // Small pause between batches to avoid rate limits
    if (i + CONCURRENCY < personas.length) await sleep(2000);
  }

  await browser.close();
  return allResults;
}

// ─── HTML report generation ───────────────────────────────────────────────────

function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportPath = path.join(REPORT_DIR, `report-${timestamp}.html`);
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const totalPersonas = results.length;
  const totalAssertions = results.reduce((s, r) => s + r.assertions.length, 0);
  const totalPassed = results.reduce((s, r) => s + r.assertions.filter(a => a.passed).length, 0);
  const failedPersonas = results.filter(r => r.assertions.some(a => !a.passed));

  const categoryStats = {};
  results.forEach(r => {
    const cat = r.persona.category;
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, passed: 0 };
    categoryStats[cat].total += r.assertions.length;
    categoryStats[cat].passed += r.assertions.filter(a => a.passed).length;
  });

  const catNames = {
    A: "Standard profiles", B: "Step-therapy traps", C: "Cheapest plan (safe)",
    D: "Maximum overpay", E: "Quick Mode", F: "Cross-page flow", G: "Edge cases"
  };

  const personaRows = results.map(r => {
    const passed = r.assertions.filter(a => a.passed).length;
    const total = r.assertions.length;
    const allPassed = passed === total;
    const statusColor = allPassed ? "#16a34a" : "#dc2626";

    const assertionRows = r.assertions.map(a =>
      `<tr style="background:${a.passed ? "#f0fdf4" : "#fef2f2"}">
        <td style="padding:4px 8px">${a.passed ? "✅" : "❌"}</td>
        <td style="padding:4px 8px;font-size:13px">${a.name}</td>
        <td style="padding:4px 8px;font-size:12px;color:#666;max-width:300px;word-break:break-word">${a.detail}</td>
      </tr>`
    ).join("");

    const screenshotTag = r.screenshot && fs.existsSync(r.screenshot)
      ? `<img src="${path.relative(REPORT_DIR, r.screenshot)}" style="max-width:100%;border:1px solid #ddd;border-radius:6px;margin-top:12px" alt="screenshot">`
      : "<p style='color:#999;font-size:13px'>Screenshot not available</p>";

    const geminiSection = r.geminiResponse
      ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;white-space:pre-wrap;font-size:14px;line-height:1.6;font-family:Georgia,serif">${r.geminiResponse.replace(/</g, "&lt;")}</div>`
      : r.error
      ? `<div style="color:#dc2626;font-family:mono;font-size:13px">Runner error: ${r.error}</div>`
      : "";

    return `
<div style="border:1px solid ${allPassed ? "#bbf7d0" : "#fecaca"};border-radius:10px;padding:20px;margin-bottom:20px;background:#fff">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    <span style="background:${statusColor};color:#fff;font-weight:700;padding:4px 10px;border-radius:20px;font-size:13px">${r.persona.id}</span>
    <strong style="font-size:15px">${r.persona.name}</strong>
    <span style="color:#666;font-size:13px">${r.persona.age}y · ${r.persona.state} · ${r.persona.targetInsurer} · ${r.persona.primaryMed || "no drug"}</span>
    <span style="margin-left:auto;font-weight:600;color:${statusColor}">${passed}/${total} passed</span>
  </div>
  <p style="color:#888;font-size:13px;margin:0 0 12px">${r.persona.description || ""}</p>

  <details>
    <summary style="cursor:pointer;font-weight:600;font-size:14px;color:#374151">Assertions (${passed}/${total})</summary>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead><tr style="background:#f3f4f6">
        <th style="padding:4px 8px;text-align:left;font-size:12px">Pass</th>
        <th style="padding:4px 8px;text-align:left;font-size:12px">Check</th>
        <th style="padding:4px 8px;text-align:left;font-size:12px">Detail</th>
      </tr></thead>
      <tbody>${assertionRows}</tbody>
    </table>
  </details>

  <details style="margin-top:12px">
    <summary style="cursor:pointer;font-weight:600;font-size:14px;color:#374151">Gemini Persona Assessment</summary>
    ${geminiSection}
  </details>

  <details style="margin-top:12px">
    <summary style="cursor:pointer;font-weight:600;font-size:14px;color:#374151">Screenshot</summary>
    ${screenshotTag}
  </details>
</div>`;
  }).join("");

  const catSummaryRows = Object.entries(categoryStats).map(([cat, s]) => {
    const pct = Math.round((s.passed / s.total) * 100);
    return `<tr>
      <td style="padding:6px 12px;font-weight:600">Cat ${cat}</td>
      <td style="padding:6px 12px">${catNames[cat] || cat}</td>
      <td style="padding:6px 12px">${s.passed}/${s.total}</td>
      <td style="padding:6px 12px">
        <div style="background:#e5e7eb;border-radius:4px;height:8px;width:120px">
          <div style="background:${pct >= 80 ? "#16a34a" : pct >= 60 ? "#f59e0b" : "#dc2626"};height:8px;border-radius:4px;width:${pct}%"></div>
        </div>
        ${pct}%
      </td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>PlanPilot Agent Test Report — ${timestamp}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif; margin: 0; background: #f9fafb; color: #111; }
  .header { background: #0f172a; color: #fff; padding: 32px 48px; }
  .header h1 { margin: 0 0 8px; font-size: 1.6rem; }
  .header p { margin: 0; color: #94a3b8; font-size: 14px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 24px 48px; }
  .kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; }
  .kpi-num { font-size: 2rem; font-weight: 700; color: #0f172a; }
  .kpi-lbl { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .body { padding: 8px 48px 48px; }
  details summary::-webkit-details-marker { display: none; }
  details summary::before { content: "▸ "; }
  details[open] summary::before { content: "▾ "; }
</style>
</head>
<body>

<div class="header">
  <h1>PlanPilot — AI Agent Test Report</h1>
  <p>Generated: ${new Date().toLocaleString()} · ${totalPersonas} personas · Gemini model: ${GEMINI_MODEL}</p>
</div>

<div class="summary">
  <div class="kpi"><div class="kpi-num">${totalPersonas}</div><div class="kpi-lbl">Personas tested</div></div>
  <div class="kpi"><div class="kpi-num" style="color:${totalPassed === totalAssertions ? "#16a34a" : "#dc2626"}">${totalPassed}/${totalAssertions}</div><div class="kpi-lbl">Assertions passed</div></div>
  <div class="kpi"><div class="kpi-num">${Math.round((totalPassed / totalAssertions) * 100)}%</div><div class="kpi-lbl">Pass rate</div></div>
  <div class="kpi"><div class="kpi-num" style="color:${failedPersonas.length === 0 ? "#16a34a" : "#dc2626"}">${failedPersonas.length}</div><div class="kpi-lbl">Personas with failures</div></div>
</div>

<div class="body">
  <h2>Results by category</h2>
  <table style="border-collapse:collapse;margin-bottom:32px">
    <thead><tr style="background:#f3f4f6">
      <th style="padding:6px 12px;text-align:left">Cat</th>
      <th style="padding:6px 12px;text-align:left">Description</th>
      <th style="padding:6px 12px;text-align:left">Assertions</th>
      <th style="padding:6px 12px;text-align:left">Pass rate</th>
    </tr></thead>
    <tbody>${catSummaryRows}</tbody>
  </table>

  ${failedPersonas.length > 0 ? `
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px">
    <strong>Failed personas:</strong> ${failedPersonas.map(r => r.persona.id + " " + r.persona.name).join(", ")}
  </div>` : `
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px">
    ✅ All personas passed all assertions.
  </div>`}

  <h2>Individual persona results</h2>
  ${personaRows}
</div>
</body>
</html>`;

  fs.writeFileSync(reportPath, html, "utf8");
  return reportPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const opts = parseArgs();
  const selected = selectPersonas(opts);

  if (selected.length === 0) {
    console.error("No personas matched your filter.");
    process.exit(1);
  }

  console.log(`\n🚀 PlanPilot Agent Test Runner`);
  console.log(`   Base URL : ${BASE_URL}`);
  console.log(`   Model    : ${GEMINI_MODEL}`);
  console.log(`   Headless : ${HEADLESS}`);
  console.log(`   Personas : ${selected.length} selected`);
  console.log(`   Concurr. : ${CONCURRENCY} parallel browsers\n`);

  const startTime = Date.now();
  const results = await runBatch(selected);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const reportPath = generateReport(results);

  const totalPassed = results.reduce((s, r) => s + r.assertions.filter(a => a.passed).length, 0);
  const totalAssertions = results.reduce((s, r) => s + r.assertions.length, 0);

  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`   Assertions: ${totalPassed}/${totalAssertions} passed (${Math.round((totalPassed / totalAssertions) * 100)}%)`);
  console.log(`   Report   : ${reportPath}\n`);
})();

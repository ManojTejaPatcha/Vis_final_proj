#!/usr/bin/env node
/**
 * Quick deterministic test — runs 5 key personas without Gemini API.
 * Checks: pages load, dashboard renders, verdict banner, savings consistency,
 *          tactic cards, hidden reqs, no $NaN, profile summary, customer.html gate.
 */
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:8766";

const personas = [
  { id: "P01", name: "Standard Ozempic / UnitedHealthcare", insurer: "UnitedHealthcare", drug: "ozempic", mode: "full", age: "72", state: "CA", conditions: ["Type 2 Diabetes"], budget: "high" },
  { id: "P13", name: "Step Therapy Trap / Kaiser / Trulicity", insurer: "Kaiser Permanente", drug: "trulicity", mode: "full", age: "68", state: "CA", conditions: ["Type 2 Diabetes"], budget: "high" },
  { id: "P25", name: "Cheapest Plan / WellCare / Trulicity", insurer: "WellCare", drug: "trulicity", mode: "full", age: "70", state: "FL", conditions: ["Type 2 Diabetes"], budget: "high" },
  { id: "P36", name: "Quick Mode / Humana / Jardiance", insurer: "Humana", drug: "jardiance", mode: "quick", budget: "high" },
  { id: "P43", name: "Cross-Page / Aetna / Eliquis", insurer: "Aetna", drug: "eliquis", mode: "full", age: "75", state: "TX", conditions: ["Atrial Fibrillation"], budget: "medium" },
];

let pass = 0, fail = 0;
const failures = [];

async function runPersona(browser, p) {
  const page = await browser.newPage();
  const results = [];
  const log = (check, ok) => {
    results.push({ check, ok });
    if (ok) pass++; else { fail++; failures.push(`${p.id}: ${check}`); }
  };

  try {
    // Collect console errors
    const consoleErrors = [];
    page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    // 1. Page loads
    await page.goto(`${BASE}/admin.html`, { waitUntil: "networkidle", timeout: 15000 });
    log("admin.html loads", await page.title() !== "");

    // 2. Select insurer
    await page.selectOption("#targetInsurer", p.insurer);

    // 3. Select drug
    await page.selectOption("#primaryMed", p.drug);

    // 4. Mode-specific fields
    if (p.mode === "quick") {
      // Ensure quick mode is active
      const isQuick = await page.evaluate(() => document.querySelector(".sidebar")?.classList.contains("mode--quick"));
      if (!isQuick) {
        await page.click("#quickModeBtn");
        await page.waitForTimeout(300);
      }
      // Click budget button
      await page.click(`.qb-btn[data-budget="${p.budget}"]`);
    } else {
      // Full mode
      await page.click("#fullModeBtn");
      await page.waitForTimeout(300);
      // Fill fields
      if (p.age) await page.fill("#customerAge", p.age);
      if (p.state) await page.selectOption("#customerState", p.state);
      if (p.conditions) {
        await page.fill("#customerConditions", p.conditions.join(", "));
      }
      await page.selectOption("#budgetSensitivity", p.budget);
    }

    // 5. Click Generate
    await page.click("#generateBtn");
    await page.waitForTimeout(3000); // wait for analysis

    // 6. Dashboard renders
    const dashboardVisible = await page.isVisible("#recommendationDashboard");
    log("Dashboard renders after analysis", dashboardVisible);

    // 7. Verdict banner visible
    const verdictVisible = await page.isVisible("#verdictBanner");
    log("Verdict banner visible", verdictVisible);

    // 8. Verdict amount has content
    const verdictText = await page.textContent("#verdictAmount");
    log("Verdict amount has content", verdictText && verdictText.length > 0 && !verdictText.includes("NaN"));

    // 9. Verdict text has content
    const verdictBody = await page.textContent("#verdictText");
    log("Verdict text has content", verdictBody && verdictBody.length > 0);

    // 10. Hero card renders
    const heroTitle = await page.textContent("#heroTitle");
    log("Hero title renders", heroTitle && heroTitle.length > 0);

    // 11. Hero Best Alternative shows insurer name (not savings)
    const heroBestAlt = await page.textContent("#heroBestAlt");
    log("Hero Best Alternative shows insurer name", heroBestAlt && heroBestAlt.length > 0 && !heroBestAlt.includes("$"));

    // 12. Savings consistency — verdict banner and best plan banner show same number
    const bestPlanSavings = await page.textContent("#bestPlanSavings");
    const verdictMatch = verdictText && bestPlanSavings
      ? (verdictText.includes("competitive") && bestPlanSavings.includes("Competitive")) ||
        (verdictText.match(/\$[\d,]+/) && bestPlanSavings.match(/\$[\d,]+/) &&
         verdictText.match(/\$[\d,]+/)[0] === bestPlanSavings.match(/\$[\d,]+/)[0])
      : false;
    log("Savings number consistent (verdict = best plan)", verdictMatch);

    // 13. No $NaN anywhere in dashboard
    const dashboardText = await page.textContent("#recommendationDashboard");
    log("No $NaN in dashboard", !dashboardText.includes("$NaN") && !dashboardText.includes("NaN"));

    // 14. Tactic cards rendered
    const angleCards = await page.$$eval(".angle-card", els => els.length);
    log("Tactic cards rendered (≥1)", angleCards >= 1);

    // 15. "What to say back" text present
    const sayBack = await page.$$eval(".tactic-say-back", els => els.length);
    log("'What to say back' present on tactic cards", sayBack >= 1);

    // 16. Hidden requirements card (Prior Auth expected for all)
    const hiddenReqVisible = await page.isVisible("#hiddenReqCard:not(.hidden)");
    log("Hidden requirements card shown (PA expected)", hiddenReqVisible);

    // 17. Annual cost rows populated
    const economyAnnual = await page.textContent("#economyAnnual");
    const recommendedAnnual = await page.textContent("#recommendedAnnual");
    log("Annual cost rows populated", economyAnnual && recommendedAnnual &&
      economyAnnual.includes("$") && !economyAnnual.includes("NaN") &&
      recommendedAnnual.includes("$") && !recommendedAnnual.includes("NaN"));

    // 18. Save Report button visible
    const saveBtnVisible = await page.isVisible("#saveReportBtn:not(.hidden)");
    log("Save Report button visible", saveBtnVisible);

    // 19. Profile summary renders (no null)
    const profileText = await page.textContent("#profileSummary");
    log("Profile summary renders without null", profileText && !profileText.includes("null") && !profileText.includes("undefined"));

    // 20. No JS console errors
    log("No JS console errors", consoleErrors.length === 0);

    // 21. Loss Aversion Warning card removed
    const lossWarningExists = await page.$("#lossAmount");
    log("Loss Aversion Warning card removed (no #lossAmount)", lossWarningExists === null);

    // 22. Cross-page test for P43
    if (p.id === "P43") {
      // Navigate to customer.html
      await page.goto(`${BASE}/customer.html`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

      // Context banner should be visible
      const ctxBanner = await page.isVisible("#pitchContextBanner");
      log("Cross-page: context banner visible on customer.html", ctxBanner);

      // Gate overlay should NOT exist
      const gateExists = await page.$("#vizGate");
      log("Cross-page: no hard gate overlay (#vizGate gone)", gateExists === null);

      // Hint banner should NOT be visible (since we have context)
      const hintVisible = await page.isVisible("#pitchHintBanner");
      log("Cross-page: hint banner hidden when context exists", !hintVisible);

      // Drug pill auto-selected
      const activePill = await page.getAttribute(".drug-pill.active", "data-drug");
      log("Cross-page: correct drug pill auto-selected", activePill === p.drug);

      // Chart titles are in question language
      const chartTitle1 = await page.textContent(".card-title");
      log("Chart titles rewritten (question language)", chartTitle1 && chartTitle1.includes("?"));
    }

  } catch (err) {
    log(`No exception thrown`, false);
    failures.push(`${p.id}: EXCEPTION: ${err.message}`);
  } finally {
    await page.close();
  }

  const personaPass = results.filter(r => r.ok).length;
  const personaFail = results.filter(r => !r.ok).length;
  console.log(`\n${p.id} — ${p.name}`);
  console.log(`  ${personaPass}/${results.length} passed${personaFail > 0 ? " ❌" : " ✅"}`);
  results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.check}`));
}

(async () => {
  console.log("=== PlanPilot Quick Test Suite (no Gemini) ===");
  console.log(`Base URL: ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const p of personas) {
    await runPersona(browser, p);
  }

  await browser.close();

  console.log(`\n=== RESULTS ===`);
  console.log(`Total: ${pass + fail} | Pass: ${pass} | Fail: ${fail}`);
  if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach(f => console.log(`  ❌ ${f}`));
    process.exit(1);
  } else {
    console.log(`\n✅ All ${pass} checks passed!`);
    process.exit(0);
  }
})();

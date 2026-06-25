# PlanPilot — Tier-2 AI Agent Test Suite

Playwright browser automation + Gemini qualitative persona assessment.
Each of the 50 personas fills the Pitch Decoder form, receives analysis, and is evaluated by:

1. **Deterministic assertions** — DOM checks (verdict banner, tactic cards, annual cost rows, no $NaN, etc.)
2. **Gemini qualitative assessment** — in-character persona response + UX assessor note

---

## Quick start

```bash
# 1. Install dependencies (from this tests/ directory)
cd tests
npm install
npx playwright install chromium

# 2. Start the local dev server (from the final/ directory)
cd ../final
python3 -m http.server 8766

# 3. Run all 50 personas (new terminal, from tests/)
GEMINI_API_KEY=your_key_here node agent-runner.js --all

# 4. Open the HTML report
open reports/report-<timestamp>.html
```

---

## Run options

| Command | What it runs |
|---|---|
| `node agent-runner.js --all` | All 50 personas |
| `node agent-runner.js --persona P13` | Single persona by ID |
| `node agent-runner.js --category B` | Category B (step-therapy traps) |
| `node agent-runner.js --category G` | Category G (edge cases) |

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | required | Your Gemini API key |
| `BASE_URL` | `http://localhost:8766` | Where the app is served |
| `CONCURRENCY` | `2` | Parallel browser sessions |
| `HEADLESS` | `true` | Set to `false` to watch browsers run |

---

## Persona categories

| Cat | Count | Description |
|---|---|---|
| A | 12 | Standard happy-path profiles — all 5 drugs, varied demographics |
| B | 7 | Step-therapy trap combos (Humana/Ozempic, Kaiser/Ozempic, BCBS/Jardiance, Aetna/Jardiance, CVS/Jardiance, Cigna/Trulicity, Kaiser/Trulicity) |
| C | 5 | Cheapest plan pitched — expects safe verdict, tests UI when savings=$0 |
| D | 5 | Maximum overpay scenarios — tests highest copay combos |
| E | 4 | Quick Mode flow — only 3 inputs used, tests toggle and budget buttons |
| F | 3 | Cross-page localStorage — generates analysis then navigates to customer.html to verify banner + drug auto-selection |
| G | 14 | Edge cases — age 90, dementia proxy, ESRD at 55, no primaryMed, no conditions, geographic mismatch, mail-order conflict, caregiver context |

---

## Deterministic assertions per persona (up to 14 checks)

- Dashboard renders after analysis
- Verdict banner visible
- Verdict tier matches expected (safe / warning / danger)
- Prior Auth warning shown (all combos have PA=true per JSON)
- Step Therapy warning shown (only for correct combos)
- Tactic cards rendered (≥1)
- "What to say back" text present on tactic cards
- Vulnerability explanation text present
- Annual cost rows populated (no `$NaN`)
- Copay cells populated (no `$NaN`)
- Save Report button visible
- No error state displayed
- Cross-page: context banner visible on customer.html *(Cat F only)*
- Cross-page: correct drug pill auto-selected *(Cat F only)*

---

## Output

Each run generates `tests/reports/report-<timestamp>.html` containing:
- Overall pass rate + breakdown by category
- Per-persona: assertion table, Gemini response (expandable), screenshot (expandable)
- Screenshots saved to `tests/reports/screenshots/P01.png` … `P50.png`

# HealthLens Dashboard

An interactive visual analytics dashboard for health insurance plan comparison and drug coverage analysis.

## Overview

HealthLens is a single-page D3.js dashboard that enables users to:
- **Compare insurance plans** by premiums, deductibles, and out-of-pocket maximums
- **Explore drug coverage** across insurers with formulary tier information
- **Benchmark internationally** against pharmaceutical spending in other countries

Built for the use case of Jardiance (empagliflozin), a diabetes medication with varying coverage across Medicare Part D plans.

## Dashboard Panels

| Panel | Type | Description |
|-------|------|-------------|
| Plan Cost Overview | Bar Chart | Compare metal tier plans (Bronze/Silver/Gold/Platinum) by premium + deductible |
| Drug Copay Explorer | Scatter Plot | Explore insurer positioning by average tier vs copay |
| Multi-Attribute Plans | Parallel Coordinates | Compare plans across premium, deductible, MOOP, and total cost |
| Formulary Tier Grid | Heatmap | View tier placement for top 15 drugs across 8 insurers |
| Global Cost Comparison | Choropleth | Compare per-capita pharmaceutical spending by country |
| Spending Tracker | Area/Line Chart | Track cumulative annual costs under different tier scenarios |

## Data Sources

- **CMS Health Insurance Exchange Public Use Files** (plan_attributes_PUF.csv)
- **Medicare Part D Spending by Drug** (CMS 2023 data)
- **OECD Health Statistics** (pharmaceutical sales per capita)

Note: Formulary tier placement data is synthesized for demonstration purposes based on CMS Part D tier structures.

## Quick Start

### 1. Data Preparation

```bash
python3 prepare_data.py
```

This generates cleaned JSON files in the `data/` directory:
- `plans.json` - Health insurance plan attributes
- `partd_spending.json` - Medicare drug spending data
- `formulary.json` - Synthesized formulary tier data
- `countries.json` - OECD pharmaceutical spending by country
- `spending_tracker.json` - Annual cost tracking scenarios

### 2. Run the Dashboard

Option 1: Open directly in browser
```bash
open index.html
```

Option 2: Use local server (recommended for D3)
```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Linked Brushing

The dashboard supports cross-panel filtering:
- **Click bar** in Plan Cost Overview → highlights plans in Parallel Coordinates
- **Brush** in Drug Copay Explorer → highlights matching insurers in Heatmap
- **Click cell** in Formulary Tier Grid → filters scatter to that drug
- **Click country** on map → shows benchmark comparison

Click **Reset All** to clear filters.

## File Structure

```
Final Proj/
├── README.md
├── prepare_data.py          # Data cleaning script
├── index.html              # Main dashboard
├── data/                   # Generated JSON files
│   ├── plans.json
│   ├── partd_spending.json
│   ├── formulary.json
│   ├── countries.json
│   └── spending_tracker.json
└── [source CSV files]      # Raw CMS/OECD data
```

## Dependencies

- **D3.js v7** - Loaded via CDN
- **TopoJSON** - For world map geometry
- **Python 3** + pandas - For data preparation

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

Data used is from public government sources (CMS, OECD). Dashboard code is provided for educational purposes.

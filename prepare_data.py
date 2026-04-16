#!/usr/bin/env python3
"""
HealthLens Data Preparation Script
Converts raw CMS and OECD data into cleaned JSON for the D3 dashboard.
"""

import pandas as pd
import json
import numpy as np
from pathlib import Path

# Set paths
BASE_DIR = Path("/Users/manojtejapatcha/Desktop/Visualization/Final Proj")
DATA_DIR = BASE_DIR / "data"

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)

def clean_money(val):
    """Convert money strings like '$1,500' to float."""
    if pd.isna(val) or val in ['Not Applicable', '']:
        return np.nan
    if isinstance(val, (int, float)):
        return float(val)
    val = str(val).replace('$', '').replace(',', '').replace(' per person', '').replace(' per group', '')
    try:
        return float(val)
    except:
        return np.nan

def process_plans():
    """Process plan_attributes_PUF.csv into plans.json"""
    print("Processing plans data...")
    
    df = pd.read_csv(BASE_DIR / "plan_attributes_PUF.csv", low_memory=False)
    
    # Filter to Individual market, non-dental plans with valid metal levels
    df = df[df['MarketCoverage'] == 'Individual']
    df = df[df['DentalOnlyPlan'] == 'No']
    df = df[df['MetalLevel'].isin(['Bronze', 'Silver', 'Gold', 'Platinum'])]
    
    # Clean monetary columns
    money_cols = ['MEHBInnTier1IndividualMOOP', 'MEHBInnTier1IndividualDeductible']
    for col in money_cols:
        if col in df.columns:
            df[col] = df[col].apply(clean_money)
    
    # Add synthesized premium based on metal level (CMS averages adjusted)
    premium_map = {'Bronze': 450, 'Silver': 550, 'Gold': 650, 'Platinum': 850}
    df['premium_monthly'] = df['MetalLevel'].map(premium_map)
    df['premium_annual'] = df['premium_monthly'] * 12
    
    # Clean up insurer names
    df['insurer'] = df['IssuerMarketPlaceMarketingName'].fillna('Unknown')
    
    # Fill missing MOOP and deductible with metal-level averages
    moop_map = {'Bronze': 9100, 'Silver': 9100, 'Gold': 8000, 'Platinum': 4000}
    ded_map = {'Bronze': 7500, 'Silver': 4500, 'Gold': 1500, 'Platinum': 0}
    
    df['MOOP'] = df.get('MEHBInnTier1IndividualMOOP', pd.Series([np.nan] * len(df)))
    df['deductible'] = df.get('MEHBInnTier1IndividualDeductible', pd.Series([np.nan] * len(df)))
    
    # Clean and fill MOOP/deductible values
    for tier in ['Bronze', 'Silver', 'Gold', 'Platinum']:
        mask = df['MetalLevel'] == tier
        df.loc[mask, 'MOOP'] = df.loc[mask, 'MOOP'].fillna(moop_map[tier])
        df.loc[mask, 'deductible'] = df.loc[mask, 'deductible'].fillna(ded_map[tier])
    
    # Sample down to ~50 representative plans per metal tier for visualization
    sampled = []
    for tier in ['Bronze', 'Silver', 'Gold', 'Platinum']:
        tier_plans = df[df['MetalLevel'] == tier]
        if len(tier_plans) > 0:
            sample_size = min(50, len(tier_plans))
            sampled.append(tier_plans.sample(n=sample_size, random_state=42))
    
    plans_sample = pd.concat(sampled) if sampled else df.head(200)
    
    # Prepare output
    output = []
    for _, row in plans_sample.iterrows():
        plan_name = str(row.get('PlanMarketingName', 'Unknown'))[:50]
        insurer = str(row.get('insurer', 'Unknown'))[:40]
        metal = str(row.get('MetalLevel', 'Unknown'))
        state = str(row.get('StateCode', 'Unknown'))
        plan_type = str(row.get('PlanType', 'PPO'))
        
        output.append({
            'plan_name': plan_name,
            'insurer': insurer,
            'metal_level': metal,
            'state': state,
            'plan_type': plan_type,
            'premium_monthly': int(row.get('premium_monthly', 500)),
            'premium_annual': int(row.get('premium_annual', 6000)),
            'deductible': int(row.get('deductible', 5000)),
            'MOOP': int(row.get('MOOP', 8000)),
            'total_first_year': int(row.get('premium_annual', 6000) + row.get('deductible', 5000))
        })
    
    with open(DATA_DIR / 'plans.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"  Generated plans.json with {len(output)} plans")
    return output

def process_partd_spending():
    """Process Medicare Part D spending data"""
    print("Processing Part D spending data...")
    
    df = pd.read_csv(BASE_DIR / "Medicare Part D Spending by Drug/2023/DSD_PTD_RY25_P04_V10_DY23_BGM.csv")
    
    # Filter to Overall manufacturer (not individual manufacturers)
    df = df[df['Mftr_Name'] == 'Overall'].copy()
    
    # Get top 20 drugs by 2023 spending
    df['Tot_Spndng_2023'] = pd.to_numeric(df['Tot_Spndng_2023'], errors='coerce')
    top_drugs = df.nlargest(20, 'Tot_Spndng_2023')[['Brnd_Name', 'Gnrc_Name', 
        'Tot_Spndng_2023', 'Tot_Dsg_Unts_2023', 'Tot_Clms_2023', 'Tot_Benes_2023',
        'Avg_Spnd_Per_Dsg_Unt_Wghtd_2023', 'Avg_Spnd_Per_Clm_2023']].copy()
    
    # Also find diabetes drugs
    diabetes_keywords = ['diabetic', 'diabetes', 'insulin', 'glipizide', 'metformin', 
                        'empagliflozin', 'sitagliptin', 'linagliptin']
    mask = df['Gnrc_Name'].str.lower().str.contains('|'.join(diabetes_keywords), na=False)
    diabetes_drugs = df[mask].head(10)[['Brnd_Name', 'Gnrc_Name', 
        'Tot_Spndng_2023', 'Tot_Dsg_Unts_2023', 'Tot_Clms_2023', 'Tot_Benes_2023',
        'Avg_Spnd_Per_Dsg_Unt_Wghtd_2023', 'Avg_Spnd_Per_Clm_2023']].copy()
    
    # Combine and deduplicate
    combined = pd.concat([top_drugs, diabetes_drugs]).drop_duplicates(subset=['Brnd_Name'])
    
    output = []
    for _, row in combined.iterrows():
        output.append({
            'brand_name': str(row['Brnd_Name']),
            'generic_name': str(row['Gnrc_Name']),
            'total_spending_2023': float(row['Tot_Spndng_2023']) if pd.notna(row['Tot_Spndng_2023']) else 0,
            'dosage_units_2023': float(row['Tot_Dsg_Unts_2023']) if pd.notna(row['Tot_Dsg_Unts_2023']) else 0,
            'claims_2023': float(row['Tot_Clms_2023']) if pd.notna(row['Tot_Clms_2023']) else 0,
            'beneficiaries_2023': float(row['Tot_Benes_2023']) if pd.notna(row['Tot_Benes_2023']) else 0,
            'avg_cost_per_unit': float(row['Avg_Spnd_Per_Dsg_Unt_Wghtd_2023']) if pd.notna(row['Avg_Spnd_Per_Dsg_Unt_Wghtd_2023']) else 0,
            'avg_cost_per_claim': float(row['Avg_Spnd_Per_Clm_2023']) if pd.notna(row['Avg_Spnd_Per_Clm_2023']) else 0
        })
    
    with open(DATA_DIR / 'partd_spending.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"  Generated partd_spending.json with {len(output)} drugs")
    return output

def generate_formulary(partd_drugs):
    """Generate realistic formulary tier data (illustrative/synthesized)"""
    print("Generating formulary tier data...")
    
    # Realistic Part D insurers
    insurers = ['Humana', 'WellCare', 'UnitedHealthcare', 'Aetna', 'Cigna', 
                'Blue Cross Blue Shield', 'Kaiser Permanente', 'CVS Caremark']
    
    # CMS Part D tier structure copay ranges (approximate)
    tier_copays = {
        1: (0, 5),      # Preferred Generic
        2: (5, 15),     # Generic
        3: (25, 45),    # Preferred Brand
        4: (45, 80),    # Non-Preferred Drug
        5: (100, 200)   # Specialty Tier
    }
    
    output = []
    
    for drug in partd_drugs[:20]:  # Top 20 drugs
        for insurer in insurers:
            # Synthesize tier based on drug characteristics
            avg_cost = drug['avg_cost_per_unit']
            
            # Simple heuristic: higher cost drugs go to higher tiers
            if avg_cost > 1000:
                base_tier = 5
            elif avg_cost > 500:
                base_tier = 4
            elif avg_cost > 100:
                base_tier = 3
            elif avg_cost > 10:
                base_tier = 2
            else:
                base_tier = 1
            
            # Add some variation between insurers (±1 tier)
            np.random.seed(hash(drug['brand_name'] + insurer) % 10000)
            tier = max(1, min(5, base_tier + np.random.randint(-1, 2)))
            
            # Generate copay based on tier
            copay_range = tier_copays[tier]
            copay = np.random.randint(copay_range[0], copay_range[1] + 1)
            
            # Prior authorization and step therapy (higher tiers more likely)
            pa_required = np.random.random() < (tier * 0.15)
            step_therapy = np.random.random() < (tier * 0.10)
            
            output.append({
                'drug_brand': drug['brand_name'],
                'drug_generic': drug['generic_name'],
                'insurer': insurer,
                'tier': int(tier),
                'copay': int(copay),
                'prior_auth_required': pa_required,
                'step_therapy': step_therapy
            })
    
    with open(DATA_DIR / 'formulary.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"  Generated formulary.json with {len(output)} entries (illustrative data)")
    return output

def process_oecd_countries():
    """Process OECD pharmaceutical spending data"""
    print("Processing OECD country data...")
    
    df = pd.read_csv(BASE_DIR / "OECD.ELS.HD,HEALTH_PHMC@DF_PHMC_SALES,1.1+..USD_PPP_PS.._T.csv")
    
    # Get latest year for each country
    df['TIME_PERIOD'] = pd.to_numeric(df['TIME_PERIOD'], errors='coerce')
    df = df.dropna(subset=['OBS_VALUE', 'TIME_PERIOD'])
    
    latest = df.loc[df.groupby('Reference area')['TIME_PERIOD'].idxmax()]
    
    # Country name to ISO mapping for D3
    iso_map = {
        'United States': 'USA',
        'United Kingdom': 'GBR',
        'Germany': 'DEU',
        'France': 'FRA',
        'Italy': 'ITA',
        'Spain': 'ESP',
        'Canada': 'CAN',
        'Australia': 'AUS',
        'Japan': 'JPN',
        'Korea': 'KOR',
        'Netherlands': 'NLD',
        'Sweden': 'SWE',
        'Norway': 'NOR',
        'Denmark': 'DNK',
        'Finland': 'FIN',
        'Switzerland': 'CHE',
        'Austria': 'AUT',
        'Belgium': 'BEL',
        'Ireland': 'IRL',
        'New Zealand': 'NZL',
        'Portugal': 'PRT',
        'Greece': 'GRC',
        'Czech Republic': 'CZE',
        'Poland': 'POL',
        'Hungary': 'HUN',
        'Slovak Republic': 'SVK',
        'Slovenia': 'SVN',
        'Estonia': 'EST',
        'Latvia': 'LVA',
        'Lithuania': 'LTU',
        'Luxembourg': 'LUX',
        'Mexico': 'MEX',
        'Chile': 'CHL',
        'Israel': 'ISR',
        'Turkey': 'TUR',
        'Colombia': 'COL',
        'Costa Rica': 'CRI',
        'Iceland': 'ISL'
    }
    
    output = []
    for _, row in latest.iterrows():
        country = row['Reference area']
        iso = iso_map.get(country, None)
        if iso:
            output.append({
                'country': country,
                'iso_code': iso,
                'spending_ppp': float(row['OBS_VALUE']),
                'year': int(row['TIME_PERIOD'])
            })
    
    # Ensure USA is included with estimated value if missing
    usa_present = any(c['iso_code'] == 'USA' for c in output)
    if not usa_present:
        output.append({
            'country': 'United States',
            'iso_code': 'USA',
            'spending_ppp': 1400.0,  # Estimated from OECD health data
            'year': 2023
        })
    
    with open(DATA_DIR / 'countries.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"  Generated countries.json with {len(output)} countries")
    return output

def generate_spending_tracker(formulary_data):
    """Generate spending tracker data for Jardiance archetype"""
    print("Generating spending tracker data...")
    
    # Simulate monthly spending for Jardiance under different tier plans
    # Jardiance retail ~$600/month, typical Medicare Part D structure
    
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    # Annual deductible $545 (Part D standard), then copays
    deductible = 545
    
    # Tier-based copays for Jardiance
    scenarios = {
        'Tier 1 (Preferred Generic)': {
            'monthly_copay': 5,
            'color': '#1a9850'
        },
        'Tier 3 (Preferred Brand)': {
            'monthly_copay': 35,
            'color': '#d73027'
        },
        'Tier 5 (Specialty)': {
            'monthly_copay': 50,
            'color': '#fc8d59'
        }
    }
    
    output = []
    for scenario_name, config in scenarios.items():
        monthly_copay = config['monthly_copay']
        cumulative = 0
        monthly_data = []
        
        for i, month in enumerate(months):
            # First month hits deductible + copay
            if i == 0:
                cost = min(deductible, 600) + monthly_copay
            else:
                cost = monthly_copay
            
            cumulative += cost
            monthly_data.append({
                'month': month,
                'monthly_cost': int(cost),
                'cumulative_cost': int(cumulative)
            })
        
        # Extract tier number from scenario name like "Tier 1 (Preferred Generic)"
        tier_num = int(scenario_name.split()[1])
        output.append({
            'scenario': scenario_name,
            'tier': tier_num,
            'color': config['color'],
            'monthly_data': monthly_data,
            'annual_total': int(cumulative)
        })
    
    with open(DATA_DIR / 'spending_tracker.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"  Generated spending_tracker.json with {len(output)} scenarios")
    return output

def main():
    print("=" * 60)
    print("HealthLens Data Preparation")
    print("=" * 60)
    
    try:
        plans = process_plans()
        partd_drugs = process_partd_spending()
        formulary = generate_formulary(partd_drugs)
        countries = process_oecd_countries()
        tracker = generate_spending_tracker(formulary)
        
        print("\n" + "=" * 60)
        print("All data files generated successfully!")
        print(f"Output directory: {DATA_DIR}")
        print("\nGenerated files:")
        for f in DATA_DIR.glob('*.json'):
            print(f"  - {f.name}")
        print("=" * 60)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

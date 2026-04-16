#!/usr/bin/env python3
"""
Enhanced data preparation with multi-year trends, global time series, 
and expanded insurer features for rich dashboard.
"""

import pandas as pd
import json
import numpy as np
from pathlib import Path

BASE_DIR = Path("/Users/manojtejapatcha/Desktop/Visualization/Final Proj")
DATA_DIR = BASE_DIR / "data"
PARTD_FILE = BASE_DIR / "Medicare Part D Spending by Drug/2023/DSD_PTD_RY25_P04_V10_DY23_BGM.csv"
OECD_FILE = BASE_DIR / "OECD.ELS.HD,HEALTH_PHMC@DF_PHMC_SALES,1.1+..USD_PPP_PS.._T.csv"

# Target drugs (top 5 by 2023 spending)
TARGET_DRUGS = ['Eliquis', 'Ozempic', 'Jardiance', 'Trulicity', 'Xarelto']

DRUG_META = {
    'Eliquis':   {'id': 'eliquis',   'generic': 'Apixaban',     'class': 'Anticoagulant',  'condition': 'AFib, DVT/PE',              'retail': 550,  'supply': '60 tablets'},
    'Ozempic':   {'id': 'ozempic',   'generic': 'Semaglutide',  'class': 'GLP-1 Agonist',  'condition': 'T2 Diabetes, Weight Mgmt',  'retail': 936,  'supply': '1 injection pen'},
    'Jardiance': {'id': 'jardiance', 'generic': 'Empagliflozin', 'class': 'SGLT2 Inhibitor', 'condition': 'T2 Diabetes, Heart Failure', 'retail': 600, 'supply': '30 tablets'},
    'Trulicity': {'id': 'trulicity', 'generic': 'Dulaglutide',  'class': 'GLP-1 Agonist',  'condition': 'T2 Diabetes',                'retail': 984,  'supply': '4 injections'},
    'Xarelto':   {'id': 'xarelto',   'generic': 'Rivaroxaban',  'class': 'Anticoagulant',  'condition': 'AFib, DVT/PE',              'retail': 520,  'supply': '30 tablets'},
}

def process_drug_trends():
    """Extract 5-year trends for target drugs from CMS Medicare Part D"""
    print("Processing drug trends (2019-2023)...")
    df = pd.read_csv(PARTD_FILE, low_memory=False)
    df = df[df['Mftr_Name'] == 'Overall']
    
    # Match target drugs (case-insensitive)
    df['brand_match'] = df['Brnd_Name'].astype(str).str.lower()
    
    drugs_data = []
    for target in TARGET_DRUGS:
        matches = df[df['brand_match'].str.contains(target.lower(), na=False, regex=False)]
        if matches.empty:
            continue
        row = matches.iloc[0]
        meta = DRUG_META[target]
        
        # 5-year time series
        yearly = []
        for year in [2019, 2020, 2021, 2022, 2023]:
            spending = row.get(f'Tot_Spndng_{year}', np.nan)
            units = row.get(f'Tot_Dsg_Unts_{year}', np.nan)
            claims = row.get(f'Tot_Clms_{year}', np.nan)
            benes = row.get(f'Tot_Benes_{year}', np.nan)
            cost_per_unit = row.get(f'Avg_Spnd_Per_Dsg_Unt_Wghtd_{year}', np.nan)
            cost_per_claim = row.get(f'Avg_Spnd_Per_Clm_{year}', np.nan)
            cost_per_bene = row.get(f'Avg_Spnd_Per_Bene_{year}', np.nan)
            
            if pd.notna(spending):
                yearly.append({
                    'year': year,
                    'total_spending': float(spending),
                    'total_spending_billions': round(float(spending) / 1e9, 2),
                    'claims': int(claims) if pd.notna(claims) else 0,
                    'beneficiaries': int(benes) if pd.notna(benes) else 0,
                    'cost_per_unit': round(float(cost_per_unit), 2) if pd.notna(cost_per_unit) else 0,
                    'cost_per_claim': round(float(cost_per_claim), 2) if pd.notna(cost_per_claim) else 0,
                    'cost_per_beneficiary': round(float(cost_per_bene), 2) if pd.notna(cost_per_bene) else 0,
                })
        
        # CAGR and YoY
        cagr = row.get('CAGR_Avg_Spnd_Per_Dsg_Unt_19_23', np.nan)
        yoy_change = row.get('Chg_Avg_Spnd_Per_Dsg_Unt_22_23', np.nan)
        
        # Calculate growth stats
        if len(yearly) >= 2:
            first = yearly[0]
            last = yearly[-1]
            spend_growth = ((last['total_spending'] - first['total_spending']) / first['total_spending']) * 100 if first['total_spending'] > 0 else 0
            bene_growth = ((last['beneficiaries'] - first['beneficiaries']) / first['beneficiaries']) * 100 if first['beneficiaries'] > 0 else 0
        else:
            spend_growth = 0
            bene_growth = 0
        
        drugs_data.append({
            'id': meta['id'],
            'brand_name': target,
            'generic_name': meta['generic'],
            'therapeutic_class': meta['class'],
            'condition': meta['condition'],
            'retail_price': meta['retail'],
            'monthly_supply': meta['supply'],
            'yearly_data': yearly,
            'cagr_cost_per_unit': round(float(cagr) * 100, 2) if pd.notna(cagr) else 0,
            'yoy_change_22_23': round(float(yoy_change) * 100, 2) if pd.notna(yoy_change) else 0,
            'total_spending_growth_pct': round(spend_growth, 1),
            'beneficiary_growth_pct': round(bene_growth, 1),
            'latest_spending_b': round(yearly[-1]['total_spending'] / 1e9, 2) if yearly else 0,
            'latest_beneficiaries_m': round(yearly[-1]['beneficiaries'] / 1e6, 2) if yearly else 0,
            'latest_claims_m': round(yearly[-1]['claims'] / 1e6, 2) if yearly else 0,
        })
    
    return drugs_data

def process_global_trends():
    """Extract pharmaceutical spending time series for key countries"""
    print("Processing global trends (2010-2023)...")
    df = pd.read_csv(OECD_FILE, low_memory=False)
    
    # Key benchmark countries
    target_countries = {
        'United States': {'iso': 'USA', 'flag': '🇺🇸', 'system': 'Private / Medicare'},
        'Canada': {'iso': 'CAN', 'flag': '🇨🇦', 'system': 'Public + Private'},
        'United Kingdom': {'iso': 'GBR', 'flag': '🇬🇧', 'system': 'NHS (single-payer)'},
        'Germany': {'iso': 'DEU', 'flag': '🇩🇪', 'system': 'Statutory Insurance'},
        'France': {'iso': 'FRA', 'flag': '🇫🇷', 'system': 'Universal + Supplementary'},
        'Japan': {'iso': 'JPN', 'flag': '🇯🇵', 'system': 'Universal Statutory'},
        'Australia': {'iso': 'AUS', 'flag': '🇦🇺', 'system': 'Medicare + PBS'},
        'Switzerland': {'iso': 'CHE', 'flag': '🇨🇭', 'system': 'Mandatory Private'},
    }
    
    countries_data = []
    for country_name, meta in target_countries.items():
        subset = df[df['Reference area'] == country_name].copy()
        if subset.empty:
            continue
        
        subset = subset.sort_values('TIME_PERIOD')
        yearly = []
        for _, row in subset.iterrows():
            year = int(row['TIME_PERIOD'])
            val = row.get('OBS_VALUE', np.nan)
            if pd.notna(val) and year >= 2010:
                yearly.append({
                    'year': year,
                    'spending_per_capita': round(float(val), 1)
                })
        
        if yearly:
            latest = yearly[-1]
            first = yearly[0]
            growth = ((latest['spending_per_capita'] - first['spending_per_capita']) / first['spending_per_capita']) * 100 if first['spending_per_capita'] > 0 else 0
            
            countries_data.append({
                'country': country_name,
                'iso_code': meta['iso'],
                'flag': meta['flag'],
                'system': meta['system'],
                'yearly_data': yearly,
                'latest_year': latest['year'],
                'latest_spending': latest['spending_per_capita'],
                'first_year': first['year'],
                'first_spending': first['spending_per_capita'],
                'growth_pct': round(growth, 1),
            })
    
    # Sort by latest spending descending
    countries_data.sort(key=lambda x: -x['latest_spending'])
    return countries_data

def generate_insurer_pricing(drugs_data):
    """Enhanced insurer pricing with additional features"""
    print("Generating enhanced insurer pricing...")
    
    insurers = [
        {'name': 'UnitedHealthcare',      'market_share': 24, 'network_size': 'Nationwide'},
        {'name': 'Blue Cross Blue Shield','market_share': 20, 'network_size': 'Nationwide'},
        {'name': 'Humana',                'market_share': 18, 'network_size': 'Nationwide'},
        {'name': 'Aetna',                 'market_share': 12, 'network_size': 'Nationwide'},
        {'name': 'Cigna',                 'market_share': 10, 'network_size': 'Nationwide'},
        {'name': 'WellCare',              'market_share': 8,  'network_size': 'Regional'},
        {'name': 'Kaiser Permanente',     'market_share': 5,  'network_size': 'Regional'},
        {'name': 'CVS Caremark',          'market_share': 3,  'network_size': 'Regional'},
    ]
    
    records = []
    for drug in drugs_data:
        meta = DRUG_META[drug['brand_name']]
        base_cost = drug['yearly_data'][-1]['cost_per_claim'] if drug['yearly_data'] else meta['retail']
        
        for insurer in insurers:
            discount = 0.75 + (insurer['market_share'] / 100) * 0.15
            np.random.seed(hash(drug['id'] + insurer['name']) % 10000)
            variation = np.random.uniform(0.85, 1.15)
            price = round(base_cost * discount * variation, -1)
            
            ratio = price / meta['retail']
            if ratio < 0.5:
                tier, copay = 2, int(np.random.choice([20, 25, 30, 35]))
            elif ratio < 0.75:
                tier, copay = 3, int(np.random.choice([40, 45, 50]))
            else:
                tier, copay = 4, int(np.random.choice([80, 95, 100]))
            
            pa = bool((tier >= 4) or (meta['retail'] > 800) or (np.random.random() < 0.15))
            st = bool((meta['class'] in ['GLP-1 Agonist', 'SGLT2 Inhibitor']) and (np.random.random() < 0.35))
            quantity_limit = bool(np.random.random() < 0.25)
            mail_order = bool(np.random.random() < 0.7)
            
            # Mail order discount (typically 20-30%)
            mail_order_copay = int(copay * 0.75) if mail_order else copay
            
            records.append({
                'drug_id': drug['id'],
                'drug_name': drug['brand_name'],
                'insurer': insurer['name'],
                'network_size': insurer['network_size'],
                'market_share': insurer['market_share'],
                'negotiated_price': int(price),
                'patient_copay': copay,
                'mail_order_copay': mail_order_copay,
                'tier': tier,
                'prior_auth_required': pa,
                'step_therapy': st,
                'quantity_limit': quantity_limit,
                'mail_order_available': mail_order,
            })
    
    return records

def generate_patient_scenarios(drugs_data, insurer_pricing, global_data):
    """Generate annual cost scenarios with multiple comparisons"""
    print("Generating patient scenarios...")
    scenarios = []
    us_data = next((c for c in global_data if c['iso_code'] == 'USA'), None)
    
    for drug in drugs_data:
        drug_insurers = [p for p in insurer_pricing if p['drug_id'] == drug['id']]
        best = min(drug_insurers, key=lambda x: x['patient_copay'])
        worst = max(drug_insurers, key=lambda x: x['patient_copay'])
        meta = DRUG_META[drug['brand_name']]
        
        retail_annual = meta['retail'] * 12
        
        scenario_list = [
            {'name': 'Best US Coverage',    'annual': best['patient_copay'] * 12,   'type': 'best',    'currency': 'USD'},
            {'name': 'Worst US Coverage',   'annual': worst['patient_copay'] * 12,  'type': 'worst',   'currency': 'USD'},
            {'name': 'Medicare Average',    'annual': int(drug['yearly_data'][-1]['cost_per_bene'] if drug['yearly_data'] and drug['yearly_data'][-1].get('cost_per_bene') else drug['yearly_data'][-1].get('cost_per_beneficiary', 0)) if drug['yearly_data'] else 0, 'type': 'avg', 'currency': 'USD'},
            {'name': 'No Insurance',        'annual': retail_annual,                'type': 'retail',  'currency': 'USD'},
            {'name': 'Canada (typical)',    'annual': int(meta['retail'] * 0.6 * 12 * 0.15), 'type': 'global', 'currency': 'USD'},
            {'name': 'UK (NHS)',            'annual': int(9.65 * 12),               'type': 'global', 'currency': 'GBP'},
        ]
        
        scenarios.append({
            'drug_id': drug['id'],
            'drug_name': drug['brand_name'],
            'scenarios': scenario_list,
            'max_savings': retail_annual - (best['patient_copay'] * 12),
        })
    
    return scenarios

def main():
    drugs_data = process_drug_trends()
    global_data = process_global_trends()
    insurer_data = generate_insurer_pricing(drugs_data)
    scenario_data = generate_patient_scenarios(drugs_data, insurer_data, global_data)
    
    with open(DATA_DIR / 'drug_trends.json', 'w') as f:
        json.dump(drugs_data, f, indent=2)
    
    with open(DATA_DIR / 'global_trends.json', 'w') as f:
        json.dump(global_data, f, indent=2)
    
    with open(DATA_DIR / 'insurer_pricing.json', 'w') as f:
        json.dump(insurer_data, f, indent=2)
    
    with open(DATA_DIR / 'patient_scenarios.json', 'w') as f:
        json.dump(scenario_data, f, indent=2)
    
    print("\n✓ Enhanced dataset generated:")
    print(f"  - {len(drugs_data)} drugs with 5-year trends (2019-2023)")
    print(f"  - {len(global_data)} countries with time series (2010-2023)")
    print(f"  - {len(insurer_data)} insurer-drug records with full feature set")
    print(f"  - {len(scenario_data)} multi-scenario cost projections")

if __name__ == "__main__":
    main()

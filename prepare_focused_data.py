#!/usr/bin/env python3
"""
Generate focused drug comparison data for HealthLens v2
Top 5 drugs with insurer pricing and global benchmarks
"""

import pandas as pd
import json
import numpy as np
from pathlib import Path

BASE_DIR = Path("/Users/manojtejapatcha/Desktop/Visualization/Final Proj")
DATA_DIR = BASE_DIR / "data"

def generate_focused_data():
    # Top 5 drugs by Medicare spending with therapeutic areas
    drugs = [
        {
            "id": "eliquis",
            "brand_name": "Eliquis",
            "generic_name": "Apixaban",
            "therapeutic_class": "Anticoagulant",
            "condition": "Atrial Fibrillation, DVT/PE",
            "avg_claim_cost": 862,
            "retail_price": 550,
            "monthly_supply": 60,  # tablets
            "description": "Blood thinner to prevent stroke and blood clots"
        },
        {
            "id": "ozempic", 
            "brand_name": "Ozempic",
            "generic_name": "Semaglutide",
            "therapeutic_class": "GLP-1 Agonist",
            "condition": "Type 2 Diabetes, Weight Management",
            "avg_claim_cost": 1327,
            "retail_price": 936,
            "monthly_supply": 1,  # injection pen
            "description": "Weekly injection for blood sugar control and weight loss"
        },
        {
            "id": "jardiance",
            "brand_name": "Jardiance", 
            "generic_name": "Empagliflozin",
            "therapeutic_class": "SGLT2 Inhibitor",
            "condition": "Type 2 Diabetes, Heart Failure",
            "avg_claim_cost": 570,
            "retail_price": 600,
            "monthly_supply": 30,  # tablets
            "description": "Oral medication for diabetes with heart benefits"
        },
        {
            "id": "trulicity",
            "brand_name": "Trulicity",
            "generic_name": "Dulaglutide", 
            "therapeutic_class": "GLP-1 Agonist",
            "condition": "Type 2 Diabetes",
            "avg_claim_cost": 1385,
            "retail_price": 984,
            "monthly_supply": 4,  # injections
            "description": "Weekly injection for type 2 diabetes management"
        },
        {
            "id": "xarelto",
            "brand_name": "Xarelto",
            "generic_name": "Rivaroxaban",
            "therapeutic_class": "Anticoagulant",
            "condition": "Atrial Fibrillation, DVT/PE",
            "avg_claim_cost": 948,
            "retail_price": 520,
            "monthly_supply": 30,  # tablets
            "description": "Once-daily blood thinner for stroke prevention"
        }
    ]
    
    # Realistic insurer pricing structure
    insurers = [
        {"name": "Humana", "market_share": 18},
        {"name": "UnitedHealthcare", "market_share": 24},
        {"name": "Aetna", "market_share": 12},
        {"name": "Cigna", "market_share": 10},
        {"name": "Blue Cross Blue Shield", "market_share": 20},
        {"name": "WellCare", "market_share": 8},
        {"name": "Kaiser Permanente", "market_share": 5},
        {"name": "CVS Caremark", "market_share": 3}
    ]
    
    # Generate insurer-specific pricing for each drug
    insurer_pricing = []
    for drug in drugs:
        base_cost = drug["avg_claim_cost"]
        
        for insurer in insurers:
            # Larger insurers get better pricing
            discount_factor = 0.75 + (insurer["market_share"] / 100) * 0.15
            
            # Random variation per insurer-drug combo (±15%)
            np.random.seed(hash(drug["id"] + insurer["name"]) % 10000)
            variation = np.random.uniform(0.85, 1.15)
            
            negotiated_price = round(base_cost * discount_factor * variation, -1)
            
            # Determine tier based on price relative to retail
            price_ratio = negotiated_price / drug["retail_price"]
            if price_ratio < 0.4:
                tier = 2
                copay = np.random.choice([20, 25, 30, 35])
            elif price_ratio < 0.6:
                tier = 3
                copay = np.random.choice([40, 45, 50])
            else:
                tier = 4
                copay = np.random.choice([80, 95, 100])
            
            # Prior auth more likely for higher tiers and specialty drugs
            pa_required = (tier >= 4) or (drug["retail_price"] > 800) or (np.random.random() < 0.15)
            step_therapy = (drug["therapeutic_class"] in ["GLP-1 Agonist", "SGLT2 Inhibitor"]) and (np.random.random() < 0.3)
            
            insurer_pricing.append({
                "drug_id": drug["id"],
                "drug_name": drug["brand_name"],
                "insurer": insurer["name"],
                "negotiated_price": int(negotiated_price),
                "patient_copay": int(copay),
                "tier": tier,
                "tier_name": f"Tier {tier}",
                "prior_auth_required": pa_required,
                "step_therapy": step_therapy,
                "market_share": insurer["market_share"]
            })
    
    # Global pricing benchmarks (realistic approximations)
    global_prices = []
    for drug in drugs:
        us_retail = drug["retail_price"]
        
        # Canada: ~60-70% of US (patent laws, price negotiation)
        canada_price = round(us_retail * np.random.uniform(0.55, 0.70), -1)
        canada_copay = max(0, canada_price - 450) if canada_price > 450 else 0  # provincial coverage
        
        # UK: NHS covers most, patient pays £0-£9.65 prescription charge
        uk_price = round(us_retail * np.random.uniform(0.25, 0.40), -1)  # NHS procurement
        uk_copay = 9.65 if drug["retail_price"] < 2000 else 0  # exempt if high cost
        
        global_prices.append({
            "drug_id": drug["id"],
            "drug_name": drug["brand_name"],
            "us_retail": drug["retail_price"],
            "us_medicare_avg": drug["avg_claim_cost"],
            "canada_price": int(canada_price),
            "canada_patient_cost": int(canada_copay),
            "uk_price_gbp": int(uk_price * 0.79),  # Convert to GBP
            "uk_patient_cost_gbp": uk_copay,
            "canada_notes": "Provincial formularies vary; some require special authorization",
            "uk_notes": "NHS covers via NICE appraisal; standard prescription charge applies"
        })
    
    # Patient annual cost scenarios
    patient_scenarios = []
    for drug in drugs:
        retail_monthly = drug["retail_price"]
        
        # Best case: Tier 2 with good insurer
        best_insurer = min([p for p in insurer_pricing if p["drug_id"] == drug["id"]], 
                          key=lambda x: x["patient_copay"])
        
        # Worst case: No insurance, retail price
        # Average case: Medicare average
        
        tiers = [
            {"name": "Best Coverage (Tier 2)", "monthly_copay": best_insurer["patient_copay"], 
             "annual": best_insurer["patient_copay"] * 12},
            {"name": "Medicare Average", "monthly_copay": drug["avg_claim_cost"], 
             "annual": drug["avg_claim_cost"] * 12},
            {"name": "No Insurance (Retail)", "monthly_copay": retail_monthly, 
             "annual": retail_monthly * 12},
            {"name": "Canada (Provincial)", "monthly_copay": max(0, global_prices[drugs.index(drug)]["canada_patient_cost"]), 
             "annual": max(0, global_prices[drugs.index(drug)]["canada_patient_cost"]) * 12},
            {"name": "UK (NHS)", "monthly_copay": global_prices[drugs.index(drug)]["uk_patient_cost_gbp"], 
             "annual": global_prices[drugs.index(drug)]["uk_patient_cost_gbp"] * 12}
        ]
        
        patient_scenarios.append({
            "drug_id": drug["id"],
            "drug_name": drug["brand_name"],
            "scenarios": tiers,
            "savings_vs_retail": retail_monthly * 12 - tiers[0]["annual"]
        })
    
    # Save all files
    with open(DATA_DIR / 'drug_profiles.json', 'w') as f:
        json.dump(drugs, f, indent=2)
    
    with open(DATA_DIR / 'insurer_pricing.json', 'w') as f:
        json.dump(insurer_pricing, f, indent=2)
    
    with open(DATA_DIR / 'global_prices.json', 'w') as f:
        json.dump(global_prices, f, indent=2)
    
    with open(DATA_DIR / 'patient_scenarios.json', 'w') as f:
        json.dump(patient_scenarios, f, indent=2)
    
    print("✓ Generated focused dataset:")
    print(f"  - {len(drugs)} drug profiles")
    print(f"  - {len(insurer_pricing)} insurer-drug pricing records")
    print(f"  - {len(global_prices)} global benchmarks")
    print(f"  - {len(patient_scenarios)} patient scenario comparisons")

if __name__ == "__main__":
    generate_focused_data()

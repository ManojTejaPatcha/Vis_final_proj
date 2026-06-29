/* =========================================================
   DrugWatch · Prescription Drug Cost Intelligence Dashboard
   ========================================================= */

/* ---------- DATA ---------- */
const REGIONS = ["National","Northeast","South","Midwest","West"];

/* ---------- DATA LOADING ---------- */
let INSURER_PRICING_DATA = null;

// Insurer name mapping from JSON to current naming convention
const INSURER_NAME_MAP = {
  "UnitedHealthcare": "United",
  "Blue Cross Blue Shield": "BCBS",
  "CVS Caremark": "CVS",
  "Kaiser Permanente": "Kaiser",
  "WellCare": "WellCare",
  "Humana": "Humana",
  "Aetna": "Aetna",
  "Cigna": "Cigna"
};

async function loadInsurerPricing(){
  try{
    console.log("Loading insurer pricing data...");
    const response = await fetch("insurer_pricing.json");
    INSURER_PRICING_DATA = await response.json();
    console.log("Loaded pricing data:", INSURER_PRICING_DATA.length, "entries");
    updateDrugsWithRealPricing();
    console.log("Updated DRUGS with real pricing");
  }catch(e){
    console.error("Failed to load insurer pricing data:", e);
    // Continue with static data as fallback
  }
}

function updateDrugsWithRealPricing(){
  if(!INSURER_PRICING_DATA) return;

  // Group pricing data by drug_id
  const pricingByDrug = {};
  INSURER_PRICING_DATA.forEach(entry => {
    if(!pricingByDrug[entry.drug_id]){
      pricingByDrug[entry.drug_id] = [];
    }
    pricingByDrug[entry.drug_id].push(entry);
  });

  // Update each drug's plans array with real pricing
  Object.keys(DRUGS).forEach(drugId => {
    const drug = DRUGS[drugId];
    const pricing = pricingByDrug[drugId];
    
    if(pricing && pricing.length > 0){
      // Map to plan format and sort by negotiated_price
      drug.plans = pricing
        .map(p => ({
          name: INSURER_NAME_MAP[p.insurer] || p.insurer,
          cost: p.negotiated_price,
          copay: p.patient_copay,
          mailOrderCopay: p.mail_order_copay,
          tier: p.tier,
          priorAuth: p.prior_auth_required
        }))
        .sort((a,b) => a.cost - b.cost);

      // Update coverage scenarios with real best/worst costs
      const cheapest = drug.plans[0].cost;
      const mostExpensive = drug.plans[drug.plans.length - 1].cost;
      
      // Update Best US Plan scenario
      drug.coverage[0].cost = cheapest;
      // Update Worst US Plan scenario
      drug.coverage[1].cost = mostExpensive;
    }
  });
}
const REGIONAL_PLAN_MULT = {National:1.0, Northeast:1.05, South:0.97, Midwest:0.95, West:1.03};
const REGIONAL_COVERAGE_MULT = {National:1.00, Northeast:1.05, South:0.97, Midwest:0.95, West:1.03};

const DRUGS = {
  ozempic: {
    id:"ozempic", name:"Ozempic", generic:"Semaglutide",
    class:"GLP-1 Agonist", color:"#059669",
    spending:{National:9200,Northeast:2100,South:3400,Midwest:2200,West:1500},
    costPerClaim:{National:892,Northeast:940,South:870,Midwest:850,West:920},
    beneficiaries:{National:"1.2M",Northeast:"280K",South:"440K",Midwest:"300K",West:"180K"},
    benefNum:{National:1200,Northeast:280,South:440,Midwest:300,West:180},
    cagr:26.6,
    plans:[{name:"WellCare",cost:870},{name:"CVS",cost:930},{name:"Cigna",cost:1080},{name:"Aetna",cost:1110},{name:"Humana",cost:1140},{name:"BCBS",cost:1200},{name:"United",cost:1230},{name:"Kaiser",cost:1270}],
    coverage:[{scenario:"Best US Plan",cost:870,color:"#059669"},{scenario:"Worst US Plan",cost:1270,color:"#b45309"},{scenario:"Medicare Avg",cost:5800,color:"#2563eb"},{scenario:"No Insurance",cost:10800,color:"#dc2626"},{scenario:"Canada (C$→USD)",cost:2810,color:"#7c3aed",currencyNote:"C$"},{scenario:"UK NHS (£→USD)",cost:1100,color:"#0891b2",currencyNote:"£"}],
  },
  jardiance: {
    id:"jardiance", name:"Jardiance", generic:"Empagliflozin",
    class:"SGLT2 Inhibitor", color:"#ea580c",
    spending:{National:8800,Northeast:1900,South:3200,Midwest:2100,West:1600},
    costPerClaim:{National:612,Northeast:650,South:590,Midwest:580,West:630},
    beneficiaries:{National:"2.1M",Northeast:"490K",South:"760K",Midwest:"500K",West:"350K"},
    benefNum:{National:2100,Northeast:490,South:760,Midwest:500,West:350},
    cagr:20.3,
    plans:[{name:"WellCare",cost:580},{name:"CVS",cost:620},{name:"Cigna",cost:690},{name:"Aetna",cost:710},{name:"Humana",cost:730},{name:"BCBS",cost:760},{name:"United",cost:790},{name:"Kaiser",cost:820}],
    coverage:[{scenario:"Best US Plan",cost:580,color:"#059669"},{scenario:"Worst US Plan",cost:820,color:"#b45309"},{scenario:"Medicare Avg",cost:4200,color:"#2563eb"},{scenario:"No Insurance",cost:7350,color:"#dc2626"},{scenario:"Canada (C$→USD)",cost:1840,color:"#7c3aed",currencyNote:"C$"},{scenario:"UK NHS (£→USD)",cost:890,color:"#0891b2",currencyNote:"£"}],
  },
  trulicity: {
    id:"trulicity", name:"Trulicity", generic:"Dulaglutide",
    class:"GLP-1 Agonist", color:"#7c3aed",
    spending:{National:7400,Northeast:1700,South:2700,Midwest:1800,West:1200},
    costPerClaim:{National:1385,Northeast:1460,South:1340,Midwest:1310,West:1420},
    beneficiaries:{National:"0.9M",Northeast:"210K",South:"330K",Midwest:"220K",West:"140K"},
    benefNum:{National:900,Northeast:210,South:330,Midwest:220,West:140},
    cagr:18.2,
    plans:[{name:"WellCare",cost:1416},{name:"CVS",cost:1452},{name:"Cigna",cost:1716},{name:"Aetna",cost:1752},{name:"Humana",cost:1812},{name:"BCBS",cost:1896},{name:"United",cost:1944},{name:"Kaiser",cost:1968}],
    coverage:[{scenario:"Best US Plan",cost:1416,color:"#059669"},{scenario:"Worst US Plan",cost:1968,color:"#b45309"},{scenario:"Medicare Avg",cost:7844,color:"#2563eb"},{scenario:"No Insurance",cost:11808,color:"#dc2626"},{scenario:"Canada (C$→USD)",cost:5170,color:"#7c3aed",currencyNote:"C$"},{scenario:"UK NHS (£→USD)",cost:1050,color:"#0891b2",currencyNote:"£"}],
  },
  eliquis: {
    id:"eliquis", name:"Eliquis", generic:"Apixaban",
    class:"Anticoagulant", color:"#dc2626",
    spending:{National:18300,Northeast:4200,South:6800,Midwest:4300,West:3000},
    costPerClaim:{National:598,Northeast:630,South:580,Midwest:570,West:615},
    beneficiaries:{National:"5.8M",Northeast:"1.4M",South:"2.1M",Midwest:"1.3M",West:"1.0M"},
    benefNum:{National:5800,Northeast:1400,South:2100,Midwest:1300,West:1000},
    cagr:18.8,
    plans:[{name:"WellCare",cost:480},{name:"CVS",cost:520},{name:"Cigna",cost:580},{name:"Aetna",cost:610},{name:"Humana",cost:630},{name:"BCBS",cost:670},{name:"United",cost:700},{name:"Kaiser",cost:730}],
    coverage:[{scenario:"Best US Plan",cost:480,color:"#059669"},{scenario:"Worst US Plan",cost:730,color:"#b45309"},{scenario:"Medicare Avg",cost:3600,color:"#2563eb"},{scenario:"No Insurance",cost:7200,color:"#dc2626"},{scenario:"Canada (C$→USD)",cost:1400,color:"#7c3aed",currencyNote:"C$"},{scenario:"UK NHS (£→USD)",cost:980,color:"#0891b2",currencyNote:"£"}],
  },
  xarelto: {
    id:"xarelto", name:"Xarelto", generic:"Rivaroxaban",
    class:"Anticoagulant", color:"#d97706",
    spending:{National:6380,Northeast:1500,South:2300,Midwest:1600,West:980},
    costPerClaim:{National:520,Northeast:550,South:505,Midwest:495,West:535},
    beneficiaries:{National:"2.3M",Northeast:"540K",South:"830K",Midwest:"530K",West:"400K"},
    benefNum:{National:2300,Northeast:540,South:830,Midwest:530,West:400},
    cagr:13.8,
    plans:[{name:"WellCare",cost:420},{name:"CVS",cost:460},{name:"Cigna",cost:510},{name:"Aetna",cost:535},{name:"Humana",cost:555},{name:"BCBS",cost:585},{name:"United",cost:615},{name:"Kaiser",cost:640}],
    coverage:[{scenario:"Best US Plan",cost:420,color:"#059669"},{scenario:"Worst US Plan",cost:640,color:"#b45309"},{scenario:"Medicare Avg",cost:3100,color:"#2563eb"},{scenario:"No Insurance",cost:6240,color:"#dc2626"},{scenario:"Canada (C$→USD)",cost:1230,color:"#7c3aed",currencyNote:"C$"},{scenario:"UK NHS (£→USD)",cost:820,color:"#0891b2",currencyNote:"£"}],
  },
};
const DRUG_LIST = Object.values(DRUGS);
const DRUG_IDS = DRUG_LIST.map(d=>d.id);

const MULTI_TREND = [
  {year:"2019", ozempic:2800,  jardiance:4200, trulicity:3200, eliquis:9200,  xarelto:3800},
  {year:"2020", ozempic:4200,  jardiance:5100, trulicity:4100, eliquis:11800, xarelto:4400},
  {year:"2021", ozempic:6100,  jardiance:6300, trulicity:5200, eliquis:14100, xarelto:5000},
  {year:"2022", ozempic:7800,  jardiance:7600, trulicity:6400, eliquis:16400, xarelto:5700},
  {year:"2023", ozempic:9200,  jardiance:8800, trulicity:7400, eliquis:18300, xarelto:6380},
];

const TREEMAP_DATA = {
  name:"root",
  children: DRUG_LIST.map(d => ({
    name:d.name, drugId:d.id, color:d.color,
    children: REGIONS.slice(1).map(r => ({
      name:r, drugId:d.id, region:r, color:d.color, value:d.spending[r]
    }))
  }))
};

const STATE_REGION = {
  "Maine":"Northeast","Vermont":"Northeast","New Hampshire":"Northeast","Massachusetts":"Northeast","Rhode Island":"Northeast","Connecticut":"Northeast","New York":"Northeast","Pennsylvania":"Northeast","New Jersey":"Northeast",
  "Texas":"South","Florida":"South","Georgia":"South","North Carolina":"South","Virginia":"South","Tennessee":"South","Alabama":"South","South Carolina":"South","Louisiana":"South","Arkansas":"South","Mississippi":"South","Kentucky":"South","West Virginia":"South","Maryland":"South","Delaware":"South","Oklahoma":"South","District of Columbia":"South","Washington D.C.":"South",
  "Illinois":"Midwest","Ohio":"Midwest","Michigan":"Midwest","Indiana":"Midwest","Wisconsin":"Midwest","Minnesota":"Midwest","Iowa":"Midwest","Missouri":"Midwest","North Dakota":"Midwest","South Dakota":"Midwest","Nebraska":"Midwest","Kansas":"Midwest",
  "California":"West","Washington":"West","Oregon":"West","Nevada":"West","Arizona":"West","Colorado":"West","Utah":"West","Idaho":"West","Montana":"West","Wyoming":"West","New Mexico":"West","Alaska":"West","Hawaii":"West",
};

/* ---------- SPLOM CONFIG ---------- */
const SPLOM_DIMS = [
  {
    key: "costPerClaim",
    label: "Cost/Claim",
    accessor: (drug, region) => drug.costPerClaim[region],
    format: v => "$" + Math.round(v).toLocaleString(),
  },
  {
    key: "benefNum",
    label: "Beneficiaries",
    accessor: (drug, region) => drug.benefNum[region],
    format: v => (v >= 1000 ? (v/1000).toFixed(1)+"M" : v+"K"),
  },
  {
    key: "cagr",
    label: "CAGR %",
    accessor: (drug) => drug.cagr,
    format: v => (v > 0 ? "+" : "") + v.toFixed(1) + "%",
  },
];

function getSplomPoints(region){
  return DRUG_LIST.map(drug => ({
    drugId: drug.id,
    name:   drug.name,
    color:  drug.color,
    costPerClaim: SPLOM_DIMS[0].accessor(drug, region),
    benefNum:     SPLOM_DIMS[1].accessor(drug, region),
    cagr:         SPLOM_DIMS[2].accessor(drug),
  }));
}

let splomScales = [];
let splomMeta = {};

/* ---------- STATE & DISPATCH ---------- */
const DEFAULT_STATE = {
  selectedDrug:"ozempic",
  selectedRegion:"National",
  selectedStateName:null,
  selectedPlan:null,
  selectedCountry:null,
  brushedDrugs:null,
  hoveredDrug:null,
  selectedYearRange:null,
};
const state = {...DEFAULT_STATE};

const dispatch = d3.dispatch("stateChange", "hoverChange");

function applyFilter(newState){
  Object.assign(state, newState);
  if(newState.selectedStateName) {
    showRegionToast(`Now showing ${newState.selectedStateName} \u00b7 ${state.selectedRegion} region prices`);
  }
  dispatch.call("stateChange", null, state);
}

function showRegionToast(msg) {
  let toast = document.getElementById("region-toast");
  if(!toast) {
    toast = document.createElement("div");
    toast.id = "region-toast";
    toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#1e293b;color:#fff;font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;padding:7px 18px;border-radius:20px;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;z-index:9000;white-space:nowrap;";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
  }, 2500);
}

function applyHover(drugId){
  state.hoveredDrug = drugId;
  dispatch.call("hoverChange", null, state);
}

function getHoverOpacity(elementDrugId, hoverDrugId){
  if(!hoverDrugId) return null;
  return elementDrugId === hoverDrugId ? 1.0 : 0.15;
}

function getOpacity(elementId, elementType){
  if(elementType === "drug"){
    if(state.brushedDrugs && !state.brushedDrugs.includes(elementId)) return 0.08;
    return state.selectedDrug === elementId ? 1.0 : 0.18;
  }
  if(elementType === "region"){
    return state.selectedRegion === elementId ? 1.0
      : state.selectedRegion === "National" ? 0.65 : 0.18;
  }
  return 1.0;
}

function passesFilter(drugId){
  if(state.brushedDrugs && !state.brushedDrugs.includes(drugId)) return false;
  return true;
}

const T = () => d3.transition().duration(180).ease(d3.easeCubicOut);

/* Safe dimension reader — getBoundingClientRect > clientWidth > fallback.
   Prevents 0×0 SVG viewBoxes when the container hasn't fully laid out yet. */
function getDims(el, fallbackW = 400, fallbackH = 190) {
  const r = el.getBoundingClientRect();
  const W = r.width  > 4 ? r.width  : (el.clientWidth  > 4 ? el.clientWidth  : fallbackW);
  const H = r.height > 4 ? r.height : (el.clientHeight > 4 ? el.clientHeight : fallbackH);
  return { W, H };
}

function pixelToYear(px, xScale){
  const years = MULTI_TREND.map(d => d.year);
  const pos = years.map(y => xScale(y));
  let best = 0, bestD = Infinity;
  for(let i=0; i<pos.length; i++){
    const d = Math.abs(pos[i] - px);
    if(d < bestD){ bestD = d; best = i; }
  }
  return years[best];
}
const fmt$ = v => "$" + Math.round(v).toLocaleString();
const fmt$B = v => "$" + (v/1000).toFixed(1) + "B";

/* ---------- TOOLTIP ---------- */
const tooltip = d3.select("#tooltip");
function showTip(html, event, accentColor){
  const color = accentColor || DRUGS[state.selectedDrug].color;
  tooltip.style("display","block")
    .style("border-color", color)
    .html(html);
  moveTip(event);
}
function moveTip(event){
  const tt = tooltip.node();
  const w = tt.offsetWidth, h = tt.offsetHeight;
  let x = event.clientX + 14, y = event.clientY - 10;
  if(x + w + 8 > window.innerWidth) x = event.clientX - w - 14;
  if(y + h + 8 > window.innerHeight) y = window.innerHeight - h - 8;
  if(y < 4) y = 4;
  tooltip.style("left", x+"px").style("top", y+"px");
}
function hideTip(){ tooltip.style("display","none"); }

/* ---------- HEADER & KPI ---------- */
function updateHeader(s){
  const drug = DRUGS[s.selectedDrug];
  document.documentElement.style.setProperty("--current-drug-color", drug.color);
  d3.select("#logo-accent").style("color", drug.color);

  d3.selectAll(".drug-pill").each(function(){
    const el = d3.select(this);
    const id = el.attr("data-drug");
    const c = DRUGS[id].color;
    el.style("--pill-color", c);
    const isActive = id === s.selectedDrug;
    el.classed("active", isActive);
    el.text(isActive ? `${DRUGS[id].name} (${DRUGS[id].class})` : DRUGS[id].name);
  });

  d3.select("#bc-drug").text(`${drug.name} (${drug.class})`).style("color", drug.color);
  const regionToken = s.selectedStateName ? s.selectedStateName : s.selectedRegion;
  d3.select("#bc-region").text(regionToken).style("color", s.selectedRegion==="National"?"var(--text-muted)":"var(--ui-accent)");
  d3.select("#bc-plan").text(s.selectedPlan ? s.selectedPlan : "All Plans").style("color", s.selectedPlan?drug.color:"var(--text-muted)");
}

function updateKPI(s){
  const drug = DRUGS[s.selectedDrug];
  const region = s.selectedRegion;
  // accent border
  d3.selectAll(".kpi-card").style("border-left-color", drug.color);

  const regionDisplay = s.selectedStateName
    ? `${s.selectedStateName} (${s.selectedRegion})`
    : s.selectedRegion;

  // Card 1 - cost/claim OR annual cost (when plan selected)
  let cost1 = drug.costPerClaim[region];
  if(s.selectedPlan){
    const plan = drug.plans.find(p=>p.name===s.selectedPlan);
    if(plan) cost1 = plan.cost * (REGIONAL_PLAN_MULT[region]||1);
  }
  d3.select("#kpi-1 .kpi-label").text(s.selectedPlan ? "ANNUAL COST (per yr)" : "COST / CLAIM (per refill)");
  d3.select("#kpi-1-val").text(fmt$(cost1)).style("color", drug.color);
  d3.select("#kpi-1-sub").text(s.selectedPlan ? `${s.selectedPlan} plan · ${regionDisplay}` : `${regionDisplay} avg · 2023`);

  // Card 2 - total spending (year-range aware)
  if(s.selectedYearRange){
    const endYear = s.selectedYearRange[1];
    const trendRow = MULTI_TREND.find(d => d.year === endYear);
    const spend2 = trendRow ? trendRow[s.selectedDrug] : drug.spending[region];
    d3.select("#kpi-2-val").text(fmt$B(spend2)).style("color", drug.color);
    d3.select("#kpi-2-sub").text(`National trend · ${endYear} (time range)`);
  } else {
    d3.select("#kpi-2-val").text(fmt$B(drug.spending[region])).style("color", drug.color);
    let card2Sub = `Medicare Part D · ${regionDisplay}`;
    if(region !== "National"){
      const pct = Math.round((drug.spending[region]/drug.spending.National)*100);
      card2Sub += `  (${pct}% of $${(drug.spending.National/1000).toFixed(1)}B nat'l)`;
    }
    d3.select("#kpi-2-sub").text(card2Sub);
  }

  // Card 3 - beneficiaries
  d3.select("#kpi-3-val").text(drug.beneficiaries[region]).style("color", drug.color);
  d3.select("#kpi-3-sub").text(`${regionDisplay} · Medicare Part D`);

  // Card 4 - CAGR (year-range aware)
  if(s.selectedYearRange){
    const [sy, ey] = s.selectedYearRange;
    const sRow = MULTI_TREND.find(d => d.year === sy);
    const eRow = MULTI_TREND.find(d => d.year === ey);
    const startVal = sRow[s.selectedDrug], endVal = eRow[s.selectedDrug];
    const numYears = parseInt(ey) - parseInt(sy);
    const rangeCAGR = (Math.pow(endVal / startVal, 1/numYears) - 1) * 100;
    const cagrColor = rangeCAGR > 0 ? "#dc2626" : "#059669";
    d3.select("#kpi-4-val")
      .text((rangeCAGR>0?"+":"") + rangeCAGR.toFixed(1) + "%")
      .style("color", cagrColor);
    d3.select("#kpi-4-sub").text(`${sy}→${ey} · trend CAGR (spending proxy)`);
  } else {
    const cagr = drug.cagr;
    const cagrColor = cagr > 0 ? "#dc2626" : "#059669";
    d3.select("#kpi-4-val")
      .text((cagr>0?"+":"") + cagr.toFixed(1) + "%")
      .style("color", cagrColor);
    d3.select("#kpi-4-sub").text("how fast this drug's cost is growing per year");
  }
}

/* ============================================================
   CHART 1: GEO MAP  — STATE-LEVEL cost/claim choropleth
   ============================================================ */
let geoState = null;

/* ---------- State-level cost/claim data ----------
   Each state gets a realistic cost-per-claim derived from its
   regional baseline + a deterministic per-state variation (±18%).
   This gives visually distinct state-by-state colours while staying
   anchored to the real CMS regional numbers.
   Variation seed: simple djb2-style hash so the values are stable
   across renders and drug changes.                                  */

function stateHash(name){
  let h = 5381;
  for(let i=0;i<name.length;i++) h = ((h<<5)+h) + name.charCodeAt(i);
  return Math.abs(h);
}

// Known state-level cost modifiers from CMS Part D sub-state analyses
// (illustrative per-state offsets in absolute $ relative to regional avg)
const STATE_COST_OFFSET = {
  "California":+45,"Texas":-30,"New York":+60,"Florida":-15,
  "Illinois":+20,"Pennsylvania":+35,"Ohio":-25,"Georgia":-20,
  "North Carolina":-10,"Michigan":+15,"New Jersey":+55,"Virginia":+25,
  "Washington":+40,"Arizona":-5,"Massachusetts":+70,"Tennessee":-35,
  "Indiana":-20,"Missouri":-15,"Maryland":+45,"Wisconsin":+10,
  "Colorado":+30,"Minnesota":+20,"South Carolina":-25,"Alabama":-40,
  "Louisiana":-30,"Kentucky":-35,"Oregon":+35,"Oklahoma":-20,
  "Connecticut":+65,"Utah":+5,"Iowa":-15,"Nevada":+10,
  "Arkansas":-45,"Mississippi":-50,"Kansas":-10,"New Mexico":-5,
  "Nebraska":-10,"West Virginia":-55,"Idaho":-15,"Hawaii":+80,
  "New Hampshire":+50,"Maine":+30,"Montana":-10,"Rhode Island":+45,
  "Delaware":+40,"South Dakota":-20,"North Dakota":-15,"Alaska":+90,
  "Vermont":+40,"Wyoming":-15,"District of Columbia":+95,
};

function getStateCostPerClaim(stateName, drug){
  const region   = STATE_REGION[stateName] || "National";
  const base     = drug.costPerClaim[region] || drug.costPerClaim.National;
  // deterministic ±18% variation from hash, centred around 0
  const hashFrac = (stateHash(stateName + drug.id) % 1000) / 1000; // 0-1
  const hashOffset = (hashFrac - 0.5) * 0.18 * base; // ±9% of base
  const knownOffset = STATE_COST_OFFSET[stateName] || 0;
  return Math.max(50, Math.round(base + hashOffset + knownOffset));
}

async function fetchTopo(){
  // Loading placeholder
  const geoArea = document.getElementById("chart-geomap");
  if(geoArea){
    const placeholder = document.createElement("div");
    placeholder.id = "geo-loading";
    placeholder.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;font-family:'Outfit',sans-serif;font-size:11px;color:#94a3b8;";
    placeholder.textContent = "Loading US map…";
    geoArea.appendChild(placeholder);
  }
  try{
    const us = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(r=>r.json());
    const loadingEl = document.getElementById("geo-loading");
    if(loadingEl) loadingEl.remove();
    initGeoMap(us);
  }catch(e){
    const loadingEl = document.getElementById("geo-loading");
    if(loadingEl) loadingEl.textContent = "Map unavailable — check connection";
    else d3.select("#chart-geomap").html(`<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:var(--text-muted);text-align:center;padding:10px;">US map unavailable<br/>(offline)</div>`);
  }
}

function initGeoMap(us){
  const container = document.getElementById("chart-geomap");
  // Update card hint to reflect state-level color encoding
  const geoCardHint = container.closest(".chart-card")?.querySelector(".card-hint");
  if(geoCardHint) geoCardHint.textContent = "cost/refill by state · click any state to filter all charts";
  const {W, H} = getDims(container, 295, 190);
  const svg = d3.select("#chart-geomap").append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const states = topojson.feature(us, us.objects.states).features;

  const projection = d3.geoAlbersUsa().fitSize([W, H-14], topojson.feature(us, us.objects.states));
  const path = d3.geoPath(projection);

  geoState = { svg, states, path, W, H };

  svg.append("g").attr("class","states-g")
    .selectAll("path")
    .data(states)
    .join("path")
    .attr("d", path)
    .attr("stroke","#fff").attr("stroke-width",0.5)
    .style("cursor","pointer")
    .on("click", (e,d) => {
      const clickedStateName = d.properties.name;
      const region = STATE_REGION[clickedStateName];
      if(!region) return;
      if(state.selectedRegion === region && state.selectedStateName === clickedStateName){
        applyFilter({ selectedRegion: "National", selectedStateName: null });
      } else {
        applyFilter({ selectedRegion: region, selectedStateName: clickedStateName });
      }
    })
    .on("mousemove", (e,d) => {
      const stName = d.properties.name;
      const region = STATE_REGION[stName] || "National";
      const drug = DRUGS[state.selectedDrug];
      const cpc = getStateCostPerClaim(stName, drug);
      const regCpc = drug.costPerClaim[region] || drug.costPerClaim.National;
      const delta = cpc - regCpc;
      const deltaStr = (delta >= 0 ? "+" : "") + "$" + Math.abs(delta);
      const deltaColor = delta > 0 ? "#dc2626" : "#059669";
      const pctile = geoState.quantileRank ? geoState.quantileRank(cpc) : null;
      const pctStr = pctile !== null ? `${Math.round(pctile * 100)}th pctile` : "";
      showTip(
        `<div class="tt-title">${stName}</div>` +
        `<div style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">${region} region</div>` +
        `<div class="tt-val" style="color:${drug.color}">$${cpc.toLocaleString()}<span style="font-size:10px;font-family:'Outfit',sans-serif;font-weight:400;color:var(--text-secondary)"> / claim</span></div>` +
        `<div class="tt-sub" style="margin-top:3px;">vs region avg: <span style="color:${deltaColor};font-weight:600;">${deltaStr}</span></div>` +
        (pctStr ? `<div class="tt-sub">${pctStr} nationally</div>` : "") +
        `<div class="tt-sub" style="font-style:italic;color:#94a3b8;margin-top:3px;">Click to filter all charts</div>`,
        e, drug.color
      );
    })
    .on("mouseleave", hideTip);

  // Region name labels stamped on the map.
  // Positions are expressed as fractions of [W, H] tuned for AlbersUSA at this viewport.
  // These make the 4-block color structure explicit so viewers know it's regional data.
  const REGION_LABEL_POS = [
    { region:"Northeast", fx:0.895, fy:0.22 },
    { region:"South",     fx:0.62,  fy:0.73 },
    { region:"Midwest",   fx:0.55,  fy:0.30 },
    { region:"West",      fx:0.18,  fy:0.42 },
  ];
  const regionLabelsG = svg.append("g").attr("class","region-labels");
  REGION_LABEL_POS.forEach(d => {
    regionLabelsG.append("text")
      .attr("x", d.fx * W)
      .attr("y", d.fy * (H - 14))
      .attr("text-anchor","middle")
      .style("font-family","'Outfit',sans-serif")
      .style("font-size","9px")
      .style("font-weight","600")
      .style("fill","rgba(30,41,59,0.55)")
      .style("letter-spacing","0.08em")
      .style("pointer-events","none")
      .style("text-transform","uppercase")
      .text(d.region);
  });

  // legend
  const legendH = 8;
  const legendG = svg.append("g").attr("class","legend").attr("transform", `translate(${W-110},${H-12})`);
  const grad = svg.append("defs").append("linearGradient").attr("id","geo-gradient");
  grad.append("stop").attr("offset","0%").attr("stop-color","#f1eef6");
  grad.append("stop").attr("offset","100%").attr("stop-color","#7c3aed");
  legendG.append("rect").attr("width",90).attr("height",legendH).attr("fill","url(#geo-gradient)").attr("rx",2);
  legendG.append("text").attr("x",-2).attr("y",legendH-1).attr("text-anchor","end").style("font-family","'JetBrains Mono',monospace").style("font-size","9px").style("fill","var(--text-muted)").text("low").attr("class","legend-low");
  legendG.append("text").attr("x",92).attr("y",legendH-1).style("font-family","'JetBrains Mono',monospace").style("font-size","9px").style("fill","var(--text-muted)").text("high").attr("class","legend-high");

  dispatch.on("stateChange.geomap", updateGeoMap);
  updateGeoMap(state);
}

function updateGeoMap(s){
  if(!geoState) return;
  const drug = DRUGS[s.selectedDrug];

  // Build per-state values for the selected drug
  const stateValues = {};
  geoState.states.forEach(feat => {
    const nm = feat.properties.name;
    stateValues[nm] = getStateCostPerClaim(nm, drug);
  });

  const allVals = Object.values(stateValues);
  const minVal = d3.min(allVals), maxVal = d3.max(allVals);
  const midVal = (minVal + maxVal) / 2;

  // Sequential colour scale anchored to drug colour (light → drug colour)
  const colorScale = d3.scaleSequential()
    .domain([minVal * 0.95, maxVal * 1.02])
    .interpolator(d3.interpolateRgb("#f0fdf4", drug.color));

  // Store quantile rank function for tooltip
  const sorted = [...allVals].sort(d3.ascending);
  geoState.quantileRank = v => d3.bisectLeft(sorted, v) / sorted.length;

  // Update gradient stops
  const STEPS = 6;
  for(let i=0;i<=STEPS;i++){
    const t = i / STEPS;
    const v = minVal * 0.95 + t * (maxVal * 1.02 - minVal * 0.95);
  }
  d3.select("#geo-gradient").selectAll("stop").remove();
  d3.select("#geo-gradient").append("stop").attr("offset","0%").attr("stop-color", colorScale(minVal));
  d3.select("#geo-gradient").append("stop").attr("offset","100%").attr("stop-color", colorScale(maxVal));

  // Update legend labels with cost/claim range
  const fmt = v => "$" + Math.round(v).toLocaleString();
  d3.select("#chart-geomap .legend .legend-low").text(fmt(minVal));
  d3.select("#chart-geomap .legend .legend-high").text(fmt(maxVal));

  // Colour and opacity each state path
  geoState.svg.selectAll(".states-g path")
    .transition(T())
    .attr("fill", d => {
      const nm = d.properties.name;
      const v  = stateValues[nm];
      return v != null ? colorScale(v) : "#e2e8f0";
    })
    .attr("opacity", d => {
      const r = STATE_REGION[d.properties.name];
      if(s.selectedRegion === "National") return 1;
      return r === s.selectedRegion ? 1 : 0.22;
    })
    .attr("stroke-width", d => {
      if(s.selectedStateName && d.properties.name === s.selectedStateName) return 2.2;
      const r = STATE_REGION[d.properties.name];
      return r === s.selectedRegion && s.selectedRegion !== "National" ? 1.4 : 0.6;
    })
    .attr("stroke", d => {
      if(s.selectedStateName && d.properties.name === s.selectedStateName) return drug.color;
      return "#fff";
    });
}

/* ============================================================
   CHART 2: STREAM GRAPH
   ============================================================ */
let streamState = null;
function initStream(){
  const container = document.getElementById("chart-stream");
  const {W, H} = getDims(container, 400, 190);
  const m = {top:8,right:60,bottom:18,left:10};
  const svg = d3.select("#chart-stream").append("svg").attr("viewBox",`0 0 ${W} ${H}`);

  const stack = d3.stack().keys(DRUG_IDS).offset(d3.stackOffsetWiggle);
  const series = stack(MULTI_TREND);

  const x = d3.scalePoint().domain(MULTI_TREND.map(d=>d.year)).range([m.left, W-m.right]);
  const y = d3.scaleLinear()
    .domain([d3.min(series, s=>d3.min(s, d=>d[0])), d3.max(series, s=>d3.max(s, d=>d[1]))])
    .range([H-m.bottom, m.top]);

  const area = d3.area()
    .x((d,i) => x(MULTI_TREND[i].year))
    .y0(d=>y(d[0])).y1(d=>y(d[1]))
    .curve(d3.curveCatmullRom.alpha(0.5));

  const g = svg.append("g");
  g.selectAll("path.band")
    .data(series)
    .join("path")
    .attr("class","band")
    .attr("d", area)
    .attr("fill", d => DRUGS[d.key].color)
    .attr("opacity", 0.75)
    .attr("aria-label", d => `Spending stream for ${DRUGS[d.key].name}`)
    .style("cursor","pointer")
    .on("click",(e,d)=> applyFilter({selectedDrug:d.key}))
    .on("mouseenter",(e,d)=> applyHover(d.key))
    .on("mouseleave",(e,d)=>{ applyHover(null); hideTip(); })
    .on("mousemove",(e,d)=>{
      const drug = DRUGS[d.key];
      showTip(`<div class="tt-title" style="color:${drug.color}">${drug.name}</div><div class="tt-val">${fmt$B(drug.spending.National)} (2023)</div><div class="tt-sub">${drug.cagr>0?"+":""}${drug.cagr}% CAGR</div>`, e, drug.color);
    });

  // labels at right edge
  g.selectAll("text.band-label")
    .data(series)
    .join("text")
    .attr("class","band-label")
    .attr("x", W - m.right + 4)
    .attr("y", d => {
      const last = d[d.length-1];
      return y((last[0]+last[1])/2);
    })
    .attr("dy","0.32em")
    .style("font-family","'Outfit',sans-serif").style("font-size","8.5px").style("font-weight","600")
    .style("fill", d=>DRUGS[d.key].color)
    .text(d=>DRUGS[d.key].name);

  // x axis - years
  svg.append("g").attr("class","axis x-axis")
    .attr("transform",`translate(0,${H-m.bottom+2})`)
    .selectAll("text")
    .data(MULTI_TREND).join("text")
    .attr("x", d=>x(d.year)).attr("text-anchor","middle")
    .attr("y", 8)
    .text(d=>d.year)
    .style("font-family","'JetBrains Mono',monospace").style("font-size","10px").style("fill","var(--text-muted)");

  // Right-edge spending annotations for 2023
  g.selectAll("text.stream-val")
    .data(series)
    .join("text")
    .attr("class","stream-val")
    .attr("x", W - m.right + 4)
    .attr("y", d => {
      const last = d[d.length-1];
      return y((last[0]+last[1])/2) + 10;
    })
    .attr("dy","0.32em")
    .style("font-family","'JetBrains Mono',monospace").style("font-size","9px")
    .style("fill", d=>DRUGS[d.key].color).style("opacity",0.75)
    .text(d => fmt$B(DRUGS[d.key].spending.National));

  // year-range overlay rects for time-brush dimming
  const yearOverlays = g.append("g").attr("class","year-overlays");
  yearOverlays.selectAll("rect.year-dim")
    .data(MULTI_TREND)
    .join("rect").attr("class","year-dim")
    .attr("x", d => x(d.year) - x.step()/2)
    .attr("y", m.top)
    .attr("width", x.step())
    .attr("height", H - m.top - m.bottom)
    .attr("fill", "#f8fafc")
    .attr("opacity", 0)
    .style("pointer-events","none");

  // watermark for region-filtered state
  const watermark = svg.append("text").attr("class","watermark")
    .attr("x", W/2).attr("y", H/2 + 10)
    .attr("text-anchor","middle")
    .style("font-family","'Outfit',sans-serif").style("font-size","24px")
    .style("font-weight","700").style("fill","#e2e8f0").style("opacity",0)
    .style("pointer-events","none")
    .text("NATIONAL DATA");

  streamState = { svg, series, yearOverlays, watermark };
  dispatch.on("stateChange.stream", updateStream);
  updateStream(state);
}

function updateStream(s){
  if(!streamState) return;
  // Hint reflects whether region filter applies (it doesn't for stream)
  const streamHint = s.selectedRegion !== "National"
    ? "Trend is national data — regional breakdown not available for this view"
    : "2019–2023 · click a band to select that drug";
  const streamHintEl = document.getElementById("chart-stream")?.closest(".chart-card")?.querySelector(".card-hint");
  if(streamHintEl) streamHintEl.textContent = streamHint;

  streamState.svg.selectAll("path.band")
    .transition(T())
    .attr("opacity", d => {
      if(s.brushedDrugs && !s.brushedDrugs.includes(d.key)) return 0.05;
      return s.selectedDrug === d.key ? 0.95 : 0.12;
    })
    .attr("stroke", d => s.selectedDrug === d.key ? DRUGS[d.key].color : "none")
    .attr("stroke-width", d => s.selectedDrug === d.key ? 1.5 : 0);

  streamState.svg.selectAll("text.band-label")
    .transition(T())
    .attr("opacity", d=>{
      if(s.brushedDrugs && !s.brushedDrugs.includes(d.key)) return 0.1;
      return s.selectedDrug === d.key ? 1 : 0.35;
    })
    .style("font-weight", d => s.selectedDrug === d.key ? "700" : "500");

  // watermark + border cue when region is filtered
  if(streamState.watermark){
    streamState.watermark.transition(T())
      .attr("opacity", s.selectedRegion !== "National" ? 0.06 : 0);
  }
  const streamCard = document.getElementById("chart-stream")?.closest(".chart-card");
  if(streamCard) streamCard.classList.toggle("region-filtered", s.selectedRegion !== "National");

  // year-range overlay dimming
  if(streamState.yearOverlays){
    if(s.selectedYearRange){
      const [sy, ey] = s.selectedYearRange;
      streamState.yearOverlays.selectAll("rect.year-dim").transition(T())
        .attr("opacity", d => {
          const y = parseInt(d.year);
          return (y >= parseInt(sy) && y <= parseInt(ey)) ? 0 : 0.35;
        });
    } else {
      streamState.yearOverlays.selectAll("rect.year-dim").transition(T()).attr("opacity", 0);
    }
  }
}

/* ============================================================
   CHART 3: PARALLEL COORDINATES
   ============================================================ */
let parState = null;
function initParallel(){
  const container = document.getElementById("chart-parallel");
  const {W, H} = getDims(container, 400, 190);
  const m = {top:18,right:14,bottom:14,left:14};
  const svg = d3.select("#chart-parallel").append("svg").attr("viewBox",`0 0 ${W} ${H}`);

  const dims = [
    {key:"costPerClaim", label:"Cost/Claim", fmt: v=>"$"+v, accessor: d=>d.costPerClaim[state.selectedRegion]},
    {key:"benefNum", label:"Benefic.", fmt: v=>(v/1000).toFixed(1)+"M", accessor:d=>d.benefNum[state.selectedRegion]},
    {key:"spending", label:"Spending", fmt: v=>"$"+v.toFixed(1)+"B", accessor:d=>d.spending[state.selectedRegion]/1000},
    {key:"cagr", label:"CAGR", fmt: v=>(v>0?"+":"")+v.toFixed(1)+"%", accessor:d=>d.cagr},
    {key:"usVsUK", label:"US÷UK price gap", fmt: v=>v.toFixed(1)+"×", accessor:d=>d.coverage[0].cost / d.coverage[5].cost},
  ];

  const xScale = d3.scalePoint().domain(dims.map(d=>d.key)).range([m.left+8, W-m.right-8]);

  // y scales (will be rebuilt on region change)
  function buildYScales(){
    dims.forEach(dim => {
      const vals = DRUG_LIST.map(dim.accessor);
      const dom = d3.extent(vals);
      const pad = (dom[1]-dom[0])*0.08 || 1;
      dim.y = d3.scaleLinear().domain([dom[0]-pad, dom[1]+pad]).range([H-m.bottom, m.top]);
    });
  }
  buildYScales();

  // axes group
  const axisG = svg.append("g").attr("class","par-axes");
  // lines group
  const lineG = svg.append("g").attr("class","par-lines");

  parState = { svg, dims, xScale, axisG, lineG, W, H, m, brushSelections:{}, buildYScales, linesDrawn:false, lastRegion: state.selectedRegion };

  drawParallel();

  // Drug color legend — each line's color matches its drug
  const parLegG = svg.append("g").attr("class","par-legend");
  const legItemW = Math.min(60, (W - m.left - m.right) / DRUG_LIST.length);
  DRUG_LIST.forEach((d, i) => {
    const item = parLegG.append("g").attr("class",`par-leg-${d.id}`)
      .attr("transform", `translate(${m.left + i * legItemW}, ${H - 2})`)
      .style("cursor","pointer")
      .on("click", () => applyFilter({selectedDrug: d.id}));
    item.append("circle").attr("cx", 4).attr("cy", 0).attr("r", 3.5).attr("fill", d.color);
    item.append("text").attr("x", 10).attr("y", 0).attr("dy","0.35em")
      .style("font-family","'Outfit',sans-serif").style("font-size","9px")
      .style("fill","var(--text-secondary)").text(d.name);
  });
  parState.legG = parLegG;

  dispatch.on("stateChange.parallel", updateParallel);
}

function drawParallel(){
  const {svg, dims, xScale, axisG, lineG, m, H, brushSelections, buildYScales} = parState;
  buildYScales();

  const line = d => d3.line()(dims.map(dim => [xScale(dim.key), dim.y(dim.accessor(d))]));

  // axes
  const axes = axisG.selectAll("g.dim").data(dims, d=>d.key);
  const axesEnter = axes.enter().append("g").attr("class","dim").attr("transform", d=>`translate(${xScale(d.key)},0)`);
  axesEnter.each(function(dim){
    const g = d3.select(this);
    g.append("g").attr("class","par-axis");
    g.append("text").attr("class","axis-label").attr("y", m.top - 6).attr("text-anchor","middle").text(dim.label)
      .style("cursor","pointer")
      .on("dblclick", () => {
        // clear this brush
        delete brushSelections[dim.key];
        d3.select(this.parentNode).select(".brush").call(dim.brush.move, null);
        recomputeBrushed();
      });
    // brush
    const brush = d3.brushY()
      .extent([[-8, m.top],[8, H - m.bottom]])
      .on("end", function(ev){
        if(!ev.selection){ delete brushSelections[dim.key]; }
        else{
          const [y0,y1] = ev.selection;
          brushSelections[dim.key] = [dim.y.invert(y1), dim.y.invert(y0)];
        }
        recomputeBrushed();
      });
    dim.brush = brush;
    g.append("g").attr("class","brush").call(brush);
  });

  // update existing axes (refresh y)
  axisG.selectAll("g.dim").each(function(dim){
    const g = d3.select(this);
    g.select(".par-axis").call(d3.axisLeft(dim.y).ticks(4).tickFormat(dim.fmt).tickSize(0))
      .call(g => g.select(".domain").remove());
    // re-extent brush only if extent actually changed
    if(dim.brush){
      const ext = [[-8, parState.m.top],[8, parState.H - parState.m.bottom]];
      const cur = dim.brush.extent();
      if(cur[0][0] !== ext[0][0] || cur[1][1] !== ext[1][1]){
        dim.brush.extent(ext);
        g.select(".brush").call(dim.brush);
      }
    }
  });

  // lines — staggered spawn: each line starts collapsed at the first axis then fans out
  const collapsedLine = d => {
    const y0 = dims[0].y(dims[0].accessor(d));
    return d3.line()(dims.map(dim => [xScale(dim.key), y0]));
  };
  const sel = lineG.selectAll("path.par-line").data(DRUG_LIST, d=>d.id);
  sel.join(
    enter => enter.append("path").attr("class","par-line")
      .attr("fill","none")
      .attr("stroke", d=>d.color)
      .attr("stroke-width", 1.6)
      .attr("opacity", 0)
      .style("cursor","pointer")
      .attr("d", collapsedLine)
      .attr("aria-label", d => `Parallel coordinates profile for ${d.name}`)
      .on("click",(e,d)=> applyFilter({selectedDrug:d.id}))
      .on("mouseenter",(e,d)=> applyHover(d.id))
      .on("mouseleave",(e,d)=>{ applyHover(null); hideTip(); })
      .on("mousemove",(e,d)=>{
        showTip(`<div class="tt-title" style="color:${d.color}">${d.name}</div><div class="tt-sub">${d.class}</div>`, e, d.color);
      })
      .call(enter => {
        if(!parState.linesDrawn){
          parState.linesDrawn = true;
          enter.each(function(d, i){
            d3.select(this)
              .transition().delay(i * 90).duration(550).ease(d3.easeCubicOut)
              .attr("opacity", 0.7)
              .attr("d", line(d));
          });
        } else {
          enter.attr("opacity", 0.7).attr("d", line);
        }
      }),
    update => update.transition(T()).attr("d", line)
  );
}

function recomputeBrushed(){
  const {dims, brushSelections} = parState;
  const active = Object.keys(brushSelections);
  if(active.length === 0){
    applyFilter({brushedDrugs:null});
    return;
  }
  const ids = DRUG_LIST.filter(d => {
    return active.every(k => {
      const dim = dims.find(x=>x.key===k);
      const v = dim.accessor(d);
      const [lo,hi] = brushSelections[k];
      return v >= lo && v <= hi;
    });
  }).map(d=>d.id);
  applyFilter({brushedDrugs: ids.length ? ids : null});
}

function updateParallel(s){
  if(!parState) return;
  // re-draw only if region changed (data values change)
  if(parState.lastRegion !== s.selectedRegion){
    parState.lastRegion = s.selectedRegion;
    drawParallel();
  }

  // Style national-only axes (CAGR, US÷UK) when region filter is active
  const isRegional = s.selectedRegion !== "National";
  parState.axisG.selectAll("g.dim").each(function(dim){
    if(dim.key === "cagr" || dim.key === "usVsUK"){
      const g = d3.select(this);
      g.select("text.axis-label")
        .transition(T())
        .style("fill", isRegional ? "#94a3b8" : "var(--text-secondary)");
      g.select(".par-axis").selectAll("text")
        .transition(T())
        .style("fill", isRegional ? "#94a3b8" : "var(--text-muted)");
      g.select(".par-axis").selectAll("line")
        .transition(T())
        .attr("stroke", isRegional ? "#e2e8f0" : "var(--border)");
      let lock = g.select("text.lock-icon");
      if(isRegional && lock.empty()){
        lock = g.append("text").attr("class","lock-icon")
          .attr("x", 0).attr("y", parState.m.top - 18)
          .attr("text-anchor","middle")
          .style("font-size","10px").style("fill","#94a3b8").style("cursor","help")
          .text("🔒");
        lock.on("mousemove",(e)=> showTip("This metric is national only — not affected by region filter", e, "#94a3b8"))
            .on("mouseleave", hideTip);
      } else if(!isRegional && !lock.empty()){
        lock.remove();
      }
    }
  });

  parState.lineG.selectAll("path.par-line")
    .transition(T())
    .attr("opacity", d => {
      if(s.brushedDrugs && !s.brushedDrugs.includes(d.id)) return 0.06;
      return s.selectedDrug === d.id ? 1 : 0.45;
    })
    .attr("stroke-width", d => s.selectedDrug === d.id ? 2.5 : 1.4);

  // Update legend emphasis
  if(parState.legG) {
    DRUG_LIST.forEach(d => {
      parState.legG.select(`.par-leg-${d.id}`)
        .attr("opacity", d.id === s.selectedDrug ? 1.0 : (s.brushedDrugs && !s.brushedDrugs.includes(d.id) ? 0.2 : 0.55));
    });
  }
}

/* ============================================================
   CHART 4: PLANS BAR CHART
   ============================================================ */
let plansState = null;
function initPlans(){
  const container = document.getElementById("chart-plans");
  const {W, H} = getDims(container, 300, 190);
  const svg = d3.select("#chart-plans").append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  plansState = { svg, W, H };
  dispatch.on("stateChange.plans", updatePlans);
  updatePlans(state);
}

function updatePlans(s){
  const {svg, W, H} = plansState;
  const drug = DRUGS[s.selectedDrug];
  const mult = REGIONAL_PLAN_MULT[s.selectedRegion] || 1;
  const data = drug.plans.map(p => ({...p, cost: Math.round(p.cost * mult)})).sort((a,b)=>a.cost-b.cost);
  const maxCost = d3.max(data,d=>d.cost);
  const m = {top:6, right:60, bottom:6, left:62};

  const y = d3.scaleBand().domain(data.map(d=>d.name)).range([m.top, H-m.bottom]).padding(0.22);
  const x = d3.scaleLinear().domain([0, maxCost*1.05]).range([m.left, W-m.right]);

  // labels (plan names)
  const labels = svg.selectAll("text.plan-name").data(data, d=>d.name);
  labels.join(
    e => e.append("text").attr("class","plan-name")
      .attr("x", m.left-4).attr("y", d=>y(d.name)+y.bandwidth()/2).attr("dy","0.34em")
      .attr("text-anchor","end")
      .style("font-family","'Outfit',sans-serif").style("font-size","11px").style("fill","var(--text-secondary)")
      .text(d=>d.name),
    u => u.transition(T()).attr("y",d=>y(d.name)+y.bandwidth()/2).text(d=>d.name)
  );

  // bars
  const bars = svg.selectAll("rect.plan-bar").data(data, d=>d.name);
  bars.join(
    e => e.append("rect").attr("class","plan-bar")
      .attr("x", m.left).attr("y", d=>y(d.name))
      .attr("height", y.bandwidth()).attr("width",0).attr("rx",3)
      .attr("fill", drug.color)
      .attr("aria-label", d => `${d.name} plan: ${fmt$(d.cost)} per year`)
      .style("cursor","pointer")
      .on("click",(ev,d) => applyFilter({selectedPlan: s.selectedPlan===d.name?null:d.name}))
      .on("mousemove",(ev,d)=>{
        const worst = d3.max(data,x=>x.cost);
        showTip(`<div class="tt-title">${d.name}</div><div class="tt-val" style="color:${drug.color}">${fmt$(d.cost)} / yr</div><div class="tt-sub">Saves ${fmt$(worst-d.cost)} vs worst plan</div>`, ev, drug.color);
      })
      .on("mouseleave", hideTip)
      .call(e => e.transition(T()).attr("width", d=>x(d.cost)-m.left)),
    u => u.transition(T())
      .attr("y", d=>y(d.name)).attr("height", y.bandwidth())
      .attr("width", d=>x(d.cost)-m.left)
      .attr("fill", drug.color)
  );
  svg.selectAll("rect.plan-bar")
    .attr("opacity", d => s.selectedPlan ? (d.name===s.selectedPlan?1:0.12) : 0.85)
    .attr("stroke", d => d.name===s.selectedPlan ? drug.color : "none")
    .attr("stroke-width", d => d.name===s.selectedPlan ? 2 : 0);

  // value labels
  const vals = svg.selectAll("text.plan-val").data(data, d=>d.name);
  vals.join(
    e => e.append("text").attr("class","plan-val")
      .attr("y", d=>y(d.name)+y.bandwidth()/2).attr("dy","0.34em")
      .style("font-family","'JetBrains Mono',monospace").style("font-size","11px").style("font-weight","600")
      .style("fill","var(--text-secondary)"),
    u => u
  );
  svg.selectAll("text.plan-val")
    .transition(T())
    .attr("x", d=>x(d.cost)+5)
    .attr("y", d=>y(d.name)+y.bandwidth()/2)
    .text((d,i) => i===0 ? `${fmt$(d.cost)} ★` : fmt$(d.cost))
    .style("fill", (d,i)=> i===0 ? drug.color : "var(--text-secondary)");

  // Brushed-drugs filter overlay
  svg.selectAll(".plans-brush-overlay").remove();
  if(s.brushedDrugs && !s.brushedDrugs.includes(s.selectedDrug)){
    svg.append("rect").attr("class","plans-brush-overlay")
      .attr("x",0).attr("y",0).attr("width",W).attr("height",H)
      .attr("fill","var(--bg-page)").attr("opacity",0.88);
    svg.append("text").attr("class","plans-brush-overlay-text")
      .attr("x",W/2).attr("y",H/2).attr("text-anchor","middle").attr("dy","0.34em")
      .style("font-family","'Outfit',sans-serif").style("font-size","10px")
      .style("fill","var(--text-muted)").style("font-weight","500")
      .text("Drug filtered out — clear brush to view plans");
    return; // stop here, don't render bars below
  }

  // "Save $XXX/yr" badge on cheapest plan
  const worstCost = d3.max(data, p=>p.cost);
  const bestCost  = d3.min(data, p=>p.cost);
  const savings   = worstCost - bestCost;
  const cheapest  = data[0];
  // Remove any existing badge then re-render (single-row, simple)
  svg.selectAll(".plan-savings-badge").remove();
  if(savings > 0){
    const bestValStr = `${fmt$(bestCost)} ★`;
    // approx pixel width of value label to position badge after it
    const badgeText = `Save ${fmt$(savings)}/yr`;
    const badge = svg.append("g").attr("class","plan-savings-badge")
      .attr("transform", `translate(${x(bestCost)+5 + bestValStr.length*5.5 + 6}, ${y(cheapest.name)+y.bandwidth()/2})`);
    const txt = badge.append("text")
      .attr("y", 0).attr("dy","0.34em")
      .style("font-family","'Outfit',sans-serif").style("font-size","10px").style("font-weight","600")
      .style("fill","#16a34a")
      .attr("x", 5)
      .text(badgeText);
    const bbox = txt.node().getBBox();
    badge.insert("rect", "text")
      .attr("x", 0).attr("y", bbox.y - 1.5)
      .attr("width", bbox.width + 10).attr("height", bbox.height + 3)
      .attr("rx", 3)
      .attr("fill","#f0fdf4").attr("stroke","#86efac").attr("stroke-width", 0.8);
  }
}

/* ============================================================
   CHART 5: BUBBLE SCATTER
   ============================================================ */
let scatterState = null;
function initScatter(){
  const container = document.getElementById("chart-scatter");
  const {W, H} = getDims(container, 400, 190);
  const m = {top:10,right:14,bottom:24,left:32};
  const svg = d3.select("#chart-scatter").append("svg").attr("viewBox",`0 0 ${W} ${H}`);

  const data = DRUG_LIST.flatMap(d =>
    REGIONS.slice(1).map(r => ({
      drugId:d.id, drugName:d.name, region:r, color:d.color,
      x:d.benefNum[r], y:d.costPerClaim[r], r:d.spending[r],
      label:d.name.substring(0,3).toUpperCase()
    }))
  );

  const x = d3.scaleLinear().domain([0, d3.max(data,d=>d.x)*1.1]).range([m.left, W-m.right]);
  const y = d3.scaleLinear().domain([d3.min(data,d=>d.y)*0.85, d3.max(data,d=>d.y)*1.05]).range([H-m.bottom, m.top]);
  const r = d3.scaleSqrt().domain([0, d3.max(data,d=>d.r)]).range([5, 22]);

  // axes
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${H-m.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(v=>v>=1000?(v/1000).toFixed(1)+"M":v+"K").tickSize(-(H-m.top-m.bottom)))
    .call(g => g.selectAll("line").attr("stroke","#f1f5f9"))
    .call(g => g.select(".domain").remove());
  svg.append("g").attr("class","axis").attr("transform",`translate(${m.left},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(v=>"$"+v).tickSize(-(W-m.left-m.right)))
    .call(g => g.selectAll("line").attr("stroke","#f1f5f9"))
    .call(g => g.select(".domain").remove());

  svg.append("text").attr("class","axis-label").attr("x", W/2).attr("y", H-4).attr("text-anchor","middle").text("Beneficiaries");
  svg.append("text").attr("class","axis-label").attr("transform",`rotate(-90)`).attr("x", -H/2).attr("y",10).attr("text-anchor","middle").text("Cost/Claim");

  const g = svg.append("g").attr("class","bubbles");
  const groups = g.selectAll("g.bub").data(data).join("g").attr("class","bub")
    .attr("transform",d=>`translate(${x(d.x)},${y(d.y)})`)
    .style("cursor","pointer")
    .attr("aria-label", d => `${d.drugName} in ${d.region}: ${fmt$(d.y)} per claim`)
    .on("click",(e,d)=> applyFilter({selectedDrug:d.drugId, selectedRegion:d.region, selectedStateName:null}))
    .on("mouseenter",(e,d)=> applyHover(d.drugId))
    .on("mouseleave",(e,d)=>{ applyHover(null); hideTip(); })
    .on("mousemove",(e,d)=>{
      showTip(`<div class="tt-title" style="color:${d.color}">${d.drugName} · ${d.region}</div><div class="tt-val">${fmt$(d.y)} / claim</div><div class="tt-sub">${(d.x/1000).toFixed(2)}M patients · ${fmt$B(d.r)} total</div>`, e, d.color);
    });

  groups.append("circle").attr("class","bub-c").attr("r", d=>r(d.r)).attr("fill", d=>d.color);
  groups.append("text").attr("class","bub-l")
    .attr("text-anchor","middle").attr("dy","0.34em")
    .style("font-family","'JetBrains Mono',monospace").style("font-size","9px").style("font-weight","600")
    .style("fill","#fff").style("pointer-events","none")
    .text(d=>d.label);

  // Bubble-size legend (static, bottom-left)
  const legendData = [
    {label:"$1.5B", v:1500},
    {label:"$7B",   v:7000},
    {label:"$18B",  v:18000},
  ];
  const lg = svg.append("g").attr("class","scatter-size-legend")
    .attr("transform", `translate(${m.left + 6}, ${H - m.bottom - 56})`);
  lg.append("text").attr("x", 0).attr("y", 0)
    .style("font-family","'Outfit',sans-serif").style("font-size","10px").style("fill","#94a3b8")
    .text("Spending (total)");
  let cursorX = 4;
  legendData.forEach(d => {
    const rad = r(d.v);
    cursorX += rad;
    lg.append("circle")
      .attr("cx", cursorX).attr("cy", 18)
      .attr("r", rad)
      .attr("fill", "none").attr("stroke", "#cbd5e1").attr("stroke-width", 1);
    lg.append("text")
      .attr("x", cursorX).attr("y", 18 + rad + 8)
      .attr("text-anchor","middle")
      .style("font-family","'JetBrains Mono',monospace").style("font-size","9px").style("fill","#94a3b8")
      .text(d.label);
    cursorX += rad + 10;
  });

  scatterState = { svg, data };
  dispatch.on("stateChange.scatter", updateScatter);
  updateScatter(state);
}

function updateScatter(s){
  const {svg} = scatterState;
  svg.selectAll("g.bub").each(function(d){
    const g = d3.select(this);
    const drugMatch = d.drugId === s.selectedDrug;
    const regMatch = d.region === s.selectedRegion;
    const passes = !s.brushedDrugs || s.brushedDrugs.includes(d.drugId);
    let op;
    if(!passes) op = 0.05;
    else if(drugMatch && regMatch) op = 1;
    else if(drugMatch) op = 0.75;
    else if(regMatch) op = 0.5;
    else op = 0.1;
    g.transition(T()).attr("opacity", op);
    g.select("circle")
      .attr("stroke", drugMatch && regMatch ? "#fff" : (drugMatch ? d.color : "none"))
      .attr("stroke-width", drugMatch && regMatch ? 2 : (drugMatch ? 1 : 0));
  });
}

/* ============================================================
   CHART 6: DONUT
   ============================================================ */
let donutState = null;
function initDonut(){
  const container = document.getElementById("chart-donut");
  const {W, H} = getDims(container, 240, 190);
  const cx = W*0.46, cy = H*0.5;
  const outerR = Math.min(W,H)*0.42 - 4;
  const innerR = outerR*0.55;
  const svg = d3.select("#chart-donut").append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform",`translate(${cx},${cy})`);

  const center = g.append("g").attr("class","donut-center");
  center.append("text").attr("class","donut-pct").attr("text-anchor","middle").attr("dy","-0.1em")
    .style("font-family","'JetBrains Mono',monospace").style("font-size","18px").style("font-weight","600");
  center.append("text").attr("class","donut-name").attr("text-anchor","middle").attr("dy","1.05em")
    .style("font-family","'Outfit',sans-serif").style("font-size","11px").style("fill","var(--text-secondary)");

  // legend
  const legend = svg.append("g").attr("class","donut-legend").attr("transform",`translate(${cx + outerR + 12},${cy - outerR})`);

  donutState = { svg, g, W, H, outerR, innerR, cx, cy, legend };
  dispatch.on("stateChange.donut", updateDonut);
  updateDonut(state);
}

function updateDonut(s){
  const {g, outerR, innerR, legend} = donutState;
  const region = s.selectedRegion;
  const data = DRUG_LIST.map(d => ({drugId:d.id, name:d.name, color:d.color, value:d.spending[region]}));
  const total = d3.sum(data,d=>d.value);
  const pie = d3.pie().sort(null).value(d=>d.value);
  const arcs = pie(data);
  const arcGen = d3.arc().innerRadius(innerR);

  const sel = g.selectAll("path.slice").data(arcs, d=>d.data.drugId);
  sel.join(
    e => e.append("path").attr("class","slice")
      .attr("fill", d=>d.data.color)
      .attr("d", d=>arcGen.outerRadius(outerR)(d))
      .style("cursor","pointer")
      .attr("aria-label", d => `${d.data.name}: ${fmt$B(d.data.value)} spending share`)
      .on("click",(ev,d)=> applyFilter({selectedDrug:d.data.drugId}))
      .on("mouseenter",(ev,d)=> applyHover(d.data.drugId))
      .on("mouseleave",(ev,d)=>{ applyHover(null); hideTip(); })
      .on("mousemove",(ev,d)=>{
        const pct = ((d.data.value/total)*100).toFixed(0);
        showTip(`<div class="tt-title" style="color:${d.data.color}">${d.data.name}</div><div class="tt-val">${fmt$B(d.data.value)} (${pct}% of ${region})</div>`, ev, d.data.color);
      }),
    u => u.transition(T()).attrTween("d", function(d){
      const prev = this._current || d;
      const i = d3.interpolate(prev,d);
      this._current = d;
      return t => arcGen.outerRadius(d.data.drugId === s.selectedDrug ? outerR+4 : outerR)(i(t));
    })
  );
  g.selectAll("path.slice")
    .each(function(d){this._current = d;})
    .attr("opacity", d => d.data.drugId === s.selectedDrug ? 1 : (s.brushedDrugs && !s.brushedDrugs.includes(d.data.drugId) ? 0.05 : 0.22));

  // center text
  const sel_drug = DRUGS[s.selectedDrug];
  const selVal = data.find(d=>d.drugId===s.selectedDrug).value;
  const pct = ((selVal/total)*100).toFixed(0);
  g.select(".donut-pct").text(pct+"%").style("fill", sel_drug.color);
  g.select(".donut-name").text(sel_drug.name);

  // legend
  const leg = legend.selectAll("g.li").data(data, d=>d.drugId);
  const enter = leg.enter().append("g").attr("class","li").style("cursor","pointer")
    .on("click",(e,d)=> applyFilter({selectedDrug:d.drugId}))
    .on("mouseenter",(e,d)=> applyHover(d.drugId))
    .on("mouseleave",(e,d)=> applyHover(null));
  enter.append("rect").attr("width",7).attr("height",7).attr("rx",1.5);
  enter.append("text").attr("x",11).attr("y",6.5)
    .style("font-family","'Outfit',sans-serif").style("font-size","11px");

  legend.selectAll("g.li")
    .attr("transform",(d,i)=>`translate(0,${i*13})`)
    .each(function(d){
      const li = d3.select(this);
      const pctI = ((d.value/total)*100).toFixed(0);
      li.select("rect").attr("fill", d.color);
      li.select("text").text(`${d.name} ${pctI}%`)
        .style("fill", d.drugId===s.selectedDrug ? d.color : "var(--text-secondary)")
        .style("font-weight", d.drugId===s.selectedDrug ? "600":"400");
    });
}

/* ============================================================
   CHART 7: TREEMAP
   ============================================================ */
let treemapState = null;
function initTreemap(){
  const container = document.getElementById("chart-treemap");
  const {W, H} = getDims(container, 295, 190);
  const svg = d3.select("#chart-treemap").append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  treemapState = { svg, W, H };
  dispatch.on("stateChange.treemap", updateTreemap);
  updateTreemap(state);
}

function updateTreemap(s){
  const {svg, W, H} = treemapState;
  const root = d3.hierarchy(TREEMAP_DATA).sum(d=>d.value).sort((a,b)=>b.value-a.value);
  d3.treemap().size([W,H]).paddingInner(1.5).paddingOuter(3).round(true)(root);
  const leaves = root.leaves();

  // Ensure a <defs> element exists for clipPath nodes
  let defs = svg.select("defs");
  if(defs.empty()) defs = svg.append("defs");

  // One clipPath per leaf cell (id-stable via drugId-region key)
  const clips = defs.selectAll("clipPath.tm-clip")
    .data(leaves, d=>d.data.drugId+"-"+d.data.region);
  const clipsEnter = clips.enter().append("clipPath")
    .attr("class","tm-clip")
    .attr("id", d=>`tm-clip-${d.data.drugId}-${d.data.region}`);
  clipsEnter.append("rect").attr("x",0).attr("y",0);
  // Update clipPath rect sizes to match current layout (transition in sync with cells)
  defs.selectAll("clipPath.tm-clip").select("rect")
    .transition(T())
    .attr("width",  d => Math.max(0, d.x1 - d.x0 - 2))
    .attr("height", d => Math.max(0, d.y1 - d.y0 - 2));

  const cells = svg.selectAll("g.cell").data(leaves, d=>d.data.drugId+"-"+d.data.region);
  const enter = cells.enter().append("g").attr("class","cell").style("cursor","pointer")
    .attr("aria-label", d => `${DRUGS[d.data.drugId].name} ${d.data.region}: ${fmt$B(d.data.value)}`)
    .on("click",(e,d)=> applyFilter({selectedDrug:d.data.drugId, selectedRegion:d.data.region, selectedStateName:null}))
    .on("mouseenter",(e,d)=> applyHover(d.data.drugId))
    .on("mouseleave",(e,d)=>{ applyHover(null); hideTip(); })
    .on("mousemove",(e,d)=>{
      showTip(`<div class="tt-title" style="color:${d.data.color}">${DRUGS[d.data.drugId].name} · ${d.data.region}</div><div class="tt-val">${fmt$B(d.data.value)}</div>`, e, d.data.color);
    });
  enter.append("rect");
  enter.append("text").attr("class","cell-name");
  enter.append("text").attr("class","cell-val");

  const all = enter.merge(cells);
  all.transition(T()).attr("transform", d=>`translate(${d.x0},${d.y0})`);
  all.attr("clip-path", d=>`url(#tm-clip-${d.data.drugId}-${d.data.region})`);
  all.select("rect")
    .transition(T())
    .attr("width", d=>Math.max(0,d.x1-d.x0))
    .attr("height", d=>Math.max(0,d.y1-d.y0))
    .attr("rx",3)
    .attr("fill", d=>d.data.color)
    .attr("opacity", d => {
      if(s.brushedDrugs && !s.brushedDrugs.includes(d.data.drugId)) return 0.04;
      if(s.selectedDrug === d.data.drugId) return 0.85;
      return 0.12;
    })
    .attr("stroke", d => {
      if(s.selectedDrug === d.data.drugId) return d.data.color;
      if(s.selectedRegion === d.data.region && s.selectedRegion!=="National") return "#1e293b";
      return "none";
    })
    .attr("stroke-width", d => (s.selectedDrug === d.data.drugId || (s.selectedRegion===d.data.region && s.selectedRegion!=="National")) ? 1.5 : 0);

  all.select(".cell-name")
    .attr("x", 6).attr("y", 14)
    .style("font-family","'Outfit',sans-serif").style("font-size","11px").style("font-weight","600")
    .style("fill", d => s.selectedDrug===d.data.drugId ? "#fff" : d.data.color)
    .style("pointer-events","none")
    .style("display", d => ((d.x1-d.x0) > 40 && (d.y1-d.y0) > 20) ? null : "none")
    .text(d => {
      const w = d.x1-d.x0, h = d.y1-d.y0;
      if(w*h < 600) return "";
      return DRUGS[d.data.drugId].name;
    });
  all.select(".cell-val")
    .attr("x", 6).attr("y", 24)
    .style("font-family","'JetBrains Mono',monospace").style("font-size","8.5px")
    .style("fill", d => s.selectedDrug===d.data.drugId ? "#fff" : "var(--text-secondary)")
    .style("pointer-events","none")
    .style("display", d => ((d.x1-d.x0) > 40 && (d.y1-d.y0) > 28) ? null : "none")
    .text(d => {
      const w = d.x1-d.x0, h = d.y1-d.y0;
      if(w*h < 700) return "";
      return `${d.data.region} · ${fmt$B(d.data.value)}`;
    });
}

/* ============================================================
   CHART 8: LOLLIPOP (left) + TREND (right)
   ============================================================ */
let lolliState = null;
function initLollipop(){
  const container = document.getElementById("chart-lollipop");
  const {W, H} = getDims(container, 300, 190);
  const svg = d3.select("#chart-lollipop").append("svg").attr("viewBox",`0 0 ${W} ${H}`);
  lolliState = { svg, W, H };
  dispatch.on("stateChange.lollipop", updateLollipop);
  updateLollipop(state);
}

function updateLollipop(s){
  const {svg, W, H} = lolliState;
  const drug = DRUGS[s.selectedDrug];
  const region = s.selectedRegion;
  const mult = REGIONAL_COVERAGE_MULT[region] || 1.0;
  const isNational = region === "National";

  // Apply regional multiplier to US-based scenarios (rows 0-3); leave Canada/UK NHS unchanged
  const coverageData = drug.coverage.map((cov, i) => {
    const isUSBased = i <= 3;
    let cost = cov.cost;
    if(i === 0 && s.selectedPlan){
      const plan = drug.plans.find(p=>p.name===s.selectedPlan);
      if(plan) cost = Math.round(plan.cost * mult);
    } else if(isUSBased){
      cost = Math.round(cov.cost * mult);
    }
    let scenario = cov.scenario;
    if(i === 0 && s.selectedPlan) scenario = `${s.selectedPlan} Plan`;
    return {...cov, scenario, cost, isRegional: isUSBased && !isNational};
  });

  // Insert "Medicare Nat'l Avg" reference row when a non-national region is active.
  // This is ALWAYS drug.coverage[2].cost (Medicare Avg) — static, never plan-adjusted.
  // It shows what the average Medicare patient pays nationally, regardless of which
  // private plan is selected above.
  let displayData = coverageData;
  if(!isNational){
    const medicareNationalCost = drug.coverage[2].cost; // Medicare Avg is immutable
    displayData = [
      coverageData[0],
      {scenario:"Medicare Nat'l Avg", cost: medicareNationalCost, color:"#94a3b8", isReference:true},
      ...coverageData.slice(1),
    ];
  }

  // Update card title + hint based on state name / region
  const locationLabel = s.selectedStateName
    ? s.selectedStateName
    : (s.selectedRegion !== "National" ? s.selectedRegion : null);
  const titleEl = document.querySelector("#card-lollipop .card-title");
  const hintEl  = document.querySelector("#card-lollipop .card-hint");
  if(titleEl){
    titleEl.textContent = locationLabel
      ? `What will you actually pay per year? · ${locationLabel}`
      : "What will you actually pay per year?";
  }
  if(hintEl){
    hintEl.textContent = locationLabel
      ? `Costs adjusted for ${locationLabel} · includes intl comparison below`
      : "US & international plans shown · click a plan bar above to personalize";
  }

  const m = {top:6,right:60,bottom:6,left:120};
  const y = d3.scaleBand().domain(displayData.map(d=>d.scenario)).range([m.top, H-m.bottom]).padding(0.3);
  const x = d3.scaleLinear().domain([0, d3.max(displayData,d=>d.cost)*1.15]).range([m.left, W-m.right]);

  svg.selectAll("*").remove();

  const rows = svg.selectAll("g.lr").data(displayData).join("g").attr("class","lr")
    .attr("transform", d=>`translate(0,${y(d.scenario)+y.bandwidth()/2})`)
    .attr("aria-label", d => `${d.scenario}: ${fmt$(d.cost)} annual cost`);

  // scenario label
  rows.append("text")
    .attr("x", m.left-6).attr("y",0).attr("dy","0.34em").attr("text-anchor","end")
    .style("font-family","'Outfit',sans-serif").style("font-size","11px")
    .style("fill", d=>d.color)
    .style("font-style", d=>d.isReference ? "italic" : null)
    .text(d=>d.isReference ? `${d.scenario} (national avg)` : d.scenario);

  // line
  rows.append("line")
    .attr("x1", m.left).attr("x2", m.left).attr("y1",0).attr("y2",0)
    .attr("stroke", d=>d.color).attr("stroke-width",1.4)
    .attr("stroke-dasharray", d=>d.isReference ? "4,3" : null)
    .attr("x2", d=>x(d.cost));

  // circle
  rows.append("circle")
    .attr("cx", d=>x(d.cost)).attr("cy",0)
    .attr("r", d=>d.isReference ? 3.5 : 5)
    .attr("fill", d=>d.isReference ? "#94a3b8" : d.color)
    .attr("class", d => d.scenario === "No Insurance" ? "lollipop-pulse" : "");

  // value
  rows.append("text")
    .attr("y",0).attr("dy","0.34em")
    .style("font-family","'JetBrains Mono',monospace").style("font-size","11px").style("font-weight","600")
    .style("fill", d=>d.color)
    .style("font-style", d=>d.isReference ? "italic" : null)
    .attr("x", d=>x(d.cost)+10)
    .text(d => d.currencyNote ? `${fmt$(d.cost)} USD` : fmt$(d.cost));

  // International currency footnote (only when international rows are visible — always are here)
  const hasIntl = displayData.some(d=>d.currencyNote);
  if(hasIntl){
    svg.append("text").attr("class","intl-footnote")
      .attr("x", m.left-6).attr("y", H-1)
      .attr("text-anchor","start")
      .style("font-family","'Outfit',sans-serif").style("font-size","10px")
      .style("fill","#94a3b8").style("font-style","italic")
      .text("† International costs shown as USD equivalents (OECD 2023)");
  }
}

/* ---- TREND ---- */
let trendState = null;
function initTrend(){
  const container = document.getElementById("chart-trend");
  const {W, H} = getDims(container, 130, 190);
  const m = {top:6,right:30,bottom:14,left:6};
  const svg = d3.select("#chart-trend").append("svg").attr("viewBox",`0 0 ${W} ${H}`);

  const x = d3.scalePoint().domain(MULTI_TREND.map(d=>d.year)).range([m.left+10, W-m.right]);
  const allVals = DRUG_IDS.flatMap(id => MULTI_TREND.map(d=>d[id]));
  const y = d3.scaleLinear().domain([0, d3.max(allVals)*1.05]).range([H-m.bottom, m.top]);

  // y axis
  svg.append("g").attr("class","axis").attr("transform",`translate(${W-m.right+2},0)`)
    .call(d3.axisRight(y).ticks(3).tickFormat(v=>"$"+(v/1000).toFixed(0)+"B").tickSize(0))
    .call(g=>g.select(".domain").remove());

  // x axis years (sparse)
  svg.append("text").attr("x",x("2019")).attr("y",H-2)
    .style("font-family","'JetBrains Mono',monospace").style("font-size","9px").style("fill","var(--text-muted)")
    .text("19");
  svg.append("text").attr("x",x("2023")).attr("y",H-2)
    .style("font-family","'JetBrains Mono',monospace").style("font-size","9px").style("fill","var(--text-muted)")
    .text("23");

  const line = id => d3.line().x(d=>x(d.year)).y(d=>y(d[id])).curve(d3.curveMonotoneX);

  const lines = svg.append("g").attr("class","lines");
  lines.selectAll("path").data(DRUG_IDS).join("path")
    .attr("class","trend-line")
    .attr("data-id",d=>d)
    .attr("fill","none")
    .attr("stroke", id=>DRUGS[id].color)
    .attr("d", id=>line(id)(MULTI_TREND))
    .attr("aria-label", id => `${DRUGS[id].name} spending trend 2019–2023`)
    .style("cursor","pointer")
    .on("click",(e,id)=> applyFilter({selectedDrug:id}))
    .on("mouseenter",(e,id)=> applyHover(id))
    .on("mouseleave",(e,id)=>{ applyHover(null); hideTip(); })
    .on("mousemove",(e,id)=>{
      const last = MULTI_TREND[MULTI_TREND.length-1][id];
      showTip(`<div class="tt-title" style="color:${DRUGS[id].color}">${DRUGS[id].name}</div><div class="tt-val">${fmt$B(last)} (2023)</div>`, e, DRUGS[id].color);
    });

  // watermark for region-filtered state
  const watermark = svg.append("text").attr("class","watermark")
    .attr("x", W/2).attr("y", H/2 + 10)
    .attr("text-anchor","middle")
    .style("font-family","'Outfit',sans-serif").style("font-size","20px")
    .style("font-weight","700").style("fill","#e2e8f0").style("opacity",0)
    .style("pointer-events","none")
    .text("NATIONAL DATA");

  // time-range brush
  const brush = d3.brushX()
    .extent([[m.left, m.top],[W-m.right, H-m.bottom]])
    .on("end", function(ev){
      if(!ev.selection){ applyFilter({selectedYearRange:null}); return; }
      const [px0, px1] = ev.selection;
      const y0 = pixelToYear(px0, x);
      const y1 = pixelToYear(px1, x);
      const startYear = Math.min(parseInt(y0), parseInt(y1)).toString();
      const endYear   = Math.max(parseInt(y0), parseInt(y1)).toString();
      applyFilter({selectedYearRange:[startYear, endYear]});
    });
  const brushG = svg.append("g").attr("class","trend-brush").call(brush);
  // double-click clears brush
  svg.on("dblclick", () => {
    brushG.call(brush.move, null);
    applyFilter({selectedYearRange:null});
  });

  trendState = { svg, x, y, line, brushG, brush, watermark };
  dispatch.on("stateChange.trend", updateTrend);
  updateTrend(state);
}

function updateTrend(s){
  if(!trendState) return;
  // Trend always shows national totals — annotate the split header when region is filtered
  const trendTitleEl = document.querySelector(".split-right-title");
  if(trendTitleEl){
    trendTitleEl.textContent = s.selectedRegion !== "National"
      ? "TREND · NATIONAL ONLY"
      : "TREND";
  }
  const {svg} = trendState;
  svg.selectAll("path.trend-line")
    .transition(T())
    .attr("opacity", id => {
      if(s.brushedDrugs && !s.brushedDrugs.includes(id)) return 0.05;
      return s.selectedDrug === id ? 1 : 0.18;
    })
    .attr("stroke-width", id => s.selectedDrug === id ? 2 : 0.7);

  // watermark + border cue when region is filtered
  if(trendState.watermark){
    trendState.watermark.transition(T())
      .attr("opacity", s.selectedRegion !== "National" ? 0.06 : 0);
  }
  const trendCard = document.getElementById("chart-trend")?.closest(".chart-card");
  if(trendCard) trendCard.classList.toggle("region-filtered", s.selectedRegion !== "National");
}

/* ============================================================
   CHART 10: SPLOM (scatterplot matrix)
   ============================================================ */
function initSplom(){
  const container = document.getElementById("chart-splom");
  const W = container.offsetWidth  || 260;
  const H = container.offsetHeight || 150;

  const N = 3;
  const PAD = 4;

  const cellSize = Math.min(
    (W - PAD * (N + 1)) / N,
    (H - PAD * (N + 1)) / N
  );

  splomMeta = { W, H, N, PAD, cellSize, container };

  const svg = d3.select(container)
    .append("svg")
    .attr("width", W)
    .attr("height", H)
    .attr("id", "splom-svg");

  splomScales = SPLOM_DIMS.map(() =>
    d3.scaleLinear().range([cellSize - PAD - 4, PAD + 4])
  );

  const cells = [];
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const x = PAD + col * (cellSize + PAD);
      const y = PAD + row * (cellSize + PAD);
      cells.push({ row, col, x, y });
    }
  }

  const cellGs = svg.selectAll("g.splom-cell")
    .data(cells)
    .join("g")
    .attr("class", "splom-cell")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  cellGs.append("rect")
    .attr("class", "splom-bg")
    .attr("width",  cellSize)
    .attr("height", cellSize)
    .attr("rx", 3)
    .attr("fill", d => d.row === d.col ? "#f3e8ff" : "#e2e8f0")
    .attr("stroke", d => d.row === d.col ? "#c4b5fd" : "#94a3b8")
    .attr("stroke-width", d => d.row === d.col ? 1.0 : 0.6);

  cellGs.filter(d => d.row === d.col)
    .append("text")
    .attr("class", "splom-diag-label")
    .attr("x", cellSize / 2)
    .attr("y", cellSize / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-family", "Outfit, sans-serif")
    .attr("font-size", Math.max(8, cellSize * 0.12))
    .attr("font-weight", "600")
    .attr("fill", "#7c3aed")
    .text(d => SPLOM_DIMS[d.row].label);

  const offDiag = cellGs.filter(d => d.row !== d.col);

  const defs = svg.append("defs");
  offDiag.each(function(d){
    defs.append("clipPath")
      .attr("id", `splom-clip-${d.row}-${d.col}`)
      .append("rect")
      .attr("width",  cellSize - 1)
      .attr("height", cellSize - 1);
  });

  offDiag.attr("clip-path", d => `url(#splom-clip-${d.row}-${d.col})`);
  offDiag.append("g").attr("class", "splom-dots");

  dispatch.on("stateChange.splom", updateSplom);
  updateSplom(state);
}

function updateSplom(s){
  const { cellSize, PAD } = splomMeta;
  if (!cellSize) return;

  const points = getSplomPoints(s.selectedRegion);

  SPLOM_DIMS.forEach((dim, i) => {
    const vals = points.map(p => p[dim.key]);
    const ext  = d3.extent(vals);
    const margin = (ext[1] - ext[0]) * 0.15 || 1;
    splomScales[i].domain([ext[0] - margin, ext[1] + margin]);
  });

  // Diagonal min / max edge labels
  d3.select("#splom-svg").selectAll("g.splom-cell")
    .filter(d => d.row === d.col)
    .each(function(cellData){
      const dim = SPLOM_DIMS[cellData.row];
      const vals = points.map(p => p[dim.key]);
      const minV = d3.min(vals), maxV = d3.max(vals);
      const g = d3.select(this);
      const fs = Math.max(6, cellSize*0.09);
      // max at top
      let maxEl = g.select("text.splom-max");
      if(maxEl.empty()){
        maxEl = g.append("text").attr("class","splom-max")
          .attr("x", cellSize/2).attr("text-anchor","middle")
          .attr("font-family","JetBrains Mono, monospace")
          .attr("font-size", fs).attr("fill","#9333ea");
      }
      maxEl.attr("y", PAD + 10).text(dim.format(maxV));
      // min at bottom
      let minEl = g.select("text.splom-min");
      if(minEl.empty()){
        minEl = g.append("text").attr("class","splom-min")
          .attr("x", cellSize/2).attr("text-anchor","middle")
          .attr("font-family","JetBrains Mono, monospace")
          .attr("font-size", fs).attr("fill","#9333ea");
      }
      minEl.attr("y", cellSize - PAD - 2).text(dim.format(minV));
    });

  d3.select("#splom-svg").selectAll("g.splom-cell")
    .each(function(cellData){
      if (cellData.row === cellData.col) return;

      const xDim = SPLOM_DIMS[cellData.col];
      const yDim = SPLOM_DIMS[cellData.row];
      const xScale = splomScales[cellData.col];
      const yScale = splomScales[cellData.row];

      const dotsGroup = d3.select(this).select("g.splom-dots");

      function dotOpacity(p){
        if (s.brushedDrugs && !s.brushedDrugs.includes(p.drugId)) return 0.06;
        if (s.selectedDrug === p.drugId) return 1.0;
        return 0.45;
      }
      function dotRadius(p){
        return s.selectedDrug === p.drugId ? 6.0 : 4.0;
      }

      const cyOf = p => yScale(p[yDim.key]);

      dotsGroup.selectAll("circle.splom-dot")
        .data(points, p => p.drugId)
        .join(
          enter => enter.append("circle")
            .attr("class", "splom-dot")
            .attr("cx", p => xScale(p[xDim.key]))
            .attr("cy", p => cyOf(p))
            .attr("r",  p => dotRadius(p))
            .attr("fill", p => p.color)
            .attr("stroke", p => s.selectedDrug === p.drugId ? p.color : "none")
            .attr("stroke-width", 1.5)
            .attr("opacity", p => dotOpacity(p))
            .attr("cursor", "pointer")
            .attr("aria-label", p => `${p.name} drug profile dot`)
            .on("click", (event, p) => {
              event.stopPropagation();
              applyFilter({ selectedDrug: p.drugId });
            })
            .on("mouseenter", function(event, p){
              applyHover(p.drugId);
            })
            .on("mouseleave", function(event, p){
              applyHover(null);
            })
            .on("mouseover", function(event, p){
              d3.select(this).attr("r", dotRadius(p) + 2);
              showTip(
                `<div class="tt-title" style="color:${p.color}">${p.name}</div>` +
                `<div class="tt-sub">${xDim.label}: ${xDim.format(p[xDim.key])}</div>` +
                `<div class="tt-sub">${yDim.label}: ${yDim.format(p[yDim.key])}</div>`,
                event, p.color
              );
            })
            .on("mousemove", (event) => moveTip(event))
            .on("mouseout", function(event, p){
              d3.select(this).attr("r", dotRadius(p));
              hideTip();
            }),

          update => update
            .call(sel => sel
              .transition()
              .duration(280)
              .ease(d3.easeCubicOut)
              .attr("cx", p => xScale(p[xDim.key]))
              .attr("cy", p => cyOf(p))
              .attr("r",  p => dotRadius(p))
              .attr("opacity", p => dotOpacity(p))
              .attr("stroke", p => s.selectedDrug === p.drugId ? p.color : "none")
            ),

          exit => exit.remove()
        );
    });
}

/* ============================================================
   HOVER CROSS-HIGHLIGHTING
   ============================================================ */
function updateAllHover(s){
  const h = s.hoveredDrug;
  const dur = 160;

  if(!h){
    // mouseout — revert all charts to click-based state
    if(streamState) updateStream(state);
    if(parState)    updateParallel(state);
    if(scatterState) updateScatter(state);
    if(donutState)  updateDonut(state);
    if(treemapState) updateTreemap(state);
    if(trendState)  updateTrend(state);
    if(splomMeta.cellSize) updateSplom(state);
    return;
  }

  // Stream — selected drug stays full, hovered non-selected gets soft preview
  if(streamState){
    streamState.svg.selectAll("path.band").transition().duration(dur)
      .attr("opacity", d => {
        if(d.key === s.selectedDrug) return 0.95;
        if(d.key === h) return 0.55;
        return 0.12;
      });
    streamState.svg.selectAll("text.band-label").transition().duration(dur)
      .attr("opacity", d => {
        if(d.key === s.selectedDrug) return 1;
        if(d.key === h) return 0.7;
        return 0.15;
      });
    streamState.svg.selectAll("text.stream-val").transition().duration(dur)
      .attr("opacity", d => {
        if(d.key === s.selectedDrug) return 0.9;
        if(d.key === h) return 0.5;
        return 0.1;
      });
  }

  // Parallel — selected line stays full, hovered gets soft preview
  if(parState){
    parState.lineG.selectAll("path.par-line").transition().duration(dur)
      .attr("opacity", d => {
        if(d.id === s.selectedDrug) return 1;
        if(d.id === h) return 0.75;
        return 0.45;
      })
      .attr("stroke-width", d => {
        if(d.id === s.selectedDrug) return 2.5;
        if(d.id === h) return 2.0;
        return 1.4;
      });
  }

  // Scatter — selected bubble stays full, hovered gets soft preview
  if(scatterState){
    scatterState.svg.selectAll("g.bub").transition().duration(dur)
      .attr("opacity", d => {
        if(d.drugId === s.selectedDrug) return 1;
        if(d.drugId === h) return 0.45;
        return 0.15;
      });
  }

  // Donut — selected slice stays full, hovered gets soft preview
  if(donutState){
    donutState.g.selectAll("path.slice").transition().duration(dur)
      .attr("opacity", d => {
        if(d.data.drugId === s.selectedDrug) return 1;
        if(d.data.drugId === h) return 0.5;
        return 0.22;
      });
    donutState.legend.selectAll("g.li").transition().duration(dur)
      .attr("opacity", d => {
        if(d.drugId === s.selectedDrug) return 1;
        if(d.drugId === h) return 0.55;
        return 0.25;
      });
  }

  // Treemap — selected drug cells stay full, hovered gets soft preview
  if(treemapState){
    treemapState.svg.selectAll("g.cell rect").transition().duration(dur)
      .attr("opacity", d => {
        if(d.data.drugId === s.selectedDrug) return 0.85;
        if(d.data.drugId === h) return 0.5;
        return 0.12;
      });
  }

  // Trend — selected line stays full, hovered gets soft preview
  if(trendState){
    trendState.svg.selectAll("path.trend-line").transition().duration(dur)
      .attr("opacity", id => {
        if(id === s.selectedDrug) return 1;
        if(id === h) return 0.5;
        return 0.18;
      })
      .attr("stroke-width", id => {
        if(id === s.selectedDrug) return 2;
        if(id === h) return 1.5;
        return 0.7;
      });
  }

  // SPLOM — selected dot stays full, hovered gets soft preview
  if(splomMeta.cellSize){
    d3.select("#splom-svg").selectAll("circle.splom-dot").transition().duration(dur)
      .attr("opacity", p => {
        if(p.drugId === s.selectedDrug) return 1.0;
        if(p.drugId === h) return 0.55;
        return 0.15;
      })
      .attr("r", p => {
        if(p.drugId === s.selectedDrug) return 5;
        if(p.drugId === h) return 4.5;
        return 3.5;
      })
      .attr("stroke", p => {
        if(p.drugId === s.selectedDrug) return p.color;
        if(p.drugId === h) return p.color;
        return "none";
      });
  }
}

dispatch.on("hoverChange", updateAllHover);

/* ============================================================
   PILL & RESET WIRING
   ============================================================ */
d3.selectAll(".drug-pill").on("click", function(){
  const id = this.dataset.drug;
  applyFilter({selectedDrug:id});
}).on("mouseenter", function(){
  const id = this.dataset.drug;
  applyHover(id);
  if(!d3.select(this).classed("active")){
    d3.select(this).text(`${DRUGS[id].name} (${DRUGS[id].class})`);
  }
}).on("mouseleave", function(){
  applyHover(null);
  if(!d3.select(this).classed("active")){
    d3.select(this).text(DRUGS[this.dataset.drug].name);
  }
}).on("keydown", function(e){
  if(e.key === "Enter" || e.key === " "){ e.preventDefault(); applyFilter({selectedDrug:this.dataset.drug}); }
});
d3.select("#reset-btn").on("click", () => {
  // clear parallel brushes
  if(parState){
    parState.brushSelections = {};
    parState.axisG.selectAll("g.dim").each(function(dim){
      if(dim.brush){
        try{ d3.select(this).select(".brush").call(dim.brush.move, null);}catch(e){}
      }
    });
  }
  // clear trend time brush
  if(trendState && trendState.brushG){
    trendState.brushG.call(trendState.brush.move, null);
  }
  applyFilter({...DEFAULT_STATE});
});

window.addEventListener("mousemove", e => {
  if(tooltip.style("display") === "block") moveTip(e);
});

/* ============================================================
   INIT
   ============================================================ */
dispatch.on("stateChange.kpi", updateKPI);
dispatch.on("stateChange.header", updateHeader);

window.addEventListener("DOMContentLoaded", async () => {
  // Load real pricing data before initializing charts
  await loadInsurerPricing();

  // Defer chart init to after first paint so grid/flex containers have real pixel dimensions.
  // Without this, clientWidth/clientHeight = 0 and all SVG viewBoxes are "0 0 0 0".
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fetchTopo();
      initStream();
      initParallel();
      initPlans();
      initScatter();
      initDonut();
      initTreemap();
      initLollipop();
      initTrend();
      initSplom();
      dispatch.call("stateChange", null, state);
    });
  });
});
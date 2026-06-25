/* ============================================================================
 * PlanPilot — Learning Insights Dashboard
 * D3.js visualizations proving the model learns from every interaction.
 * ==========================================================================*/
(function () {
  "use strict";

  let dataStore = null;
  let mlModelParams = null;
  let interactions = [];

  const ANGLE_LABELS = {
    anchoring: "Anchoring",
    lossAversion: "Loss Aversion",
    framing: "Framing",
    socialProof: "Social Proof",
    decoy: "Decoy",
    default: "Default",
    authority: "Authority",
  };
  const ANGLES = Object.keys(ANGLE_LABELS);

  // ===========================================================================
  // Initialization
  // ===========================================================================
  async function init() {
    if (!window.PPStore || !window.PPFeatures || !window.PPLearn || !window.PPModel) {
      document.querySelector(".dashboard").innerHTML =
        '<p style="padding:4rem;text-align:center;color:var(--muted)">Learning modules not loaded.</p>';
      return;
    }

    // Load seed data
    let seedInteractions = [];
    try {
      const res = await fetch("./data/seed_interactions.json");
      if (res.ok) seedInteractions = await res.json();
    } catch (e) { /* ignore */ }

    dataStore = new window.PPStore.DataStore();
    await dataStore.init(seedInteractions);

    interactions = dataStore.getInteractions();
    mlModelParams = window.PPModel.trainModel(interactions);

    renderStats();
    renderConversionTrend();
    renderSegmentTable();
    renderHeatmap();
    populateSegmentSelector();
    renderBanditChart();
    renderFeatureImportance();
    bindControls();
  }

  // ===========================================================================
  // Header Stats
  // ===========================================================================
  function renderStats() {
    const total = interactions.length;
    const converted = interactions.filter(
      (i) => (i.outcome ? i.outcome.converted : i.debrief && i.debrief.converted)
    ).length;
    const rate = total ? ((converted / total) * 100).toFixed(1) : "0";
    const accuracy = mlModelParams && mlModelParams.trained
      ? (mlModelParams.trainAccuracy * 100).toFixed(1) + "%"
      : "N/A";

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statConversion").textContent = rate + "%";
    document.getElementById("statAccuracy").textContent = accuracy;
  }

  // ===========================================================================
  // Chart 1: Conversion Rate Over Time (cumulative line)
  // ===========================================================================
  function renderConversionTrend() {
    const container = document.getElementById("chartConversionTrend");
    container.innerHTML = "";

    const sorted = [...interactions].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length < 2) {
      container.innerHTML = '<p class="card-desc" style="padding:2rem">Not enough data for trend.</p>';
      return;
    }

    // Build cumulative data
    let cumConv = 0;
    const data = sorted.map((it, i) => {
      const conv = it.outcome ? it.outcome.converted : (it.debrief && it.debrief.converted);
      if (conv) cumConv++;
      return { idx: i + 1, rate: cumConv / (i + 1) };
    });

    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, data.length]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    // Area
    const area = d3.area()
      .x((d) => x(d.idx))
      .y0(height)
      .y1((d) => y(d.rate))
      .curve(d3.curveMonotoneX);

    svg.append("path").datum(data).attr("class", "trend-area").attr("d", area);

    // Line
    const line = d3.line()
      .x((d) => x(d.idx))
      .y((d) => y(d.rate))
      .curve(d3.curveMonotoneX);

    svg.append("path").datum(data).attr("class", "trend-line").attr("d", line);

    // Axes
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")));

    svg.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")));

    // Labels
    svg.append("text").attr("class", "axis-label")
      .attr("x", width / 2).attr("y", height + 30)
      .attr("text-anchor", "middle")
      .style("font-size", "0.65rem").style("fill", "var(--muted)")
      .text("Interaction #");

    // Grid
    svg.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""));
  }

  // ===========================================================================
  // Chart 2: Segment Performance Table
  // ===========================================================================
  function renderSegmentTable() {
    const container = document.getElementById("segmentTable");

    // Group by segment
    const segMap = {};
    interactions.forEach((it) => {
      const seg = it.segment || window.PPFeatures.deriveSegment(it.customer);
      if (!segMap[seg]) segMap[seg] = { total: 0, converted: 0 };
      segMap[seg].total++;
      const conv = it.outcome ? it.outcome.converted : (it.debrief && it.debrief.converted);
      if (conv) segMap[seg].converted++;
    });

    const rows = Object.entries(segMap)
      .map(([seg, d]) => ({ segment: seg, ...d, rate: d.converted / d.total }))
      .sort((a, b) => b.total - a.total);

    const maxTotal = Math.max(...rows.map((r) => r.total), 1);

    let html = `<table><thead><tr>
      <th>Segment</th><th>Volume</th><th>Conv. Rate</th><th></th>
    </tr></thead><tbody>`;

    rows.forEach((r) => {
      const barW = Math.round((r.rate) * 80);
      html += `<tr>
        <td><code style="font-size:0.7rem">${r.segment}</code></td>
        <td>${r.total}</td>
        <td>${(r.rate * 100).toFixed(0)}%</td>
        <td><span class="rate-bar" style="width:${barW}px"></span></td>
      </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  // ===========================================================================
  // Chart 3: Angle Effectiveness Heatmap
  // ===========================================================================
  function renderHeatmap() {
    const container = document.getElementById("chartHeatmap");
    container.innerHTML = "";

    // Build bandit state
    const banditState = window.PPLearn.buildBanditFromInteractions(interactions);
    const segments = Object.keys(banditState).sort();

    if (segments.length === 0) {
      container.innerHTML = '<p class="card-desc" style="padding:2rem">No bandit data available.</p>';
      return;
    }

    // Build matrix
    const cells = [];
    segments.forEach((seg) => {
      ANGLES.forEach((angle) => {
        const p = banditState[seg] && banditState[seg][angle];
        const alpha = p ? p.alpha : 1;
        const beta = p ? p.beta : 1;
        const mean = alpha / (alpha + beta);
        cells.push({ segment: seg, angle, mean });
      });
    });

    const margin = { top: 80, right: 20, bottom: 20, left: 200 };
    const cellSize = 36;
    const width = ANGLES.length * cellSize;
    const height = segments.length * cellSize;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(ANGLES).range([0, width]).padding(0.05);
    const y = d3.scaleBand().domain(segments).range([0, height]).padding(0.05);
    const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([0.2, 0.8]);

    // Tooltip
    const tooltip = d3.select(container).append("div").attr("class", "tooltip");

    svg.selectAll(".heatmap-cell")
      .data(cells).enter()
      .append("rect")
      .attr("class", "heatmap-cell")
      .attr("x", (d) => x(d.angle))
      .attr("y", (d) => y(d.segment))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", (d) => color(d.mean))
      .on("mouseenter", function (event, d) {
        tooltip.style("opacity", 1)
          .html(`<strong>${ANGLE_LABELS[d.angle]}</strong><br>${d.segment}<br>Win rate: ${(d.mean * 100).toFixed(1)}%`);
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.offsetX + 12) + "px")
          .style("top", (event.offsetY - 10) + "px");
      })
      .on("mouseleave", function () { tooltip.style("opacity", 0); });

    // Axis labels
    svg.selectAll(".x-label")
      .data(ANGLES).enter()
      .append("text")
      .attr("x", (d) => x(d) + x.bandwidth() / 2)
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .style("font-size", "0.65rem")
      .style("fill", "var(--muted)")
      .text((d) => ANGLE_LABELS[d]);

    svg.selectAll(".y-label")
      .data(segments).enter()
      .append("text")
      .attr("x", -8)
      .attr("y", (d) => y(d) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .style("font-size", "0.6rem")
      .style("fill", "var(--muted)")
      .text((d) => d.length > 28 ? d.slice(0, 28) + "…" : d);
  }

  // ===========================================================================
  // Chart 4: Bandit Confidence (Beta PDF curves)
  // ===========================================================================
  function populateSegmentSelector() {
    const select = document.getElementById("banditSegmentSelect");
    const banditState = window.PPLearn.buildBanditFromInteractions(interactions);
    const segments = Object.keys(banditState).sort();
    select.innerHTML = segments.map((s) => `<option value="${s}">${s}</option>`).join("");
    select.addEventListener("change", renderBanditChart);
  }

  function renderBanditChart() {
    const container = document.getElementById("chartBandit");
    container.innerHTML = "";

    const segment = document.getElementById("banditSegmentSelect").value;
    if (!segment) return;

    const banditState = window.PPLearn.buildBanditFromInteractions(interactions);
    const stats = window.PPLearn.banditStats(banditState, segment);

    const margin = { top: 20, right: 20, bottom: 35, left: 45 };
    const width = container.clientWidth - margin.left - margin.right || 400;
    const height = 280 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 1]).range([0, width]);

    // Compute Beta PDFs
    const nPoints = 100;
    const curves = stats.map((s) => {
      const a = s.alpha, b = s.beta;
      const points = [];
      for (let i = 0; i <= nPoints; i++) {
        const t = i / nPoints;
        const pdf = betaPDF(t, a, b);
        points.push({ t, pdf });
      }
      return { angle: s.angle, label: ANGLE_LABELS[s.angle], mean: s.mean, points };
    });

    const maxPDF = d3.max(curves, (c) => d3.max(c.points, (p) => p.pdf)) || 1;
    const y = d3.scaleLinear().domain([0, maxPDF * 1.1]).range([height, 0]);

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(ANGLES);

    const lineGen = d3.line()
      .x((d) => x(d.t))
      .y((d) => y(d.pdf))
      .curve(d3.curveMonotoneX);

    const areaGen = d3.area()
      .x((d) => x(d.t))
      .y0(height)
      .y1((d) => y(d.pdf))
      .curve(d3.curveMonotoneX);

    curves.forEach((c) => {
      svg.append("path")
        .datum(c.points)
        .attr("class", "beta-curve")
        .attr("d", areaGen)
        .attr("fill", colorScale(c.angle));

      svg.append("path")
        .datum(c.points)
        .attr("d", lineGen)
        .attr("fill", "none")
        .attr("stroke", colorScale(c.angle))
        .attr("stroke-width", 1.8);
    });

    // Axes
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%")));

    svg.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(4).tickFormat(""));

    // Legend
    const legend = svg.append("g").attr("transform", `translate(${width - 120}, 0)`);
    curves.forEach((c, i) => {
      const g = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
      g.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2)
        .attr("fill", colorScale(c.angle));
      g.append("text").attr("x", 14).attr("y", 9)
        .style("font-size", "0.6rem").style("fill", "var(--muted)")
        .text(`${c.label} (${(c.mean * 100).toFixed(0)}%)`);
    });
  }

  // Beta PDF helper
  function betaPDF(x, a, b) {
    if (x <= 0 || x >= 1) return 0;
    const logB = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB);
  }

  function lnGamma(z) {
    // Stirling approximation for ln(Gamma(z))
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    z -= 1;
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let s = c[0];
    for (let i = 1; i < g + 2; i++) s += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(s);
  }

  // ===========================================================================
  // Chart 5: Feature Importance
  // ===========================================================================
  function renderFeatureImportance() {
    const container = document.getElementById("chartFeatureImportance");
    container.innerHTML = "";

    if (!mlModelParams || !mlModelParams.trained) {
      container.innerHTML = '<p class="card-desc" style="padding:2rem">Model not trained yet.</p>';
      return;
    }

    const importance = window.PPModel.featureImportance(mlModelParams, 12);

    const margin = { top: 10, right: 20, bottom: 30, left: 130 };
    const barHeight = 22;
    const height = importance.length * barHeight;
    const width = (container.clientWidth || 400) - margin.left - margin.right;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const maxMag = d3.max(importance, (d) => d.magnitude) || 1;
    const x = d3.scaleLinear().domain([-maxMag, maxMag]).range([0, width]);
    const y = d3.scaleBand().domain(importance.map((d) => d.feature)).range([0, height]).padding(0.2);

    // Zero line
    svg.append("line")
      .attr("x1", x(0)).attr("x2", x(0))
      .attr("y1", 0).attr("y2", height)
      .attr("stroke", "var(--border)").attr("stroke-width", 1);

    // Bars
    svg.selectAll(".importance-bar")
      .data(importance).enter()
      .append("rect")
      .attr("class", (d) => `importance-bar importance-bar--${d.coef >= 0 ? "positive" : "negative"}`)
      .attr("x", (d) => d.coef >= 0 ? x(0) : x(d.coef))
      .attr("y", (d) => y(d.feature))
      .attr("width", (d) => Math.abs(x(d.coef) - x(0)))
      .attr("height", y.bandwidth());

    // Labels
    svg.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll("text")
      .style("font-size", "0.65rem");

    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2f")));
  }

  // ===========================================================================
  // Data Controls
  // ===========================================================================
  function bindControls() {
    document.getElementById("btnReseed").addEventListener("click", async () => {
      if (!confirm("This will reset all data and reseed with 100 synthetic interactions. Continue?")) return;
      let seed = [];
      try {
        const res = await fetch("./data/seed_interactions.json");
        if (res.ok) seed = await res.json();
      } catch (e) { /* ignore */ }
      dataStore.reset();
      dataStore.init(seed, { force: true });
      location.reload();
    });

    document.getElementById("btnReset").addEventListener("click", () => {
      if (!confirm("This will permanently delete all learning data. Continue?")) return;
      dataStore.reset();
      dataStore.init([], { force: true });
      location.reload();
    });

    document.getElementById("btnExport").addEventListener("click", () => {
      const json = dataStore.exportJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planpilot-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById("btnImport").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          dataStore.importJSON(reader.result);
          location.reload();
        } catch (err) {
          alert("Invalid JSON file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // ===========================================================================
  // Boot
  // ===========================================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

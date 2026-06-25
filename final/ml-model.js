/* ============================================================================
 * PlanPilot — Logistic Regression Conversion Model
 * ----------------------------------------------------------------------------
 * Predicts P(convert) from a customer feature vector and surfaces feature
 * importance (standardized coefficients). Trained in-browser via batch
 * gradient descent with L2 regularization and feature standardization.
 *
 * Used for: conversion-likelihood gauge + "biggest blockers/drivers" explainer.
 * Graceful cold-start: caller can fall back to cohort rate if data is thin.
 *
 * Depends on PPFeatures. Works in browser (window.PPModel) and Node.
 * ==========================================================================*/
(function (global) {
  "use strict";

  const F = (typeof require !== "undefined")
    ? require("./feature-engineering.js")
    : global.PPFeatures;

  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

  /* Standardize columns; returns {X, mean, std}. */
  function standardize(rows) {
    const n = rows.length, d = rows[0].length;
    const mean = new Array(d).fill(0), std = new Array(d).fill(0);
    for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r[j];
    for (let j = 0; j < d; j++) mean[j] /= n;
    for (const r of rows) for (let j = 0; j < d; j++) std[j] += (r[j] - mean[j]) ** 2;
    for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / n) || 1;
    const X = rows.map((r) => r.map((v, j) => (v - mean[j]) / std[j]));
    return { X, mean, std };
  }

  /* Train logistic regression. interactions → labeled examples. */
  function trainModel(interactions, opts) {
    const o = opts || {};
    const lr = o.lr || 0.1;
    const epochs = o.epochs || 400;
    const l2 = o.l2 != null ? o.l2 : 0.01;

    const labeled = (interactions || []).filter(
      (it) => it.outcome || (it.debrief && it.debrief.converted != null)
    );
    if (labeled.length < 10) {
      return { trained: false, n: labeled.length, reason: "insufficient_data" };
    }

    const rawX = labeled.map((it) => F.vectorize(it.customer));
    const y = labeled.map((it) => (it.outcome ? it.outcome.converted : it.debrief.converted) ? 1 : 0);
    const { X, mean, std } = standardize(rawX);
    const n = X.length, d = X[0].length;

    let w = new Array(d).fill(0), b = 0;
    for (let ep = 0; ep < epochs; ep++) {
      const gw = new Array(d).fill(0); let gb = 0;
      for (let i = 0; i < n; i++) {
        let z = b;
        for (let j = 0; j < d; j++) z += w[j] * X[i][j];
        const err = sigmoid(z) - y[i];
        for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
        gb += err;
      }
      for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
      b -= lr * (gb / n);
    }

    // training accuracy
    let correct = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      if ((sigmoid(z) >= 0.5 ? 1 : 0) === y[i]) correct++;
    }

    return {
      trained: true, n, weights: w, bias: b, mean, std,
      labels: F.FEATURE_LABELS, trainAccuracy: correct / n,
      baseRate: y.reduce((s, v) => s + v, 0) / n,
      trainedAt: Date.now(),
    };
  }

  /* Predict P(convert) for a customer using a trained model. */
  function predict(model, customer) {
    if (!model || !model.trained) return null;
    const raw = F.vectorize(customer);
    let z = model.bias;
    for (let j = 0; j < raw.length; j++) {
      const xs = (raw[j] - model.mean[j]) / model.std[j];
      z += model.weights[j] * xs;
    }
    return sigmoid(z);
  }

  /* Sorted feature importance (standardized coefficients). */
  function featureImportance(model, topK) {
    if (!model || !model.trained) return [];
    const items = model.weights.map((w, j) => ({
      feature: model.labels[j],
      coef: w,
      direction: w >= 0 ? "drives conversion" : "blocks conversion",
      magnitude: Math.abs(w),
    }));
    items.sort((a, b) => b.magnitude - a.magnitude);
    return topK ? items.slice(0, topK) : items;
  }

  const api = { sigmoid, trainModel, predict, featureImportance };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PPModel = api;
})(typeof window !== "undefined" ? window : globalThis);

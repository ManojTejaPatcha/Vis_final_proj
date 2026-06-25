/* ============================================================================
 * PlanPilot — Data Store (pluggable persistence)
 * ----------------------------------------------------------------------------
 * One DataStore interface, swappable backend:
 *   - LocalStorageBackend  (browser, default, reliable & free)
 *   - MemoryBackend        (Node tests / SSR / fallback)
 *   - [future] SupabaseBackend — drop-in, same interface (schema in plan)
 *
 * Stores: interactions[], banditState{}, model{}, meta{}.
 * On first run, auto-seeds from a provided seed array (the 100 synthetic
 * interactions) so learning works on day one.
 *
 * Works in browser (window.PPStore) and Node (module.exports).
 * ==========================================================================*/
(function (global) {
  "use strict";

  const KEYS = {
    interactions: "planpilot.interactions",
    bandit: "planpilot.bandit",
    model: "planpilot.model",
    meta: "planpilot.meta",
  };

  /* ----------------------------- backends --------------------------------- */
  function LocalStorageBackend() {
    const ls = global.localStorage;
    return {
      get(key) { const v = ls.getItem(key); return v ? JSON.parse(v) : null; },
      set(key, val) { ls.setItem(key, JSON.stringify(val)); },
      remove(key) { ls.removeItem(key); },
    };
  }
  function MemoryBackend() {
    const m = {};
    return {
      get(key) { return key in m ? JSON.parse(m[key]) : null; },
      set(key, val) { m[key] = JSON.stringify(val); },
      remove(key) { delete m[key]; },
    };
  }

  function detectBackend() {
    try {
      if (typeof global.localStorage !== "undefined") {
        global.localStorage.setItem("__pp_test__", "1");
        global.localStorage.removeItem("__pp_test__");
        return LocalStorageBackend();
      }
    } catch (e) { /* fall through */ }
    return MemoryBackend();
  }

  /* ----------------------------- DataStore -------------------------------- */
  function DataStore(backend) {
    this.b = backend || detectBackend();
  }

  DataStore.prototype.isSeeded = function () {
    const meta = this.b.get(KEYS.meta);
    return !!(meta && meta.seeded);
  };

  /* Initialize: seed from `seedInteractions` only if empty (or force=true). */
  DataStore.prototype.init = function (seedInteractions, opts) {
    const force = opts && opts.force;
    if (force || !this.isSeeded()) {
      const seed = seedInteractions || [];
      this.b.set(KEYS.interactions, seed);
      this.b.remove(KEYS.bandit);
      this.b.remove(KEYS.model);
      this.b.set(KEYS.meta, {
        seeded: true, seededAt: Date.now(), seedCount: seed.length,
      });
    }
    return this;
  };

  DataStore.prototype.getInteractions = function () {
    return this.b.get(KEYS.interactions) || [];
  };

  DataStore.prototype.addInteraction = function (rec) {
    const all = this.getInteractions();
    all.push(rec);
    this.b.set(KEYS.interactions, all);
    return rec;
  };

  DataStore.prototype.getBanditState = function () {
    return this.b.get(KEYS.bandit) || {};
  };
  DataStore.prototype.saveBanditState = function (state) {
    this.b.set(KEYS.bandit, state);
    return state;
  };

  DataStore.prototype.getModel = function () {
    return this.b.get(KEYS.model) || null;
  };
  DataStore.prototype.saveModel = function (model) {
    this.b.set(KEYS.model, model);
    return model;
  };

  DataStore.prototype.getMeta = function () {
    return this.b.get(KEYS.meta) || {};
  };
  DataStore.prototype.setMeta = function (patch) {
    const meta = Object.assign(this.getMeta(), patch);
    this.b.set(KEYS.meta, meta);
    return meta;
  };

  /* Counts + conversion trend for the learning dashboard. */
  DataStore.prototype.stats = function () {
    const all = this.getInteractions();
    const seeds = all.filter((i) => i.source === "seed").length;
    const live = all.length - seeds;
    const converted = all.filter((i) => (i.outcome ? i.outcome.converted : i.debrief && i.debrief.converted)).length;
    return {
      total: all.length, seeds, live,
      conversionRate: all.length ? converted / all.length : 0,
    };
  };

  DataStore.prototype.exportJSON = function () {
    return JSON.stringify({
      interactions: this.getInteractions(),
      banditState: this.getBanditState(),
      model: this.getModel(),
      meta: this.getMeta(),
    }, null, 2);
  };

  DataStore.prototype.importJSON = function (json) {
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    if (obj.interactions) this.b.set(KEYS.interactions, obj.interactions);
    if (obj.banditState) this.b.set(KEYS.bandit, obj.banditState);
    if (obj.model) this.b.set(KEYS.model, obj.model);
    if (obj.meta) this.b.set(KEYS.meta, obj.meta);
    return this;
  };

  DataStore.prototype.reset = function () {
    Object.values(KEYS).forEach((k) => this.b.remove(k));
    return this;
  };

  const api = { DataStore, LocalStorageBackend, MemoryBackend, KEYS };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.PPStore = api;
})(typeof window !== "undefined" ? window : globalThis);

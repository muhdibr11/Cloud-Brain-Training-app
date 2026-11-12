// Single state object, kept in memory and persisted to IndexedDB (localStorage fallback).
const DB = 'cloud-app', STORE = 'kv', KEY = 'state';

export const blank = () => ({
  v: 1,
  created: Date.now(),
  cards: {},        // id -> {step, reps, lapses, due, last, introduced}
  custom: [],       // user-added concept cards
  reviews: [],      // {t, id, mode, grade, conf}
  arith: { levels: {}, sessions: [] },   // sessions: {t, dur, n, correct, medMs, bench}
  calib: [],        // {t, src, conf, hit}
  intervals: [],    // {t, id, lo, hi, v, hit, kind, factor}
  seen: {},         // item id -> last seen time (judgement, estimates, held-out questions)
  judgement: [],    // {t, id, tag, correct}
  baserate: [],     // {t, correct, err}
  forecasts: [],    // {id, q, p, base, why, created, due, updates:[{t,p}], resolved, outcome}
  writing: [],      // {t, kind, id, text, words, secs, checks, scores, weakest}
  speaking: [],     // {t, prompt, secs, words, wpm, fillers, checks, scores, weakest}
  dives: [],        // {id, prompt, links, started, framings, notes, outline, essay, mode, checks, scores, weakest, fix, done}
  bench: [],        // {t, arithRate, arithAcc, baseAcc, intervalHit, transfer, n}
  days: {},         // dayKey -> {cards, sprint, drill}
  settings: { newPerDay: 3, sprintSecs: 180 },
});

let state = blank();
let idb = null;
let saveTimer = null;
const listeners = new Set();

function openDb() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no idb'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const idbGet = () => new Promise((res, rej) => { const r = idb.transaction(STORE).objectStore(STORE).get(KEY); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbPut = (v) => new Promise((res, rej) => { const tx = idb.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(v, KEY); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });

export function merge(base, saved) {
  const out = { ...base, ...saved };
  out.arith = { ...base.arith, ...(saved?.arith || {}) };
  out.settings = { ...base.settings, ...(saved?.settings || {}) };
  return out;
}

export async function load() {
  let saved = null;
  try { idb = await openDb(); saved = await idbGet(); } catch { idb = null; }
  if (!saved) { try { saved = JSON.parse(localStorage.getItem(DB) || 'null'); } catch { saved = null; } }
  state = merge(blank(), saved || {});
  try { navigator.storage?.persist?.(); } catch { /* optional */ }
  return state;
}

export const get = () => state;

async function flush() {
  saveTimer = null;
  try { if (idb) await idbPut(state); else localStorage.setItem(DB, JSON.stringify(state)); }
  catch { try { localStorage.setItem(DB, JSON.stringify(state)); } catch { /* storage full */ } }
}

// Mutate state through this so it is saved and views can refresh.
export function update(fn, { silent = false } = {}) {
  fn(state);
  if (!saveTimer) saveTimer = setTimeout(flush, 250);
  if (!silent) listeners.forEach((l) => l(state));
}
export const flushNow = () => { clearTimeout(saveTimer); return flush(); };
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const exportJson = () => JSON.stringify(state, null, 1);
export function importJson(text) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || !('cards' in obj)) throw new Error('This does not look like a Cloud backup.');
  state = merge(blank(), obj);
  return flushNow();
}
export function reset() { state = blank(); return flushNow(); }

// Domain logic shared by views.
import { get, update } from './store.js';
import { CONCEPTS, DOMAINS } from '../data/concepts.js';
import { isDue, dayKey, startOfDay, DAY } from './srs.js';

export { DOMAINS };
export const allConcepts = () => [...CONCEPTS, ...get().custom];
export const concept = (id) => allConcepts().find((c) => c.id === id);

export function dueCards(now = Date.now()) {
  const s = get();
  return allConcepts().filter((c) => isDue(s.cards[c.id], now)).sort((a, b) => s.cards[a.id].due - s.cards[b.id].due);
}

// New cards: spread across domains so early sessions are interleaved.
export function newCards(limit) {
  const s = get();
  const fresh = allConcepts().filter((c) => !s.cards[c.id]);
  const byDomain = {};
  fresh.forEach((c) => (byDomain[c.d] ??= []).push(c));
  const order = Object.keys(byDomain), out = [];
  for (let i = 0; out.length < limit && order.some((d) => byDomain[d].length); i++) {
    const d = order[(i + introducedCount()) % order.length];
    if (byDomain[d].length) out.push(byDomain[d].shift());
    if (i > 500) break;
  }
  return out;
}
export const introducedCount = () => Object.keys(get().cards).length;
export function introducedToday() {
  const t0 = startOfDay();
  return Object.values(get().cards).filter((c) => (c.introduced || 0) >= t0).length;
}
export const newAllowance = () => Math.max(0, get().settings.newPerDay - introducedToday());

export const today = () => get().days[dayKey()] || {};
export function markDay(part) {
  update((s) => { (s.days[dayKey()] ??= {})[part] = true; });
}
export function recordCalib(src, conf, hit) {
  update((s) => s.calib.push({ t: Date.now(), src, conf, hit: !!hit }), { silent: true });
}
export function markSeen(id) { update((s) => { s.seen[id] = Date.now(); }, { silent: true }); }

// Pick n items, unseen first, then least recently seen. Shuffled within the unseen group.
export function pickItems(items, n, rnd = Math.random) {
  const seen = get().seen;
  const unseen = items.filter((i) => !seen[i.id]).map((i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const old = items.filter((i) => seen[i.id]).sort((a, b) => seen[a.id] - seen[b.id]);
  return [...unseen, ...old].slice(0, n);
}

export const ROTATION = [
  { k: 'judgement', t: 'Judgement lab', d: 'Three cases: decide, then see where you were pulled' },
  { k: 'estimate', t: 'Estimation', d: 'Five quantities, each with a 90% range' },
  { k: 'baserate', t: 'Base rates', d: 'Three problems solved with a frequency tree' },
  { k: 'writing', t: 'Writing brief', d: 'One paragraph from messy notes' },
  { k: 'speaking', t: 'Speaking rep', d: 'A 90-second impromptu answer' },
];
const counts = () => { const s = get(); return { judgement: s.judgement.length, estimate: s.intervals.length, baserate: s.baserate.length, writing: s.writing.length, speaking: s.speaking.length }; };
// Today's drill: anything never tried comes first, otherwise rotate by date.
export function todaysDrill(now = Date.now()) {
  const c = counts();
  const untried = ROTATION.find((r) => !c[r.k]);
  if (untried) return untried;
  const day = Math.floor(startOfDay(now) / DAY);
  // Every third day, go to the weakest scored drill instead of the next in rotation.
  if (day % 3 === 0) { const w = weakestDrill(); if (w) return { ...w, d: 'Your weakest scored drill at the moment' }; }
  return ROTATION[day % ROTATION.length];
}

export function weakestDrill() {
  const s = get(), share = (list, f) => list.filter(f).length / list.length;
  const scores = [];
  if (s.judgement.length >= 6) scores.push(['judgement', share(s.judgement.slice(-20), (j) => j.correct)]);
  if (s.baserate.length >= 6) scores.push(['baserate', share(s.baserate.slice(-20), (b) => b.correct)]);
  if (s.intervals.length >= 10) scores.push(['estimate', 1 - Math.abs(0.9 - share(s.intervals.slice(-30), (i) => i.hit)) * 2]);
  if (!scores.length) return null;
  scores.sort((a, b) => a[1] - b[1]);
  return ROTATION.find((r) => r.k === scores[0][0]);
}
export const benchDue = () => { const b = get().bench; return !b.length || Date.now() - b[b.length - 1].t > 30 * DAY; };
export const forecastsToResolve = (now = Date.now()) => get().forecasts.filter((f) => f.outcome == null && f.due && new Date(f.due).getTime() <= now);
export const lastDive = () => { const d = get().dives.filter((x) => x.done); return d.length ? Math.max(...d.map((x) => x.done)) : 0; };

// ---------- critique by copy and paste ----------
export function critiquePrompt({ kind, task, text, rubric, concepts = [] }) {
  const lines = rubric.map((r) => `- ${r.k} (${r.t}): 1 = ${r.lo}. 5 = ${r.hi}.`).join('\n');
  const keys = rubric.map((r) => `"${r.k}":3`).join(',');
  return `You are a demanding, fair examiner. Assess the ${kind} below against the rubric. Do not flatter: a typical competent piece scores 3 on most criteria, and 5 is rare.

TASK GIVEN TO THE WRITER
${task}
${concepts.length ? `\nCONCEPTS THE WRITER MIGHT USE\n${concepts.join(', ')}\n` : ''}
RUBRIC (score each criterion from 1 to 5)
${lines}

THE ${kind.toUpperCase()}
"""
${text}
"""

Reply in this order:
1. For each criterion, one sentence of judgement that quotes the text, then its score.
2. The single weakest point, and exactly how to fix it.
3. A rewritten opening that shows the fix.
4. A final line in exactly this format, with nothing after it:
SCORES {${keys},"weakest":"one sentence","fix":"one sentence"}`;
}

export function parseCritique(text, rubric) {
  const at = text.lastIndexOf('SCORES');
  const src = at >= 0 ? text.slice(at) : text;
  const a = src.indexOf('{'), b = src.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let obj;
  try { obj = JSON.parse(src.slice(a, b + 1).replace(/[“”]/g, '"')); } catch { return null; }
  const scores = {};
  for (const r of rubric) { const v = Number(obj[r.k]); if (v >= 1 && v <= 5) scores[r.k] = v; }
  if (!Object.keys(scores).length) return null;
  return { scores, weakest: String(obj.weakest || ''), fix: String(obj.fix || '') };
}
export const avgScore = (scores) => { const v = Object.values(scores || {}); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

export function cardsPrompt(domainName, existing) {
  return `Write 5 concept cards for a personal spaced-repetition library of mental models, in the domain "${domainName}". Avoid these existing cards: ${existing.join(', ')}.

Each card needs: a title; a definition of two sentences; one concrete example with a number in it; and three "apply it" questions that pose a realistic situation in business, finance or policy, each with a model answer of one or two sentences. The questions must require using the idea, not recalling its definition.

Reply with only a JSON array in this shape:
[{"t":"Title","def":"...","ex":"...","apply":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}]`;
}

export function parseCards(text, d) {
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  if (a < 0 || b <= a) throw new Error('No JSON list found in the pasted text.');
  const arr = JSON.parse(text.slice(a, b + 1).replace(/[“”]/g, '"'));
  const out = arr.filter((c) => c && c.t && c.def).map((c) => ({
    id: 'u-' + String(c.t).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6),
    d, t: String(c.t), def: String(c.def), ex: String(c.ex || ''), links: [],
    apply: (Array.isArray(c.apply) ? c.apply : []).filter((x) => x && x.q).map((x) => ({ q: String(x.q), a: String(x.a || '') })),
  }));
  if (!out.length) throw new Error('No usable cards in the pasted text.');
  return out;
}

export const wordCount = (s) => (String(s).trim().match(/\S+/g) || []).length;
const FILLERS = ['um', 'uh', 'er', 'erm', 'like', 'you know', 'sort of', 'kind of', 'basically', 'actually', 'i mean', 'literally'];
export function fillerCount(text) {
  const t = ' ' + String(text).toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  const found = {};
  let total = 0;
  for (const f of FILLERS) { const n = t.split(' ' + f + ' ').length - 1; if (n) { found[f] = n; total += n; } }
  return { total, found };
}

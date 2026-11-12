import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, GAPS, DAY, startOfDay, nextMode, isDue } from '../js/srs.js';
import { brier, calibrationBins, foldForecast, parseNum, factorError, streak, median, forecastBrier, canUpdate, dueEnd, firstP } from '../js/scoring.js';
import { TYPES, TYPE_KEYS, BASIC, makeProblem, makeApplied, isCorrect, nextType, adapt, levelOf, summarise, typeWeights, learnedKeys, nextToLearn, learnPassed, makeBaseRate } from '../js/arith.js';
import { CONCEPTS, DOMAINS } from '../data/concepts.js';
import { JUDGEMENT } from '../data/judgement.js';
import { ESTIMATES } from '../data/estimate.js';
import { DIVE_PROMPTS, BRIEFS } from '../data/prompts.js';
import { dayKey } from '../js/srs.js';

const now = new Date(2026, 10, 12, 15).getTime();

test('srs gaps expand, reset on miss, repeat on partial', () => {
  let c = {};
  const days = [];
  for (let i = 0; i < 7; i++) { c = schedule(c, 2, now); days.push((c.due - startOfDay(now)) / DAY); }
  assert.deepEqual(days, [1, 3, 7, 21, 60, 120, 120]);
  const p = schedule({ step: 4 }, 1, now);
  assert.equal(p.step, 4); assert.equal((p.due - startOfDay(now)) / DAY, 3);
  const m = schedule({ step: 4 }, 0, now);
  assert.equal(m.step, 0); assert.equal(m.lapses, 1); assert.equal((m.due - startOfDay(now)) / DAY, 1);
  assert.ok(isDue({ due: now - 1 }, now)); assert.ok(!isDue({ due: now + DAY }, now)); assert.ok(!isDue(undefined, now));
});

test('review modes rotate and fall back', () => {
  const con = CONCEPTS[0];
  assert.deepEqual([0, 1, 2, 3, 4].map((reps) => nextMode({ reps }, con)), ['apply0', 'explain', 'apply1', 'compare', 'apply0']);
  assert.equal(nextMode({ reps: 3 }, { links: [], apply: [] }), 'explain');
  assert.equal(nextMode({ reps: 0 }, { links: [], apply: [] }), 'explain');
});

test('scoring', () => {
  assert.equal(brier([{ p: 1, outcome: 1 }, { p: 0.5, outcome: 0 }]), 0.125);
  assert.deepEqual(foldForecast({ p: 0.2, outcome: 0 }), { conf: 0.8, hit: true });
  const bins = calibrationBins([{ conf: 0.95, hit: true }, { conf: 0.95, hit: false }, { conf: 0.55, hit: true }, { conf: 1, hit: true }]);
  assert.equal(bins.length, 2); assert.equal(bins[1].n, 3); assert.ok(Math.abs(bins[1].acc - 2 / 3) < 1e-9);
  assert.equal(parseNum('1.2m'), 1.2e6); assert.equal(parseNum('45k'), 45000); assert.equal(parseNum('3bn'), 3e9); assert.equal(parseNum('1,200'), 1200); assert.ok(Number.isNaN(parseNum('abc')));
  assert.equal(factorError(10, 100), 10); assert.equal(median([3, 1, 2]), 2);
  const k = (t) => dayKey(t);
  assert.equal(streak([k(now), k(now - DAY), k(now - 2 * DAY)], now, k), 3);
  assert.equal(streak([k(now - DAY), k(now - 2 * DAY)], now, k), 2);
  assert.equal(streak([k(now - 2 * DAY)], now, k), 0);
});

test('arithmetic problems are well formed and self-consistent', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const type of TYPE_KEYS) for (let L = 1; L <= 5; L++) for (let i = 0; i < 200; i++) {
    const p = makeProblem(type, L, rnd);
    assert.ok(Number.isFinite(p.a), `${type} L${L} ${p.q}`);
    assert.ok(isCorrect(p, p.a), `${type} own answer ${p.q} ${p.a}`);
    assert.ok(isCorrect(p, String(p.a)));
    assert.ok(!isCorrect(p, Math.abs(p.a) * 2 + 50), `${type} wrong accepted ${p.q}`);
    assert.ok(p.q && p.why && !/NaN|undefined/.test(p.q + p.why), p.q + ' | ' + p.why);
  }
  assert.ok(!isCorrect(makeProblem('mult', 1, rnd), ''));
});

test('interleaving never repeats a type', () => {
  let prev = null;
  for (let i = 0; i < 200; i++) { const t = nextType(prev); assert.notEqual(t, prev); prev = t; }
  assert.equal(nextType('add', Math.random, ['add']), 'add');
});

test('difficulty settles where about 85% of answers are right', () => {
  // A simulated learner who is near-perfect at level 1 and gets worse as problems get harder.
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pRight = (level) => [0, 0.99, 0.93, 0.82, 0.6, 0.35][level];
  let stat, right = 0, n = 0;
  for (let i = 0; i < 6000; i++) {
    const ok = rnd() < pRight(levelOf(stat));
    stat = adapt(stat, ok, 5000);
    if (i >= 1000) { n++; if (ok) right++; }
  }
  assert.ok(right / n > 0.8 && right / n < 0.9, `accuracy ${right / n}`);
  assert.equal(stat.hist.length, 20);
  assert.ok(stat.rating >= 1 && stat.rating <= 5);
  let low = { rating: 1 }; low = adapt(low, false, 1); assert.equal(low.rating, 1);
  let cap = { rating: 3 }; for (let i = 0; i < 50; i++) cap = adapt(cap, true, 1, 30000, 3); assert.equal(cap.rating, 3);
});

test('weak and slow types get more of the sprint', () => {
  const hist = (acc, ms) => Array.from({ length: 20 }, (_, i) => [i < acc * 20 ? 1 : 0, ms]);
  const stats = { add: { hist: hist(1, 4000) }, sub: { hist: hist(0.6, 4000) }, mult: { hist: hist(1, 9000) }, div: { hist: hist(1, 4000).slice(0, 3) } };
  const w = typeWeights(stats, ['add', 'sub', 'mult', 'div']);
  assert.ok(w.sub > w.mult && w.mult > w.add, JSON.stringify(w));
  assert.equal(w.div, 1.5);
  assert.deepEqual(summarise(stats.sub), { n: 20, acc: 0.6, ms: 4000 });
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const counts = { add: 0, sub: 0, mult: 0, div: 0 }; let prev = null;
  for (let i = 0; i < 4000; i++) { prev = nextType(prev, rnd, ['add', 'sub', 'mult', 'div'], w); counts[prev]++; }
  assert.ok(counts.sub > counts.add * 1.4, JSON.stringify(counts));
});

test('learn mode gates the taught methods', () => {
  assert.deepEqual(learnedKeys({}), BASIC);
  assert.equal(nextToLearn({}), TYPE_KEYS.find((k) => !BASIC.includes(k)));
  const all = Object.fromEntries(TYPE_KEYS.map((k) => [k, { learned: true }]));
  assert.equal(nextToLearn(all), null); assert.equal(learnedKeys(all).length, TYPE_KEYS.length);
  assert.ok(!learnPassed([true, true, true]));
  assert.ok(learnPassed([false, ...Array(9).fill(true)]));
  assert.ok(!learnPassed([...Array(8).fill(true), false, false]));
  assert.ok(learnPassed([false, false, false, false, false, false, ...Array(10).fill(true)]));
  for (const k of TYPE_KEYS) assert.ok(TYPES[k].method && TYPES[k].example, k);
});

test('applied problems are well formed', () => {
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const kinds = new Set();
  for (let L = 1; L <= 3; L++) for (let i = 0; i < 1500; i++) {
    const p = makeApplied(L, rnd); kinds.add(p.kind);
    assert.ok(Number.isFinite(p.a) && p.a !== 0, p.q);
    assert.ok(isCorrect(p, p.a), p.q); assert.ok(!isCorrect(p, Math.abs(p.a) * 2 + 50), p.q);
    assert.ok(!/NaN|undefined|Infinity/.test(p.q + p.why), p.q + ' | ' + p.why);
    assert.ok(p.q.length < 170, p.q);
  }
  assert.equal(kinds.size, 15);
  assert.notEqual(makeApplied(1, () => 0, 0).kind, 0);
});

test('forecasts are scored by time held and lock after the due date', () => {
  const DAYMS = 86400000, t0 = new Date('2026-01-01T12:00:00').getTime();
  const f = { p: 0.9, created: t0, due: '2026-01-11', updates: [{ t: t0, p: 0.5 }, { t: t0 + 8 * DAYMS, p: 0.9 }], outcome: 1, resolved: t0 + 10 * DAYMS };
  // 8 days at 50% (0.25) and 2 days at 90% (0.01)
  assert.ok(Math.abs(forecastBrier(f) - (8 * 0.25 + 2 * 0.01) / 10) < 1e-9);
  assert.equal(firstP(f), 0.5);
  // a last-minute jump barely helps
  const late = { ...f, updates: [{ t: t0, p: 0.5 }, { t: t0 + 10 * DAYMS - 60000, p: 0.99 }] };
  assert.ok(forecastBrier(late) > 0.249);
  // time after the due date does not count, and an update made after it is ignored
  const overdue = { ...f, resolved: t0 + 60 * DAYMS, updates: [{ t: t0, p: 0.5 }, { t: t0 + 30 * DAYMS, p: 1 }] };
  assert.ok(Math.abs(forecastBrier(overdue) - 0.25) < 1e-9);
  // single forecast, and one resolved the instant it was made
  assert.ok(Math.abs(forecastBrier({ p: 0.8, created: t0, due: '2026-01-11', updates: [{ t: t0, p: 0.8 }], outcome: 1, resolved: t0 + DAYMS }) - 0.04) < 1e-9);
  assert.ok(Math.abs(forecastBrier({ p: 0.8, created: t0, due: '2026-01-11', updates: [{ t: t0, p: 0.8 }], outcome: 0, resolved: t0 }) - 0.64) < 1e-9);
  assert.ok(canUpdate({ outcome: null, due: '2026-01-11' }, dueEnd('2026-01-11') - 1));
  assert.ok(!canUpdate({ outcome: null, due: '2026-01-11' }, dueEnd('2026-01-11') + 1));
  assert.ok(!canUpdate({ outcome: 1, due: '2026-01-11' }, t0));
});

test('base-rate problems', () => {
  for (let i = 0; i < 300; i++) {
    const p = makeBaseRate();
    assert.ok(p.a > 0 && p.a < 100); assert.equal(p.tree.length, 4); assert.ok(isCorrect(p, p.a)); assert.ok(!/NaN|undefined/.test(p.q + p.tree.join()));
  }
});

test('content integrity', () => {
  const ids = new Set(CONCEPTS.map((c) => c.id));
  assert.equal(ids.size, CONCEPTS.length); assert.equal(CONCEPTS.length, 42);
  for (const d of Object.keys(DOMAINS)) assert.equal(CONCEPTS.filter((c) => c.d === d).length, 6, d);
  for (const c of CONCEPTS) {
    assert.equal(c.apply.length, 3, c.id);
    for (const l of c.links) assert.ok(ids.has(l), `${c.id} -> ${l}`);
    assert.ok(!c.links.includes(c.id));
  }
  // Judgement options: similar lengths, and neither length nor position gives the answer away.
  let longest = 0; const pos = [0, 0, 0];
  for (const j of JUDGEMENT) {
    const L = j.options.map((o) => o.length);
    assert.ok(Math.max(...L) / Math.min(...L) <= 1.3, `${j.id} option lengths ${L}`);
    if (L[j.best] === Math.max(...L)) longest++;
    pos[j.best]++;
    assert.ok(!/option [abc]/i.test(j.why), j.id);
  }
  assert.ok(JUDGEMENT.length >= 36);
  assert.ok(longest / JUDGEMENT.length <= 0.55, `best is longest in ${longest}`);
  assert.ok(Math.min(...pos) >= 9, `positions ${pos}`);
  assert.ok(BRIEFS.length >= 12); assert.equal(new Set(BRIEFS.map((b) => b.id)).size, BRIEFS.length);
  for (const b of BRIEFS) { const w = b.model.split(/\s+/).length; assert.ok(w >= 60 && w <= 90, `${b.id} model ${w} words`); }
  for (const j of JUDGEMENT) { assert.ok(j.best < j.options.length); if (j.link) assert.ok(ids.has(j.link), j.id); }
  assert.equal(new Set(JUDGEMENT.map((j) => j.id)).size, JUDGEMENT.length);
  assert.equal(new Set(ESTIMATES.map((e) => e.id)).size, ESTIMATES.length);
  for (const e of ESTIMATES) assert.ok(e.v > 0);
  for (const d of DIVE_PROMPTS) for (const l of d.links) assert.ok(ids.has(l), `${d.id} -> ${l}`);
});

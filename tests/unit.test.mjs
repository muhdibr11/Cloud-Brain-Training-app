import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, GAPS, DAY, startOfDay, nextMode, isDue } from '../js/srs.js';
import { brier, calibrationBins, foldForecast, parseNum, factorError, streak, median } from '../js/scoring.js';
import { TYPE_KEYS, makeProblem, isCorrect, nextType, adapt, makeBaseRate } from '../js/arith.js';
import { CONCEPTS, DOMAINS } from '../data/concepts.js';
import { JUDGEMENT } from '../data/judgement.js';
import { ESTIMATES } from '../data/estimate.js';
import { DIVE_PROMPTS } from '../data/prompts.js';
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

test('interleaving and adaptation', () => {
  let prev = null;
  for (let i = 0; i < 100; i++) { const t = nextType(prev); assert.notEqual(t, prev); prev = t; }
  let s = { level: 1, run: 0, miss: 0 };
  for (let i = 0; i < 3; i++) s = adapt(s, true, 5000);
  assert.equal(s.level, 2);
  s = adapt(adapt(s, false, 5000), false, 5000);
  assert.equal(s.level, 1);
  s = adapt(s, true, 60000); assert.equal(s.run, 0);
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
  for (const j of JUDGEMENT) { assert.ok(j.best < j.options.length); if (j.link) assert.ok(ids.has(j.link), j.id); }
  assert.equal(new Set(JUDGEMENT.map((j) => j.id)).size, JUDGEMENT.length);
  assert.equal(new Set(ESTIMATES.map((e) => e.id)).size, ESTIMATES.length);
  for (const e of ESTIMATES) assert.ok(e.v > 0);
  for (const d of DIVE_PROMPTS) for (const l of d.links) assert.ok(ids.has(l), `${d.id} -> ${l}`);
});

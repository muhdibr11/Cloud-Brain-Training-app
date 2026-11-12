// Mental arithmetic generators. Each returns {type, q, a, tol, unit, why}.
// tol is the accepted relative error (0 = exact). Levels run 1–5.
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const round = (x, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp;
const gbp = (n) => '£' + n.toLocaleString('en-GB');

export const TYPES = {
  pct: { name: 'Percentages', gen(rnd, L) {
    const p = L <= 1 ? pick(rnd, [10, 20, 25, 50, 5]) : L <= 2 ? pick(rnd, [15, 30, 40, 60, 75, 12]) : L <= 3 ? ri(rnd, 3, 45) : ri(rnd, 11, 95) + (L >= 5 ? 0.5 : 0);
    const base = L <= 2 ? ri(rnd, 2, 40) * 20 : L <= 3 ? ri(rnd, 12, 99) * 10 : ri(rnd, 120, 990);
    return { q: `${p}% of ${base.toLocaleString('en-GB')}`, a: round(p * base / 100, 2), tol: L >= 4 ? 0.01 : 0, why: `10% is ${base / 10}; build ${p}% from 10%, 5% and 1%.` };
  } },
  pctchg: { name: 'Percent change', gen(rnd, L) {
    const from = L <= 2 ? ri(rnd, 2, 20) * 10 : ri(rnd, 30, 400);
    const chg = (rnd() < 0.35 ? -1 : 1) * (L <= 2 ? pick(rnd, [10, 20, 25, 50]) : ri(rnd, 3, 60));
    const to = round(from * (1 + chg / 100), L <= 2 ? 0 : 0);
    const a = round((to - from) / from * 100, 1);
    return { q: `From ${from} to ${to}: % change?`, a, unit: '%', abs: L <= 2 ? 0.05 : 0.6, why: `Change ${to - from} over start ${from}: ${to - from} ÷ ${from}.` };
  } },
  mult: { name: 'Multiplication', gen(rnd, L) {
    const a = L <= 1 ? ri(rnd, 3, 9) : L <= 3 ? ri(rnd, 12, 99) : ri(rnd, 12, 99);
    const b = L <= 1 ? ri(rnd, 11, 20) : L <= 2 ? ri(rnd, 3, 9) : L <= 3 ? ri(rnd, 11, 19) : ri(rnd, 21, 99);
    const tens = Math.floor(b / 10) * 10;
    return { q: `${a} × ${b}`, a: a * b, tol: 0, why: tens ? `${a}×${tens} = ${a * tens}, plus ${a}×${b - tens} = ${a * (b - tens)}.` : `Split ${a} into tens and units.` };
  } },
  div: { name: 'Division', gen(rnd, L) {
    const d = L <= 2 ? ri(rnd, 3, 9) : L <= 4 ? ri(rnd, 11, 25) : ri(rnd, 13, 49);
    const qv = L <= 1 ? ri(rnd, 6, 20) : L <= 3 ? ri(rnd, 12, 60) : ri(rnd, 21, 120);
    return { q: `${(d * qv).toLocaleString('en-GB')} ÷ ${d}`, a: qv, tol: 0, why: `${d} × ${Math.floor(qv / 10) * 10} = ${d * Math.floor(qv / 10) * 10}; the remainder gives the units.` };
  } },
  frac: { name: 'Fractions to percent', gen(rnd, L) {
    const den = L <= 2 ? pick(rnd, [4, 5, 8, 10, 20]) : L <= 3 ? pick(rnd, [6, 8, 12, 16, 25, 40]) : pick(rnd, [7, 9, 11, 13, 15, 17, 30]);
    const num = ri(rnd, 1, den - 1);
    return { q: `${num}/${den} as a %`, a: round(num / den * 100, 1), unit: '%', abs: L <= 2 ? 0.05 : 0.6, why: `1/${den} ≈ ${round(100 / den, 1)}%; multiply by ${num}.` };
  } },
  r72: { name: 'Rule of 72', gen(rnd, L) {
    if (rnd() < 0.5 || L <= 1) {
      const r = L <= 2 ? pick(rnd, [2, 3, 4, 6, 8, 9, 12]) : pick(rnd, [1.5, 2.5, 3.5, 5, 7, 10, 15]);
      return { q: `Growth of ${r}% a year: years to double?`, a: round(Math.log(2) / Math.log(1 + r / 100), 1), unit: 'yrs', tol: 0.08, why: `72 ÷ ${r} ≈ ${round(72 / r, 1)}.` };
    }
    const y = pick(rnd, [4, 6, 8, 9, 12, 18, 24]);
    return { q: `Doubled in ${y} years: annual growth %?`, a: round((2 ** (1 / y) - 1) * 100, 1), unit: '%', tol: 0.08, why: `72 ÷ ${y} ≈ ${round(72 / y, 1)}.` };
  } },
  bps: { name: 'Basis points', gen(rnd, L) {
    if (rnd() < 0.5) {
      const a = round(ri(rnd, 4, 30) * 0.25, 2), d = pick(rnd, L <= 2 ? [25, 50, 100] : [15, 35, 75, 125, 175]) * (rnd() < 0.4 ? -1 : 1);
      const b = round(a + d / 100, 2);
      if (b <= 0) return TYPES.bps.gen(rnd, L);
      return { q: `Rate moves from ${a.toFixed(2)}% to ${b.toFixed(2)}%: change in bps?`, a: d, unit: 'bps', tol: 0, why: `1 percentage point = 100 bps, so ${round(b - a, 2)} points = ${d} bps.` };
    }
    const bp = pick(rnd, L <= 2 ? [10, 25, 50] : [5, 15, 35, 60, 80, 125]);
    const m = pick(rnd, L <= 2 ? [10, 20, 100, 200] : [40, 60, 150, 250, 800]);
    return { q: `${bp} bps of £${m}m, in £ thousands`, a: round(m * 1e6 * bp / 1e4 / 1e3, 1), unit: 'k', tol: 0, why: `1 bp of £${m}m is £${(m * 100).toLocaleString('en-GB')}; times ${bp}.` };
  } },
  fx: { name: 'Currency conversion', gen(rnd, L) {
    const [pair, sym, lo, hi] = pick(rnd, [['$ per £', '$', 1.2, 1.35], ['€ per £', '€', 1.12, 1.2], ['¥ per $', '¥', 140, 158], ['₦ per $', '₦', 1450, 1600]]);
    const rate = round(lo + rnd() * (hi - lo), sym === '¥' || sym === '₦' ? 0 : 2);
    const amt = L <= 2 ? ri(rnd, 1, 9) * 100 : ri(rnd, 12, 95) * 10;
    return { q: `${amt} at ${rate} ${pair}: how many ${sym}?`, a: round(amt * rate, 0), tol: L <= 2 ? 0.01 : 0.02, why: `${amt} × ${rate}: take ${amt} × ${Math.floor(rate)} then add the fraction.` };
  } },
  compound: { name: 'Compound growth', gen(rnd, L) {
    const r = pick(rnd, L <= 2 ? [5, 10, 20] : [3, 4, 6, 7, 8, 12, 15]);
    const y = L <= 2 ? pick(rnd, [2, 3]) : pick(rnd, [3, 4, 5, 10]);
    const p = pick(rnd, [100, 200, 500, 1000]);
    return { q: `${gbp(p)} at ${r}% a year for ${y} years ≈ ?`, a: round(p * (1 + r / 100) ** y, 0), tol: 0.03, why: `Simple interest gives ${gbp(round(p * (1 + r * y / 100)))}; compounding adds a little more.` };
  } },
};

export const TYPE_KEYS = Object.keys(TYPES);

export function makeProblem(type, level = 1, rnd = Math.random) {
  const L = Math.max(1, Math.min(5, level));
  const p = TYPES[type].gen(rnd, L);
  return { type, level: L, tol: 0, unit: '', ...p };
}

export function isCorrect(p, input) {
  const x = typeof input === 'number' ? input : parseFloat(String(input).replace(/,/g, ''));
  if (!isFinite(x)) return false;
  if (p.abs != null) return Math.abs(x - p.a) <= p.abs + 1e-9;
  if (!p.tol) return Math.abs(x - p.a) < 1e-6;
  return Math.abs(x - p.a) <= Math.abs(p.a) * p.tol + 1e-9;
}

// Interleaved sequence: never the same type twice running.
export function nextType(prev, rnd = Math.random, keys = TYPE_KEYS) {
  const pool = keys.filter((k) => k !== prev);
  return pool[Math.floor(rnd() * pool.length)];
}

// Adapt a per-type level: up after 3 fast correct in a row, down after 2 misses in a row.
export function adapt(state = { level: 1, run: 0, miss: 0 }, correct, ms, targetMs = 12000) {
  const s = { level: 1, run: 0, miss: 0, ...state };
  if (correct) { s.miss = 0; s.run = ms <= targetMs ? s.run + 1 : s.run; if (s.run >= 3 && s.level < 5) { s.level++; s.run = 0; } }
  else { s.run = 0; s.miss++; if (s.miss >= 2 && s.level > 1) { s.level--; s.miss = 0; } }
  return s;
}

// Base-rate problem with a natural-frequency explanation.
export function makeBaseRate(rnd = Math.random) {
  const skins = [
    ['borrowers', 'default within a year', 'a credit screen flags', 'flagged borrower defaults'],
    ['transactions', 'are fraudulent', 'the fraud system flags', 'flagged transaction is fraudulent'],
    ['patients', 'have the condition', 'the test is positive for', 'patient who tests positive has the condition'],
    ['start-ups', 'become very successful', 'an investor\'s checklist approves', 'approved start-up becomes very successful'],
    ['job applicants', 'would be strong performers', 'the interview panel rates highly', 'highly rated applicant is a strong performer'],
  ];
  const [pop, cond, flag, ask] = pick(rnd, skins);
  const base = pick(rnd, [1, 2, 3, 5, 8, 10, 20]);
  const sens = pick(rnd, [60, 70, 80, 90, 95]);
  const fp = pick(rnd, [5, 10, 15, 20, 30]);
  const N = 1000, yes = N * base / 100, no = N - yes;
  const tp = yes * sens / 100, fpn = no * fp / 100;
  const a = round(tp / (tp + fpn) * 100, 0);
  return {
    q: `${base}% of ${pop} ${cond}. ${flag[0].toUpperCase() + flag.slice(1)} ${sens}% of those who do, and ${fp}% of those who do not. What is the chance that a ${ask}?`,
    a, abs: 4, unit: '%',
    tree: [`Take 1,000 ${pop}.`, `${round(yes)} ${cond}; ${round(tp)} of them are flagged.`, `${round(no)} do not; ${round(fpn)} of them are flagged anyway.`, `Flagged in total: ${round(tp + fpn)}. True cases among them: ${round(tp)} ÷ ${round(tp + fpn)} = ${a}%.`],
  };
}

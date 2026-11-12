// Mental arithmetic: problem generators, difficulty adaptation, weak-spot weighting and applied problems.
// Generators return {type, q, a, tol, unit, why}.
// tol is the accepted relative error (0 = exact). Levels run 1–5.
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
const round = (x, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp;
const gbp = (n) => '£' + n.toLocaleString('en-GB');

export const TYPES = {
  add: { name: 'Addition', method: 'Add the tens first, then the units, carrying as you go.', example: '487 + 256: 400 + 200 = 600, 87 + 56 = 143. Total 743.', gen(rnd, L) {
    const a = L <= 1 ? ri(rnd, 12, 99) : L <= 3 ? ri(rnd, 101, 999) : ri(rnd, 1001, 9999), b = L <= 2 ? ri(rnd, 12, 99) : L <= 4 ? ri(rnd, 101, 999) : ri(rnd, 1001, 9999);
    return { q: `${a.toLocaleString('en-GB')} + ${b.toLocaleString('en-GB')}`, a: a + b, tol: 0, why: `Add ${Math.floor(b / 10) * 10} first, then ${b % 10}.` };
  } },
  sub: { name: 'Subtraction', method: 'Count up from the smaller number to the larger in easy steps.', example: '532 − 278: from 278 to 300 is 22, then to 532 is 232. Total 254.', gen(rnd, L) {
    const b = L <= 1 ? ri(rnd, 12, 60) : L <= 3 ? ri(rnd, 101, 600) : ri(rnd, 1001, 6000), a = b + (L <= 2 ? ri(rnd, 11, 89) : L <= 4 ? ri(rnd, 101, 899) : ri(rnd, 1001, 3999));
    return { q: `${a.toLocaleString('en-GB')} − ${b.toLocaleString('en-GB')}`, a: a - b, tol: 0, why: `Count up from ${b} to ${a} in round steps.` };
  } },
  pct: { name: 'Percentages', method: 'Build the percentage from easy pieces: 10%, 5% and 1%.', example: '35% of 240: 10% is 24, so 30% is 72 and 5% is 12. Total 84.', gen(rnd, L) {
    const p = L <= 1 ? pick(rnd, [10, 20, 25, 50, 5]) : L <= 2 ? pick(rnd, [15, 30, 40, 60, 75, 12]) : L <= 3 ? ri(rnd, 3, 45) : ri(rnd, 11, 95) + (L >= 5 ? 0.5 : 0);
    const base = L <= 2 ? ri(rnd, 2, 40) * 20 : L <= 3 ? ri(rnd, 12, 99) * 10 : ri(rnd, 120, 990);
    return { q: `${p}% of ${base.toLocaleString('en-GB')}`, a: round(p * base / 100, 2), tol: L >= 4 ? 0.01 : 0, why: `10% is ${base / 10}; build ${p}% from 10%, 5% and 1%.` };
  } },
  pctchg: { name: 'Percent change', method: 'Divide the change by the starting value, not the end value.', example: 'From 80 to 92: the change is 12, and 12 ÷ 80 = 15%.', gen(rnd, L) {
    const from = L <= 2 ? ri(rnd, 2, 20) * 10 : ri(rnd, 30, 400);
    const chg = (rnd() < 0.35 ? -1 : 1) * (L <= 2 ? pick(rnd, [10, 20, 25, 50]) : ri(rnd, 3, 60));
    const to = round(from * (1 + chg / 100), L <= 2 ? 0 : 0);
    const a = round((to - from) / from * 100, 1);
    return { q: `From ${from} to ${to}: % change?`, a, unit: '%', abs: L <= 2 ? 0.05 : 0.6, why: `Change ${to - from} over start ${from}: ${to - from} ÷ ${from}.` };
  } },
  mult: { name: 'Multiplication', method: 'Split one number into tens and units, multiply each, then add.', example: '47 × 6: 40 × 6 = 240 and 7 × 6 = 42. Total 282.', gen(rnd, L) {
    const a = L <= 1 ? ri(rnd, 3, 9) : L <= 3 ? ri(rnd, 12, 99) : ri(rnd, 12, 99);
    const b = L <= 1 ? ri(rnd, 11, 20) : L <= 2 ? ri(rnd, 3, 9) : L <= 3 ? ri(rnd, 11, 19) : ri(rnd, 21, 99);
    const tens = Math.floor(b / 10) * 10;
    return { q: `${a} × ${b}`, a: a * b, tol: 0, why: tens ? `${a}×${tens} = ${a * tens}, plus ${a}×${b - tens} = ${a * (b - tens)}.` : `Split ${a} into tens and units.` };
  } },
  div: { name: 'Division', method: 'Take out the largest easy multiple first, then divide what is left.', example: '252 ÷ 12: 12 × 20 = 240, leaving 12, which is one more. Answer 21.', gen(rnd, L) {
    const d = L <= 2 ? ri(rnd, 3, 9) : L <= 4 ? ri(rnd, 11, 25) : ri(rnd, 13, 49);
    const qv = L <= 1 ? ri(rnd, 6, 20) : L <= 3 ? ri(rnd, 12, 60) : ri(rnd, 21, 120);
    return { q: `${(d * qv).toLocaleString('en-GB')} ÷ ${d}`, a: qv, tol: 0, why: `${d} × ${Math.floor(qv / 10) * 10} = ${d * Math.floor(qv / 10) * 10}; the remainder gives the units.` };
  } },
  frac: { name: 'Fractions to percent', method: 'Know the unit fraction as a percentage, then multiply up.', example: '3/8: one eighth is 12.5%, so three eighths is 37.5%.', gen(rnd, L) {
    const den = L <= 2 ? pick(rnd, [4, 5, 8, 10, 20]) : L <= 3 ? pick(rnd, [6, 8, 12, 16, 25, 40]) : pick(rnd, [7, 9, 11, 13, 15, 17, 30]);
    const num = ri(rnd, 1, den - 1);
    return { q: `${num}/${den} as a %`, a: round(num / den * 100, 1), unit: '%', abs: L <= 2 ? 0.05 : 0.6, why: `1/${den} ≈ ${round(100 / den, 1)}%; multiply by ${num}.` };
  } },
  r72: { name: 'Rule of 72', method: 'Years to double is about 72 divided by the growth rate, and the reverse.', example: 'At 6% a year: 72 ÷ 6 = 12 years. Doubling in 9 years needs 72 ÷ 9 = 8% a year.', gen(rnd, L) {
    if (rnd() < 0.5 || L <= 1) {
      const r = L <= 2 ? pick(rnd, [2, 3, 4, 6, 8, 9, 12]) : pick(rnd, [1.5, 2.5, 3.5, 5, 7, 10, 15]);
      return { q: `Growth of ${r}% a year: years to double?`, a: round(Math.log(2) / Math.log(1 + r / 100), 1), unit: 'yrs', tol: 0.08, why: `72 ÷ ${r} ≈ ${round(72 / r, 1)}.` };
    }
    const y = pick(rnd, [4, 6, 8, 9, 12, 18, 24]);
    return { q: `Doubled in ${y} years: annual growth %?`, a: round((2 ** (1 / y) - 1) * 100, 1), unit: '%', tol: 0.08, why: `72 ÷ ${y} ≈ ${round(72 / y, 1)}.` };
  } },
  bps: { name: 'Basis points', method: 'One basis point is 0.01%. 100 bps is one percentage point; 1 bp of £1m is £100.', example: '25 bps of £40m: 1 bp is £4,000, so 25 bps is £100,000.', gen(rnd, L) {
    if (rnd() < 0.5) {
      const a = round(ri(rnd, 4, 30) * 0.25, 2), d = pick(rnd, L <= 2 ? [25, 50, 100] : [15, 35, 75, 125, 175]) * (rnd() < 0.4 ? -1 : 1);
      const b = round(a + d / 100, 2);
      if (b <= 0) return TYPES.bps.gen(rnd, L);
      return { q: `Rate moves from ${a.toFixed(2)}% to ${b.toFixed(2)}%: change in bps?`, a: d, unit: 'bps', tol: 0, why: `1 percentage point = 100 bps, so ${round(b - a, 2)} points = ${d} bps.` };
    }
    const bp = pick(rnd, L <= 2 ? [10, 25, 50] : [5, 15, 35, 60, 80, 125]);
    const m = pick(rnd, L <= 2 ? [10, 20, 100, 200] : [40, 60, 150, 250, 800]);
    return { q: `${bp} bps of £${m}m, in £ thousands`, a: round(m * 1e6 * bp / 1e4 / 1e3, 1), unit: '£k', tol: 0, why: `1 bp of £${m}m is £${(m * 100).toLocaleString('en-GB')}; times ${bp}.` };
  } },
  fx: { name: 'Currency conversion', method: 'Multiply by the whole part of the rate, then add the fractional part.', example: '300 at 1.27: 300 × 1 = 300, plus 300 × 0.27 = 81. Total 381.', gen(rnd, L) {
    const [pair, sym, lo, hi] = pick(rnd, [['$ per £', '$', 1.2, 1.35], ['€ per £', '€', 1.12, 1.2], ['¥ per $', '¥', 140, 158], ['₦ per $', '₦', 1450, 1600]]);
    const rate = round(lo + rnd() * (hi - lo), sym === '¥' || sym === '₦' ? 0 : 2);
    const amt = L <= 2 ? ri(rnd, 1, 9) * 100 : ri(rnd, 12, 95) * 10;
    return { q: `${amt} at ${rate} ${pair}: how many ${sym}?`, a: round(amt * rate, 0), tol: L <= 2 ? 0.01 : 0.02, why: `${amt} × ${rate}: take ${amt} × ${Math.floor(rate)} then add the fraction.` };
  } },
  compound: { name: 'Compound growth', method: 'Start from simple interest, then add a little for interest on interest.', example: '£200 at 10% for 3 years: simple interest gives £260; compounding gives £266.', gen(rnd, L) {
    const r = pick(rnd, L <= 2 ? [5, 10, 20] : [3, 4, 6, 7, 8, 12, 15]);
    const y = L <= 2 ? pick(rnd, [2, 3]) : pick(rnd, [3, 4, 5, 10]);
    const p = pick(rnd, [100, 200, 500, 1000]);
    return { q: `${gbp(p)} at ${r}% a year for ${y} years ≈ ?`, a: round(p * (1 + r / 100) ** y, 0), tol: 0.03, why: `Simple interest gives ${gbp(round(p * (1 + r * y / 100)))}; compounding adds a little more.` };
  } },
};

export const TYPE_KEYS = Object.keys(TYPES);
// Plain operations count as learned from the start; the methods below them are taught first.
export const BASIC = ['add', 'sub', 'mult', 'div'];
export const isLearned = (stats, k) => BASIC.includes(k) || !!stats?.[k]?.learned;
export const learnedKeys = (stats) => TYPE_KEYS.filter((k) => isLearned(stats, k));
export const nextToLearn = (stats) => TYPE_KEYS.find((k) => !isLearned(stats, k)) || null;

export function makeProblem(type, level = 1, rnd = Math.random) {
  if (type === 'applied') return makeApplied(level, rnd);
  const L = Math.max(1, Math.min(5, Math.round(level)));
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

// ---------- adaptation ----------
// Each type keeps a rating from 1 to 5 and its last 20 attempts. A correct answer raises the rating a
// little and a miss lowers it by about 5.5 times as much, so difficulty settles where roughly 85% are right.
export const TARGET = 0.85, UP = 0.1, UP_SLOW = 0.06, DOWN = 0.55, HIST = 20;
export function adapt(stat, correct, ms, targetMs = 15000, max = 5) {
  const s = { rating: 1, hist: [], learned: false, ...stat };
  s.rating = Math.max(1, Math.min(max, s.rating + (correct ? (ms <= targetMs ? UP : UP_SLOW) : -DOWN)));
  s.hist = [...s.hist, [correct ? 1 : 0, Math.round(ms)]].slice(-HIST);
  return s;
}
export const levelOf = (stat) => Math.max(1, Math.min(5, Math.round(stat?.rating || 1)));
export function summarise(stat) {
  const h = stat?.hist || [];
  if (!h.length) return { n: 0, acc: null, ms: null };
  const ok = h.filter((x) => x[0]).map((x) => x[1]).sort((a, b) => a - b);
  return { n: h.length, acc: ok.length / h.length, ms: ok.length ? ok[ok.length >> 1] : null };
}

// Weak-spot weighting: low accuracy and slow answers both raise a type's share of the sprint.
export function typeWeights(stats, keys) {
  const sums = Object.fromEntries(keys.map((k) => [k, summarise(stats?.[k])]));
  const times = keys.map((k) => sums[k].ms).filter(Boolean).sort((a, b) => a - b);
  const mid = times.length ? times[times.length >> 1] : null;
  return Object.fromEntries(keys.map((k) => {
    const { n, acc, ms } = sums[k];
    if (n < 5) return [k, 1.5];
    const slow = mid && ms ? Math.max(0, Math.min(1, ms / mid - 1)) : 0;
    return [k, 1 + 4 * Math.max(0, 0.95 - acc) + slow];
  }));
}

// Interleaved: never the same type twice running; otherwise drawn in proportion to weight.
export function nextType(prev, rnd = Math.random, keys = TYPE_KEYS, weights = null) {
  const pool = keys.length > 1 ? keys.filter((k) => k !== prev) : keys;
  const w = pool.map((k) => weights?.[k] ?? 1), total = w.reduce((a, b) => a + b, 0);
  let x = rnd() * total;
  for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x < 0) return pool[i]; }
  return pool[pool.length - 1];
}

// Learn mode: one type at a time until 9 of the last 10 are right.
export const LEARN_WINDOW = 10, LEARN_NEED = 9, LEARN_MAX = 30;
export const learnPassed = (results) => results.length >= LEARN_WINDOW && results.slice(-LEARN_WINDOW).filter(Boolean).length >= LEARN_NEED;

// ---------- applied problems: work out which calculation the situation needs ----------
const APPLIED = [
  (r, L) => { const a = L <= 1 ? ri(r, 4, 40) * 10 : ri(r, 120, 900), g = L <= 1 ? pick(r, [10, 20, 25, 50]) : ri(r, 4, 35), b = round(a * (1 + g / 100)); return { q: `Revenue rose from £${a}m to £${b}m. What was the growth rate?`, a: round((b - a) / a * 100, 1), unit: '%', abs: 0.6, why: `(${b} − ${a}) ÷ ${a}: the change over the starting value.` }; },
  (r, L) => { const a = L <= 1 ? ri(r, 5, 40) * 100 : ri(r, 600, 4000), c = L <= 1 ? pick(r, [10, 20, 25]) : ri(r, 4, 30), b = round(a * (1 - c / 100)); return { q: `Headcount fell from ${a.toLocaleString('en-GB')} to ${b.toLocaleString('en-GB')}. What was the percentage change?`, a: round((b - a) / a * 100, 1), unit: '%', abs: 0.6, why: `(${b} − ${a}) ÷ ${a}: a fall, so the answer is negative.` }; },
  (r, L) => { const rev = L <= 1 ? ri(r, 2, 20) * 50 : ri(r, 150, 950), m = L <= 1 ? pick(r, [5, 10, 20, 25]) : ri(r, 3, 32), p = round(rev * m / 100, 1); return { q: `A firm made £${p}m profit on £${rev}m of revenue. What was its profit margin?`, a: round(p / rev * 100, 1), unit: '%', abs: 0.6, why: `Profit ÷ revenue: ${p} ÷ ${rev}.` }; },
  (r, L) => { const mk = L <= 1 ? pick(r, [2, 4, 5, 10]) : ri(r, 3, 24), sh = L <= 1 ? pick(r, [5, 10, 20, 25]) : ri(r, 2, 30), s = round(mk * 1000 * sh / 100); return { q: `A firm sells £${s.toLocaleString('en-GB')}m a year in a market worth £${mk}bn. What is its market share?`, a: round(s / (mk * 1000) * 100, 1), unit: '%', abs: 0.6, why: `£${mk}bn is £${(mk * 1000).toLocaleString('en-GB')}m; sales ÷ market.` }; },
  (r, L) => { const x = L <= 1 ? ri(r, 2, 20) * 20 : ri(r, 45, 480), d = L <= 1 ? pick(r, [10, 20, 25, 50]) : pick(r, [15, 30, 35, 12, 40]); return { q: `A £${x} item is reduced by ${d}%. What is the new price in pounds?`, a: round(x * (1 - d / 100), 2), tol: 0.01, why: `Pay ${100 - d}% of £${x}.` }; },
  (r, L) => { const before = L <= 1 ? ri(r, 2, 20) * 50 : ri(r, 12, 90) * 10, up = L <= 1 ? pick(r, [10, 20, 25]) : pick(r, [5, 15, 20, 30, 40]), after = round(before * (1 + up / 100), 2); return { q: `A price is £${after} after a ${up}% rise. What was it before, in pounds?`, a: before, tol: 0.01, why: `Divide by ${round(1 + up / 100, 2)}; do not take ${up}% off the new price.` }; },
  (r, L) => { const loan = L <= 1 ? pick(r, [2, 4, 5, 10, 20]) : ri(r, 3, 48), rate = L <= 1 ? pick(r, [4, 5, 6, 8]) : pick(r, [3.5, 4.5, 5.5, 6.5, 7.5]); return { q: `What is a year's interest on a £${loan}m loan at ${rate}%, in £ thousands?`, a: round(loan * 1000 * rate / 100, 1), unit: '£k', tol: 0.01, why: `1% of £${loan}m is £${loan * 10}k; multiply by ${rate}.` }; },
  (r, L) => { const loan = L <= 1 ? pick(r, [10, 20, 40, 100]) : pick(r, [30, 60, 150, 250, 800]), bp = L <= 1 ? pick(r, [25, 50, 100]) : pick(r, [15, 35, 75, 125]); return { q: `The rate on a £${loan}m loan rises by ${bp} basis points. What is the extra annual cost in £ thousands?`, a: round(loan * 1e6 * bp / 1e4 / 1e3, 1), unit: '£k', tol: 0.01, why: `1 bp of £${loan}m is £${(loan * 100).toLocaleString('en-GB')}; times ${bp}.` }; },
  (r, L) => { const eur = L <= 1 ? ri(r, 2, 12) * 100 : ri(r, 15, 95) * 10, rate = round(1.12 + r() * 0.1, 2); return { q: `An invoice is for €${eur.toLocaleString('en-GB')}. At ${rate} euros to the pound, what does it cost in pounds?`, a: round(eur / rate), tol: 0.02, why: `Euros ÷ ${rate}: you get fewer pounds than euros.` }; },
  (r, L) => { const g = L <= 1 ? pick(r, [2, 3, 4, 6, 8]) : pick(r, [1.5, 2.5, 5, 7, 9, 12]); return { q: `An economy grows ${g}% a year. Roughly how many years until it doubles?`, a: round(Math.log(2) / Math.log(1 + g / 100), 1), unit: 'yrs', tol: 0.08, why: `Rule of 72: 72 ÷ ${g} ≈ ${round(72 / g, 1)}.` }; },
  (r, L) => { const n = L <= 1 ? pick(r, [20, 40, 50, 200]) : ri(r, 12, 95) * 10, c = L <= 1 ? ri(r, 2, 9) : round(ri(r, 150, 950) / 100, 2); return { q: `An order of ${n} units costs £${round(n * c, 2).toLocaleString('en-GB')} in total. What is the cost per unit, in pounds?`, a: c, tol: 0.01, why: `Total ÷ units: ${round(n * c, 2)} ÷ ${n}.` }; },
  (r, L) => { const e = L <= 1 ? pick(r, [0.5, 1, 2, 4]) : round(ri(r, 30, 420) / 100, 2), pe = L <= 1 ? pick(r, [8, 10, 12, 20]) : ri(r, 6, 32), price = round(e * pe, 2); return { q: `A share costs £${price} and earnings per share are £${e}. What is the price-to-earnings ratio?`, a: round(price / e, 1), tol: 0.03, why: `Price ÷ earnings: ${price} ÷ ${e}.` }; },
  (r, L) => { const v = ri(r, 2, 12), margin = L <= 1 ? pick(r, [2, 4, 5, 10]) : ri(r, 3, 14), units = L <= 1 ? ri(r, 2, 20) * 100 : ri(r, 12, 90) * 50; return { q: `Fixed costs are £${(units * margin).toLocaleString('en-GB')}. Each unit sells for £${v + margin} and costs £${v} to make. How many units to break even?`, a: units, tol: 0, why: `Each unit contributes £${margin}; fixed costs ÷ £${margin}.` }; },
  (r, L) => { const p = pick(r, [100, 200, 500]), g = L <= 1 ? pick(r, [10, 20]) : pick(r, [5, 8, 12, 15]), y = L <= 1 ? 2 : pick(r, [3, 4, 5]); return { q: `Sales of £${p}m grow ${g}% a year for ${y} years. What are they then, in £m?`, a: round(p * (1 + g / 100) ** y), tol: 0.03, why: `Multiply by ${round(1 + g / 100, 2)} once for each year; simple growth alone gives £${round(p * (1 + g * y / 100))}m.` }; },
  (r, L) => { const w = L <= 1 ? 50 : pick(r, [60, 70, 40, 80]), a = ri(r, 5, 11), b = ri(r, 1, 4); return { q: `A portfolio holds ${w}% in shares returning ${a}% and ${100 - w}% in bonds returning ${b}%. What is the overall return?`, a: round(w / 100 * a + (100 - w) / 100 * b, 2), unit: '%', abs: 0.06, why: `Weight each return: ${w / 100} × ${a} + ${(100 - w) / 100} × ${b}.` }; },
];
export function makeApplied(level = 1, rnd = Math.random, prevKind = -1) {
  const L = Math.max(1, Math.min(3, Math.round(level)));
  let kind = Math.floor(rnd() * APPLIED.length);
  if (kind === prevKind) kind = (kind + 1) % APPLIED.length;
  return { type: 'applied', kind, level: L, tol: 0, unit: '', ...APPLIED[kind](rnd, L) };
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

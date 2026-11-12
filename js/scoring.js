// Scoring helpers: Brier score, calibration bins, medians, streaks.
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// forecasts: [{p (0..1), outcome (0|1)}]
export const brier = (fs) => mean(fs.map((f) => (f.p - f.outcome) ** 2));

// items: [{conf (0..1), hit (bool)}] -> bins with mean confidence and hit rate
export function calibrationBins(items, edges = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0001]) {
  const bins = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const inBin = items.filter((x) => x.conf >= edges[i] && x.conf < edges[i + 1]);
    if (inBin.length) bins.push({ lo: edges[i], hi: Math.min(1, edges[i + 1]), n: inBin.length, conf: mean(inBin.map((x) => x.conf)), acc: mean(inBin.map((x) => (x.hit ? 1 : 0))) });
  }
  return bins;
}

// For yes/no forecasts, fold probabilities below 50% so every forecast reads as "confidence in the likelier side".
export const foldForecast = (f) => (f.p >= 0.5 ? { conf: f.p, hit: f.outcome === 1 } : { conf: 1 - f.p, hit: f.outcome === 0 });

export function streak(dayKeys, today, keyOf) {
  const set = new Set(dayKeys);
  let n = 0, t = today;
  if (!set.has(keyOf(t))) t -= 86400000; // today not done yet does not break the streak
  while (set.has(keyOf(t))) { n++; t -= 86400000; }
  return n;
}

// Factor error for Fermi: 1 = exact, 10 = one order of magnitude out.
export const factorError = (guess, truth) => (guess > 0 && truth > 0 ? Math.max(guess / truth, truth / guess) : Infinity);

// Parse numbers typed like "1.2m", "45k", "3bn", "1,200".
export function parseNum(s) {
  if (typeof s === 'number') return s;
  const m = String(s).trim().toLowerCase().replace(/,/g, '').match(/^(-?\d*\.?\d+)\s*(k|m|bn|b|tn|t)?$/);
  if (!m) return NaN;
  const mult = { k: 1e3, m: 1e6, bn: 1e9, b: 1e9, tn: 1e12, t: 1e12 }[m[2]] ?? 1;
  return parseFloat(m[1]) * mult;
}

export function fmtNum(n) {
  if (n == null || !isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a >= 1e12) return +(n / 1e12).toPrecision(3) + ' trillion';
  if (a >= 1e9) return +(n / 1e9).toPrecision(3) + ' billion';
  if (a >= 1e6) return +(n / 1e6).toPrecision(3) + ' million';
  if (a >= 1e4) return Math.round(n).toLocaleString('en-GB');
  return String(+n.toPrecision(4));
}

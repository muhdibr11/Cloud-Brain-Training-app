// Spaced repetition: expanding gaps that reset on a miss.
export const GAPS = [1, 3, 7, 21, 60, 120];
export const DAY = 86400000;

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

// grade: 0 missed, 1 partial, 2 got it
export function schedule(card, grade, now = Date.now()) {
  const c = { step: 0, reps: 0, lapses: 0, ...card };
  if (grade === 2) c.step = Math.min(c.step + 1, GAPS.length);
  else if (grade === 0) { c.step = 0; c.lapses += 1; }
  // partial: repeat the same gap
  const gap = GAPS[Math.max(0, Math.min(c.step, GAPS.length) - 1)] ?? 1;
  c.reps += 1;
  c.last = now;
  c.due = startOfDay(now) + (grade === 2 ? gap : grade === 1 ? Math.min(gap, 3) : 1) * DAY;
  return c;
}

export const isDue = (card, now = Date.now()) => !!card && card.due != null && card.due <= now;

// Review modes rotate: apply question 0, explain, apply question 1, compare.
export const MODES = ['apply0', 'explain', 'apply1', 'compare'];
export function nextMode(card, concept) {
  const n = (card?.reps ?? 0) % MODES.length;
  let mode = MODES[n];
  if (mode === 'compare' && !(concept.links || []).length) mode = 'explain';
  if (mode === 'apply1' && (concept.apply || []).length < 2) mode = 'apply0';
  if (mode === 'apply0' && !(concept.apply || []).length) mode = 'explain';
  return mode;
}

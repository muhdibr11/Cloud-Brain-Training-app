// Mental arithmetic with an on-screen keypad. Three modes: learn (one type), mixed sprint, applied sprint.
import { get, update } from '../store.js';
import { markDay } from '../lib.js';
import { TYPES, TYPE_KEYS, makeProblem, isCorrect, nextType, adapt, levelOf, summarise, typeWeights, learnedKeys, nextToLearn, isLearned, learnPassed, LEARN_MAX, LEARN_NEED, LEARN_WINDOW } from '../arith.js';
import { median } from '../scoring.js';
import { startOfDay, DAY } from '../srs.js';
import { esc, head, bind, fmtTime, verdict, $ } from '../ui.js';

const nameOf = (type) => (type === 'applied' ? 'Applied' : TYPES[type].name);
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.'];

// One engine for every mode.
//   mode 'mixed'   timed; learned types, weighted to weak ones; difficulty adapts
//   mode 'applied' timed; word problems; difficulty adapts
//   mode 'bench'   timed; every type at a fixed level, evenly mixed; nothing adapts
//   mode 'learn'   untimed; one type until 9 of the last 10 are right
export function run(root, { mode = 'mixed', secs = 180, fixedLevel = 3, learnType = null, back = '#/practice', onDone }) {
  const stats = structuredClone(get().arith.stats || {});
  const timed = mode !== 'learn';
  const keys = mode === 'bench' ? TYPE_KEYS : learnedKeys(stats);
  let left = secs, timer = null, prob = null, entry = '', shownAt = 0, paused = false, log = [], prevType = null, prevKind = -1, onKey = null, finished = false;

  const pickProblem = () => {
    if (mode === 'learn') return makeProblem(learnType, log.length < 5 ? 1 : 2);
    if (mode === 'applied') { const p = makeProblem('applied', Math.min(3, levelOf(stats.applied))); return p.kind === prevKind ? makeProblem('applied', p.level) : p; }
    const type = nextType(prevType, Math.random, keys, mode === 'bench' ? null : typeWeights(stats, keys));
    return makeProblem(type, mode === 'bench' ? fixedLevel : levelOf(stats[type]));
  };
  const next = () => { prob = pickProblem(); prevType = prob.type; prevKind = prob.kind ?? -1; entry = ''; paused = false; shownAt = performance.now(); draw(); };
  const tick = () => {
    if (paused) return;
    left -= 0.25; if (left <= 0) return end();
    const t = $('#clock', root); if (t) t.textContent = fmtTime(Math.ceil(left));
    const b = $('#bar', root); if (b) b.style.width = (1 - left / secs) * 100 + '%';
  };

  const end = (passed = false) => {
    if (finished) return; finished = true;
    clearInterval(timer); timer = null; document.removeEventListener('keydown', onKey);
    const right = log.filter((l) => l.ok);
    const sum = { t: Date.now(), mode, dur: secs, n: log.length, correct: right.length, medMs: median(right.map((l) => l.ms)), rate: timed ? right.length / (secs / 60) : null, acc: log.length ? right.length / log.length : null, bench: mode === 'bench', passed, learnType, log };
    update((s) => {
      if (mode !== 'bench') { if (mode === 'learn' && passed) (stats[learnType] ??= { rating: 1, hist: [] }).learned = true; s.arith.stats = stats; }
      if (timed) s.arith.sessions.push({ t: sum.t, mode, dur: secs, n: sum.n, correct: sum.correct, medMs: sum.medMs, bench: sum.bench });
    });
    onDone(sum);
  };

  const learnStatus = () => { const last = log.slice(-LEARN_WINDOW); return `${last.filter((l) => l.ok).length} of the last ${Math.max(last.length, 1)} right · need ${LEARN_NEED} of ${LEARN_WINDOW}`; };
  const draw = () => {
    const right = timed ? `<span class="timer" id="clock">${fmtTime(Math.ceil(left))}</span>` : `<span class="muted small">${log.length + 1}</span>`;
    const approx = prob.tol || prob.abs > 0.1 ? ' · an approximate answer is accepted' : '';
    root.innerHTML = `${head(mode === 'learn' ? 'Learn' : 'Sprint', back, right)}
      ${timed ? `<div class="progressbar"><i id="bar" style="width:${(1 - left / secs) * 100}%"></i></div>` : `<p class="muted small" style="text-align:center">${learnStatus()}</p>`}
      <p class="muted small" style="text-align:center">${esc(nameOf(prob.type))}${approx}</p>
      <div class="sprint-q ${prob.type === 'applied' ? 'applied' : ''}">${esc(prob.q)}</div>
      ${paused ? `<section class="card">${verdict(false, 'Not quite')}<p>Answer: <strong>${esc(prob.a)}${prob.unit ? (prob.unit === '%' ? '' : ' ') + esc(prob.unit) : ''}</strong>. You entered ${esc(entry || 'nothing')}.</p><p class="muted">${esc(prob.why)}</p><button class="btn" data-act="next">Next</button>${timed ? '<p class="muted small">The clock is paused.</p>' : ''}</section>`
        : `<div class="sprint-in" id="entry" aria-live="polite">${esc(entry) || '&nbsp;'}${prob.unit ? ` <small>${esc(prob.unit)}</small>` : ''}</div>
        <div class="keypad">${KEYS.map((k) => `<button class="key" data-act="key" data-k="${k}">${k}</button>`).join('')}
          <button class="key" data-act="key" data-k="del" aria-label="Delete">⌫</button><button class="key enter" data-act="enter" style="grid-column:span 2">Enter</button></div>`}`;
  };
  const press = (k) => {
    if (paused) return;
    if (k === 'del') entry = entry.slice(0, -1);
    else if (k === '−' || k === '-') entry = entry.startsWith('-') ? entry.slice(1) : '-' + entry;
    else if (k === '.') { if (!entry.includes('.')) entry += '.'; }
    else if (entry.replace(/\D/g, '').length < 9) entry += k;
    const e = $('#entry', root); if (e) e.firstChild.textContent = entry || ' ';
  };
  const afterAnswer = () => {
    if (mode !== 'learn') return next();
    if (learnPassed(log.map((l) => l.ok))) return end(true);
    if (log.length >= LEARN_MAX) return end(false);
    next();
  };
  const submit = () => {
    if (paused || entry === '' || entry === '-') return;
    const ms = performance.now() - shownAt, ok = isCorrect(prob, entry);
    log.push({ type: prob.type, level: prob.level, ok, ms });
    // Word problems take longer to read, so they get a longer "quick" threshold and a three-level ceiling.
    if (mode === 'mixed') stats[prob.type] = adapt(stats[prob.type], ok, ms);
    if (mode === 'applied') stats.applied = adapt(stats.applied, ok, ms, 30000, 3);
    if (ok) { afterAnswer(); $('.sprint-q', root)?.classList.add('flash-good'); } else { paused = true; draw(); }
  };

  bind(root, { key: (el) => press(el.dataset.k), enter: submit, next: afterAnswer });
  onKey = (e) => { if (/^[0-9.\-]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Enter') { e.preventDefault(); paused ? afterAnswer() : submit(); } };
  document.addEventListener('keydown', onKey);
  if (timed) timer = setInterval(tick, 250);
  next();
  return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
}

export function summaryHtml(sum) {
  const types = [...new Set(sum.log.map((l) => l.type))];
  const byType = types.map((k) => { const l = sum.log.filter((x) => x.type === k); return `<tr><td>${esc(nameOf(k))}</td><td class="num">${l.filter((x) => x.ok).length} / ${l.length}</td><td class="num">${(median(l.map((x) => x.ms)) / 1000).toFixed(1)} s</td></tr>`; }).join('');
  return `<div class="tiles"><div class="tile"><b>${sum.rate == null ? sum.n : sum.rate.toFixed(1)}</b><span>${sum.rate == null ? 'problems' : 'correct per minute'}</span></div><div class="tile"><b>${sum.acc == null ? '–' : Math.round(sum.acc * 100) + '%'}</b><span>accuracy (${sum.correct} of ${sum.n})</span></div></div>
    ${byType ? `<section class="card"><table class="table"><thead><tr><th>Type</th><th class="num">Right</th><th class="num">Median</th></tr></thead><tbody>${byType}</tbody></table></section>` : ''}`;
}

// Which mode the daily session suggests: a learn set while any method is untaught, otherwise mostly mixed with applied every third day.
export function suggested(stats = get().arith.stats) {
  const learn = nextToLearn(stats);
  if (learn) return { mode: 'learn', learnType: learn };
  return { mode: Math.floor(startOfDay() / DAY) % 3 === 2 ? 'applied' : 'mixed' };
}

export function render(root) {
  let stop = null;
  const home = () => {
    const s = get(), stats = s.arith.stats || {}, secs = s.settings.sprintSecs, sug = suggested(stats), learn = nextToLearn(stats);
    const cls = (m) => (sug.mode === m ? 'btn' : 'btn ghost');
    const rows = TYPE_KEYS.map((k) => {
      const { n, acc, ms } = summarise(stats[k]), learned = isLearned(stats, k);
      return `<tr><td>${esc(TYPES[k].name)}${learned ? '' : ' <span class="tag">to learn</span>'}</td><td class="num">${learned ? levelOf(stats[k]) : '–'}</td><td class="num">${n ? Math.round(acc * 100) + '%' : '–'}</td><td class="num">${ms ? (ms / 1000).toFixed(1) + ' s' : '–'}</td></tr>`;
    }).join('');
    root.innerHTML = `${head('Arithmetic', '#/practice')}
      ${learn ? `<section class="card"><h2>Learn: ${esc(TYPES[learn].name)}</h2><p>${esc(TYPES[learn].method)}</p><p class="muted"><strong>Example.</strong> ${esc(TYPES[learn].example)}</p>
        <p class="muted small">One method at a time, untimed, until ${LEARN_NEED} of your last ${LEARN_WINDOW} are right. Then it joins the mixed sprint.</p>
        <button class="${cls('learn')}" data-act="learn">Start this set</button></section>` : ''}
      <section class="card"><h2>Mixed sprint</h2><p class="muted">${Math.round(secs / 60)} minutes across the ${learnedKeys(stats).length} types you have learned, with more of your weakest.</p><button class="${cls('mixed')}" data-act="mixed">Start mixed sprint</button></section>
      <section class="card"><h2>Applied sprint</h2><p class="muted">${Math.round(secs / 60)} minutes of short business problems where you work out the calculation yourself.</p><button class="${cls('applied')}" data-act="applied">Start applied sprint</button></section>
      <section class="card"><h2>By type</h2><div class="scroll-x"><table class="table"><thead><tr><th>Type</th><th class="num">Level</th><th class="num">Right</th><th class="num">Median</th></tr></thead><tbody>${rows}
        <tr><td>Applied</td><td class="num">${Math.min(3, levelOf(stats.applied))}</td><td class="num">${summarise(stats.applied).n ? Math.round(summarise(stats.applied).acc * 100) + '%' : '–'}</td><td class="num">${summarise(stats.applied).ms ? (summarise(stats.applied).ms / 1000).toFixed(1) + ' s' : '–'}</td></tr></tbody></table></div>
        <p class="muted small">From your last 20 answers of each type. Difficulty moves so that about 85% of answers are right.</p></section>`;
    bind(root, { learn: () => start('learn', learn), mixed: () => start('mixed'), applied: () => start('applied') });
  };
  const start = (mode, learnType = null) => {
    stop = run(root, { mode, learnType, secs: get().settings.sprintSecs, back: '#/practice', onDone: (sum) => {
      stop = null; markDay('sprint');
      const title = mode !== 'learn' ? 'Sprint done' : sum.passed ? 'Learned' : 'Not there yet';
      const note = mode !== 'learn' ? '' : sum.passed ? `<section class="card"><p>${esc(TYPES[learnType].name)} now appears in your mixed sprints.</p></section>`
        : `<section class="card"><p>You did ${sum.n} problems without reaching ${LEARN_NEED} of ${LEARN_WINDOW}. Read the method again and try another set tomorrow.</p><p class="muted">${esc(TYPES[learnType].method)}</p></section>`;
      root.innerHTML = `${head(title, '#/practice')}${note}${summaryHtml(sum)}<a class="btn" href="#/today">Back to today</a><button class="btn ghost" data-act="more">More arithmetic</button>`;
      bind(root, { more: home });
    } });
  };
  home();
  return () => stop && stop();
}

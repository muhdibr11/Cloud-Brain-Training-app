// Timed, interleaved mental arithmetic with an on-screen keypad.
import { get, update } from '../store.js';
import { markDay } from '../lib.js';
import { TYPES, TYPE_KEYS, makeProblem, isCorrect, nextType, adapt } from '../arith.js';
import { median } from '../scoring.js';
import { esc, head, bind, fmtTime, verdict, $ } from '../ui.js';

// run(root, {secs, fixedLevel, back, onDone}) -> cleanup. onDone receives the session summary.
export function run(root, { secs, fixedLevel = null, back = '#/practice', onDone }) {
  const levels = structuredClone(get().arith.levels || {});
  let left = secs, timer = null, prob = null, entry = '', shownAt = 0, paused = false, log = [], prevType = null, key = null;

  const next = () => {
    const type = nextType(prevType); prevType = type;
    prob = makeProblem(type, fixedLevel ?? (levels[type]?.level || 1));
    entry = ''; paused = false; shownAt = performance.now(); draw();
  };
  const tick = () => { if (paused) return; left -= 0.25; if (left <= 0) return end(); const t = $('#clock', root); if (t) t.textContent = fmtTime(Math.ceil(left)); const b = $('#bar', root); if (b) b.style.width = (1 - left / secs) * 100 + '%'; };

  const end = () => {
    clearInterval(timer); timer = null; document.removeEventListener('keydown', key);
    const right = log.filter((l) => l.ok);
    const sum = { t: Date.now(), dur: secs, n: log.length, correct: right.length, medMs: median(right.map((l) => l.ms)), rate: right.length / (secs / 60), acc: log.length ? right.length / log.length : null, bench: fixedLevel != null, log };
    update((s) => {
      if (fixedLevel == null) s.arith.levels = levels;
      s.arith.sessions.push({ t: sum.t, dur: secs, n: sum.n, correct: sum.correct, medMs: sum.medMs, bench: sum.bench });
    });
    onDone(sum);
  };

  const draw = () => {
    root.innerHTML = `${head('Sprint', back, `<span class="timer" id="clock">${fmtTime(Math.ceil(left))}</span>`)}
      <div class="progressbar"><i id="bar" style="width:${(1 - left / secs) * 100}%"></i></div>
      <p class="muted small" style="text-align:center">${esc(TYPES[prob.type].name)}${prob.tol || prob.abs > 0.1 ? ' · an approximate answer is accepted' : ''}</p>
      <div class="sprint-q">${esc(prob.q)}</div>
      ${paused ? `<section class="card">${verdict(false, 'Not quite')}<p>Answer: <strong>${esc(prob.a)}${prob.unit ? (prob.unit === '%' ? '' : ' ') + esc(prob.unit) : ''}</strong>. You entered ${esc(entry || 'nothing')}.</p><p class="muted">${esc(prob.why)}</p><button class="btn" data-act="next">Next</button><p class="muted small">The clock is paused.</p></section>`
        : `<div class="sprint-in" id="entry" aria-live="polite">${esc(entry) || '&nbsp;'}${prob.unit ? ` <small>${esc(prob.unit)}</small>` : ''}</div>
        <div class="keypad">${['7', '8', '9', '4', '5', '6', '1', '2', '3', '−', '0', '.'].map((k) => `<button class="key" data-act="key" data-k="${k}">${k}</button>`).join('')}
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
  const submit = () => {
    if (paused || entry === '' || entry === '-') return;
    const ms = performance.now() - shownAt, ok = isCorrect(prob, entry);
    log.push({ type: prob.type, level: prob.level, ok, ms });
    if (fixedLevel == null) levels[prob.type] = adapt(levels[prob.type], ok, ms);
    if (ok) { next(); $('.sprint-q', root)?.classList.add('flash-good'); } else { paused = true; draw(); }
  };

  bind(root, { key: (el) => press(el.dataset.k), enter: submit, next });
  key = (e) => { if (/^[0-9.\-]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); else if (e.key === 'Enter') { e.preventDefault(); paused ? next() : submit(); } };
  document.addEventListener('keydown', key);
  timer = setInterval(tick, 250);
  next();
  return () => { clearInterval(timer); document.removeEventListener('keydown', key); };
}

export function summaryHtml(sum) {
  const byType = TYPE_KEYS.map((k) => { const l = sum.log.filter((x) => x.type === k); return l.length ? `<tr><td>${esc(TYPES[k].name)}</td><td class="num">${l.filter((x) => x.ok).length} / ${l.length}</td><td class="num">${(median(l.map((x) => x.ms)) / 1000).toFixed(1)} s</td></tr>` : ''; }).join('');
  return `<div class="tiles"><div class="tile"><b>${sum.rate.toFixed(1)}</b><span>correct per minute</span></div><div class="tile"><b>${sum.acc == null ? '–' : Math.round(sum.acc * 100) + '%'}</b><span>accuracy (${sum.correct} of ${sum.n})</span></div></div>
    ${byType ? `<section class="card"><table class="table"><thead><tr><th>Type</th><th class="num">Right</th><th class="num">Median</th></tr></thead><tbody>${byType}</tbody></table></section>` : ''}`;
}

export function render(root) {
  const s = get(), secs = s.settings.sprintSecs;
  let stop = null;
  const levels = TYPE_KEYS.map((k) => `<tr><td>${esc(TYPES[k].name)}</td><td class="num">Level ${s.arith.levels[k]?.level || 1}</td></tr>`).join('');
  root.innerHTML = `${head('Arithmetic sprint', '#/practice')}
    <section class="card"><p>${Math.round(secs / 60)} minutes of mixed problems. A wrong answer pauses the clock and shows the method.</p>
    <button class="btn" data-act="start">Start</button></section>
    <section class="card"><h2>Your levels</h2><table class="table"><tbody>${levels}</tbody></table><p class="muted small">A level rises after three quick correct answers and falls after two misses.</p></section>`;
  bind(root, { start: () => {
    stop = run(root, { secs, onDone: (sum) => {
      markDay('sprint');
      root.innerHTML = `${head('Sprint done', '#/practice')}${summaryHtml(sum)}<a class="btn" href="#/today">Back to today</a><a class="btn ghost" href="#/practice/sprint" data-act="again">Go again</a>`;
      bind(root, { again: (el, e) => { e.preventDefault(); render(root); } });
    } });
  } });
  return () => stop && stop();
}

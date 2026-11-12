// Monthly benchmark: fixed difficulty, new questions, same format every time.
import { get, update } from '../store.js';
import { allConcepts, markSeen, DOMAINS } from '../lib.js';
import { esc, head, bind, pct } from '../ui.js';
import { run as runSprint } from './sprint.js';
import { run as runEstimate, runBaseRate } from './estimate.js';
import { benchTable } from './progress.js';

const BACK = '#/progress';

// Held-out questions: the third apply question of cards already in review, never shown before.
function heldOut(n) {
  const s = get();
  return allConcepts().filter((c) => s.cards[c.id] && c.apply[2] && !s.seen['h:' + c.id])
    .sort((a, b) => (s.cards[a.id].introduced || 0) - (s.cards[b.id].introduced || 0)).slice(0, n);
}

function runTransfer(root, { n, onDone }) {
  const queue = heldOut(n), total = queue.length;
  let i = 0, shown = false, score = 0;
  const draw = () => {
    const c = queue[i];
    if (!c) return onDone({ score: total ? score / total : null, n: total });
    root.innerHTML = `${head('New questions', BACK, `<span class="muted small">${i + 1} of ${total}</span>`)}
      <div class="progressbar"><i style="width:${i / total * 100}%"></i></div>
      <p><span class="tag">${esc(DOMAINS[c.d] || c.d)}</span></p>
      <section class="card"><p class="muted small">You have not seen this question before. The concept is not named.</p><p class="prompt">${esc(c.apply[2].q)}</p>
      ${shown ? `<div class="answer"><h3>Model answer · ${esc(c.t)}</h3><p>${esc(c.apply[2].a)}</p></div>
          <div class="btns"><button class="btn danger" data-act="g" data-g="0">Missed</button><button class="btn ghost" data-act="g" data-g="0.5">Partial</button><button class="btn" data-act="g" data-g="1">Got it</button></div>`
        : '<textarea rows="3" placeholder="Answer in your head or type it here" aria-label="Your answer"></textarea><button class="btn" data-act="show">Show answer</button>'}
      </section>`;
  };
  bind(root, {
    show: () => { shown = true; draw(); },
    g: (el) => { score += Number(el.dataset.g); markSeen('h:' + queue[i].id); i++; shown = false; draw(); window.scrollTo(0, 0); },
  });
  draw();
}

export function render(root) {
  let stop = null;
  const out = {};
  const stages = [
    (next) => { stop = runSprint(root, { mode: 'bench', secs: 120, fixedLevel: 3, back: BACK, onDone: (r) => { out.arithRate = r.rate; out.arithAcc = r.acc; stop = null; next(); } }); },
    (next) => runBaseRate(root, { n: 4, back: BACK, onDone: (r) => { out.baseAcc = r.correct / r.n; next(); } }),
    (next) => runEstimate(root, { n: 8, back: BACK, onDone: (r) => { out.intervalHit = r.n ? r.hits / r.n : null; next(); } }),
    (next) => runTransfer(root, { n: 6, onDone: (r) => { out.transfer = r.score; out.transferN = r.n; next(); } }),
  ];
  const names = ['Two-minute arithmetic at a fixed level', 'Four base-rate problems', 'Eight estimates with 90% ranges', 'Up to six new concept questions'];
  let i = 0;
  const intro = () => {
    root.innerHTML = `${head('Benchmark', BACK)}
      <section class="card"><p>Do this rested and undisturbed, at a similar time of day each month, so the scores are comparable.</p>
        <ol>${names.map((n) => `<li>${n}</li>`).join('')}</ol><button class="btn" data-act="go">Begin</button></section>
      <section class="card"><h2>Previous results</h2>${benchTable(get().bench)}</section>`;
    bind(root, { go: step });
  };
  const between = () => {
    root.innerHTML = `${head('Benchmark', BACK)}<div class="progressbar"><i style="width:${i / stages.length * 100}%"></i></div>
      <section class="card"><p class="muted small">Part ${i + 1} of ${stages.length}</p><p class="prompt">${names[i]}</p><button class="btn" data-act="go">Start</button></section>`;
    bind(root, { go: () => stages[i](() => { i++; step(); }) });
  };
  function step() {
    window.scrollTo(0, 0);
    if (i < stages.length) return between();
    const rec = { t: Date.now(), ...out };
    update((s) => s.bench.push(rec));
    const prev = get().bench[get().bench.length - 2];
    root.innerHTML = `${head('Benchmark done', BACK)}
      <div class="tiles"><div class="tile"><b>${rec.arithRate.toFixed(1)}</b><span>sums a minute${prev ? ` (was ${prev.arithRate.toFixed(1)})` : ''}</span></div>
        <div class="tile"><b>${pct(rec.baseAcc)}</b><span>base rates${prev ? ` (was ${pct(prev.baseAcc)})` : ''}</span></div>
        <div class="tile"><b>${pct(rec.intervalHit)}</b><span>90% ranges that hit, target 90%</span></div>
        <div class="tile"><b>${rec.transfer == null ? '–' : pct(rec.transfer)}</b><span>new concept questions${rec.transferN ? ` (${rec.transferN})` : ': none available yet'}</span></div></div>
      <section class="card"><p class="muted small">One month's change is mostly noise. Look for a direction over three or more benchmarks.</p>${benchTable(get().bench)}</section>
      <a class="btn" href="#/progress">Back to progress</a>`;
    bind(root, {});
  }
  intro();
  return () => stop && stop();
}

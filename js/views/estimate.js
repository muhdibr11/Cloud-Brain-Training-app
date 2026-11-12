// Estimation with 90% ranges (facts and Fermi questions), and base-rate problems.
import { get, update } from '../store.js';
import { ESTIMATES } from '../../data/estimate.js';
import { pickItems, markSeen, markDay } from '../lib.js';
import { makeBaseRate, isCorrect } from '../arith.js';
import { parseNum, fmtNum, factorError, mean } from '../scoring.js';
import { esc, head, bind, verdict, toast, $ } from '../ui.js';

export const hitRate = (list) => (list.length ? mean(list.map((x) => (x.hit ? 1 : 0))) : null);

// run(root, {n, back, onDone}) ; onDone({hits, n, results})
export function run(root, { n = 5, back = '#/practice', onDone }) {
  const fermiN = Math.round(n * 0.4);
  const queue = [...pickItems(ESTIMATES.filter((e) => e.kind === 'fact'), n - fermiN), ...pickItems(ESTIMATES.filter((e) => e.kind === 'fermi'), fermiN)];
  const total = queue.length, results = [];
  let i = 0, res = null;

  const draw = () => {
    const it = queue[i];
    if (!it) return onDone({ hits: results.filter((r) => r.hit).length, n: total, results });
    const unit = it.unit ? ` (${it.unit})` : '';
    root.innerHTML = `${head('Estimation', back, `<span class="muted small">${i + 1} of ${total}</span>`)}
      <div class="progressbar"><i style="width:${i / total * 100}%"></i></div>
      <p><span class="tag">${it.kind === 'fermi' ? 'Fermi' : 'Quantity'}</span></p>
      <section class="card"><p class="prompt">${esc(it.q)}${esc(unit)}</p>
      ${res ? `${verdict(res.hit, res.hit ? 'Inside your range' : 'Outside your range')}
          <div class="answer"><h3>Reference value</h3><p><strong>${esc(fmtNum(it.v))}${it.unit ? ' ' + esc(it.unit) : ''}</strong>${it.note ? ` <span class="muted">(${esc(it.note)})</span>` : ''}</p>
          <p class="muted">Your range: ${esc(fmtNum(res.lo))} to ${esc(fmtNum(res.hi))}${res.factor ? `. Best guess ${esc(fmtNum(res.guess))}, out by a factor of ${res.factor.toFixed(1)}` : ''}.</p></div>
          <button class="btn" data-act="next">${i + 1 < total ? 'Next' : 'Finish'}</button>`
        : `<p class="muted small">Give a range you are 90% sure contains the answer. You can type 45k, 1.2m or 3bn.</p>
          ${it.kind === 'fermi' ? '<label class="field">Best guess<input type="text" id="guess" inputmode="text" autocomplete="off"></label>' : ''}
          <div class="row"><label class="field grow">Low<input type="text" id="lo" autocomplete="off"></label><label class="field grow">High<input type="text" id="hi" autocomplete="off"></label></div>
          <p></p><button class="btn" data-act="check">Check</button>`}
      </section>`;
  };
  bind(root, {
    check: () => {
      const it = queue[i], lo = parseNum($('#lo', root).value), hi = parseNum($('#hi', root).value);
      const guess = it.kind === 'fermi' ? parseNum($('#guess', root).value) : null;
      if (!isFinite(lo) || !isFinite(hi) || lo > hi) return toast('Enter a low and a high number, low first');
      if (it.kind === 'fermi' && !isFinite(guess)) return toast('Enter a best guess');
      res = { t: Date.now(), id: it.id, kind: it.kind, lo, hi, v: it.v, hit: it.v >= lo && it.v <= hi, guess, factor: guess ? factorError(guess, it.v) : null };
      results.push(res);
      update((s) => s.intervals.push(res), { silent: true }); markSeen(it.id);
      draw();
    },
    next: () => { i++; res = null; draw(); window.scrollTo(0, 0); },
  });
  draw();
}

export function render(root) {
  run(root, { onDone: ({ hits, n }) => {
    markDay('drill');
    const all = get().intervals, rate = hitRate(all);
    const msg = all.length < 10 ? 'Ten or more answers are needed before the rate means much.'
      : rate < 0.8 ? 'Your 90% ranges are too narrow. Widen them until about nine in ten contain the answer.'
      : rate > 0.97 ? 'Your ranges may be wider than they need to be. Try tightening them.' : 'Your ranges are close to well calibrated.';
    root.innerHTML = `${head('Estimation', '#/practice')}
      <div class="tiles"><div class="tile"><b>${hits} / ${n}</b><span>inside your range today</span></div><div class="tile"><b>${Math.round(rate * 100)}%</b><span>overall, target 90% (${all.length} answers)</span></div></div>
      <section class="card"><p>${msg}</p></section><a class="btn" href="#/today">Back to today</a>`;
  } });
}

// run base-rate problems: onDone({correct, n})
export function runBaseRate(root, { n = 3, back = '#/practice', onDone }) {
  let i = 0, p = makeBaseRate(), res = null, correct = 0;
  const draw = () => {
    if (i >= n) return onDone({ correct, n });
    root.innerHTML = `${head('Base rates', back, `<span class="muted small">${i + 1} of ${n}</span>`)}
      <div class="progressbar"><i style="width:${i / n * 100}%"></i></div>
      <section class="card"><p class="prompt">${esc(p.q)}</p>
      ${res ? `${verdict(res.ok, res.ok ? 'Close enough' : 'Not close')}
          <div class="answer"><h3>Answer: about ${p.a}%</h3><p class="muted">You said ${esc(res.x)}%.</p><ol>${p.tree.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></div>
          <button class="btn" data-act="next">${i + 1 < n ? 'Next' : 'Finish'}</button>`
        : `<p class="muted small">Picture 1,000 cases and count. An answer within 4 points is accepted.</p>
          <label class="field">Your answer (%)<input type="text" id="x" inputmode="decimal" autocomplete="off"></label><p></p><button class="btn" data-act="check">Check</button>`}
      </section>`;
  };
  bind(root, {
    check: () => {
      const x = parseFloat($('#x', root).value);
      if (!isFinite(x)) return toast('Enter a percentage');
      res = { x, ok: isCorrect(p, x) };
      if (res.ok) correct++;
      update((s) => s.baserate.push({ t: Date.now(), correct: res.ok, err: Math.abs(x - p.a) }), { silent: true });
      draw();
    },
    next: () => { i++; res = null; p = makeBaseRate(); draw(); window.scrollTo(0, 0); },
  });
  draw();
}

export function renderBaseRate(root) {
  runBaseRate(root, { onDone: ({ correct, n }) => {
    markDay('drill');
    const all = get().baserate;
    root.innerHTML = `${head('Base rates', '#/practice')}
      <div class="tiles"><div class="tile"><b>${correct} / ${n}</b><span>right today</span></div><div class="tile"><b>${Math.round(hitRate(all.map((b) => ({ hit: b.correct }))) * 100)}%</b><span>overall (${all.length} problems)</span></div></div>
      <a class="btn" href="#/today">Back to today</a>`;
  } });
}

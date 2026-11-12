// Judgement lab: decide first, then see the planted bias or flaw. Feedback includes your own pattern.
import { get, update } from '../store.js';
import { JUDGEMENT } from '../../data/judgement.js';
import { pickItems, markSeen, markDay, recordCalib, concept } from '../lib.js';
import { esc, head, bind, confChips, verdict } from '../ui.js';

export function patternHtml() {
  const by = {};
  for (const j of get().judgement) { (by[j.tag] ??= { n: 0, miss: 0 }); by[j.tag].n++; if (!j.correct) by[j.tag].miss++; }
  const rows = Object.entries(by).filter(([, v]) => v.miss).sort((a, b) => b[1].miss / b[1].n - a[1].miss / a[1].n)
    .map(([tag, v]) => `<tr><td>${esc(tag)}</td><td class="num">caught you ${v.miss} of ${v.n}</td></tr>`).join('');
  return rows ? `<table class="table"><tbody>${rows}</tbody></table>` : '<p class="muted">No misses recorded yet.</p>';
}

export function render(root) {
  // Options are shuffled each time so the position of the best answer carries no information.
  const shuffle = (n) => Array.from({ length: n }, (_, k) => [Math.random(), k]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const queue = pickItems(JUDGEMENT, 3).map((it) => ({ ...it, order: shuffle(it.options.length) }));
  const total = queue.length;
  let i = 0, sel = null, conf = null, shown = false, right = 0;

  const draw = () => {
    const it = queue[i];
    if (!it) {
      markDay('drill');
      root.innerHTML = `${head('Judgement lab', '#/practice')}<section class="card"><h2>${right} of ${total} right</h2><p class="muted small">Your pattern so far</p>${patternHtml()}</section><a class="btn" href="#/today">Back to today</a>`;
      return;
    }
    const link = it.link && concept(it.link);
    root.innerHTML = `${head('Judgement lab', '#/practice', `<span class="muted small">${i + 1} of ${total}</span>`)}
      <div class="progressbar"><i style="width:${i / total * 100}%"></i></div>
      <p><span class="tag">${it.kind === 'case' ? 'Decision' : 'Argument'}</span></p>
      <section class="card"><p>${esc(it.text)}</p><p class="prompt">${esc(it.q)}</p>
        ${it.order.map((n) => [it.options[n], n]).map(([o, n]) => `<button class="opt ${shown ? (n === it.best ? 'right' : n === sel ? 'wrong' : '') : n === sel ? 'on' : ''}" data-act="pick" data-n="${n}" ${shown ? 'disabled' : ''}>${esc(o)}</button>`).join('')}
        ${shown ? `${verdict(sel === it.best, sel === it.best ? 'Right' : 'Not the best option')}
          <div class="answer"><h3>${esc(it.tag)}</h3><p>${esc(it.why)}</p>${link ? `<p class="small">Related card: <a href="#/library/card/${it.link}">${esc(link.t)}</a></p>` : ''}</div>
          <button class="btn" data-act="next">${i + 1 < total ? 'Next' : 'Finish'}</button>`
        : `<p class="muted small" style="margin-top:12px">How sure are you?</p>${confChips(conf)}<button class="btn" data-act="check" ${sel != null && conf ? '' : 'disabled'}>Check</button>`}
      </section>`;
  };
  bind(root, {
    pick: (el) => { sel = Number(el.dataset.n); draw(); },
    conf: (el) => { conf = Number(el.dataset.v); draw(); },
    check: () => {
      const it = queue[i], ok = sel === it.best;
      if (ok) right++;
      update((s) => s.judgement.push({ t: Date.now(), id: it.id, tag: it.tag, correct: ok }), { silent: true });
      recordCalib('judgement', conf, ok); markSeen(it.id);
      shown = true; draw();
    },
    next: () => { i++; sel = null; conf = null; shown = false; draw(); window.scrollTo(0, 0); },
  });
  draw();
}

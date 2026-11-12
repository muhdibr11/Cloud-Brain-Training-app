// Card review session: new cards are studied once, due cards are retrieved apply-first.
import { get, update } from '../store.js';
import { dueCards, newCards, newAllowance, concept, markDay, recordCalib, DOMAINS } from '../lib.js';
import { schedule, nextMode, startOfDay, DAY } from '../srs.js';
import { esc, head, bind, confChips, go, $ } from '../ui.js';

const MAX_DUE = 15;

export function taskFor(c, mode) {
  if (mode === 'apply0' || mode === 'apply1') { const a = c.apply[mode === 'apply0' ? 0 : 1]; return { label: 'Apply it', q: a.q, model: a.a }; }
  if (mode === 'compare') {
    const others = (c.links || []).map(concept).filter(Boolean);
    const o = others[(get().cards[c.id]?.reps || 0) % others.length];
    if (o) return { label: 'Compare', q: `How does ${c.t} differ from ${o.t}? Describe a situation where one applies and the other does not.`, other: o };
  }
  return { label: 'Explain', q: `Explain "${c.t}" in your own words, then give an example of your own.` };
}

const facts = (c) => `<div class="answer"><h3>${esc(c.t)}</h3><p>${esc(c.def)}</p>${c.ex ? `<p class="muted"><strong>Example.</strong> ${esc(c.ex)}</p>` : ''}</div>`;

export function render(root) {
  const queue = [
    ...dueCards().slice(0, MAX_DUE).map((c) => ({ c, kind: 'due' })),
    ...newCards(newAllowance()).map((c) => ({ c, kind: 'new' })),
  ];
  const total = queue.length;
  let done = 0, stats = { got: 0, partial: 0, missed: 0, fresh: 0 }, cur = null, conf = null, revealed = false;

  const finish = () => {
    if (total) markDay('cards');
    root.innerHTML = `${head('Cards', '#/today')}
      <section class="card"><h2>${total ? 'Cards done' : 'Nothing due'}</h2>
      ${total ? `<p>${stats.got} got, ${stats.partial} partial, ${stats.missed} missed${stats.fresh ? `, ${stats.fresh} new` : ''}.</p><p class="muted small">Missed cards return tomorrow. The rest come back at growing intervals.</p>` : '<p class="muted">No cards are due and today\'s new cards are done.</p>'}
      <a class="btn" href="#/today">Back to today</a></section>`;
  };

  const draw = () => {
    if (!cur) { cur = queue.shift(); conf = null; revealed = false; }
    if (!cur) return finish();
    const { c, kind } = cur;
    const bar = `<div class="progressbar"><i style="width:${total ? done / total * 100 : 0}%"></i></div>`;
    const top = `${head('Cards', '#/today', `<span class="muted small">${done + 1} of ${total}</span>`)}${bar}<p><span class="tag">${esc(DOMAINS[c.d] || c.d)}</span></p>`;
    if (kind === 'new') {
      root.innerHTML = `${top}<section class="card"><p class="muted small">New concept</p><h2>${esc(c.t)}</h2><p>${esc(c.def)}</p>
        ${c.ex ? `<p class="muted"><strong>Example.</strong> ${esc(c.ex)}</p>` : ''}
        ${(c.links || []).length ? `<p class="small muted">Related: ${c.links.map((l) => esc(concept(l)?.t || l)).join(', ')}</p>` : ''}</section>
        <p class="muted small">Read it once. Tomorrow you will be asked to use it without seeing this.</p>
        <button class="btn" data-act="learn">Add to my reviews</button>`;
      return;
    }
    const mode = cur.mode ??= nextMode(get().cards[c.id], c);
    const task = cur.task ??= taskFor(c, mode);
    root.innerHTML = `${top}<section class="card"><p class="muted small">${task.label} · ${esc(c.t)}</p><p class="prompt">${esc(task.q)}</p>
      ${revealed ? '' : `<textarea id="ans" rows="3" placeholder="Answer in your head or type it here" aria-label="Your answer">${esc(cur.typed || '')}</textarea>
        <p class="muted small">How sure are you that you have it?</p>${confChips(conf)}
        <button class="btn" data-act="reveal" ${conf ? '' : 'disabled'}>Show answer</button>`}
      ${revealed ? `${cur.typed ? `<div class="answer"><h3>Your answer</h3><p>${esc(cur.typed)}</p></div>` : ''}
        ${task.model ? `<div class="answer"><h3>Model answer</h3><p>${esc(task.model)}</p></div>` : ''}
        ${facts(c)}${task.other ? facts(task.other) : ''}
        <p class="muted small">Grade yourself against the answer, not against how it felt.</p>
        <div class="btns"><button class="btn danger" data-act="grade" data-g="0">Missed</button><button class="btn ghost" data-act="grade" data-g="1">Partial</button><button class="btn" data-act="grade" data-g="2">Got it</button></div>` : ''}
    </section>`;
  };

  bind(root, {
    learn: () => {
      update((s) => { s.cards[cur.c.id] = { step: 0, reps: 0, lapses: 0, introduced: Date.now(), due: startOfDay() + DAY }; });
      stats.fresh++; done++; cur = null; draw();
    },
    conf: (el) => { cur.typed = $('#ans', root)?.value || ''; conf = Number(el.dataset.v); draw(); },
    input: (el) => { if (el.id === 'ans') cur.typed = el.value; },
    reveal: () => { cur.typed = $('#ans', root)?.value || ''; revealed = true; draw(); window.scrollTo(0, 0); },
    grade: (el) => {
      const g = Number(el.dataset.g), id = cur.c.id;
      update((s) => {
        s.cards[id] = schedule(s.cards[id], g);
        s.reviews.push({ t: Date.now(), id, mode: cur.mode, grade: g, conf });
      });
      recordCalib('card', conf, g === 2);
      stats[['missed', 'partial', 'got'][g]]++;
      done++; cur = null; draw(); window.scrollTo(0, 0);
    },
  });
  draw();
}

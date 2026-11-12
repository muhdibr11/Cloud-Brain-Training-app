// Forecast log: probability, base rate and rationale now; outcome and Brier score later.
import { get, update } from '../store.js';
import { brier } from '../scoring.js';
import { recordCalib } from '../lib.js';
import { foldForecast } from '../scoring.js';
import { esc, head, bind, toast, fmtDate, $ } from '../ui.js';
import { dayKey, DAY } from '../srs.js';

export const resolved = () => get().forecasts.filter((f) => f.outcome != null);

export function render(root) {
  let adding = false, openId = null;
  const draw = () => {
    const fs = get().forecasts, now = Date.now();
    const open = fs.filter((f) => f.outcome == null).sort((a, b) => new Date(a.due) - new Date(b.due));
    const done = resolved().sort((a, b) => b.resolved - a.resolved);
    const b = brier(done);
    const item = (f) => {
      const overdue = f.outcome == null && new Date(f.due).getTime() <= now;
      const isOpen = openId === f.id;
      return `<li><button data-act="open" data-id="${f.id}" aria-expanded="${isOpen}"><span class="grow">${esc(f.q)}<small>${f.outcome == null ? `Resolves ${fmtDate(new Date(f.due).getTime())}` : `${f.outcome ? 'Happened' : 'Did not happen'} · Brier ${((f.p - f.outcome) ** 2).toFixed(2)}`}</small></span>
        <span class="tag ${overdue ? 'warn' : ''}">${Math.round(f.p * 100)}%</span></button>
        ${isOpen ? `<div class="answer">
          ${f.base ? `<p><strong>Base rate.</strong> ${esc(f.base)}</p>` : ''}${f.why ? `<p><strong>Reasoning.</strong> ${esc(f.why)}</p>` : ''}
          ${f.updates?.length > 1 ? `<p class="muted small">History: ${f.updates.map((u) => `${Math.round(u.p * 100)}% on ${fmtDate(u.t)}`).join(' → ')}</p>` : ''}
          ${f.outcome == null ? `<label class="field">Update probability: <span id="up-v">${Math.round(f.p * 100)}</span>%<input type="range" id="up" min="1" max="99" value="${Math.round(f.p * 100)}"></label>
            <button class="btn small ghost" data-act="update" data-id="${f.id}">Save update</button>
            <p class="muted small" style="margin-top:12px">Resolve once the outcome is known:</p>
            <div class="btns"><button class="btn ghost" data-act="resolve" data-id="${f.id}" data-o="1">It happened</button><button class="btn ghost" data-act="resolve" data-id="${f.id}" data-o="0">It did not</button></div>` : ''}
          <button class="btn danger small" data-act="del" data-id="${f.id}" style="margin-top:8px">Delete</button></div>` : ''}</li>`;
    };
    root.innerHTML = `${head('Forecasts', null, adding ? '' : '<button class="btn small" data-act="add">New</button>')}
      ${adding ? `<section class="card"><h2>New forecast</h2>
        <label class="field">Question with a clear yes or no outcome<textarea id="q" rows="2" placeholder="Will the Bank of England cut rates at its next meeting?"></textarea></label>
        <label class="field">Base rate or reference class<input type="text" id="base" placeholder="How often has this kind of thing happened?"></label>
        <label class="field">Probability it happens: <span id="p-v">50</span>%<input type="range" id="p" min="1" max="99" value="50"></label>
        <label class="field">Reasoning<textarea id="why" rows="2" placeholder="What moves you away from the base rate?"></textarea></label>
        <label class="field">Resolves by<input type="date" id="due" value="${dayKey(now + 30 * DAY)}"></label>
        <p></p><div class="btns"><button class="btn ghost" data-act="cancel">Cancel</button><button class="btn" data-act="save">Save</button></div></section>` : ''}
      <div class="tiles"><div class="tile"><b>${b == null ? '–' : b.toFixed(2)}</b><span>Brier score (${done.length} resolved)</span></div><div class="tile"><b>${open.length}</b><span>open forecasts</span></div></div>
      <p class="muted small">Brier score: 0 is perfect, 0.25 is what always saying 50% earns. Lower is better.</p>
      ${open.length ? `<h3>Open</h3><section class="card"><ul class="list">${open.map(item).join('')}</ul></section>` : adding ? '' : '<section class="card"><p>Log a prediction about something you follow: a rate decision, an election, a data release, a deal.</p><p class="muted small">State the base rate first, then adjust. Small, frequent updates beat big swings.</p></section>'}
      ${done.length ? `<h3>Resolved</h3><section class="card"><ul class="list">${done.map(item).join('')}</ul></section>` : ''}`;
  };
  const find = (id) => get().forecasts.find((f) => f.id === id);
  bind(root, {
    add: () => { adding = true; draw(); },
    cancel: () => { adding = false; draw(); },
    input: (el) => { if (el.id === 'p') $('#p-v', root).textContent = el.value; if (el.id === 'up') $('#up-v', root).textContent = el.value; },
    save: () => {
      const q = $('#q', root).value.trim(), p = Number($('#p', root).value) / 100, due = $('#due', root).value;
      if (q.length < 8) return toast('Write the question out in full');
      if (!due) return toast('Choose a date by which it resolves');
      update((s) => s.forecasts.push({ id: 'f' + Date.now().toString(36), q, p, base: $('#base', root).value.trim(), why: $('#why', root).value.trim(), created: Date.now(), due, updates: [{ t: Date.now(), p }], outcome: null }));
      adding = false; toast('Forecast logged'); draw();
    },
    open: (el) => { openId = openId === el.dataset.id ? null : el.dataset.id; draw(); },
    update: (el) => { const p = Number($('#up', root).value) / 100; update((s) => { const f = s.forecasts.find((x) => x.id === el.dataset.id); f.p = p; f.updates.push({ t: Date.now(), p }); }); toast('Updated'); draw(); },
    resolve: (el) => {
      const o = Number(el.dataset.o);
      update((s) => { const f = s.forecasts.find((x) => x.id === el.dataset.id); f.outcome = o; f.resolved = Date.now(); });
      const fold = foldForecast(find(el.dataset.id)); recordCalib('forecast', fold.conf, fold.hit);
      toast('Resolved'); draw();
    },
    del: (el) => { if (!confirm('Delete this forecast?')) return; update((s) => { s.forecasts = s.forecasts.filter((x) => x.id !== el.dataset.id); }); openId = null; draw(); },
  });
  draw();
}

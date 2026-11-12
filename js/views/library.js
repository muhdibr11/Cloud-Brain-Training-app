import { get, update } from '../store.js';
import { allConcepts, concept, DOMAINS, cardsPrompt, parseCards } from '../lib.js';
import { GAPS } from '../srs.js';
import { esc, head, bind, go, toast, copyText, fmtDate, $ } from '../ui.js';

const status = (card) => {
  if (!card) return ['New', ''];
  if (card.due <= Date.now()) return ['Due', 'due'];
  return [card.step >= 4 ? 'Strong' : 'Learning', card.step >= 4 ? 'done' : ''];
};

export function list(root) {
  let q = '';
  const draw = () => {
    const s = get(), all = allConcepts();
    const match = (c) => !q || (c.t + ' ' + c.def).toLowerCase().includes(q);
    const groups = Object.entries(DOMAINS).map(([d, name]) => {
      const cs = all.filter((c) => c.d === d && match(c));
      if (!cs.length) return '';
      return `<h3>${esc(name)}</h3><section class="card"><ul class="list">${cs.map((c) => {
        const [label, cls] = status(s.cards[c.id]);
        return `<li><a href="#/library/card/${encodeURIComponent(c.id)}"><span class="grow">${esc(c.t)}</span><span class="tag ${cls}">${label}</span><span class="chev" aria-hidden="true">›</span></a></li>`;
      }).join('')}</ul></section>`;
    }).join('');
    $('#groups', root).innerHTML = groups || '<p class="muted">No cards match.</p>';
  };
  const learned = Object.keys(get().cards).length;
  root.innerHTML = `${head('Library', null, '<a class="btn small ghost" href="#/library/edit">Add</a>')}
    <p class="muted small">${learned} of ${allConcepts().length} concepts in review. <a href="#/library/import">Import cards</a></p>
    <input type="text" id="q" placeholder="Search concepts" aria-label="Search concepts" autocomplete="off">
    <div id="groups"></div>`;
  bind(root, { input: (el) => { if (el.id === 'q') { q = el.value.trim().toLowerCase(); draw(); } } });
  draw();
}

export function card(root, id) {
  const c = concept(id);
  if (!c) return go('#/library');
  const st = get().cards[id];
  const isCustom = get().custom.some((x) => x.id === id);
  const sched = !st ? 'Not started. It will be introduced in a daily session.'
    : `Next review ${fmtDate(st.due)} · step ${Math.min(st.step, GAPS.length)} of ${GAPS.length} · ${st.reps} review${st.reps === 1 ? '' : 's'}, ${st.lapses} missed`;
  root.innerHTML = `${head(c.t, '#/library', isCustom ? `<a class="btn small ghost" href="#/library/edit/${encodeURIComponent(id)}">Edit</a>` : '')}
    <p><span class="tag">${esc(DOMAINS[c.d] || c.d)}</span></p>
    <section class="card"><p>${esc(c.def)}</p>${c.ex ? `<p class="muted"><strong>Example.</strong> ${esc(c.ex)}</p>` : ''}</section>
    ${(c.links || []).length ? `<h3>Related</h3><section class="card"><ul class="list">${c.links.map((l) => { const o = concept(l); return o ? `<li><a href="#/library/card/${encodeURIComponent(l)}"><span class="grow">${esc(o.t)}<small>${esc(DOMAINS[o.d] || '')}</small></span><span class="chev">›</span></a></li>` : ''; }).join('')}</ul></section>` : ''}
    <h3>Schedule</h3><p class="muted small">${esc(sched)}</p>
    <p class="muted small">Apply-it questions are hidden here so that reviews stay a real test.</p>
    ${st ? '<button class="btn ghost" data-act="now">Review this card today</button>' : '<button class="btn ghost" data-act="start">Start learning this card</button>'}`;
  bind(root, {
    now: () => { update((s) => { s.cards[id].due = Date.now() - 1; }); toast('Added to today\'s cards'); card(root, id); },
    start: () => { update((s) => { s.cards[id] = { step: 0, reps: 0, lapses: 0, introduced: Date.now(), due: Date.now() - 1 }; }); toast('Added to today\'s cards'); card(root, id); },
  });
}

export function edit(root, id) {
  const existing = id ? get().custom.find((c) => c.id === id) : null;
  const c = existing || { t: '', d: 'finance', def: '', ex: '', links: [], apply: [{ q: '', a: '' }, { q: '', a: '' }, { q: '', a: '' }] };
  const ap = [0, 1, 2].map((i) => c.apply[i] || { q: '', a: '' });
  root.innerHTML = `${head(existing ? 'Edit card' : 'New card', '#/library')}
    <p class="muted small">Writing your own cards is itself good practice. The third question is held back for benchmarks.</p>
    <label class="field">Title<input type="text" id="t" value="${esc(c.t)}"></label>
    <label class="field">Domain<select id="d">${Object.entries(DOMAINS).map(([k, v]) => `<option value="${k}" ${c.d === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <label class="field">Definition<textarea id="def" rows="3">${esc(c.def)}</textarea></label>
    <label class="field">Example<textarea id="ex" rows="2">${esc(c.ex)}</textarea></label>
    <label class="field">Related concepts<select id="links" multiple size="5">${allConcepts().filter((o) => o.id !== id).map((o) => `<option value="${esc(o.id)}" ${(c.links || []).includes(o.id) ? 'selected' : ''}>${esc(o.t)}</option>`).join('')}</select></label>
    ${ap.map((a, i) => `<label class="field">Apply-it question ${i + 1}<textarea id="q${i}" rows="2">${esc(a.q)}</textarea></label><label class="field">Model answer ${i + 1}<textarea id="a${i}" rows="2">${esc(a.a)}</textarea></label>`).join('')}
    <p></p><button class="btn" data-act="save">Save card</button>
    ${existing ? '<button class="btn danger" data-act="del">Delete card</button>' : ''}`;
  bind(root, {
    save: () => {
      const v = (k) => $('#' + k, root).value.trim();
      if (!v('t') || !v('def')) return toast('A card needs a title and a definition');
      const card = {
        id: existing?.id || 'u-' + v('t').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36),
        t: v('t'), d: v('d'), def: v('def'), ex: v('ex'),
        links: [...$('#links', root).selectedOptions].map((o) => o.value),
        apply: [0, 1, 2].map((i) => ({ q: v('q' + i), a: v('a' + i) })).filter((x) => x.q),
      };
      update((s) => { const i = s.custom.findIndex((x) => x.id === card.id); if (i >= 0) s.custom[i] = card; else s.custom.push(card); });
      toast('Card saved'); go('#/library/card/' + encodeURIComponent(card.id));
    },
    del: () => {
      if (!confirm('Delete this card and its review history?')) return;
      update((s) => { s.custom = s.custom.filter((x) => x.id !== existing.id); delete s.cards[existing.id]; });
      go('#/library');
    },
  });
}

export function importCards(root) {
  root.innerHTML = `${head('Import cards', '#/library')}
    <section class="card"><h2>1. Ask a chat app for cards</h2>
      <label class="field">Domain<select id="d">${Object.entries(DOMAINS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <p></p><button class="btn" data-act="copy">Copy the request</button></section>
    <section class="card"><h2>2. Paste the reply</h2>
      <textarea id="in" rows="6" placeholder="Paste the JSON reply here" aria-label="Pasted cards"></textarea>
      <button class="btn" data-act="add">Add cards</button>
      <p class="muted small">Read imported cards before trusting them: chat apps make factual mistakes.</p></section>`;
  bind(root, {
    copy: () => { const d = $('#d', root).value; copyText(cardsPrompt(DOMAINS[d], allConcepts().filter((c) => c.d === d).map((c) => c.t))); },
    add: () => {
      try {
        const cards = parseCards($('#in', root).value, $('#d', root).value);
        update((s) => s.custom.push(...cards));
        toast(`${cards.length} card${cards.length > 1 ? 's' : ''} added`); go('#/library');
      } catch (e) { toast(e.message); }
    },
  });
}

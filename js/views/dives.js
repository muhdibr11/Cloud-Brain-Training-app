// Deep Dives: a broad question researched and written up (or presented), then critiqued against a rubric.
import { get, update } from '../store.js';
import { DIVE_PROMPTS, DIVE_RUBRIC, DIVE_CHECKLIST } from '../../data/prompts.js';
import { concept, wordCount, avgScore } from '../lib.js';
import { esc, head, bind, go, toast, checklist, readChecks, critiquePanel, critiqueHandlers, scoresHtml, fmtDate, fmtTime, $ } from '../ui.js';
import { metricsHtml } from './speaking.js';

const TALK = 180;

function suggestion(skip = 0) {
  const used = new Set(get().dives.map((d) => d.pid));
  const free = DIVE_PROMPTS.filter((p) => !used.has(p.id));
  const pool = free.length ? free : DIVE_PROMPTS;
  return pool[skip % pool.length];
}

export function list(root) {
  let skip = 0;
  const draw = () => {
    const s = get(), sug = suggestion(skip);
    const row = (d) => `<li><a href="#/practice/dives/${d.id}"><span class="grow">${esc(d.prompt)}<small>${d.done ? `Finished ${fmtDate(d.done)}${d.scores ? ` · ${avgScore(d.scores).toFixed(1)} / 5` : ''}` : `Started ${fmtDate(d.started)}`}</small></span><span class="chev">›</span></a></li>`;
    const open = s.dives.filter((d) => !d.done), done = s.dives.filter((d) => d.done).reverse();
    root.innerHTML = `${head('Deep Dives', '#/practice')}
      <section class="card"><p class="muted small">Suggested question</p><p class="prompt">${esc(sug.t)}</p>
        <p class="small muted">Draws on: ${sug.links.map((l) => esc(concept(l)?.t || l)).join(', ')}</p>
        <div class="btns"><button class="btn ghost" data-act="other">Another</button><button class="btn" data-act="start">Start</button></div></section>
      <section class="card"><h2>Your own question</h2><input type="text" id="own" placeholder="A broad question you want to understand" aria-label="Your own question"><p></p><button class="btn ghost" data-act="own">Start with this</button></section>
      ${open.length ? `<h3>In progress</h3><section class="card"><ul class="list">${open.map(row).join('')}</ul></section>` : ''}
      ${done.length ? `<h3>Finished</h3><section class="card"><ul class="list">${done.map(row).join('')}</ul></section>` : ''}`;
  };
  const create = (prompt, links, pid) => {
    const d = { id: 'dv' + Date.now().toString(36), pid, prompt, links, started: Date.now(), framings: '', notes: '', outline: '', mode: 'essay', essay: '', talkSecs: 0, checks: [], scores: null, done: null };
    update((s) => s.dives.push(d)); go('#/practice/dives/' + d.id);
  };
  bind(root, {
    other: () => { skip++; draw(); },
    start: () => { const p = suggestion(skip); create(p.t, p.links, p.id); },
    own: () => { const t = $('#own', root).value.trim(); if (t.length < 10) return toast('Write the question out in full'); create(t, [], null); },
  });
  draw();
}

export function dive(root, id) {
  const d = get().dives.find((x) => x.id === id);
  if (!d) return go('#/practice/dives');
  let timer = null, left = TALK, started = 0;
  const save = (patch) => update((s) => Object.assign(s.dives.find((x) => x.id === id), patch), { silent: true });
  const area = (k, rows, ph) => `<textarea id="${k}" data-k="${k}" rows="${rows}" placeholder="${esc(ph)}" aria-label="${esc(ph)}">${esc(d[k] || '')}</textarea>`;

  const draw = () => {
    root.innerHTML = `${head('Deep Dive', '#/practice/dives')}
      <section class="card"><p class="prompt">${esc(d.prompt)}</p>
        ${d.links.length ? `<p class="small muted">Concepts to draw on: ${d.links.map((l) => concept(l) ? `<a href="#/library/card/${l}">${esc(concept(l).t)}</a>` : '').filter(Boolean).join(', ')}</p>` : ''}</section>
      <section class="card"><h2>1. Five framings</h2><p class="muted small">Before researching, write five different ways to approach the question. Then pick one.</p>${area('framings', 5, 'Five angles, one per line')}</section>
      <section class="card"><h2>2. Research notes</h2><p class="muted small">Facts, figures and where each came from. Note what would change your mind.</p>${area('notes', 7, 'Notes and sources')}</section>
      <section class="card"><h2>3. Outline</h2><p class="muted small">Your answer in one sentence, three supporting points, and the strongest objection.</p>${area('outline', 5, 'Answer, three points, objection')}</section>
      <section class="card"><h2>4. Produce it</h2>
        <div class="chips three" style="grid-template-columns:1fr 1fr"><button class="chip ${d.mode === 'essay' ? 'on' : ''}" data-act="mode" data-m="essay">Mini essay<small>400–600 words</small></button><button class="chip ${d.mode === 'talk' ? 'on' : ''}" data-act="mode" data-m="talk">Presentation<small>3 minutes, dictated</small></button></div>
        ${d.mode === 'talk' ? `<p class="muted small">Start the clock, tap the box, then tap the microphone on the keyboard and present.</p><div class="row"><button class="btn small ghost" data-act="clock" id="clockbtn">Start 3:00</button><span class="timer grow" id="clock">${d.talkSecs ? 'Spoke for ' + fmtTime(d.talkSecs) : ''}</span></div><p></p>` : ''}
        ${area('essay', 12, d.mode === 'essay' ? 'Write the essay here' : 'Dictated presentation')}
        <p class="muted small" id="count">${wordCount(d.essay)} words</p>
        <div id="metrics">${d.mode === 'talk' && d.talkSecs ? metricsHtml(d.essay, d.talkSecs) : ''}</div></section>
      <section class="card"><h2>5. Check it yourself</h2>${checklist(DIVE_CHECKLIST, d.checks)}</section>
      ${critiquePanel(d.scores ? { scores: d.scores, weakest: d.weakest, fix: d.fix, rubric: DIVE_RUBRIC } : null)}
      <section class="card"><h2>6. Finish</h2><p class="muted small">If the dive taught you an idea worth keeping, add it to the library so it gets reviewed.</p>
        <a class="btn ghost" href="#/library/edit">Add a concept card</a>
        <button class="btn" data-act="finish">${d.done ? 'Finished ' + fmtDate(d.done) : 'Mark as finished'}</button>
        <button class="btn danger" data-act="del">Delete this dive</button></section>`;
  };

  const stopClock = () => { if (!timer) return; clearInterval(timer); timer = null; d.talkSecs = Math.max(1, Math.round((Date.now() - started) / 1000)); save({ talkSecs: d.talkSecs }); draw(); };
  bind(root, {
    input: (el) => {
      const k = el.dataset.k; if (!k) return;
      d[k] = el.value; save({ [k]: el.value });
      if (k === 'essay') $('#count', root).textContent = `${wordCount(el.value)} words`;
    },
    change: (el) => { if (el.dataset.check != null) { d.checks = readChecks(root, DIVE_CHECKLIST.length); save({ checks: d.checks }); } },
    mode: (el) => { d.mode = el.dataset.m; save({ mode: d.mode }); draw(); },
    clock: () => {
      if (timer) return stopClock();
      started = Date.now(); left = TALK; $('#clockbtn', root).textContent = 'Stop'; $('#essay', root).focus();
      timer = setInterval(() => { left--; const c = $('#clock', root); if (c) c.textContent = fmtTime(left); if (left <= 0) stopClock(); }, 1000);
    },
    finish: () => { if (wordCount(d.essay) < 50) return toast('Write or present it first'); d.done = d.done || Date.now(); save({ done: d.done }); toast('Dive finished'); go('#/practice/dives'); },
    del: () => { if (!confirm('Delete this dive?')) return; update((s) => { s.dives = s.dives.filter((x) => x.id !== id); }); go('#/practice/dives'); },
    ...critiqueHandlers(root, () => ({ kind: d.mode === 'essay' ? 'mini essay' : 'transcript of a three-minute presentation', task: d.prompt, text: d.essay, rubric: DIVE_RUBRIC, concepts: d.links.map((l) => concept(l)?.t).filter(Boolean) }),
      (res) => { Object.assign(d, res); save(res); }),
  });
  draw();
  return () => clearInterval(timer);
}

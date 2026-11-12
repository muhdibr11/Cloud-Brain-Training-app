// Writing drills: a one-paragraph brief from messy notes, or a 100-word summary of your own source.
import { get, update } from '../store.js';
import { BRIEFS, BRIEF_CHECKLIST, WRITING_RUBRIC } from '../../data/prompts.js';
import { pickItems, markSeen, markDay, wordCount, avgScore } from '../lib.js';
import { esc, head, bind, toast, checklist, readChecks, critiquePanel, critiqueHandlers, scoresHtml, fmtTime, $ } from '../ui.js';

const SUMMARY_TASK = 'Summarise the source in no more than 100 words for a busy reader who will not read the original. Lead with the main point.';
const SUMMARY_CHECKS = ['The main point is the first sentence', 'I kept the one or two figures that matter', 'Nothing here is my own opinion', 'A reader could repeat the argument from this alone', 'It is 100 words or fewer'];

export function render(root) {
  let stage = 'choose', kind = null, brief = null, source = '', text = '', text2 = '', started = 0, timer = null, rec = null;
  const limit = () => (kind === 'brief' ? 80 : 100);
  const task = () => (kind === 'brief' ? brief.task : SUMMARY_TASK);
  const checks = () => (kind === 'brief' ? BRIEF_CHECKLIST : SUMMARY_CHECKS);

  const draw = () => {
    if (stage === 'choose') {
      root.innerHTML = `${head('Writing', '#/practice')}
        <section class="card"><h2>One-paragraph brief</h2><p class="muted">Turn messy notes into a recommendation someone could act on. About 80 words.</p><button class="btn" data-act="brief">Start a brief</button></section>
        <section class="card"><h2>100-word summary</h2><p class="muted">Paste something you are reading anyway: a report, an article, a long email.</p>
          <textarea id="src" rows="5" placeholder="Paste the source text" aria-label="Source text"></textarea><button class="btn ghost" data-act="summary">Summarise this</button></section>`;
    } else if (stage === 'write') {
      const n = wordCount(text);
      root.innerHTML = `${head(kind === 'brief' ? 'Brief' : 'Summary', '#/practice', `<span class="timer" id="clock">${fmtTime((Date.now() - started) / 1000)}</span>`)}
        <section class="card"><p><strong>${esc(task())}</strong></p><div class="source">${esc(kind === 'brief' ? brief.notes : source)}</div></section>
        <p class="muted small">Plan before you write: decide the answer, then the two or three facts that carry it.</p>
        <textarea id="text" rows="8" placeholder="Write here" aria-label="Your text">${esc(text)}</textarea>
        <p class="muted small" id="count">${n} words · limit ${limit()}</p>
        <button class="btn" data-act="done">Finished</button>`;
    } else if (stage === 'review') {
      root.innerHTML = `${head('Review', '#/practice')}
        <section class="card"><h2>Your text</h2><p>${esc(text)}</p><p class="muted small">${rec.words} words in ${fmtTime(rec.secs)}</p></section>
        <section class="card"><h2>Check it yourself first</h2>${checklist(checks(), rec.checks)}</section>
        ${kind === 'brief' ? `<section class="card"><h2>Model answer</h2><p>${esc(brief.model)}</p><p class="muted small">One good version, not the only one. Compare what it leads with and what it leaves out.</p></section>` : ''}
        ${critiquePanel()}
        <section class="card"><h2>Now rewrite it</h2><p class="muted">Revising against feedback is where most of the gain comes from. Use the critique if you have one, otherwise the checklist${kind === 'brief' ? ' and the model answer' : ''}.</p><button class="btn" data-act="rewrite">Rewrite</button></section>
        <a class="btn ghost" href="#/today">Finish without rewriting</a>`;
    } else if (stage === 'rewrite') {
      const missed = checks().filter((_, i) => !rec.checks?.[i]);
      const n = wordCount(text2);
      root.innerHTML = `${head('Rewrite', '#/practice')}
        <section class="card"><h2>What to fix</h2>
          ${rec.weakest ? `<p><strong>Weakest point.</strong> ${esc(rec.weakest)}</p>` : ''}${rec.fix ? `<p><strong>Fix.</strong> ${esc(rec.fix)}</p>` : ''}
          ${missed.length ? `<p class="muted small">Checklist items you did not tick:</p><ul>${missed.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
          ${!rec.weakest && !missed.length ? '<p class="muted">No critique pasted and every box ticked. Cut ten words and sharpen the first sentence.</p>' : ''}</section>
        <details class="card"><summary>Task and source</summary><p><strong>${esc(task())}</strong></p><div class="source">${esc(kind === 'brief' ? brief.notes : source)}</div></details>
        <textarea id="text2" rows="8" aria-label="Your rewrite">${esc(text2)}</textarea>
        <p class="muted small" id="count2">${n} words · limit ${limit()}</p>
        <button class="btn" data-act="done2">Finished rewriting</button>`;
    } else {
      const a = avgScore(rec.scores), b = avgScore(rec.scores2);
      root.innerHTML = `${head('Before and after', '#/practice')}
        <section class="card"><h2>First version</h2><p class="muted">${esc(text)}</p><p class="muted small">${rec.words} words${a ? ` · ${a.toFixed(1)} / 5` : ''}</p></section>
        <section class="card"><h2>Rewrite</h2><p>${esc(text2)}</p><p class="muted small">${rec.rewriteWords} words</p></section>
        ${critiquePanel(rec.scores2 ? { scores: rec.scores2, weakest: rec.weakest2, fix: rec.fix2, rubric: WRITING_RUBRIC } : null)}
        <div id="delta">${a && b ? `<section class="card"><p><strong>Average score ${a.toFixed(1)} → ${b.toFixed(1)}.</strong></p></section>` : ''}</div>
        <a class="btn" href="#/today">Back to today</a>`;
    }
  };

  const save = (patch) => update((s) => { Object.assign(rec, patch); const i = s.writing.findIndex((w) => w.t === rec.t); if (i >= 0) s.writing[i] = rec; else s.writing.push(rec); }, { silent: true });
  const begin = () => { stage = 'write'; text = ''; started = Date.now(); clearInterval(timer); timer = setInterval(() => { const c = $('#clock', root); if (c) c.textContent = fmtTime((Date.now() - started) / 1000); }, 1000); draw(); window.scrollTo(0, 0); };

  bind(root, {
    brief: () => { kind = 'brief'; brief = pickItems(BRIEFS, 1)[0]; begin(); },
    summary: () => { source = $('#src', root).value.trim(); if (wordCount(source) < 60) return toast('Paste a longer source: at least 60 words'); kind = 'summary'; begin(); },
    input: (el) => {
      if (el.id === 'text') { text = el.value; const n = wordCount(text); const c = $('#count', root); c.textContent = `${n} words · limit ${limit()}${n > limit() ? ' · over the limit' : ''}`; }
      if (el.id === 'text2') { text2 = el.value; const n = wordCount(text2); $('#count2', root).textContent = `${n} words · limit ${limit()}${n > limit() ? ' · over the limit' : ''}`; }
    },
    change: (el) => { if (el.dataset.check != null && rec) save({ checks: readChecks(root, checks().length) }); },
    rewrite: () => { text2 = text2 || text; stage = 'rewrite'; draw(); window.scrollTo(0, 0); },
    done2: () => {
      if (text2.trim() === text.trim()) return toast('Change something first');
      save({ rewrite: text2, rewriteWords: wordCount(text2) }); stage = 'review2'; draw(); window.scrollTo(0, 0);
    },
    done: () => {
      if (wordCount(text) < 15) return toast('Write at least a few sentences');
      clearInterval(timer);
      rec = { t: Date.now(), kind, id: brief?.id || null, text, words: wordCount(text), secs: Math.round((Date.now() - started) / 1000), checks: [], scores: null };
      save({}); if (brief) markSeen(brief.id); markDay('drill');
      stage = 'review'; draw(); window.scrollTo(0, 0);
    },
    // The same panel serves both rounds: the first version, then the rewrite.
    ...critiqueHandlers(root, () => ({ kind: kind === 'brief' ? 'one-paragraph brief' : '100-word summary', task: task() + '\n\nSOURCE MATERIAL\n' + (kind === 'brief' ? brief.notes : source), text: stage === 'review2' ? text2 : text, rubric: WRITING_RUBRIC }),
      (res) => {
        if (stage !== 'review2') return save({ scores: res.scores, weakest: res.weakest, fix: res.fix });
        save({ scores2: res.scores, weakest2: res.weakest, fix2: res.fix });
        const a = avgScore(rec.scores), b = avgScore(rec.scores2);
        if (a && b) $('#delta', root).innerHTML = `<section class="card"><p><strong>Average score ${a.toFixed(1)} → ${b.toFixed(1)}.</strong></p></section>`;
      }),
  });
  draw();
  return () => clearInterval(timer);
}

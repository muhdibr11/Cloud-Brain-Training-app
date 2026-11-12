import { get } from '../store.js';
import { dueCards, newCards, newAllowance, today, todaysDrill, benchDue, forecastsToResolve, lastDive, introducedCount } from '../lib.js';
import { esc, head } from '../ui.js';
import { DAY, dayKey } from '../srs.js';
import { streak } from '../scoring.js';
import { suggested } from './sprint.js';
import { TYPES } from '../arith.js';

const step = (n, title, sub, href, done, cta) => `<li><a href="${href}">
  <span class="tag ${done ? 'done' : 'due'}">${done ? '✓' : n}</span>
  <span class="grow">${esc(title)}<small>${esc(sub)}</small></span>
  <span class="chev" aria-hidden="true">${done ? '' : '›'}</span><span class="sr">${done ? 'Done' : cta}</span></a></li>`;

export function render(root) {
  const s = get(), t = today();
  const due = dueCards().length, fresh = newCards(newAllowance()).length;
  const drill = todaysDrill();
  const sug = suggested(), mins = Math.round(s.settings.sprintSecs / 60);
  const arith = sug.mode === 'learn' ? ['Arithmetic: learn a method', `${TYPES[sug.learnType].name}, untimed`] : sug.mode === 'applied' ? ['Arithmetic: applied sprint', `${mins} minutes of short business problems`] : ['Arithmetic: mixed sprint', `${mins} minutes, more of your weakest types`];
  const days = Object.keys(s.days);
  const run = streak(days, Date.now(), dayKey);
  const allDone = t.cards && t.sprint && t.drill;
  const cardSub = due + fresh === 0 ? (t.cards ? 'Done for today' : 'Nothing due today') : `${due} due${fresh ? `, ${fresh} new` : ''}`;

  const extras = [];
  const resolve = forecastsToResolve().length;
  if (resolve) extras.push(`<li><a href="#/forecasts"><span class="grow">${resolve} forecast${resolve > 1 ? 's' : ''} to resolve<small>Score them while the reasoning is fresh</small></span><span class="chev">›</span></a></li>`);
  if (Date.now() - lastDive() > 7 * DAY) extras.push(`<li><a href="#/practice/dives"><span class="grow">Weekly Deep Dive<small>${lastDive() ? 'Over a week since your last one' : 'Research a question and write it up'}</small></span><span class="chev">›</span></a></li>`);
  if (benchDue() && introducedCount() >= 6) extras.push(`<li><a href="#/progress/bench"><span class="grow">Monthly benchmark<small>About 10 minutes, on new questions</small></span><span class="chev">›</span></a></li>`);

  root.innerHTML = `${head('Today', null, `<span class="tag ${run ? 'done' : ''}">${run} day${run === 1 ? '' : 's'}</span>`)}
    ${allDone ? '<section class="card"><h2>Session complete</h2><p class="muted">Three parts done. Come back tomorrow, or pick anything from Practice.</p></section>' : ''}
    <section class="card"><h2>Daily session</h2><p class="muted small">About 15 minutes.</p>
      <ul class="list">
        ${step(1, 'Concept cards', cardSub, '#/review', t.cards || due + fresh === 0, 'Start')}
        ${step(2, arith[0], arith[1], '#/practice/sprint', t.sprint, 'Start')}
        ${step(3, drill.t, drill.d, '#/practice/' + drill.k, t.drill, 'Start')}
      </ul>
    </section>
    ${extras.length ? `<section class="card"><h2>Also due</h2><ul class="list">${extras.join('')}</ul></section>` : ''}
    ${introducedCount() === 0 ? '<section class="card"><h2>How this works</h2><p>Cards ask you to use an idea before showing it. Drills are real tasks: arithmetic you need, decisions, estimates, short briefs and spoken answers. Everything is scored so you can see what changes.</p><p class="muted small">Your data stays on this phone. Back it up from Progress → Settings.</p></section>' : ''}`;
}

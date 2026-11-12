import { load, flushNow } from './store.js';
import { $, $$ } from './ui.js';
import * as today from './views/today.js';
import * as library from './views/library.js';
import * as review from './views/review.js';
import * as practice from './views/practice.js';
import * as sprint from './views/sprint.js';
import * as judgement from './views/judgement.js';
import * as estimate from './views/estimate.js';
import * as writing from './views/writing.js';
import * as speaking from './views/speaking.js';
import * as dives from './views/dives.js';
import * as forecasts from './views/forecasts.js';
import * as progress from './views/progress.js';
import * as bench from './views/bench.js';

// route -> [tab, render, focus mode (hides the tab bar)]
const routes = [
  [/^\/today$/, 'today', today.render],
  [/^\/review$/, 'today', review.render, true],
  [/^\/library$/, 'library', library.list],
  [/^\/library\/card\/(.+)$/, 'library', library.card],
  [/^\/library\/edit(?:\/(.+))?$/, 'library', library.edit],
  [/^\/library\/import$/, 'library', library.importCards],
  [/^\/practice$/, 'practice', practice.render],
  [/^\/practice\/sprint$/, 'practice', sprint.render, true],
  [/^\/practice\/judgement$/, 'practice', judgement.render, true],
  [/^\/practice\/estimate$/, 'practice', estimate.render, true],
  [/^\/practice\/baserate$/, 'practice', estimate.renderBaseRate, true],
  [/^\/practice\/writing$/, 'practice', writing.render, true],
  [/^\/practice\/speaking$/, 'practice', speaking.render, true],
  [/^\/practice\/dives$/, 'practice', dives.list],
  [/^\/practice\/dives\/(.+)$/, 'practice', dives.dive, true],
  [/^\/forecasts$/, 'forecasts', forecasts.render],
  [/^\/progress$/, 'progress', progress.render],
  [/^\/progress\/bench$/, 'progress', bench.render, true],
  [/^\/settings$/, 'progress', progress.settings],
];

let cleanup = null;
function route() {
  const path = location.hash.replace(/^#/, '') || '/today';
  const view = $('#view');
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  view.onclick = view.oninput = view.onchange = null;
  for (const [re, tab, render, focus] of routes) {
    const m = path.match(re);
    if (!m) continue;
    $$('#tabs a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    document.body.classList.toggle('focus', !!focus);
    cleanup = render(view, ...m.slice(1).map((x) => (x ? decodeURIComponent(x) : x)));
    window.scrollTo(0, 0);
    return;
  }
  location.hash = '#/today';
}

load().then(() => {
  window.addEventListener('hashchange', route);
  route();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) flushNow(); });
window.addEventListener('pagehide', () => flushNow());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

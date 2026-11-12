import { get, update, exportJson, importJson, reset } from '../store.js';
import { allConcepts, benchDue, avgScore } from '../lib.js';
import { calibrationBins, meanForecastBrier, streak, mean } from '../scoring.js';
import { dayKey, DAY } from '../srs.js';
import { esc, head, bind, toast, calibrationChart, sparkline, fmtDate, pct, copyText, $ } from '../ui.js';
import { patternHtml } from './judgement.js';
import { hitRate } from './estimate.js';
import { resolved } from './forecasts.js';

const tile = (v, label) => `<div class="tile"><b>${v}</b><span>${label}</span></div>`;
const rate = (x) => x.correct / (x.dur / 60);

export function benchTable(b) {
  if (!b.length) return '<p class="muted">No benchmark yet.</p>';
  return `<div class="scroll-x"><table class="table"><thead><tr><th>Date</th><th class="num">Sums/min</th><th class="num">Base rates</th><th class="num">90% ranges</th><th class="num">New questions</th></tr></thead><tbody>
    ${b.map((x) => `<tr><td>${fmtDate(x.t)}</td><td class="num">${x.arithRate.toFixed(1)}</td><td class="num">${pct(x.baseAcc)}</td><td class="num">${pct(x.intervalHit)}</td><td class="num">${x.transfer == null ? '–' : pct(x.transfer)}</td></tr>`).join('')}</tbody></table></div>`;
}

export function render(root) {
  const s = get(), now = Date.now();
  const recent = s.reviews.filter((r) => now - r.t < 30 * DAY);
  const retention = recent.length ? mean(recent.map((r) => (r.grade === 2 ? 1 : 0))) : null;
  const sprints = s.arith.sessions.filter((x) => !x.bench && x.mode !== 'applied');
  const done = resolved();
  const scored = [...s.writing, ...s.speaking, ...s.dives].filter((x) => x.scores).sort((a, b) => (a.t || a.done || a.started) - (b.t || b.done || b.started)).map((x) => avgScore(x.scores));
  const jAcc = s.judgement.length ? mean(s.judgement.map((j) => (j.correct ? 1 : 0))) : null;
  const iv = hitRate(s.intervals);

  root.innerHTML = `${head('Progress', null, '<a class="btn small ghost" href="#/settings">Settings</a>')}
    <div class="tiles">
      ${tile(streak(Object.keys(s.days), now, dayKey), 'day streak')}
      ${tile(`${Object.keys(s.cards).length}<small class="muted" style="font-size:16px"> / ${allConcepts().length}</small>`, 'concepts in review')}
      ${tile(pct(retention), 'cards got right, last 30 days')}
      ${tile(sprints.length ? rate(sprints[sprints.length - 1]).toFixed(1) : '–', 'sums a minute, last sprint')}
      ${tile(iv == null ? '–' : pct(iv), `90% ranges that hit (${s.intervals.length})`)}
      ${tile(done.length ? meanForecastBrier(done).toFixed(2) : '–', `Brier score (${done.length} resolved)`)}
    </div>
    <section class="card"><h2>Monthly benchmark</h2><p class="muted small">Ten minutes on new questions at fixed difficulty. The fairest measure of change.</p>
      ${benchTable(s.bench)}<a class="btn ${benchDue() ? '' : 'ghost'}" href="#/progress/bench">${benchDue() ? 'Run the benchmark' : 'Run it again early'}</a></section>
    <section class="card"><h2>Calibration</h2><p class="muted small">From ${s.calib.length} confidence ratings on cards, judgement cases and resolved forecasts.</p>${calibrationChart(calibrationBins(s.calib))}</section>
    ${sprints.length > 1 ? `<section class="card"><h2>Arithmetic speed</h2><p class="muted small">Correct answers a minute, each mixed sprint. Difficulty rises as you improve, so a flat line can still be progress.</p>${sparkline(sprints.slice(-30).map(rate), 'Correct answers a minute')}</section>` : ''}
    <section class="card"><h2>Judgement lab</h2><p class="muted small">${s.judgement.length ? `${pct(jAcc)} right across ${s.judgement.length} items. Where you were pulled:` : 'No cases done yet.'}</p>${s.judgement.length ? patternHtml() : ''}</section>
    ${scored.length ? `<section class="card"><h2>Writing and speaking scores</h2><p class="muted small">Average rubric score out of 5 from pasted critiques (${scored.length}). Treat as rough: different chats mark differently.</p>${scored.length > 1 ? sparkline(scored, 'Average rubric score') : `<p><strong>${scored[0].toFixed(1)} / 5</strong></p>`}</section>` : ''}`;
  bind(root, {});
}

export function settings(root) {
  const s = get();
  root.innerHTML = `${head('Settings', '#/progress')}
    <section class="card"><h2>Daily session</h2>
      <label class="field">New cards a day<select id="newPerDay">${[1, 2, 3, 4, 5, 8].map((n) => `<option ${s.settings.newPerDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field">Sprint length<select id="sprintSecs">${[[120, '2 minutes'], [180, '3 minutes'], [300, '5 minutes']].map(([v, l]) => `<option value="${v}" ${s.settings.sprintSecs === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></section>
    <section class="card"><h2>Backup</h2><p class="muted small">Everything is stored on this device only. Copy a backup now and then and keep it in Notes or Files.</p>
      <button class="btn" data-act="export">Copy backup to clipboard</button><button class="btn ghost" data-act="download">Download backup file</button>
      <textarea id="imp" rows="3" placeholder="Paste a backup here to restore it" aria-label="Backup to restore"></textarea><button class="btn ghost" data-act="import">Restore from pasted backup</button></section>
    <section class="card"><h2>Start again</h2><button class="btn danger" data-act="reset">Erase all data</button></section>
    <p class="muted small">Cloud · reference figures are approximate and dated where noted.</p>`;
  bind(root, {
    change: (el) => { if (el.id === 'newPerDay' || el.id === 'sprintSecs') { update((st) => { st.settings[el.id] = Number(el.value); }); toast('Saved'); } },
    export: () => copyText(exportJson()),
    download: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportJson()], { type: 'application/json' })); a.download = `cloud-backup-${dayKey()}.json`; a.click(); },
    import: async () => { if (!confirm('Replace everything on this device with the pasted backup?')) return; try { await importJson($('#imp', root).value); toast('Backup restored'); settings(root); } catch (e) { toast(e.message || 'That backup could not be read'); } },
    reset: async () => { if (!confirm('Erase all cards, scores and history on this device?')) return; await reset(); toast('Erased'); location.hash = '#/today'; },
  });
}

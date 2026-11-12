// Small UI helpers: escaping, events, toasts, shared components and charts.
import { critiquePrompt, parseCritique, avgScore } from './lib.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const go = (hash) => { location.hash = hash; };

// One click handler and one input handler per view; assigning replaces the previous view's.
export function bind(root, handlers) {
  root.onclick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.act];
    if (fn) fn(el, e);
  };
  root.oninput = (e) => { if (handlers.input) handlers.input(e.target, e); };
  root.onchange = (e) => { if (handlers.change) handlers.change(e.target, e); };
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); toast(ok ? 'Copied' : 'Copy failed: select the text and copy it by hand'); return ok;
  }
}

export const head = (title, back, right = '') => `<header class="head">${back ? `<a class="back" href="${back}" aria-label="Back">‹</a>` : ''}<h1>${esc(title)}</h1>${right}</header>`;
export const verdict = (ok, label) => `<p class="verdict ${ok ? 'good' : 'bad'}"><span aria-hidden="true">${ok ? '✓' : '✗'}</span> ${esc(label)}</p>`;
export const fmtTime = (secs) => `${Math.floor(secs / 60)}:${String(Math.max(0, Math.floor(secs % 60))).padStart(2, '0')}`;
export const fmtDate = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const pct = (x, dp = 0) => (x == null ? '–' : (x * 100).toFixed(dp) + '%');

export const CONF = [[0.55, 'Guess'], [0.7, 'Unsure'], [0.85, 'Fairly sure'], [0.95, 'Sure']];
export const confChips = (sel) => `<div class="chips" role="group" aria-label="How sure are you?">${CONF.map(([v, l]) => `<button class="chip ${sel === v ? 'on' : ''}" data-act="conf" data-v="${v}">${l}<small>${Math.round(v * 100)}%</small></button>`).join('')}</div>`;

export const checklist = (items, checks = []) => `<ul class="checks">${items.map((t, i) => `<li><label><input type="checkbox" data-check="${i}" ${checks[i] ? 'checked' : ''}> <span>${esc(t)}</span></label></li>`).join('')}</ul>`;
export const readChecks = (root, n) => Array.from({ length: n }, (_, i) => !!$(`[data-check="${i}"]`, root)?.checked);

// ---------- critique panel (copy prompt out, paste reply back) ----------
export function critiquePanel(result) {
  return `<section class="card">
    <h2>AI critique</h2>
    <p class="muted">Copy the prompt into a chat app, then paste the whole reply here.</p>
    <button class="btn" data-act="crit-copy">Copy critique prompt</button>
    <textarea id="crit-in" rows="4" placeholder="Paste the reply here" aria-label="Paste the critique reply"></textarea>
    <button class="btn ghost" data-act="crit-read">Read scores</button>
    <div id="crit-out">${result ? scoresHtml(result, result.rubric) : ''}</div>
  </section>`;
}
export function scoresHtml(res, rubric) {
  if (!res?.scores) return '';
  const rows = rubric.filter((r) => res.scores[r.k]).map((r) => `<tr><td>${esc(r.t)}</td><td class="num">${res.scores[r.k]} / 5</td></tr>`).join('');
  return `<table class="table"><tbody>${rows}<tr class="total"><td>Average</td><td class="num">${avgScore(res.scores).toFixed(1)} / 5</td></tr></tbody></table>
    ${res.weakest ? `<p><strong>Weakest point.</strong> ${esc(res.weakest)}</p>` : ''}${res.fix ? `<p><strong>Fix.</strong> ${esc(res.fix)}</p>` : ''}`;
}
// Returns handlers to spread into bind(). getCtx() supplies {kind, task, text, rubric, concepts}; onScores receives the parsed result.
export function critiqueHandlers(root, getCtx, onScores) {
  return {
    'crit-copy': () => { const c = getCtx(); if (!c.text.trim()) return toast('Write something first'); copyText(critiquePrompt(c)); },
    'crit-read': () => {
      const c = getCtx();
      const res = parseCritique($('#crit-in', root).value, c.rubric);
      if (!res) return toast('No SCORES line found in the pasted text');
      $('#crit-out', root).innerHTML = scoresHtml(res, c.rubric);
      onScores(res); toast('Scores saved');
    },
  };
}

// ---------- charts ----------
// Calibration: stated confidence (x) against how often you were right (y). One series plus a reference diagonal.
export function calibrationChart(bins) {
  if (!bins.length) return '<p class="muted">No data yet. Confidence ratings from cards, the judgement lab and resolved forecasts appear here.</p>';
  const W = 320, H = 220, L = 38, R = 12, T = 12, B = 34;
  const x = (v) => L + (v - 0.5) / 0.5 * (W - L - R), y = (v) => T + (1 - v) * (H - T - B);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}</text>`).join('');
  const xt = [0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => `<text class="tick" x="${x(v)}" y="${H - B + 16}" text-anchor="middle">${v * 100}</text>`).join('');
  const pts = bins.map((b) => `${x(b.conf)},${y(b.acc)}`).join(' ');
  const dots = bins.map((b, i) => `<g class="pt" tabindex="0" data-act="pt" data-i="${i}"><circle class="hit" cx="${x(b.conf)}" cy="${y(b.acc)}" r="16"/><circle class="dot" cx="${x(b.conf)}" cy="${y(b.acc)}" r="5"/><title>Said ${Math.round(b.conf * 100)}%, right ${Math.round(b.acc * 100)}% of ${b.n}</title></g>`).join('');
  const rows = bins.map((b) => `<tr><td class="num">${Math.round(b.conf * 100)}%</td><td class="num">${Math.round(b.acc * 100)}%</td><td class="num">${b.n}</td><td>${b.n < 5 ? 'Too few to say' : b.acc < b.conf - 0.08 ? 'Overconfident' : b.acc > b.conf + 0.08 ? 'Underconfident' : 'Well calibrated'}</td></tr>`).join('');
  return `<figure class="viz">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Calibration chart: stated confidence against share correct">
      ${grid}${xt}
      <line class="ref" x1="${x(0.5)}" y1="${y(0.5)}" x2="${x(1)}" y2="${y(1)}"/>
      <text class="tick" x="${x(0.93)}" y="${y(0.97) - 6}" text-anchor="end">perfect</text>
      <polyline class="line" points="${pts}"/>${dots}
      <text class="axis" x="${(L + W - R) / 2}" y="${H - 2}" text-anchor="middle">How sure you said you were (%)</text>
    </svg>
    <p class="muted small">Share correct (%) on the vertical axis. Points below the dashed line mean overconfidence.</p>
    <table class="table"><thead><tr><th class="num">Said</th><th class="num">Right</th><th class="num">Items</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  </figure>`;
}

// Small trend line with the latest value labelled.
export function sparkline(values, label = '') {
  if (values.length < 2) return '';
  const W = 320, H = 64, P = 8, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const x = (i) => P + i / (values.length - 1) * (W - 2 * P - 44), y = (v) => H - P - (v - lo) / span * (H - 2 * P);
  const last = values[values.length - 1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}: ${values.map((v) => +v.toFixed(1)).join(', ')}">
    <polyline class="line" points="${values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>
    <circle class="dot" cx="${x(values.length - 1)}" cy="${y(last)}" r="4"/>
    <text class="val" x="${x(values.length - 1) + 8}" y="${y(last) + 4}">${+last.toFixed(1)}</text>
  </svg>`;
}

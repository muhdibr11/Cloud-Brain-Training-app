// Speaking reps: 30 seconds to prepare, 90 seconds to answer. Dictate for a transcript, or record for playback.
import { get, update } from '../store.js';
import { SPEAK_PROMPTS, SPEAK_RUBRIC, SPEAK_CHECKLIST } from '../../data/prompts.js';
import { markDay, markSeen, pickItems, wordCount, fillerCount } from '../lib.js';
import { esc, head, bind, toast, checklist, readChecks, critiquePanel, critiqueHandlers, fmtTime, $ } from '../ui.js';

const PREP = 30, TALK = 90;
const items = SPEAK_PROMPTS.map((t, i) => ({ id: 'sp-' + i, t }));

export function metricsHtml(text, secs) {
  const words = wordCount(text), wpm = secs ? Math.round(words / (secs / 60)) : 0, f = fillerCount(text);
  const pace = !words ? '' : wpm < 120 ? 'slow' : wpm > 170 ? 'fast' : 'a steady pace';
  return `<div class="tiles"><div class="tile"><b>${wpm || '–'}</b><span>words a minute${pace ? ` · ${pace}` : ''}</span></div><div class="tile"><b>${f.total}</b><span>filler words${f.total ? ': ' + Object.entries(f.found).map(([k, n]) => `${esc(k)} ×${n}`).join(', ') : ''}</span></div></div>`;
}

export function render(root) {
  let prompt = pickItems(items, 1)[0], stage = 'intro', mode = 'dictate', left = 0, timer = null, started = 0, secs = 0, text = '', audioUrl = null, recorder = null, stream = null, rec = null;

  const stopMedia = () => { try { recorder && recorder.state !== 'inactive' && recorder.stop(); } catch { /* already stopped */ } stream?.getTracks().forEach((t) => t.stop()); stream = null; };
  const clock = (n, onEnd) => { left = n; clearInterval(timer); timer = setInterval(() => { left--; const c = $('#clock', root); if (c) c.textContent = fmtTime(left); if (left <= 0) { clearInterval(timer); onEnd(); } }, 1000); };
  const save = (patch) => update((s) => { Object.assign(rec, patch); const i = s.speaking.findIndex((w) => w.t === rec.t); if (i >= 0) s.speaking[i] = rec; else s.speaking.push(rec); }, { silent: true });

  const finishTalk = () => {
    clearInterval(timer); secs = Math.max(1, Math.round((Date.now() - started) / 1000));
    text = $('#text', root)?.value || text; stopMedia();
    rec = { t: Date.now(), prompt: prompt.t, secs, words: wordCount(text), wpm: Math.round(wordCount(text) / (secs / 60)), fillers: fillerCount(text).total, mode, checks: [], scores: null };
    save({}); markSeen(prompt.id); markDay('drill');
    stage = 'review'; draw(); window.scrollTo(0, 0);
  };
  const startTalk = async () => {
    if (mode === 'record') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const chunks = []; recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => { audioUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })); const a = $('#audio', root); if (a) a.src = audioUrl; };
        recorder.start();
      } catch { toast('Microphone not available: switching to dictation'); mode = 'dictate'; }
    }
    stage = 'talk'; started = Date.now(); draw(); clock(TALK, finishTalk);
    if (mode === 'dictate') $('#text', root)?.focus();
  };

  const draw = () => {
    const top = (right = '') => head('Speaking', '#/practice', right);
    if (stage === 'intro') {
      root.innerHTML = `${top()}<section class="card"><p class="prompt">${esc(prompt.t)}</p><button class="btn ghost small" data-act="other">Another prompt</button></section>
        <section class="card"><h2>How to capture it</h2>
          <button class="opt ${mode === 'dictate' ? 'on' : ''}" data-act="mode" data-m="dictate"><strong>Dictate</strong><br><span class="muted small">Tap the microphone on the keyboard and speak. Gives a transcript, pace and filler counts.</span></button>
          <button class="opt ${mode === 'record' ? 'on' : ''}" data-act="mode" data-m="record"><strong>Record</strong><br><span class="muted small">Records audio to play back. No transcript unless you type one afterwards.</span></button></section>
        <button class="btn" data-act="prep">Start ${PREP} seconds of preparation</button>`;
    } else if (stage === 'prep') {
      root.innerHTML = `${top(`<span class="timer" id="clock">${fmtTime(left)}</span>`)}<section class="card"><p class="muted small">Prepare</p><p class="prompt">${esc(prompt.t)}</p>
        <p class="muted">Decide your answer and two supporting points. Open with the answer.</p></section><button class="btn" data-act="talk">Start speaking now</button>`;
    } else if (stage === 'talk') {
      root.innerHTML = `${top(`<span class="timer" id="clock">${fmtTime(left)}</span>`)}<section class="card"><p class="prompt">${esc(prompt.t)}</p>
        ${mode === 'dictate' ? '<textarea id="text" rows="8" placeholder="Tap here, then tap the microphone on the keyboard and speak" aria-label="Dictated answer"></textarea>' : '<p class="verdict bad"><span aria-hidden="true">●</span> Recording</p>'}</section>
        <button class="btn" data-act="stop">Finished</button>`;
    } else {
      root.innerHTML = `${top()}<section class="card"><p class="muted small">${esc(prompt.t)}</p>
          ${mode === 'record' ? `<audio id="audio" controls ${audioUrl ? `src="${audioUrl}"` : ''} style="width:100%"></audio><p class="muted small">Listen once, then type or dictate what you said to get pace and filler counts.</p>` : ''}
          <label class="field">Transcript<textarea id="text" rows="6">${esc(text)}</textarea></label>
          <p class="muted small">Spoke for ${fmtTime(secs)}.</p></section>
        <div id="metrics">${metricsHtml(text, secs)}</div>
        <section class="card"><h2>Check it yourself first</h2>${checklist(SPEAK_CHECKLIST, rec.checks)}</section>
        ${critiquePanel()}
        <button class="btn" data-act="redo">Answer the same prompt again</button><a class="btn ghost" href="#/today">Back to today</a>`;
    }
  };

  bind(root, {
    other: () => { markSeen(prompt.id); prompt = pickItems(items, 1)[0]; draw(); },
    mode: (el) => { mode = el.dataset.m; draw(); },
    prep: () => { stage = 'prep'; left = PREP; draw(); clock(PREP, startTalk); },
    talk: () => { clearInterval(timer); startTalk(); },
    stop: finishTalk,
    redo: () => { text = ''; audioUrl = null; stage = 'prep'; left = PREP; draw(); clock(PREP, startTalk); window.scrollTo(0, 0); },
    input: (el) => { if (el.id === 'text') { text = el.value; if (stage === 'review') { $('#metrics', root).innerHTML = metricsHtml(text, secs); const f = fillerCount(text); save({ words: wordCount(text), wpm: Math.round(wordCount(text) / (secs / 60)), fillers: f.total }); } } },
    change: (el) => { if (el.dataset.check != null && rec) save({ checks: readChecks(root, SPEAK_CHECKLIST.length) }); },
    ...critiqueHandlers(root, () => ({ kind: 'transcript of a spoken answer', task: `Answer this aloud in ${TALK} seconds with ${PREP} seconds to prepare: ${prompt.t}\n(Spoken for ${secs} seconds. Judge it as speech: ignore punctuation and transcription slips.)`, text, rubric: SPEAK_RUBRIC }),
      (res) => save({ scores: res.scores, weakest: res.weakest, fix: res.fix })),
  });
  draw();
  return () => { clearInterval(timer); stopMedia(); };
}

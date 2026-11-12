// End-to-end smoke test in a phone-sized browser. Usage: node tests/smoke.mjs [screenshot-dir]
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const PORT = 8765, BASE = `http://localhost:${PORT}/`;
const server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: new globalThis.URL('..', import.meta.url).pathname, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 14'], permissions: ['clipboard-read', 'clipboard-write'], colorScheme: process.env.DARK ? 'dark' : 'light' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('dialog', (d) => d.accept());

const act = (a, extra = '') => page.locator(`#view [data-act="${a}"]${extra}`).first().click();
const nav = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(120); };
const shot = async (n) => { if (shots) await page.screenshot({ path: `${shots}/${n}.png` }); };
const text = () => page.locator('#view').innerText();
const expect = async (re, what) => { const t = await text(); if (!new RegExp(re.source, 'i').test(t)) throw new Error(`${what}: expected ${re} in:\n${t.slice(0, 400)}`); };
const store = (fn) => page.evaluate(async (src) => { const m = await import('/js/store.js'); m.update(new Function('s', src)); await m.flushNow(); }, fn);
let step = '';
const run = async (name, fn) => { step = name; await fn(); console.log('ok  ' + name); };

try {
  await page.goto(BASE); await page.waitForSelector('#view h1');
  await run('today loads', async () => { await expect(/Daily session/, 'today'); await expect(/3 new/, 'new cards'); await shot('01-today'); });

  await run('learn three new cards', async () => {
    await nav('#/review'); await shot('02-new-card');
    for (let i = 0; i < 3; i++) await act('learn');
    await expect(/Cards done/, 'finish'); await expect(/3 new/, 'count');
  });

  await run('review due cards apply-first', async () => {
    await store('for (const c of Object.values(s.cards)) c.due = Date.now() - 1000; s.settings.newPerDay = 0;');
    await nav('#/today'); await expect(/3 due/, 'due count');
    await nav('#/review'); await expect(/Apply it/, 'mode');
    if (await page.locator('#view [data-act="reveal"]').isEnabled()) throw new Error('reveal should need a confidence rating');
    await page.fill('#ans', 'my answer'); await act('conf', '[data-v="0.85"]'); await shot('03-card-question');
    await act('reveal'); await expect(/Model answer/, 'reveal'); await expect(/my answer/, 'typed kept'); await shot('04-card-answer');
    await act('grade', '[data-g="2"]');
    await act('conf', '[data-v="0.55"]'); await act('reveal'); await act('grade', '[data-g="0"]');
    await act('conf', '[data-v="0.7"]'); await act('reveal'); await act('grade', '[data-g="1"]');
    await expect(/1 got, 1 partial, 1 missed/, 'summary');
    const n = await page.evaluate(async () => { const m = await import('/js/store.js'); const s = m.get(); return [s.reviews.length, s.calib.length, Object.values(s.cards).map((c) => c.step).sort().join()]; });
    if (n[0] !== 3 || n[1] !== 3 || n[2] !== '0,0,1') throw new Error('review state ' + JSON.stringify(n));
  });

  await run('arithmetic: learn set, mixed sprint, applied sprint', async () => {
    await store('s.settings.sprintSecs = 4;');
    await nav('#/today'); await expect(/Arithmetic: learn a method/, 'today suggests learning');
    await nav('#/practice/sprint'); await expect(/Learn: Percentages/, 'learn card'); await expect(/to learn/, 'type table'); await shot('05-arith-home');
    // Learn set: answer correctly by asking the generator's own checker through the page.
    await act('learn'); await expect(/need 9 of 10/, 'learn status');
    await act('key', '[data-k="1"]'); await act('enter'); await page.waitForTimeout(100);
    if (await page.locator('#view [data-act="next"]').count()) { await expect(/Answer:/, 'feedback'); await shot('06-learn-wrong'); await act('next'); }
    // Finish the set with correct answers typed on the keyboard, until nine of the last ten are right.
    for (let i = 0; i < 12 && await page.locator('.sprint-q').count(); i++) {
      const q = await page.locator('.sprint-q').innerText(); const m = q.match(/([\d.]+)% of ([\d,]+)/);
      if (!m) throw new Error('unexpected learn question: ' + q);
      await page.keyboard.type(String(Math.round(Number(m[1]) * Number(m[2].replace(/,/g, ''))) / 100)); await page.keyboard.press('Enter'); await page.waitForTimeout(40);
    }
    await expect(/Learned/, 'learn passed'); await expect(/now appears in your mixed sprints/, 'joined'); await shot('06b-learned');
    await act('more'); await expect(/Learn: Percent change/, 'next method'); await expect(/5 types you have learned/, 'learned count');
    await act('mixed'); await shot('07-sprint'); await act('key', '[data-k="1"]'); await act('enter'); await page.waitForTimeout(200);
    if (await page.locator('#view [data-act="next"]').count()) await act('next');
    await page.waitForSelector('text=Sprint done', { timeout: 15000 }); await expect(/correct per minute/, 'summary');
    await act('more'); await act('applied'); await page.waitForTimeout(100); await expect(/Applied/, 'applied label'); await shot('08-applied');
    await page.waitForSelector('text=Sprint done', { timeout: 15000 });
    const a = await page.evaluate(async () => { const m = await import('/js/store.js'); const s = m.get(); return { modes: s.arith.sessions.map((x) => x.mode).join(), keys: Object.values(s.arith.stats).reduce((n, x) => n + (x.hist || []).length, 0) }; });
    if (a.modes !== 'mixed,applied' || a.keys < 1) throw new Error('arith state ' + JSON.stringify(a));
    await store('s.settings.sprintSecs = 180;');
  });

  await run('judgement lab', async () => {
    await nav('#/practice/judgement');
    for (let i = 0; i < 3; i++) { await act('pick', '[data-n="1"]'); await act('conf', '[data-v="0.85"]'); if (i === 0) await shot('07-judgement'); await act('check'); if (i === 0) await shot('08-judgement-answer'); await act('next'); }
    await expect(/of 3 right/, 'summary');
  });

  await run('estimation', async () => {
    await nav('#/practice/estimate');
    for (let i = 0; i < 5; i++) {
      if (await page.locator('#guess').count()) await page.fill('#guess', '50k');
      await page.fill('#lo', '1'); await page.fill('#hi', '10bn'); await act('check'); await expect(/Inside your range/, 'hit'); if (i === 0) await shot('09-estimate'); await act('next');
    }
    await expect(/5 \/ 5/, 'summary');
  });

  await run('base rates', async () => {
    await nav('#/practice/baserate');
    for (let i = 0; i < 3; i++) { await page.fill('#x', '50'); await act('check'); await expect(/Take 1,000/, 'tree'); if (i === 0) await shot('10-baserate'); await act('next'); }
    await expect(/right today/, 'summary');
  });

  const reply = (keys) => `1. Fine.\n2. Weak.\nSCORES {${keys.map((k) => `"${k}":4`).join(',')},"weakest":"The opening is slow","fix":"Lead with the recommendation"}`;
  await run('writing brief with pasted critique', async () => {
    await nav('#/practice/writing'); await act('brief'); await shot('11-writing');
    await page.fill('#text', 'Renew with Henley for one year at a lower increase and add penalties for late delivery while we qualify a second supplier because switching now is too risky.');
    await expect(/2\d words · limit 80/, 'word count'); await act('done'); await expect(/Model answer/, 'model');
    await page.locator('[data-check="0"]').check();
    await act('crit-copy');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    if (!/SCORES \{"answer":3/.test(clip) || !/SOURCE MATERIAL/.test(clip)) throw new Error('prompt not on clipboard: ' + clip.slice(0, 200));
    await page.fill('#crit-in', reply(['answer', 'selection', 'reasoning', 'clarity'])); await act('crit-read'); await expect(/4\.0 \/ 5/, 'scores'); await shot('12-writing-review');
    await page.fill('#crit-in', 'no scores here'); await act('crit-read');
    await act('rewrite'); await expect(/What to fix/, 'rewrite stage'); await expect(/The opening is slow/, 'feedback shown'); await act('done2'); await expect(/What to fix/, 'unchanged text refused');
    await page.fill('#text2', 'Renew with Henley for one year at no more than four percent, with penalties for late delivery, and qualify a second supplier meanwhile.'); await act('done2');
    await expect(/Before and after/, 'compare'); await page.fill('#crit-in', reply(['answer', 'selection', 'reasoning', 'clarity']).replace(/:4/g, ':5')); await act('crit-read'); await expect(/4\.0 → 5\.0/, 'delta'); await shot('12b-rewrite');
  });

  await run('speaking by dictation', async () => {
    await nav('#/practice/speaking'); await shot('13-speaking'); await act('prep'); await act('talk');
    await page.fill('#text', 'My answer is yes. Um, two reasons. First, you know, prices matter. Second, basically, stability matters. So that is my answer.');
    await page.waitForTimeout(1100); await act('stop'); await expect(/filler words/, 'metrics'); await expect(/um ×1/, 'filler found'); await shot('14-speaking-review');
  });

  await run('deep dive', async () => {
    await nav('#/practice/dives'); await shot('15-dives'); await act('start');
    await page.fill('#framings', 'one\ntwo\nthree\nfour\nfive'); await page.fill('#essay', 'word '.repeat(60));
    await expect(/60 words/, 'count'); await page.fill('#crit-in', reply(['answer', 'structure', 'evidence', 'counter', 'concepts', 'clarity'])); await act('crit-read');
    await shot('16-dive'); await act('finish'); await page.waitForTimeout(200); await expect(/Finished/, 'finished list'); await expect(/4\.0 \/ 5/, 'score in list');
  });

  await run('forecasts', async () => {
    await nav('#/forecasts'); await act('add');
    await page.fill('#q', 'Will the Bank of England cut rates at its next meeting?'); await page.fill('#base', 'Cuts at about a third of meetings'); await page.locator('#p').fill('80');
    await shot('17-forecast-new'); await act('save'); await expect(/80%/, 'saved');
    await act('open'); await expect(/Save update/, 'can update before due');
    await store("s.forecasts[0].due = '2020-01-01';"); await nav('#/today'); await nav('#/forecasts'); await act('open'); await expect(/probability is locked/, 'locked after due');
    if (await page.locator('#view [data-act="update"]').count()) throw new Error('update still offered after the due date');
    await store("s.forecasts[0].due = '2099-01-01';"); await nav('#/today'); await nav('#/forecasts'); await act('open');
    await act('resolve', '[data-o="1"]'); await expect(/Brier 0\.04/, 'brier'); await shot('18-forecasts');
  });

  await run('benchmark', async () => {
    await nav('#/progress/bench'); await expect(/Begin/, 'intro'); await act('go'); await expect(/Part 1 of 4/, 'between');
  });

  await run('library, card editor and import', async () => {
    await nav('#/library'); await expect(/Compounding/, 'list'); await shot('19-library');
    await page.fill('#q', 'kodak'); await expect(/Kodak/, 'search'); if (/Compounding/.test(await text())) throw new Error('search did not filter');
    await nav('#/library/card/compounding'); await expect(/Growth earned/, 'card'); await shot('20-card');
    await nav('#/library/edit'); await page.fill('#t', 'Moral hazard'); await page.fill('#def', 'Taking more risk when someone else bears the cost.'); await page.fill('#q0', 'A bank expects a bailout. What follows?'); await act('save'); await page.waitForTimeout(200); await expect(/Moral hazard/, 'saved card');
    await nav('#/library/import'); await page.fill('#in', 'Here you go: [{"t":"Gresham","def":"Bad money drives out good.","ex":"x","apply":[{"q":"q1","a":"a1"}]}]'); await act('add'); await page.waitForTimeout(200); await expect(/Gresham/, 'imported');
  });

  await run('progress and settings', async () => {
    await nav('#/progress'); await expect(/Calibration/, 'progress'); await expect(/Well calibrated|Overconfident|Underconfident|Too few to say/, 'bins'); await shot('21-progress');
    await page.evaluate(() => window.scrollTo(0, 700)); await shot('22-progress-charts');
    await nav('#/settings'); await act('export'); const backup = await page.evaluate(() => navigator.clipboard.readText());
    if (!JSON.parse(backup).cards) throw new Error('backup invalid');
  });

  await run('data survives a reload', async () => {
    await page.reload(); await page.waitForSelector('#view h1'); await nav('#/progress');
    const n = await page.evaluate(async () => { const m = await import('/js/store.js'); const s = m.get(); return { cards: Object.keys(s.cards).length, f: s.forecasts.length, custom: s.custom.length, w: s.writing[0]?.scores?.answer, w2: s.writing[0]?.scores2?.answer }; });
    if (n.cards !== 3 || n.f !== 1 || n.custom !== 2 || n.w !== 4 || n.w2 !== 5) throw new Error('persisted state ' + JSON.stringify(n));
    await nav('#/today'); await shot('23-today-after');
  });

  await run('no overflow, no console errors', async () => {
    for (const h of ['#/today', '#/library', '#/practice', '#/forecasts', '#/progress', '#/settings']) {
      await nav(h); const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) throw new Error(`${h} overflows horizontally by ${over}px`);
    }
    if (errors.length) throw new Error('console errors:\n' + errors.join('\n'));
  });
  console.log('ALL PASSED');
} catch (e) {
  console.log(`FAILED at "${step}": ${e.message}`); if (errors.length) console.log('console:', errors.join('\n')); await shot('failure'); process.exitCode = 1;
} finally { await browser.close(); server.kill(); }

# Cloud

A personal training app for thinking skills that the evidence says can be trained. It runs in the browser, installs to an iPhone home screen, works offline and keeps all data on the device.

## Run it

Any static file server works. There is no build step.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Put it on an iPhone

1. Host this folder on any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages).
2. Open the address in Safari.
3. Tap Share, then Add to Home Screen.

After changing any file, bump `VERSION` in `sw.js` so installed copies update.

## Tests

```bash
node --test tests/unit.test.mjs
node tests/smoke.mjs
```

The second command needs Playwright with Chromium.

## Layout

- `data/` holds the content: concept cards, judgement cases, estimation items, prompts and rubrics.
- `js/srs.js`, `js/scoring.js`, `js/arith.js` hold the scheduling, scoring and problem generators.
- `js/store.js` holds the state and its storage.
- `js/views/` holds one file per screen.

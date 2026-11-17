# sleepmoore.app

The public website for the Sleep Moore app: home, support and privacy policy. Served by GitHub Pages at https://sleepmoore.app (DNS at Namecheap, `CNAME` in this repo). The app itself lives in a separate private repository.

Plain HTML, CSS and JavaScript, no build step.

- `index.html`, `site.css`, `site.js`: the home page. The hero, world list and mixer play real sound: 30-second seamless loops in `audio/` (Opus for Chrome, Firefox and recent Safari; FLAC fallback), mixed live with the Web Audio API. Faders set each layer's gain, the sleep timer fades the mix out, world buttons crossfade between mixes.
- `support/`, `privacy/`: text pages sharing the same header, footer and stylesheet.
- `img/`: world art (WebP, 720 px tall) plus the responsive hero (`hero-cabin-*.webp`, with a portrait crop for phones) and the Alpine Lake feature image. Masters are in `~/faceless/generations/`.
- `audio/`: made from the app's loops with `scripts/make-loop.py --length 30 --out ...` in the app repo, then `ffmpeg -c:a libopus -b:a 56k`.

## Checks

```bash
npm install          # html-validate and puppeteer-core (uses the local Chrome)
npm test             # link, asset and markup checks + HTML validation
npm run serve        # http://localhost:8080
npm run test:visual  # desktop and phone renders into test/screens/, fails on overflow or console errors
```

Lighthouse (local, 17 Nov 2026): desktop 100 / 100 / 100 / 100, mobile 99 / 100 / 100 / 100.

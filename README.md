# sleepmoore.app

The public website for the Sleep Moore app: home, support and privacy policy. Served by GitHub Pages at https://sleepmoore.app (DNS at Namecheap, `CNAME` in this repo). The app itself lives in a separate private repository.

Plain HTML, CSS and JavaScript, no build step.

- `index.html`, `site.css`, `site.js`: the home page. The hero, world list and mixer play real sound: 30-second seamless loops in `audio/` (Opus for Chrome, Firefox and recent Safari; FLAC fallback), mixed live with the Web Audio API. Faders set each layer's gain, the sleep timer fades the mix out, world buttons crossfade between mixes.
- `support/`, `privacy/`: text pages sharing the same header, footer and stylesheet.
- `img/scenes/`: the ten photographic world scenes plus a dawn room (Higgsfield gpt_image_2_6, 16:9) at 1344/900/480 px. `img/hero-cabin-*.webp` is the responsive hero with a portrait crop for phones; `img/app/` holds real app screenshots captured from the Expo web build with `test/app-shots.mjs`. Masters are in `~/faceless/generations/`.
- `video/`: a 5 s seamless hero loop (Kling image-to-video from the hero still, tail crossfaded into the head with ffmpeg xfade); loaded only on desktop without reduced motion or data saver.
- `audio/`: made from the app's loops with `scripts/make-loop.py --length 30 --out ...` in the app repo, then `ffmpeg -c:a libopus -b:a 56k`.

## Checks

```bash
npm install          # html-validate and puppeteer-core (uses the local Chrome)
npm test             # link, asset and markup checks + HTML validation
npm run serve        # http://localhost:8080
npm run test:visual  # desktop and phone renders (plus each chapter of the pinned story) into test/screens/, fails on overflow or console errors
node test/app-shots.mjs  # re-capture the app screens; needs `npx expo start --web --port 8091` running in the app repo
```

Lighthouse (local, 17 Nov 2026): desktop 100 / 100 / 100 / 100, mobile 99 / 100 / 100 / 100.

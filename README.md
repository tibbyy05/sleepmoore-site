# sleepmoore.app

The public website for the Sleep Moore app: home, support and privacy policy. Built with [Astro](https://astro.build) 7 and served by GitHub Pages at https://sleepmoore.app (DNS at Namecheap). The app itself lives in a separate private repository.

## How it fits together

- `src/pages/`: one file per page. `index.astro` is the home page; `support.astro` and `privacy.astro` build to `/support/` and `/privacy/`; `worlds/[id].astro` builds one page per world (`/worlds/rainy-cabin/` and so on). A new page is a new file here, wrapped in the `Base` layout.
- `src/data/worlds.ts`: the sound worlds and sounds, read by the pages at build time **and** by the sound engine in the browser. Name, copy, layers and default levels, and each world's living-scene effects. Add a world here (plus its picture in `src/assets/scenes/<id>.jpg` and colour in `scene-colors.json`) and it gets a page, a mixer and a scene.
- `src/data/site.ts`: navigation, home page rows and presets, and the FAQ (which also feeds the FAQPage structured data).
- `src/layouts/Base.astro`: shared head (self-hosted fonts, canonical, social tags), header, menu, footer, icon sprite and player dock. It turns on Astro's client router, so moving between pages never reloads the window and **the sound keeps playing**.
- `src/scripts/engine.ts`: the Web Audio engine (format chain, iPhone unlock and silent-switch keep-alive, sleep timer, meter). Loaded once per visit.
- `src/scripts/app.ts`: binds whatever page is showing after every page change: play buttons, world links (a plain click starts the world and opens its page), mixers, the dock, the night story, the hero video. Loads the two modules below only when motion is allowed.
- `src/scripts/motion.ts`: scroll parallax, spring lifts, magnetic buttons, built on [Motion](https://motion.dev).
- `src/scripts/ambience.ts`: the living scenes on canvas (rain, drops on the window glass, snow, embers, fireflies, leaves, spray, lightning, firelight). Each effect idles softly and grows with its own fader and the live loudness.
- `src/components/`: header, footer, dock, mixer, get-the-app, `Scene` (scene pictures as AVIF and WebP with a placeholder colour), `IconSprite` and `Icon` (Phosphor icons, light weight).
- `src/styles/site.css`: the whole stylesheet (bundled and fingerprinted by Astro).
- `public/`: copied to the site unchanged: `audio/`, `img/` (hero and app screenshots), `video/`, `favicon.png`, `CNAME`, `robots.txt`, and the unlisted motion lab in `lab/motion/`.
- A sitemap (`/sitemap-index.xml`) is generated on every build; the lab is left out of it and disallowed in `robots.txt`.

Media notes:

- `src/assets/scenes/`: the scene pictures Astro resizes: the eight playable worlds upscaled to 4K on Higgsfield then saved at 2560 px, the other scenes at 1344 px. Masters in `~/faceless/generations/` (`sleepmoore_web_<id>_4k.png`). `public/img/hero-cabin-*.webp` is the responsive hero with a portrait crop for phones; `public/img/app/` holds real app screenshots captured from the Expo web build with `test/app-shots.mjs`. Masters are in `~/faceless/generations/`.
- `public/video/`: a 5 s seamless hero loop (Kling image-to-video from the hero still, tail crossfaded into the head with ffmpeg xfade); loaded only on desktop without reduced motion or data saver.
- `public/audio/`: made from the app's loops with `scripts/make-loop.py --length 30 --out ...` in the app repo, then `ffmpeg -c:a libopus -b:a 56k`. Every world in `site.js` needs its sounds in Opus, FLAC and AAC (`.m4a`).

## Commands

```bash
npm install          # Astro, html-validate, puppeteer-core (uses the local Chrome)
npm run dev          # live-reloading dev server on http://localhost:8080
npm test             # build to dist/, then link, asset, sitemap and markup checks + HTML validation
npm run serve        # serve the built dist/ on http://localhost:8080
npm run test:visual  # with `npm run serve` running: desktop and phone renders into test/screens/, fails on overflow or console errors
npm run test:journey # with `npm run serve` running: play at home, tap into a world, check the sound never stopped, dock, faders, back home
npm run check        # Astro and TypeScript diagnostics
node test/app-shots.mjs  # re-capture the app screens; needs `npx expo start --web --port 8091` running in the app repo
```

## Publishing

Pushing to `main` runs `.github/workflows/deploy.yml`: it installs, runs `npm test` (which builds the site), and publishes `dist/` to GitHub Pages. If a check fails, nothing is published. The repository's Pages source must be set to "GitHub Actions" (Settings > Pages).

Astro 7 needs Node 22.23.4 or newer (this PC has 22.23.5; CI uses Node 24). `compressHTML: true` in `astro.config.mjs` keeps HTML whitespace rules; Astro 7's default would glue inline text to links.

Lighthouse (local, 18 Nov 2026, after the move to Astro): desktop and mobile both 100 / 100 / 100 / 100.

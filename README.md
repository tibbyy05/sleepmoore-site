# sleepmoore.app

The public website for the Sleep Moore app: home, support and privacy policy. Built with [Astro](https://astro.build) and served by GitHub Pages at https://sleepmoore.app (DNS at Namecheap). The app itself lives in a separate private repository.

## How it fits together

- `src/pages/`: one file per page. `index.astro` is the home page; `support.astro` and `privacy.astro` build to `/support/` and `/privacy/`. A new page is a new file here, wrapped in the `Base` layout.
- `src/layouts/Base.astro`: the shared head (meta, canonical, fonts, `site.css`), header, mobile menu and footer. The `home` prop switches on the home-only parts: in-page header links, the split-letter brand, GSAP and the safe-area viewport.
- `src/components/`: `SiteHeader`, `SiteFooter`, and the play icons used by every play button.
- `src/data/site.ts`: the editable content shared across the page: navigation, the world rows and presets, and the FAQ. The FAQPage structured data for Google is generated from the same FAQ, so the two can't drift apart.
- `public/`: copied to the site unchanged. `site.css` and `site.js` (the Web Audio mixer, motion, menu), `audio/`, `img/`, `video/`, `favicon.png`, `CNAME`, `robots.txt`, and the unlisted motion lab in `lab/motion/`.
- A sitemap (`/sitemap-index.xml`) is generated on every build; the lab is left out of it and disallowed in `robots.txt`.

Media notes:

- `public/img/scenes/`: the ten photographic world scenes plus a dawn room (Higgsfield gpt_image_2_6, 16:9) at 1344/900/480 px. `public/img/hero-cabin-*.webp` is the responsive hero with a portrait crop for phones; `public/img/app/` holds real app screenshots captured from the Expo web build with `test/app-shots.mjs`. Masters are in `~/faceless/generations/`.
- `public/video/`: a 5 s seamless hero loop (Kling image-to-video from the hero still, tail crossfaded into the head with ffmpeg xfade); loaded only on desktop without reduced motion or data saver.
- `public/audio/`: made from the app's loops with `scripts/make-loop.py --length 30 --out ...` in the app repo, then `ffmpeg -c:a libopus -b:a 56k`. Every world in `site.js` needs its sounds in Opus, FLAC and AAC (`.m4a`).

## Commands

```bash
npm install          # Astro, html-validate, puppeteer-core (uses the local Chrome)
npm run dev          # live-reloading dev server on http://localhost:8080
npm test             # build to dist/, then link, asset, sitemap and markup checks + HTML validation
npm run serve        # serve the built dist/ on http://localhost:8080
npm run test:visual  # with `npm run serve` running: desktop and phone renders into test/screens/, fails on overflow or console errors
npm run check        # Astro and TypeScript diagnostics
node test/app-shots.mjs  # re-capture the app screens; needs `npx expo start --web --port 8091` running in the app repo
```

## Publishing

Pushing to `main` runs `.github/workflows/deploy.yml`: it installs, runs `npm test` (which builds the site), and publishes `dist/` to GitHub Pages. If a check fails, nothing is published. The repository's Pages source must be set to "GitHub Actions" (Settings > Pages).

Astro is on version 6 because version 7 needs Node 22.23.4 or newer and this PC has 22.21. After `winget upgrade OpenJS.NodeJS.22`, move to 7 with `npx @astrojs/upgrade`.

Lighthouse (local, 18 Nov 2026, after the move to Astro): desktop and mobile both 100 / 100 / 100 / 100.

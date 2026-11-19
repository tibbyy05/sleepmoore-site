// Astro config for sleepmoore.app. Pages live in src/pages; everything in public/
// (media, site.css, site.js, the motion lab) is copied to the site unchanged.
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sleepmoore.app',
  trailingSlash: 'always',
  integrations: [sitemap()],
});

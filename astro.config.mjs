// Astro config for sleepmoore.app. Pages live in src/pages; everything in public/
// (media, the motion lab) is copied to the site unchanged.
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://sleepmoore.app',
  trailingSlash: 'always',
  // Astro 7 defaults to JSX whitespace rules, which glue inline text to links
  // ("Write to<a>"). Keep HTML rules so the pages render as written.
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
  // Self-hosted fonts: downloaded at build time, served from our own domain with
  // metric-matched fallbacks, so the first paint already has the right shapes.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Nunito',
      cssVariable: '--font-sans',
      weights: [400, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
    // The admin's typeface (owner's mock): a book serif that stays readable at table sizes.
    {
      provider: fontProviders.google(),
      name: 'Source Serif 4',
      cssVariable: '--font-serif',
      weights: [400, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['serif'],
    },
  ],
});

// Content shared across pages. Edit here, not in the page markup.

export const SITE = 'https://sleepmoore.app';
export const EMAIL = 'hello@sleepmoore.app';

export type Link = { href: string; label: string };

/** Header links on the home page (in-page anchors) and on every other page. */
export const NAV_HOME: Link[] = [
  { href: '#worlds', label: 'Worlds' },
  { href: '#stories', label: 'Stories' },
  { href: '#meditations', label: 'Meditations' },
];
export const MENU_HOME: Link[] = [
  { href: '#worlds', label: 'Worlds' },
  { href: '#stories', label: 'Stories' },
  { href: '#meditations', label: 'Meditations' },
  { href: '#night', label: 'The night' },
  { href: '#mix', label: 'Mixer' },
  { href: '#free', label: 'Free' },
  { href: '/support/', label: 'Support' },
  { href: '/privacy/', label: 'Privacy' },
];
export const NAV_PAGE: Link[] = [
  { href: '/#worlds', label: 'Worlds' },
  { href: '/#stories', label: 'Stories' },
  { href: '/#meditations', label: 'Meditations' },
];
/** Phone menu on other pages: room for the rest. */
export const MENU_PAGE: Link[] = [
  ...NAV_PAGE,
  { href: '/#mix', label: 'Mixer' },
  { href: '/support/', label: 'Support' },
  { href: '/privacy/', label: 'Privacy' },
];

/** The four destination rows beside the feature card. `id` must be a world in site.js. */
export const DESTINATIONS = [
  { id: 'moonlit-cove', cap: 'Coastal escape', name: 'Moonlit Cove', line: 'Slow surf, a softer horizon.' },
  { id: 'rainy-cabin', cap: 'Forest retreat', name: 'Rainy Cabin', line: 'Rain on the roof, a fire in the grate.' },
  { id: 'snowfall-lodge', cap: 'Mountain lodge', name: 'Snowfall Lodge', line: 'Snow on the eaves, embers ticking.' },
  { id: 'temple-garden', cap: 'Garden at night', name: 'Temple Garden', line: 'Running water, a chime now and then.' },
];

/** The strip of smaller scenes. `play: false` shows a picture only (no web mix for it yet). */
export const SCENE_STRIP = [
  { id: 'rainfall-sanctuary', name: 'Rainfall Sanctuary', play: true },
  { id: 'ocean-hideaway', name: 'Ocean Hideaway', play: true },
  { id: 'desert-camp', name: 'Desert Camp', play: true },
  { id: 'lighthouse-point', name: 'Lighthouse Point', play: false },
  { id: 'night-ferry', name: 'Night Ferry', play: false },
  { id: 'night-journey', name: 'Night Journey', play: false },
];

export const PRESETS = [
  { id: 'ocean-hideaway', name: 'Ocean Hideaway' },
  { id: 'rainfall-sanctuary', name: 'Rainfall Sanctuary' },
  { id: 'desert-camp', name: 'Desert Camp' },
];

/**
 * Home page questions. `a` is HTML (links allowed); the FAQPage structured data uses the
 * same answers with the tags stripped, so what Google reads always matches the page.
 */
export const FAQ = [
  { q: 'Is Sleep Moore really free?', a: 'Yes. Everything in the app at launch is free and stays free. A later Sleep Moore+ subscription will add new content only, and nothing you have today moves behind it.' },
  { q: 'Do I need an account?', a: 'No. There is nothing to sign up for. Your saved mixes, timer and settings live on your phone, not on our servers.' },
  { q: 'Is the sound on this website the real app sound?', a: 'Yes. The worlds on this page are the same recordings the app plays, mixed live in your browser. The app adds the full library of forty sounds, saved mixes, night journeys, breathing and the gentle wake.' },
  { q: 'Will it keep playing with the screen locked?', a: 'Yes. Sound keeps playing with the screen off, with play, pause and skip on the lock screen, and the sleep timer fades it out when you choose.' },
  { q: 'Where do the sounds come from?', a: 'Real recordings, either our own or released into the public domain, remastered into seamless loops so there is no click or gap to wake you. None of the nature sounds are synthesised.' },
  { q: 'Which phones does it work on?', a: `iPhone and Android, both coming soon. Write to <a href="mailto:${EMAIL}">${EMAIL}</a> and we will tell you the day it lands.` },
];

export const stripTags = (html: string) => html.replace(/<[^>]+>/g, '');

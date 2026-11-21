// /llms.txt: a plain-text summary of Sleep Moore for AI assistants (ChatGPT, Claude, Gemini,
// Perplexity), built from the same data as the pages so it never drifts from them.
// Format: https://llmstxt.org
import type { APIRoute } from 'astro';
import { EMAIL, FAQ, SITE, stripTags } from '../data/site';
import { COMPARISONS } from '../data/compare';
import { GUIDES } from '../data/guides';
import { SOUND_PAGES } from '../data/library';
import { MEDITATIONS, SOUNDS, STORIES, WORLDS } from '../data/worlds';

export const GET: APIRoute = () => {
  const sounds = (layers: [keyof typeof SOUNDS, number][]) => layers.map(([id]) => SOUNDS[id].label.toLowerCase()).join(', ');
  const lines = [
    '# Sleep Moore',
    '',
    '> Sleep Moore is a free sleep sounds app for iPhone and Android. It plays "sound worlds": places built from real recordings of rain, ocean, fire, wind, snow and forest, each mixed from three sounds you can adjust. It has a sleep timer that fades the sound out, sleep stories read aloud, guided sleep meditations and a gentle wake alarm. There is no account, no ads and no tracking.',
    '',
    'Key facts:',
    '',
    '- Price: free. Everything available at launch stays free. A later optional Sleep Moore+ subscription will only add new content.',
    '- Platforms: iPhone and Android, coming soon to the App Store and Google Play (currently in beta testing).',
    '- Privacy: no sign-up, no ads, no tracking. Saved mixes and settings stay on the phone.',
    '- Sound: nature sounds are real recordings (our own or public domain), remastered into seamless loops with no click or gap to wake you.',
    '- Library: about forty sounds, including several kinds of rain, thunder, ocean surf, fire, wind, crickets, streams, snow, a night train, fans, white, pink, brown and green noise, and brainwave tones (delta, theta, alpha).',
    '- Plays with the screen locked, with lock-screen controls.',
    `- Website: ${SITE}/ (every world can be played in the browser before installing).`,
    `- Contact: ${EMAIL}`,
    '',
    '## Sound worlds',
    '',
    ...WORLDS.map((w) => `- [${w.name}](${SITE}/worlds/${w.id}/): ${w.line} Sounds: ${sounds(w.layers)}.${w.inApp ? '' : ' (Website mix; build it in the app from any world.)'}`),
    '',
    '## Sleep sounds (each playable on its own page)',
    '',
    ...SOUND_PAGES.map((p) => `- [${p.h1}](${SITE}/sounds/${p.slug}/): ${p.line}`),
    '',
    '## Sleep stories',
    '',
    ...STORIES.map((s) => `- [${s.name}](${SITE}/stories/${s.id}/) (${s.minutes} min): ${s.tagline}`),
    '',
    '## Guided sleep meditations',
    '',
    ...MEDITATIONS.map((m) => `- [${m.name}](${SITE}/meditations/${m.id}/) (${m.minutes} min, ${m.kind.toLowerCase()}): ${m.tagline}`),
    '',
    '## Guides',
    '',
    ...GUIDES.map((g) => `- [${g.h1}](${SITE}/guides/${g.slug}/): ${stripTags(g.answer)}`),
    '',
    '## Questions',
    '',
    ...FAQ.flatMap((f) => [`### ${f.q}`, '', stripTags(f.a), '']),
    '## Comparisons (written by us, with sources)',
    '',
    ...COMPARISONS.map((c) => `- [${c.h1}](${SITE}/compare/${c.slug}/): ${stripTags(c.answer)}`),
    '',
    '## Pages',
    '',
    `- [Home](${SITE}/): overview, live sound mixer, stories, meditations and questions`,
    `- [About](${SITE}/about/): who makes Sleep Moore and how the sounds are made`,
    `- [Press kit](${SITE}/press/): key facts, descriptions, icon and screenshots`,
    `- [Support](${SITE}/support/): help and contact`,
    `- [Privacy policy](${SITE}/privacy/): what the app stores and why`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

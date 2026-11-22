// Comparison pages (/compare/<slug>/). We make Sleep Moore, so each page must be fair: facts from
// the other app's own pages or App Store listing, prices given as ranges where sources disagree,
// a section on where the other app is the better pick, sources listed, and the date checked.
// Re-check every fact before changing `checked`.
import type { QA, Section } from './library';

export type Comparison = {
  slug: string;
  short: string;
  h1: string;
  title: string;
  description: string;
  answer: string;
  /** Column headings after the feature column. */
  columns: string[];
  /** [feature, cell per column] (cells are HTML). */
  rows: string[][];
  sections: Section[];
  faq: QA[];
  sources: [string, string][];
  /** For the trademark line. */
  brands: string;
  owners: string;
  checked: string;
};

const SM_PRICE = 'Free. Everything at launch stays free; an optional Sleep Moore+ will add new content only';

export const COMPARISONS: Comparison[] = [
  {
    slug: 'sleep-moore-vs-bettersleep',
    short: 'Sleep Moore vs BetterSleep',
    h1: 'Sleep Moore vs BetterSleep: which sleep sounds app is right for you?',
    title: 'Sleep Moore vs BetterSleep: a fair comparison | Sleep Moore',
    description: 'Sleep Moore vs BetterSleep compared fairly: price, account, privacy, sounds, stories, sleep tracking and platforms. Where each one is the better choice, with sources.',
    answer: 'BetterSleep is the bigger app: hundreds of sounds, a sleep tracker with snore detection, and apps for watch, TV and web, mostly behind a subscription and an account. Sleep Moore is smaller and simpler: everything free, no ads, no cookies and no account, built around ten recorded sound worlds. Pick BetterSleep if you want tracking and the largest library; pick Sleep Moore if you want to press play and nothing else.',
    columns: ['Sleep Moore', 'BetterSleep'],
    rows: [
      ['Price', SM_PRICE, 'Free preview; full library needs a subscription, roughly $60 to $70 a year in the US, with a monthly and a lifetime option'],
      ['Free trial', 'Not needed', 'Yes, once per person, for new subscribers'],
      ['Account', 'None', 'Required, according to its own help pages'],
      ['Tracking (App Store label)', 'No data used to track you. Crash diagnostics only, not linked to you', 'Lists data used to track you (purchases, identifiers, usage data)'],
      ['Sound library', 'About 40 recorded sounds, ten sound worlds, three faders per mix', '300+ sounds and music, with a customisable mixer'],
      ['Sleep stories', '3 night journeys, 35 to 45 minutes', '100+ SleepTales'],
      ['Meditations', '5, from 7 to 19 minutes, including Yoga Nidra', '250+ meditations and hypnosis sessions'],
      ['Sleep tracking', 'No. A simple morning “how did you sleep” note only, kept on your phone', 'Yes: sleep tracker, sleep recorder, snore and sleep-talk detection'],
      ['Smart alarm', 'Gentle wake that rises slowly', 'Yes'],
      ['Try it before installing', 'Yes, every world plays on <a href="/">sleepmoore.app</a>', 'No sounds play on its website (checked November 2026)'],
      ['Platforms', 'iPhone and Android (coming soon; iPhone beta)', 'iPhone, iPad, Mac, Apple Watch, Apple TV, Vision Pro, Android, web'],
    ],
    sections: [
      {
        h: 'Where BetterSleep is the better choice',
        p: [],
        list: [
          '<b>You want sleep tracking.</b> BetterSleep records the night and detects snoring and sleep talking. Sleep Moore does not use the microphone at all.',
          '<b>You want the biggest library.</b> Hundreds of sounds, a hundred stories and hundreds of meditations is far more than Sleep Moore has.',
          '<b>You use many devices.</b> BetterSleep runs on Apple Watch, Apple TV, Mac and the web. Sleep Moore is a phone app.',
          '<b>It is available today.</b> Sleep Moore is still on its way to the stores.',
        ],
      },
      {
        h: 'Where Sleep Moore is different',
        p: [],
        list: [
          '<b>No account, no ads.</b> Nothing to sign up for. The App Store label lists only crash diagnostics, not linked to you.',
          '<b>Free, not a preview.</b> Everything in the app at launch stays free. There is no trial clock and no paywall in front of the sounds.',
          '<b>Places, not lists.</b> Each sound world is a scene with three real recordings already balanced, so a good mix takes one tap. You can still swap any layer.',
          '<b>Hear it first.</b> Every world and <a href="/sounds/">every sound</a> plays on this website, in your browser, before you install anything.',
        ],
      },
      {
        h: 'Which should you pick?',
        p: [
          'If you want data about your nights, a vast library and an app on every screen you own, BetterSleep is built for that and is worth its subscription for many people. If you want a calm, free sound to fall asleep to, without an account or a tracker, try Sleep Moore. The quickest way to decide is to <a href="/worlds/rainy-cabin/">play a world here</a> and see whether it is enough.',
        ],
      },
    ],
    faq: [
      { q: 'Is BetterSleep free?', a: 'Partly. Its own help pages say an active subscription is needed for the full library, with a free trial for new subscribers. Sleep Moore is free without a trial or subscription.' },
      { q: 'Is there a free alternative to BetterSleep?', a: 'Yes. Sleep Moore is free with no ads, no cookies and no account. It has fewer sounds and no sleep tracker, but every sound world, story and meditation at launch is free. <a href="/compare/free-sleep-sound-apps/">Other free sleep sound apps compared</a>.' },
      { q: 'Does Sleep Moore track sleep like BetterSleep?', a: 'No. Sleep Moore does not record you or use the microphone. It keeps a simple note of what you played and how you said you slept, on your phone only.' },
    ],
    sources: [
      ['BetterSleep on the App Store (US): features, prices, privacy label', 'https://apps.apple.com/us/app/bettersleep-relax-and-sleep/id314498713'],
      ['BetterSleep help: Is BetterSleep free?', 'https://www.bettersleep.com/support/en/articles/15602562-is-bettersleep-free'],
      ['BetterSleep help: Am I eligible for the free trial?', 'https://www.bettersleep.com/support/en/articles/3491049-am-i-eligible-for-the-free-trial'],
      ['BetterSleep blog: pricing in its 2026 app comparison', 'https://www.bettersleep.com/blog/sleep-cycle-vs-bettersleep-2026-honest-sleep-app-comparison'],
    ],
    brands: 'BetterSleep',
    owners: 'Ipnos Software Inc.',
    checked: '2026-11-21',
  },
  {
    slug: 'sleep-moore-vs-calm',
    short: 'Sleep Moore vs Calm',
    h1: 'Sleep Moore vs Calm for sleep: a fair comparison',
    title: 'Sleep Moore vs Calm for sleep: compared fairly | Sleep Moore',
    description: 'Sleep Moore vs Calm for sleep, compared fairly: price, account, privacy, sleep sounds, Sleep Stories and meditations. Where Calm is the better choice, with sources.',
    answer: 'Calm is a full meditation and wellbeing app with a huge library of Sleep Stories, many read by famous voices, mostly behind a subscription and an account. Sleep Moore does one thing: sleep sounds you can mix, with a few stories and meditations, free, with no ads, no cookies and no account. Choose Calm for stories and meditation courses; choose Sleep Moore for free, private sleep sounds.',
    columns: ['Sleep Moore', 'Calm'],
    rows: [
      ['Price', SM_PRICE, 'Subscription, roughly $70 to $80 a year in the US, with monthly, family and lifetime options'],
      ['Free trial', 'Not needed', '7 days'],
      ['Free without paying', 'Everything', 'Some meditations, a handful of sleep sessions, the first day of each programme'],
      ['Account', 'None', 'Required (a free Calm account)'],
      ['Tracking (App Store label)', 'No data used to track you. Crash diagnostics only, not linked to you', 'Lists data used to track you (purchases, identifiers, usage data)'],
      ['Sleep sounds', 'About 40 recorded sounds and ten sound worlds, mixed on three faders', 'Sleep sounds and soundscapes'],
      ['Sleep stories', '3 night journeys, one calm voice', '100+ Sleep Stories, many with well-known narrators'],
      ['Meditations', '5 sleep meditations, including Yoga Nidra', 'A very large library, with courses and daily sessions'],
      ['Platforms', 'iPhone and Android (coming soon; iPhone beta)', 'iPhone, iPad, Mac, Apple Watch, Apple TV, Vision Pro, Android'],
    ],
    sections: [
      {
        h: 'Where Calm is the better choice',
        p: [],
        list: [
          '<b>You love sleep stories.</b> Calm has more than a hundred, with famous narrators. Sleep Moore has three.',
          '<b>You want to learn meditation.</b> Calm has courses, daily sessions and far more than sleep. Sleep Moore has five sleep meditations.',
          '<b>You want it everywhere.</b> Calm runs on your watch, TV and Mac as well as your phone.',
        ],
      },
      {
        h: 'Where Sleep Moore is different',
        p: [],
        list: [
          '<b>Free and private.</b> No subscription, no ads, no cookies, no account.',
          '<b>Built around sound.</b> Ten recorded places, each three sounds already balanced, and about forty more to swap in. <a href="/sounds/">Hear them all here</a>.',
          '<b>Made for the moment in bed.</b> One tap to play, a timer that fades the sharper sounds first, and a dark screen.',
        ],
      },
      {
        h: 'Use both?',
        p: [
          'Plenty of people use a meditation app in the day and a sound app at night. If Calm’s stories help you, keep them. If you mainly want rain, waves or <a href="/sounds/brown-noise/">brown noise</a> to fall asleep to without paying, Sleep Moore does that on its own.',
        ],
      },
    ],
    faq: [
      { q: 'Is Calm free?', a: 'Partly. Calm says a free account gets some meditations, a few sleep sessions and the first day of each programme; the rest needs a subscription after a 7-day trial. Sleep Moore is free without an account.' },
      { q: 'What is a free alternative to Calm for sleep?', a: 'For sleep sounds, Sleep Moore is free with no ads, no cookies and no account. For sleep stories at Calm’s scale there is no direct free equivalent. <a href="/compare/free-sleep-sound-apps/">Free sleep sound apps compared</a>.' },
    ],
    sources: [
      ['Calm on the App Store (US): features, prices, privacy label', 'https://apps.apple.com/us/app/calm-sleep-meditation/id571800810'],
      ['Calm help: What free content is available?', 'https://support.calm.com/hc/en-us/articles/360044707294-What-Free-Content-is-Available-on-the-Calm-App'],
    ],
    brands: 'Calm',
    owners: 'Calm.com, Inc.',
    checked: '2026-11-21',
  },
  {
    slug: 'free-sleep-sound-apps',
    short: 'Free sleep sound apps compared',
    h1: 'Free sleep sound apps compared: what is actually free?',
    title: 'Best free sleep sound apps: what is really free? | Sleep Moore',
    description: 'Free sleep sound apps compared honestly: Sleep Moore, myNoise, White Noise Lite and Rain Rain. What each one gives you free, ads, account, tracking, and who each one suits.',
    answer: 'Many "free" sleep apps are free trials or carry ads. Of the ones we looked at, myNoise is the deepest free option in a browser, Rain Rain and White Noise Lite are free with ads, and Sleep Moore is free with no ads, no cookies and no account, built around recorded sound worlds.',
    columns: ['Sleep Moore', 'myNoise', 'White Noise Lite', 'Rain Rain'],
    rows: [
      ['What is free', 'Everything at launch', 'Everything in the browser; a dozen soundscapes in the apps', 'Free app with 50+ sounds', '50+ sounds, unlimited playback'],
      ['Ads', 'No', 'No', 'Yes (a paid version removes them)', 'A small banner (premium removes it)'],
      ['Account', 'None', 'None', 'None', 'None'],
      ['Tracking (App Store label)', 'None', 'Says it does not harvest personal data', 'Lists identifiers used for tracking', 'Lists identifiers used for tracking'],
      ['Mixing', 'Ten sound worlds, three faders each, about 40 sounds to swap in', 'Detailed sliders on 350+ soundscapes', 'Mix sounds', 'Mix sounds'],
      ['Stories and meditations', '3 stories, 5 meditations', 'No', 'No', 'No'],
      ['Best for', 'A calm, private app with places to fall asleep in', 'Fine-tuning sound on a computer', 'A classic sound machine', 'A big free library'],
    ],
    sections: [
      {
        h: 'How we chose',
        p: [
          'We looked for apps that are useful without paying, then checked their App Store listings for ads, sign-up and the privacy label. We left out apps that only offer a trial. We make Sleep Moore, so weigh our view of it accordingly.',
        ],
      },
      {
        h: 'The others, in a sentence',
        p: [],
        list: [
          '<b>myNoise</b> is a remarkable website with hundreds of adjustable soundscapes made by people, free in the browser with optional donations. Its apps unlock with a one-time purchase.',
          '<b>White Noise Lite</b> is the long-running classic sound machine, free with ads.',
          '<b>Rain Rain</b> has a large free library with unlimited playback, a small banner ad and an optional premium tier.',
          '<b>Sleep Moore</b> is newer and smaller, free with no ads or account, and the only one here with sleep stories and meditations included.',
        ],
      },
      {
        h: 'Paid apps worth knowing',
        p: [
          'If you want more than sound, <a href="/compare/sleep-moore-vs-bettersleep/">BetterSleep</a> adds sleep tracking and a huge library, and <a href="/compare/sleep-moore-vs-calm/">Calm</a> has the largest collection of sleep stories. Both need a subscription for most of it.',
        ],
      },
    ],
    faq: [
      { q: 'What is the best free sleep sounds app?', a: 'It depends on what you want. For fine control on a computer, myNoise. For a big free library on a phone and do not mind a small ad, Rain Rain. For no ads, no account and recorded sound worlds with stories, Sleep Moore.' },
      { q: 'Are there sleep sound apps without ads?', a: 'Yes. Sleep Moore and myNoise have no ads. Many others are free with ads and charge to remove them.' },
    ],
    sources: [
      ['myNoise', 'https://mynoise.net/'],
      ['White Noise Lite on the App Store (US)', 'https://apps.apple.com/us/app/white-noise-lite/id292987597'],
      ['Rain Rain Sleep Sounds on the App Store (US)', 'https://apps.apple.com/us/app/rain-rain-sleep-sounds/id478687481'],
    ],
    brands: 'myNoise, White Noise Lite and Rain Rain',
    owners: 'their respective owners',
    checked: '2026-11-21',
  },
];

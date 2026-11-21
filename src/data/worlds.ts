// The sound worlds, shared by the pages (build time) and the sound engine (browser).
// Plain data only: no imports, so Node's checks in test/ can read it too.

export type SoundId =
  | 'rain' | 'fire' | 'wind' | 'ocean' | 'night' | 'snow' | 'thunder' | 'stream' | 'chimes' | 'palms' | 'train' | 'ferry'
  | 'story-midnight-express' | 'story-night-ferry' | 'story-lighthouse-keeper' | 'calm-pad'
  | 'white' | 'pink' | 'brown' | 'green' | 'fan' | 'heavy-rain' | 'rain-storm'
  | 'meditation-two-minute-method' | 'meditation-soften-head-to-toe' | 'meditation-let-the-day-go' | 'meditation-back-to-sleep' | 'meditation-yoga-nidra';

/** Each sound's label, Phosphor icon, and a line for the world pages. Audio lives in public/audio/<id>.{opus,flac,m4a}. */
/** `loop: false` marks a narration: it plays once (the story's opening, about 100 s) and then the mix stops. */
export const SOUNDS: Record<SoundId, { label: string; icon: string; line: string; loop?: false }> = {
  rain: { label: 'Rain', icon: 'rain', line: 'Steady rain on a roof and leaves.' },
  fire: { label: 'Fire', icon: 'fire', line: 'Logs settling, the odd crack and hiss.' },
  wind: { label: 'Wind', icon: 'wind', line: 'Air moving through trees, never gusting.' },
  ocean: { label: 'Surf', icon: 'waves', line: 'Slow waves folding onto sand.' },
  night: { label: 'Crickets', icon: 'night', line: 'A warm night full of crickets.' },
  snow: { label: 'Snow', icon: 'snow', line: 'The soft hush of snow falling.' },
  thunder: { label: 'Thunder', icon: 'thunder', line: 'Thunder rolling far off, never close.' },
  stream: { label: 'Water', icon: 'water', line: 'Water running over stone.' },
  chimes: { label: 'Chimes', icon: 'chimes', line: 'A chime now and then, on the breeze.' },
  palms: { label: 'Palms', icon: 'palms', line: 'Palm fronds rustling overhead.' },
  train: { label: 'Train', icon: 'train', line: 'A sleeper carriage, rocking steadily on.' },
  ferry: { label: 'Water', icon: 'boat', line: 'Small waves along a slow hull.' },
  white: { label: 'White noise', icon: 'waveform', line: 'Every frequency at once, an even hiss.' },
  pink: { label: 'Pink noise', icon: 'waveform', line: 'Softer than white, like steady rain.' },
  brown: { label: 'Brown noise', icon: 'waveform', line: 'A deep, low rumble, like a far waterfall.' },
  green: { label: 'Green noise', icon: 'waveform', line: 'The middle of the sound, like wind in trees.' },
  fan: { label: 'Fan', icon: 'fan', line: 'A box fan on low, steady all night.' },
  'heavy-rain': { label: 'Heavy rain', icon: 'rain', line: 'A downpour, close and full.' },
  'rain-storm': { label: 'Storm', icon: 'thunder', line: 'Rain on glass with a storm passing.' },
  'story-midnight-express': { label: 'Narrator', icon: 'narrator', line: 'The Midnight Express, read aloud.', loop: false },
  'story-night-ferry': { label: 'Narrator', icon: 'narrator', line: 'The Night Ferry, read aloud.', loop: false },
  'story-lighthouse-keeper': { label: 'Narrator', icon: 'narrator', line: 'The Lighthouse Keeper, read aloud.', loop: false },
  'calm-pad': { label: 'Pad', icon: 'waveform', line: 'A soft, slow pad under the voice.' },
  'meditation-two-minute-method': { label: 'Voice', icon: 'narrator', line: 'The two-minute method, guided.', loop: false },
  'meditation-soften-head-to-toe': { label: 'Voice', icon: 'narrator', line: 'Soften, head to toe, guided.', loop: false },
  'meditation-let-the-day-go': { label: 'Voice', icon: 'narrator', line: 'Let the day go, guided.', loop: false },
  'meditation-back-to-sleep': { label: 'Voice', icon: 'narrator', line: 'Back to sleep, guided.', loop: false },
  'meditation-yoga-nidra': { label: 'Voice', icon: 'narrator', line: 'Yoga Nidra, guided.', loop: false },
};

/**
 * Ambient effects drawn over a world's picture, louder as its sounds play.
 * Points are fractions of the source image (x, y), so they follow the picture at any crop.
 */
export type Effect =
  | { kind: 'rain'; sound: SoundId }
  | { kind: 'snow'; sound: SoundId }
  | { kind: 'embers'; sound: SoundId; at: [number, number] }
  | { kind: 'fireflies'; sound: SoundId; band: [number, number] }
  | { kind: 'leaves'; sound: SoundId }
  | { kind: 'spray'; sound: SoundId; band: [number, number] }
  | { kind: 'lightning'; sound: SoundId }
  | { kind: 'glow'; sound: SoundId; at: [number, number]; radius: number; color: string }
  /** Low cloud drifting across the valley; wind pushes it along. */
  | { kind: 'mist'; sound: SoundId; band: [number, number] };

export type World = {
  id: string;
  name: string;
  /** Short label above the name. */
  cap: string;
  /** One line, used on cards. */
  line: string;
  /** Two or three sentences for the world's page: what the picture shows and what you hear. */
  intro: string;
  /** Sound and starting level (0-100), in fader order. */
  layers: [SoundId, number][];
  /** False for a mix that exists on the website only. */
  inApp: boolean;
  /** Where the picture's subject sits (CSS object-position), so crops keep it. */
  focus: string;
  effects: Effect[];
};

export const WORLDS: World[] = [
  {
    id: 'rainy-cabin',
    name: 'Rainy Cabin',
    cap: 'Forest retreat',
    line: 'Rain on the roof, a fire in the grate.',
    intro: 'A cabin on a pine island in a mountain lake, every window lit. Rain drums on the roof, a fire settles in the grate, and the wind stays out on the water.',
    layers: [['rain', 75], ['fire', 70], ['night', 30], ['wind', 30]],
    inApp: true,
    focus: '45% 55%',
    effects: [{ kind: 'rain', sound: 'rain' }, { kind: 'glow', sound: 'fire', at: [0.44, 0.58], radius: 0.16, color: '255,170,90' }],
  },
  {
    id: 'moonlit-cove',
    name: 'Moonlit Cove',
    cap: 'Coastal escape',
    line: 'Slow surf, a softer horizon.',
    intro: 'A stone cottage above a quiet cove, the moon laying a path across the water to a little jetty. Slow surf on the sand, a breeze in the grass, crickets in the dark.',
    layers: [['ocean', 75], ['wind', 50], ['night', 35]],
    inApp: true,
    focus: '50% 50%',
    effects: [{ kind: 'fireflies', sound: 'night', band: [0.55, 0.95] }, { kind: 'spray', sound: 'ocean', band: [0.72, 1] }],
  },
  {
    id: 'snowfall-lodge',
    name: 'Snowfall Lodge',
    cap: 'Mountain lodge',
    line: 'Snow on the eaves, embers ticking.',
    intro: 'A chalet deep in fresh snow, smoke curling from the chimney and a lantern-lit bridge over the stream. Snow on the eaves, the fire ticking inside, the wind far up the valley.',
    layers: [['snow', 70], ['fire', 75], ['wind', 35]],
    inApp: true,
    focus: '40% 50%',
    effects: [{ kind: 'snow', sound: 'snow' }, { kind: 'glow', sound: 'fire', at: [0.26, 0.55], radius: 0.18, color: '255,175,95' }],
  },
  {
    id: 'rainfall-sanctuary',
    name: 'Rainfall Sanctuary',
    cap: 'Rainforest pavilion',
    line: 'Rain, running water, thunder far off.',
    intro: 'A lantern-lit pavilion in the rainforest, beside a waterfall that never stops. Rain on broad leaves, water running past, and thunder rolling somewhere beyond the hills.',
    layers: [['rain', 70], ['stream', 65], ['thunder', 30]],
    inApp: true,
    focus: '50% 45%',
    effects: [{ kind: 'rain', sound: 'rain' }, { kind: 'spray', sound: 'stream', band: [0.55, 0.95] }, { kind: 'lightning', sound: 'thunder' }],
  },
  {
    id: 'ocean-hideaway',
    name: 'Ocean Hideaway',
    cap: 'Island nights',
    line: 'Waves, a breeze, palms overhead.',
    intro: 'A thatched hut on an empty beach, a hammock on the porch and the moon over the bay. The waves come and go, and the breeze moves through the palms.',
    layers: [['ocean', 80], ['wind', 45], ['palms', 40]],
    inApp: true,
    focus: '35% 50%',
    effects: [{ kind: 'spray', sound: 'ocean', band: [0.68, 1] }, { kind: 'glow', sound: 'palms', at: [0.14, 0.6], radius: 0.14, color: '255,190,120' }],
  },
  {
    id: 'temple-garden',
    name: 'Temple Garden',
    cap: 'Garden at night',
    line: 'Running water, a chime now and then.',
    intro: 'A temple garden at night: red maples, a koi pond, a small waterfall and bronze bells under the eaves. Water over stone, a chime now and then, a breeze that barely moves.',
    layers: [['stream', 65], ['chimes', 35], ['wind', 30]],
    inApp: true,
    focus: '45% 50%',
    effects: [{ kind: 'leaves', sound: 'wind' }, { kind: 'spray', sound: 'stream', band: [0.5, 0.8] }],
  },
  {
    id: 'desert-camp',
    name: 'Desert Camp',
    cap: 'Under the stars',
    line: 'A fire in the dunes, wind and crickets.',
    intro: 'A canvas tent in the dunes beneath the Milky Way, lanterns lit and a fire burning low. The desert wind comes and goes, and crickets fill the quiet.',
    layers: [['wind', 55], ['fire', 70], ['night', 30]],
    inApp: true,
    focus: '55% 50%',
    effects: [{ kind: 'embers', sound: 'fire', at: [0.405, 0.82] }, { kind: 'glow', sound: 'fire', at: [0.405, 0.83], radius: 0.18, color: '255,150,70' }, { kind: 'fireflies', sound: 'night', band: [0.6, 0.95] }],
  },
  {
    id: 'alpine-lake',
    name: 'Alpine Lake',
    cap: 'Feature destination',
    line: 'Wind off the peaks, crickets on the shore.',
    intro: 'A still lake under snowy peaks just after dark, one cabin lit on the far shore. Wind off the mountains, crickets along the bank and a stream feeding the water.',
    layers: [['wind', 45], ['night', 35], ['stream', 25]],
    inApp: false,
    focus: '50% 50%',
    effects: [{ kind: 'fireflies', sound: 'night', band: [0.6, 0.98] }, { kind: 'spray', sound: 'stream', band: [0.62, 0.9] }],
  },
];

export const WORLDS_BY_ID: Record<string, World> = Object.fromEntries(WORLDS.map((w) => [w.id, w]));

/** The home hero (the cabin window): drops on the glass, firelight from the stove and the lamp. */
/**
 * The home hero is the Rainy Cabin bedroom, and it listens: rain on the glass, fireflies in the
 * pines (crickets), mist across the valley (wind), and a real fire in the stove whose size follows
 * the Fire fader. All positions are fractions of the source image, so they follow any crop.
 * Phones use a tall crop of the same photo that keeps the stove in view.
 */
export type HeroLayout = {
  natural: [number, number];
  position: [number, number];
  /** Window glass x0, y0, x1, y1: rain, fireflies and mist stay inside it. */
  glass: [number, number, number, number];
  /** The area the fire videos cover; the stove door frames it. */
  stove: [number, number, number, number];
  effects: Effect[];
};
const HERO_SHARED: Effect[] = [
  { kind: 'fireflies', sound: 'night', band: [0.46, 0.68] },
  { kind: 'mist', sound: 'wind', band: [0.5, 0.66] },
];
export const HERO_SCENE: { desktop: HeroLayout; mobile: HeroLayout } = {
  desktop: {
    natural: [2560, 1434], position: [0.5, 0.4],
    glass: [0.175, 0.06, 0.885, 0.71],
    stove: [0.05759, 0.56762, 0.13051, 0.70538],
    effects: [
      ...HERO_SHARED,
      { kind: 'glow', sound: 'fire', at: [0.094, 0.66], radius: 0.16, color: '255,150,70' },
      { kind: 'glow', sound: 'fire', at: [0.955, 0.52], radius: 0.07, color: '255,200,140' },
    ],
  },
  mobile: {
    // public/img/hero-cabin-stove-mobile*.webp: x 60 to 860 of the 2560 picture, full height
    natural: [800, 1434], position: [0.3, 0.4],
    glass: [0.485, 0.06, 1, 0.71],
    stove: [0.10925, 0.56762, 0.34263, 0.70538],
    effects: [
      ...HERO_SHARED,
      { kind: 'glow', sound: 'fire', at: [0.226, 0.66], radius: 0.5, color: '255,150,70' },
    ],
  },
};

/**
 * Night journeys: narrated stories read over the sounds of the place, as in the app. On the site
 * each plays its first 100 seconds (public/audio/story-<id>.*) with its bed underneath.
 */
export type Story = {
  id: string;
  name: string;
  tagline: string;
  /** The whole journey in the app, story then sounds, and the narration alone. */
  minutes: number;
  narration: number;
  icon: string;
  /** Narration and bed, as layers (narration first). */
  layers: [SoundId, number][];
  bed: string;
  isNew?: boolean;
};

export const STORIES: Story[] = [
  {
    id: 'lighthouse-keeper',
    name: 'The Lighthouse Keeper',
    tagline: 'One quiet night tending the light, with the sea and the rain for company.',
    minutes: 45,
    narration: 27,
    icon: 'lighthouse',
    layers: [['story-lighthouse-keeper', 100], ['ocean', 42]],
    bed: 'the sea',
    isNew: true,
  },
  {
    id: 'night-ferry',
    name: 'The Night Ferry',
    tagline: 'A slow crossing of a still lake under the stars, in a berth by a round window.',
    minutes: 35,
    narration: 9,
    icon: 'boat',
    layers: [['story-night-ferry', 100], ['ferry', 52]],
    bed: 'the water',
  },
  {
    id: 'midnight-express',
    name: 'The Midnight Express',
    tagline: 'An overnight sleeper through the mountains, the carriage rocking gently on.',
    minutes: 35,
    narration: 9,
    icon: 'train',
    layers: [['story-midnight-express', 100], ['train', 50]],
    bed: 'the train',
  },
];

export const STORIES_BY_ID: Record<string, Story> = Object.fromEntries(STORIES.map((s) => [s.id, s]));

/**
 * Guided sleep meditations from the app: one calm voice over a soft pad. On the site each plays
 * its first 100 seconds (public/audio/meditation-<id>.*) over the pad.
 */
export type Meditation = {
  id: string;
  name: string;
  tagline: string;
  /** What it is for, in a few words. */
  kind: string;
  /** Length of the guided voice in the app. */
  minutes: number;
  icon: string;
  layers: [SoundId, number][];
};

export const MEDITATIONS: Meditation[] = [
  { id: 'two-minute-method', name: 'The Two-Minute Method', kind: 'Fall asleep fast', tagline: 'Relax the body part by part, then still the mind for a few slow breaths.', minutes: 7, icon: 'moon', layers: [['meditation-two-minute-method', 100], ['calm-pad', 40]] },
  { id: 'soften-head-to-toe', name: 'Soften, Head to Toe', kind: 'Deep body relaxation', tagline: 'A slow wave of warmth through the whole body, from the crown to the toes.', minutes: 11, icon: 'lotus', layers: [['meditation-soften-head-to-toe', 100], ['calm-pad', 40]] },
  { id: 'let-the-day-go', name: 'Let the Day Go', kind: 'Quiet racing thoughts', tagline: 'For a busy mind: set each thought on a leaf and let the stream carry it.', minutes: 9, icon: 'leaf', layers: [['meditation-let-the-day-go', 100], ['calm-pad', 40]] },
  { id: 'back-to-sleep', name: 'Back to Sleep', kind: 'Woken in the night', tagline: 'Woken at three? Slow the breath, count down, and drift back.', minutes: 8, icon: 'night', layers: [['meditation-back-to-sleep', 100], ['calm-pad', 40]] },
  { id: 'yoga-nidra', name: 'Yoga Nidra', kind: 'Deepest rest', tagline: 'The yogic sleep: rest each part of the body, count the breath down, and drift.', minutes: 19, icon: 'moon', layers: [['meditation-yoga-nidra', 100], ['calm-pad', 40]] },
];
export const MEDITATIONS_BY_ID: Record<string, Meditation> = Object.fromEntries(MEDITATIONS.map((m) => [m.id, m]));

/**
 * One page per sound people search for (/sounds/<slug>/): the sound on its own, with two faders
 * to blend in something else (they start at zero unless the mix needs them). Mix id: sound-<slug>.
 * The words for each page are in library.ts.
 */
export type SoundMix = { id: string; slug: string; name: string; layers: [SoundId, number][] };
const soundMix = (slug: string, name: string, layers: [SoundId, number][]): SoundMix => ({ id: `sound-${slug}`, slug, name, layers });
export const SOUND_MIXES: SoundMix[] = [
  soundMix('rain', 'Rain', [['rain', 80], ['heavy-rain', 0], ['thunder', 0]]),
  soundMix('thunderstorm', 'Thunderstorm', [['rain-storm', 75], ['thunder', 55], ['wind', 0]]),
  soundMix('ocean-waves', 'Ocean waves', [['ocean', 80], ['wind', 0], ['palms', 0]]),
  soundMix('brown-noise', 'Brown noise', [['brown', 70], ['rain', 0], ['fan', 0]]),
  soundMix('white-noise', 'White noise', [['white', 55], ['fan', 0], ['rain', 0]]),
  soundMix('pink-noise', 'Pink noise', [['pink', 65], ['rain', 0], ['ocean', 0]]),
  soundMix('green-noise', 'Green noise', [['green', 65], ['stream', 0], ['night', 0]]),
  soundMix('fan', 'Fan', [['fan', 75], ['brown', 0], ['rain', 0]]),
  soundMix('fireplace', 'Fireplace', [['fire', 80], ['rain', 0], ['wind', 0]]),
  soundMix('train', 'Train', [['train', 75], ['rain', 0], ['wind', 0]]),
  soundMix('crickets', 'Crickets', [['night', 75], ['stream', 0], ['wind', 0]]),
  soundMix('river', 'River and stream', [['stream', 80], ['night', 0], ['wind', 0]]),
];
export const SOUND_MIXES_BY_ID: Record<string, SoundMix> = Object.fromEntries(SOUND_MIXES.map((m) => [m.id, m]));

/** Anything the player can play: a world, a sound, a story or a meditation. */
export type Mix = { id: string; name: string; layers: [SoundId, number][] };
export const MIXES_BY_ID: Record<string, Mix> = { ...WORLDS_BY_ID, ...SOUND_MIXES_BY_ID, ...STORIES_BY_ID, ...MEDITATIONS_BY_ID };
/** The page that belongs to a mix: the dock links back to it. */
export const mixHref = (id: string) =>
  id in STORIES_BY_ID ? `/stories/${id}/` : id in MEDITATIONS_BY_ID ? `/meditations/${id}/` : id in SOUND_MIXES_BY_ID ? `/sounds/${SOUND_MIXES_BY_ID[id].slug}/` : `/worlds/${id}/`;
/** Stories and meditations are guided: a voice that plays once over a bed, then the mix ends. */
export const guidedKind = (id: string): 'story' | 'meditation' | null => (id in STORIES_BY_ID ? 'story' : id in MEDITATIONS_BY_ID ? 'meditation' : null);
export const isStory = (id: string) => guidedKind(id) !== null;

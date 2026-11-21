// Scene pictures (src/assets/scenes/<id>.jpg) for Astro's image pipeline, plus a colour for each
// that shows while the picture loads. Build-time only: imports image files.
import type { ImageMetadata } from 'astro';
import colors from '../assets/scene-colors.json';

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/scenes/*.jpg', { eager: true });

export const SCENES: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(files).map(([path, mod]) => [path.split('/').pop()!.replace(/\.jpg$/, ''), mod.default]),
);
export const SCENE_COLORS: Record<string, string> = colors;

/** Story covers (src/assets/stories/<id>.jpg), 3:4 like the app's journey plates. */
const covers = import.meta.glob<{ default: ImageMetadata }>('../assets/stories/*.jpg', { eager: true });
export const STORY_COVERS: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(covers).map(([path, mod]) => [path.split('/').pop()!.replace(/\.jpg$/, ''), mod.default]),
);
export const STORY_COLORS: Record<string, string> = { 'lighthouse-keeper': '#43291b', 'night-ferry': '#42281d', 'midnight-express': '#2e1711' };

/** Meditation covers (src/assets/meditations/<id>.jpg), 3:4 like the app's. */
const medCovers = import.meta.glob<{ default: ImageMetadata }>('../assets/meditations/*.jpg', { eager: true });
export const MEDITATION_COVERS: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(medCovers).map(([path, mod]) => [path.split('/').pop()!.replace(/\.jpg$/, ''), mod.default]),
);
export const MEDITATION_COLORS: Record<string, string> = { 'two-minute-method': '#141b29', 'soften-head-to-toe': '#2a1e18', 'let-the-day-go': '#2a2118', 'back-to-sleep': '#121e34', 'yoga-nidra': '#2b1d18' };

/** What each picture shows, for screen readers and image search. Describe the picture, not the brand. */
export const SCENE_ALT: Record<string, string> = {
  'rainy-cabin': 'A lit wooden cabin on a pine island in a mountain lake, on a rainy night',
  'moonlit-cove': 'A stone cottage above a quiet cove, moonlight on the water and a small jetty',
  'snowfall-lodge': 'A snowy mountain chalet at night, smoke from the chimney and a lantern-lit bridge',
  'rainfall-sanctuary': 'A lantern-lit pavilion beside a rainforest waterfall in the rain',
  'ocean-hideaway': 'A thatched beach hut with a hammock under the moon, palms and calm surf',
  'temple-garden': 'A temple garden at night with red maples, a koi pond and a small waterfall',
  'desert-camp': 'A canvas tent and campfire in the desert dunes under the Milky Way',
  'alpine-lake': 'A still alpine lake below snowy peaks at dusk, one cabin lit on the far shore',
  'lighthouse-point': 'A lighthouse on a rocky point at night, its beam over a stormy sea',
  'night-ferry': 'The deck of a ferry crossing a dark lake at night, town lights on the far shore',
  'night-journey': 'A sleeper train cabin at night, a made bed and tea by a window onto snowy mountains',
  dawn: 'A bed facing a wide window over misty mountains at sunrise',
};

/** Covers for the night journeys and meditations. */
export const COVER_ALT: Record<string, string> = {
  'lighthouse-keeper': 'A cosy bunk inside a lighthouse, a round window onto the moonlit sea',
  'night-ferry': 'A ferry cabin berth by a round window, the Milky Way over a still lake',
  'midnight-express': 'A sleeper train compartment at night, mountains and a lake outside the window',
  'two-minute-method': 'A rowing boat with a lantern on a still mountain lake under the stars',
  'soften-head-to-toe': 'A soft bed by lamplight, the moon outside the window',
  'let-the-day-go': 'A forest stream at dusk with autumn leaves floating on the water',
  'back-to-sleep': 'A dark blue bedroom at night, the full moon through the window',
  'yoga-nidra': 'A floor cushion and candle beneath a round window onto snowy mountains',
};

/** The app's square sound tiles (src/assets/tiles/<id>.jpg), art for the sound pages. */
const tiles = import.meta.glob<{ default: ImageMetadata }>('../assets/tiles/*.jpg', { eager: true });
export const TILES: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(tiles).map(([path, mod]) => [path.split('/').pop()!.replace(/\.jpg$/, ''), mod.default]),
);
/** Each tile's average colour: the placeholder while it loads and the glow behind it. */
export const TILE_COLORS: Record<string, string> = { brown: '#341507', fan: '#2e2725', fire: '#362322', green: '#1a322d', 'heavy-rain': '#4c352a', night: '#19212b', ocean: '#1f3b48', pink: '#673e53', 'rain-storm': '#241e29', rain: '#242022', snow: '#352c2f', stream: '#473b32', thunder: '#1d273d', train: '#3d2c25', white: '#313e51', wind: '#313e54' };

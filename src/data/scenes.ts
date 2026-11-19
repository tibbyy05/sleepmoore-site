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

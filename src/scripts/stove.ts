/* The hero's wood stove: three short loops of real fire (embers, steady, roaring) laid over the
   stove glass and crossfaded by the Fire fader, so the fire grows and shrinks as you mix. The
   loops were made from this photo, so the stove door in the picture frames them. They play only
   while the hero is on screen, and never under prefers-reduced-motion (the photo's fire stays). */
import { faderLevel, energy, state } from './engine';

type Options = {
  worldId: string;
  natural: [number, number];
  position: [number, number];
  /** x0, y0, x1, y1 as fractions of the image. */
  stove: [number, number, number, number];
};

const CLIPS = ['low', 'mid', 'high'];
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export function mountStove(host: HTMLElement, o: Options): () => void {
  const box = document.createElement('div');
  box.className = 'stove';
  box.setAttribute('aria-hidden', 'true');
  const vids = CLIPS.map((n) => {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.src = '/video/fire-' + n + '.mp4';
    box.appendChild(v);
    return v;
  });
  host.appendChild(box);

  const place = () => {
    const r = host.getBoundingClientRect();
    const [iw, ih] = o.natural;
    const s = Math.max(r.width / iw, r.height / ih);
    const dw = iw * s, dh = ih * s;
    const ox = (r.width - dw) * o.position[0], oy = (r.height - dh) * o.position[1];
    const [x0, y0, x1, y1] = o.stove;
    Object.assign(box.style, { left: ox + x0 * dw + 'px', top: oy + y0 * dh + 'px', width: (x1 - x0) * dw + 'px', height: (y1 - y0) * dh + 'px' });
  };

  let size = faderLevel(o.worldId, 'fire'), raf = 0, visible = true;
  const frame = () => {
    // The fader sets the fire's size; while it plays, the crackle makes it breathe a little.
    const live = state.playing && state.current === o.worldId ? 0.08 * energy : 0;
    size += (faderLevel(o.worldId, 'fire') + live - size) * 0.08;
    vids[1].style.opacity = smooth(clamp(size * 2)).toFixed(3);
    vids[2].style.opacity = smooth(clamp(size * 2 - 1)).toFixed(3);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf || !visible || document.hidden) return;
    vids.forEach((v) => { const p = v.play(); if (p) p.catch(() => {}); });
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; vids.forEach((v) => v.pause()); };

  place();
  const ro = new ResizeObserver(place); ro.observe(host);
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); });
  io.observe(host);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  // Fade the clips in once they can play, so the photo's own fire never blinks away.
  vids[0].addEventListener('canplay', () => box.classList.add('is-live'), { once: true });
  start();

  return () => { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); box.remove(); };
}

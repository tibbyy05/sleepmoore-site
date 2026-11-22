/* Living tracks: each hero fader is a small glass tube with its sound alive inside the filled part.
   Rain falls in the Rain tube, sparks rise in Fire, fireflies blink in Crickets, streaks blow along
   Wind. Busier with a higher level, and with the live loudness while the cabin plays. One loop
   draws all four; it stops off screen, in background tabs and under prefers-reduced-motion. */
import { energy, faderLevel, soundLevel, state } from './engine';

type Track = { id: string; canvas: HTMLCanvasElement; color: string };
type Bit = { x: number; y: number; v: number; s: number; a: number; age: number };

const THUMB = 9; // half the thumb width: the fill ends under the thumb's centre
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function mountTracks(worldId: string, tracks: Track[]): () => void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = tracks.map((t) => ({ ...t, c: t.canvas.getContext('2d')!, bits: [] as Bit[], w: 0, h: 0, carry: 0 }));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = () => items.forEach((it) => {
    const r = it.canvas.getBoundingClientRect();
    it.w = Math.max(1, r.width); it.h = Math.max(1, r.height);
    it.canvas.width = Math.round(it.w * dpr); it.canvas.height = Math.round(it.h * dpr);
    it.c.setTransform(dpr, 0, 0, dpr, 0, 0);
  });

  function draw(it: (typeof items)[number], dt: number, now: number) {
    const { c, w, h } = it;
    const f = faderLevel(worldId, it.id);
    const playing = state.playing && state.current === worldId;
    const L = Math.min(1, f * (playing ? 0.7 + 0.6 * energy + soundLevel(worldId, it.id) * 0.3 : 0.75));
    const end = THUMB + f * (w - THUMB * 2);
    const r = h / 2;
    c.clearRect(0, 0, w, h);
    // The tube
    c.fillStyle = 'rgba(243,234,219,0.09)';
    c.beginPath(); c.roundRect(0, 0, w, h, r); c.fill();
    if (end <= 1) return;
    c.save();
    c.beginPath(); c.roundRect(0, 0, end, h, r); c.clip();
    const g = c.createLinearGradient(0, 0, end, 0);
    g.addColorStop(0, `rgba(${it.color},0.18)`); g.addColorStop(1, `rgba(${it.color},${(0.42 + 0.3 * L).toFixed(3)})`);
    c.fillStyle = g; c.fillRect(0, 0, end, h);
    // What lives inside
    const bits = it.bits;
    if (dt > 0) {
      const rate = { rain: 60, fire: 26, night: 5, wind: 18 }[it.id] ?? 10;
      it.carry += dt * rate * (0.25 + L) * (end / 160);
      while (it.carry > 1 && bits.length < 90) {
        it.carry--;
        if (it.id === 'rain') bits.push({ x: rand(0, end), y: -4, v: rand(40, 70), s: rand(3, 5), a: rand(0.5, 0.95), age: 0 });
        else if (it.id === 'fire') bits.push({ x: rand(0, end), y: h + 1, v: rand(10, 22), s: rand(0.8, 1.6), a: 1, age: 0 });
        else if (it.id === 'night') bits.push({ x: rand(4, end - 4), y: rand(2, h - 2), v: rand(1.2, 2.4), s: rand(1, 1.6), a: 0, age: 0 });
        else bits.push({ x: -20, y: rand(1.5, h - 1.5), v: rand(60, 120), s: rand(10, 22), a: rand(0.4, 0.8), age: 0 });
      }
    }
    for (let k = bits.length - 1; k >= 0; k--) {
      const b = bits[k]; b.age += dt;
      if (it.id === 'rain') {
        b.y += b.v * dt * (0.8 + L); b.x -= b.v * dt * 0.12;
        if (b.y > h + 4) { bits.splice(k, 1); continue; }
        c.strokeStyle = `rgba(225,236,255,${(b.a * (0.5 + 0.5 * L)).toFixed(3)})`; c.lineWidth = 1;
        c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + b.s * 0.12, b.y - b.s); c.stroke();
      } else if (it.id === 'fire') {
        b.y -= b.v * dt * (0.8 + L); b.x += Math.sin(now / 160 + b.v) * 6 * dt;
        const t = 1 - b.y / h;
        if (b.y < -2) { bits.splice(k, 1); continue; }
        c.fillStyle = `rgba(255,${Math.round(220 - 90 * t)},${Math.round(140 - 100 * t)},${(1 - t * 0.7).toFixed(3)})`;
        c.beginPath(); c.arc(b.x, b.y, b.s, 0, 6.283); c.fill();
      } else if (it.id === 'night') {
        const blink = Math.max(0, Math.sin(b.age * b.v * 2.2)) ** 2;
        if (b.age * b.v * 2.2 > Math.PI * 2) { bits.splice(k, 1); continue; }
        const gg = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, 4.5);
        gg.addColorStop(0, `rgba(245,255,190,${blink.toFixed(3)})`); gg.addColorStop(1, 'rgba(200,230,110,0)');
        c.fillStyle = gg; c.beginPath(); c.arc(b.x, b.y, 4.5, 0, 6.283); c.fill();
      } else {
        b.x += b.v * dt * (0.6 + L * 1.4);
        if (b.x - b.s > end) { bits.splice(k, 1); continue; }
        const lg = c.createLinearGradient(b.x - b.s, 0, b.x, 0);
        lg.addColorStop(0, 'rgba(236,241,250,0)'); lg.addColorStop(1, `rgba(236,241,250,${(b.a * (0.45 + 0.5 * L)).toFixed(3)})`);
        c.strokeStyle = lg; c.lineWidth = 1;
        c.beginPath(); c.moveTo(b.x - b.s, b.y); c.lineTo(b.x, b.y); c.stroke();
      }
    }
    // Remove anything left beyond a fader that was just lowered
    for (let k = bits.length - 1; k >= 0; k--) if (bits[k].x > end + 25) bits.splice(k, 1);
    c.restore();
    // A soft glow where the fill meets the thumb
    const eg = c.createRadialGradient(end, r, 0, end, r, 14);
    eg.addColorStop(0, `rgba(${it.color},${(0.35 + 0.35 * L).toFixed(3)})`); eg.addColorStop(1, `rgba(${it.color},0)`);
    c.fillStyle = eg; c.fillRect(end - 14, 0, 28, h);
  }

  let raf = 0, last = 0, visible = true;
  const frame = (now: number) => {
    const dt = reduced ? 0 : Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    items.forEach((it) => draw(it, dt, now));
    raf = reduced ? 0 : requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  size();
  const ro = new ResizeObserver(() => { size(); if (reduced) frame(performance.now()); });
  items.forEach((it) => ro.observe(it.canvas));
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); });
  io.observe(items[0].canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  start();
  if (reduced) frame(performance.now());
  return () => { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}

/** Mood presets for the hero: one tap sweeps all four faders to a mix. */
export const MOODS: { id: string; name: string; levels: Record<string, number> }[] = [
  { id: 'cabin', name: 'Rainy Cabin', levels: { rain: 75, fire: 70, night: 45, wind: 30 } },
  { id: 'downpour', name: 'Downpour', levels: { rain: 100, fire: 35, night: 5, wind: 55 } },
  { id: 'fire', name: 'By the fire', levels: { rain: 25, fire: 95, night: 25, wind: 10 } },
  { id: 'summer', name: 'Summer night', levels: { rain: 0, fire: 15, night: 90, wind: 25 } },
  { id: 'storm', name: 'Storm at the window', levels: { rain: 100, fire: 60, night: 0, wind: 100 } },
];

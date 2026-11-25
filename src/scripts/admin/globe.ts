/* The Live page's globe: the land as a field of dots on a slowly turning night-side Earth, with a gold
   light for each country people are visiting from. Recent visitors pulse; earlier ones in the feed
   glow softly. Plain canvas and an orthographic projection, no map library. Drag to turn it. */
import { CENTROIDS, LAND } from './geo-data';

export type GlobeSpot = { cc: string; people: number; recent: boolean; label: string };

const RAD = Math.PI / 180;
const land: [number, number][] = [];
for (let i = 0; i < LAND.length; i += 4) {
  land.push([(parseInt(LAND.slice(i, i + 2), 36) - 360) / 2, (parseInt(LAND.slice(i + 2, i + 4), 36) - 180) / 2]);
}

export function globe(host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  host.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let spots: (GlobeSpot & { lon: number; lat: number })[] = [];
  let lon0 = -20, lat0 = 18; // centre of view; lat0 tips the north towards us a little
  let target: number | null = null;
  let size = 0, dpr = 1, raf = 0, last = 0, drag: { x: number; y: number; lon: number; lat: number } | null = null, idleUntil = 0;

  const resize = () => {
    size = Math.min(host.clientWidth, host.clientHeight || host.clientWidth);
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(size * dpr);
    canvas.style.width = canvas.style.height = size + 'px';
    if (still) draw(0);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  /** Screen position and depth (1 facing us, 0 on the edge) of a point, or null when it is behind. */
  const project = (lon: number, lat: number, r: number, c: number) => {
    const l = (lon - lon0) * RAD, p = lat * RAD, p0 = lat0 * RAD;
    const cosP = Math.cos(p);
    const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * cosP * Math.cos(l);
    if (z <= 0) return null;
    return { x: c + r * cosP * Math.sin(l), y: c - r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * cosP * Math.cos(l)), z };
  };

  function draw(t: number) {
    const W = size * dpr, c = W / 2, r = W * 0.44;
    ctx.clearRect(0, 0, W, W);
    // Atmosphere: a soft blue rim of light around the planet.
    const halo = ctx.createRadialGradient(c, c, r * 0.92, c, c, r * 1.22);
    halo.addColorStop(0, 'rgba(134,169,227,0.20)');
    halo.addColorStop(0.35, 'rgba(134,169,227,0.07)');
    halo.addColorStop(1, 'rgba(134,169,227,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, W);
    // The night-side sphere, lit faintly from the upper left.
    const body = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, r * 0.1, c, c, r);
    body.addColorStop(0, '#1b2333');
    body.addColorStop(1, '#0c1019');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(134,169,227,0.22)';
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();
    // Land: dots that dim and shrink towards the edge, which is what makes it read as a ball.
    const dot = Math.max(0.9, r / 260) * dpr;
    for (const [lon, lat] of land) {
      const q = project(lon, lat, r, c);
      if (!q) continue;
      ctx.fillStyle = `rgba(243,234,219,${(0.1 + 0.5 * q.z).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(q.x, q.y, dot * (0.55 + 0.45 * q.z), 0, Math.PI * 2); ctx.fill();
    }
    // Visitors: a gold light per country, sized by people; recent ones send out a slow ring.
    for (const s of spots) {
      const q = project(s.lon, s.lat, r, c);
      if (!q) continue;
      const base = (2.6 + Math.min(5, Math.sqrt(s.people) * 1.6)) * dpr * (0.6 + 0.4 * q.z);
      const glow = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, base * 4);
      glow.addColorStop(0, `rgba(213,162,79,${s.recent ? 0.55 : 0.22})`);
      glow.addColorStop(1, 'rgba(213,162,79,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(q.x, q.y, base * 4, 0, Math.PI * 2); ctx.fill();
      if (s.recent && !still) {
        const k = ((t / 2200) + (s.lon + 180) / 360) % 1;
        ctx.strokeStyle = `rgba(233,196,128,${(0.7 * (1 - k)).toFixed(3)})`;
        ctx.lineWidth = 1.4 * dpr;
        ctx.beginPath(); ctx.arc(q.x, q.y, base * (1 + k * 3.2), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = s.recent ? '#f6d9a2' : 'rgba(213,162,79,0.85)';
      ctx.beginPath(); ctx.arc(q.x, q.y, base * 0.55, 0, Math.PI * 2); ctx.fill();
    }
  }

  function frame(t: number) {
    const dt = last ? Math.min(64, t - last) : 16;
    last = t;
    if (!drag) {
      if (target != null) {
        // Glide to the busiest country first, then carry on turning.
        let d = ((target - lon0 + 540) % 360) - 180;
        lon0 += d * Math.min(1, dt / 500);
        if (Math.abs(d) < 0.2) target = null;
      } else if (t > idleUntil) lon0 += dt * 0.006;
    }
    draw(t);
    raf = requestAnimationFrame(frame);
  }
  const onVis = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (!still && document.visibilityState === 'visible') raf = requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', onVis);

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, lon: lon0, lat: lat0 };
    target = null;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = 180 / (size * 0.84 * Math.PI) * 1.6;
    lon0 = drag.lon - (e.clientX - drag.x) * k;
    lat0 = Math.max(-60, Math.min(70, drag.lat + (e.clientY - drag.y) * k));
    if (still) draw(0);
  });
  const end = () => { drag = null; idleUntil = performance.now() + 2500; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  resize();
  onVis();

  return {
    update(next: GlobeSpot[]) {
      const first = !spots.length;
      spots = next.flatMap((s) => (CENTROIDS[s.cc] ? [{ ...s, lon: CENTROIDS[s.cc][0], lat: CENTROIDS[s.cc][1] }] : []));
      canvas.setAttribute('aria-label', spots.length ? `Globe showing visitors from ${spots.map((s) => s.label).join(', ')}` : 'Globe, no visitors right now');
      if (first && spots.length) {
        // Face the middle of who is here now (or of everyone in the feed): the average direction, weighted by people.
        const now = spots.some((s) => s.recent) ? spots.filter((s) => s.recent) : spots;
        const x = now.reduce((a, s) => a + s.people * Math.cos(s.lon * RAD), 0), y = now.reduce((a, s) => a + s.people * Math.sin(s.lon * RAD), 0);
        const mid = Math.atan2(y, x) / RAD;
        if (still) { lon0 = mid; draw(0); } else target = mid;
      } else if (still) draw(0);
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}

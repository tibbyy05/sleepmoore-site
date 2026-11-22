/* Living scenes: rain, snow, embers, fireflies, leaves, spray, lightning and firelight drawn over
   a world's picture. Each effect idles softly and grows with its own sound's fader and the live
   loudness, so the picture answers the mix. Plain 2D canvas, paused off screen and in background
   tabs, never started under prefers-reduced-motion. */
import type { Effect } from '../data/worlds';
import { energy, faderLevel, soundLevel, state } from './engine';

type Options = {
  worldId: string;
  effects: Effect[];
  /** Source image size and CSS object-position, so points follow the picture at any crop. */
  natural: [number, number];
  position: [number, number];
  /** Optional clip (x0, y0, x1, y1 as fractions of the image): rain stays on the window glass. */
  glass?: [number, number, number, number];
};

type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; age: number; seed: number };

const IDLE = 0.22;

// The cloud strip is shared by every scene that uses it.
let cloudImg: HTMLImageElement | null = null;
function clouds() {
  if (!cloudImg) { cloudImg = new Image(); cloudImg.decoding = 'async'; cloudImg.src = '/img/clouds-band.webp'; }
  return cloudImg.complete && cloudImg.naturalWidth ? cloudImg : null;
}
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function mountAmbience(canvas: HTMLCanvasElement, o: Options): () => void {
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return () => {};
  const c: CanvasRenderingContext2D = ctx2d;
  const small = window.matchMedia('(max-width: 760px)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
  let w = 0, h = 0, map = { ox: 0, oy: 0, dw: 1, dh: 1 };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [iw, ih] = o.natural;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    map = { ox: (w - dw) * o.position[0], oy: (h - dh) * o.position[1], dw, dh };
  };
  const px = (fx: number) => map.ox + fx * map.dw;
  const py = (fy: number) => map.oy + fy * map.dh;

  // One pool per effect; intensities ease toward their targets.
  const pools = o.effects.map(() => [] as P[]);
  const level = o.effects.map(() => IDLE);
  let flash = 0, nextFlash = performance.now() + rand(6000, 14000);
  // Clouds: scroll offset in screen pixels, and a speed that eases toward the wind
  let cloudX = Math.random() * 4000, cloudSpeed = 0;
  const off = document.createElement('canvas'), offc = off.getContext('2d');

  // Playing: the fader and the live loudness. Paused: a quiet preview that still follows the fader.
  const playingHere = () => state.playing && state.current === o.worldId;
  const target = (e: Effect) => playingHere()
    ? IDLE + soundLevel(o.worldId, e.sound) * (0.55 + 1.1 * energy)
    : 0.1 + 0.5 * faderLevel(o.worldId, e.sound);
  const wind = () => 0.25 + soundLevel(o.worldId, 'wind') * 1.2 + soundLevel(o.worldId, 'palms') * 0.4;

  function spawn(e: Effect, i: number) {
    const pool = pools[i];
    const L = level[i];
    const area = (w * h) / 1e6;
    const clip = o.glass;
    switch (e.kind) {
      case 'rain': {
        const want = Math.round((clip ? 70 : 60) * area + (clip ? 420 : 260) * L * area);
        while (pool.length < want) {
          const x0 = clip ? px(clip[0]) : -40, x1 = clip ? px(clip[2]) : w + 40;
          pool.push({ x: rand(x0, x1), y: rand(clip ? py(clip[1]) : -h, clip ? py(clip[3]) : h), vx: 0, vy: rand(700, 1200), r: rand(clip ? 14 : 10, clip ? 34 : 24), a: rand(clip ? 0.12 : 0.06, clip ? 0.3 : 0.2), life: 1e9, age: 0, seed: Math.random() });
        }
        if (pool.length > want + 4) pool.length = want;
        if (clip) {
          // A few drops resting on the glass, sliding now and then.
          const drops = pools[i] as P[] & { drops?: P[] };
          if (!drops.drops) drops.drops = [];
          const dwant = Math.round(14 + 50 * L);
          while (drops.drops.length < dwant) drops.drops.push({ x: rand(px(clip[0]), px(clip[2])), y: rand(py(clip[1]), py(clip[3])), vx: 0, vy: 0, r: rand(1.1, 3.4), a: rand(0.35, 0.75), life: rand(4, 14), age: 0, seed: Math.random() });
          if (drops.drops.length > dwant + 2) drops.drops.length = dwant;
        }
        break;
      }
      case 'snow': {
        const want = Math.round(70 * area + 260 * L * area);
        while (pool.length < want) pool.push({ x: rand(0, w), y: rand(-h, h), vx: 0, vy: rand(18, 55), r: rand(0.7, 2.6), a: rand(0.35, 0.85), life: 1e9, age: 0, seed: Math.random() * 6.28 });
        if (pool.length > want + 4) pool.length = want;
        break;
      }
      case 'embers': {
        const rate = 2.5 + 9 * L; // per second: a few sparks, never a column
        if (Math.random() < rate / 60) pool.push({ x: px(e.at[0]) + rand(-24, 24), y: py(e.at[1]) + rand(-6, 6), vx: rand(-14, 14), vy: -rand(28, 70), r: rand(0.7, 1.8), a: 1, life: rand(1.2, 3), age: 0, seed: Math.random() * 6.28 });
        break;
      }
      case 'fireflies': {
        const want = Math.round(o.glass ? 16 + 34 * L : 6 + 22 * L);
        const fx0 = o.glass ? px(o.glass[0]) : 0, fx1 = o.glass ? px(o.glass[2]) : w;
        while (pool.length < want) pool.push({ x: rand(fx0, fx1), y: rand(Math.max(0, py(e.band[0])), Math.min(h, py(e.band[1]))), vx: rand(-8, 8), vy: rand(-6, 6), r: rand(1, 1.8), a: 0, life: 1e9, age: rand(0, 10), seed: Math.random() * 6.28 });
        if (pool.length > want + 1) pool.length = want;
        break;
      }
      case 'leaves': {
        const want = Math.round(5 + 18 * L);
        while (pool.length < want) pool.push({ x: rand(-40, w), y: rand(-h * 0.6, -10), vx: rand(10, 30), vy: rand(22, 48), r: rand(3, 6), a: rand(0.55, 0.9), life: 1e9, age: 0, seed: Math.random() * 6.28 });
        if (pool.length > want + 1) pool.length = want;
        break;
      }
      case 'spray': {
        const want = Math.round(16 + 70 * L);
        while (pool.length < want) pool.push({ x: rand(0, w), y: rand(Math.max(0, py(e.band[0])), Math.min(h, py(e.band[1]))), vx: rand(-6, 6), vy: -rand(4, 16), r: rand(0.6, 1.6), a: 0, life: rand(3, 8), age: 0, seed: Math.random() * 6.28 });
        if (pool.length > want + 2) pool.length = want;
        break;
      }
      case 'mist': {
        while (pool.length < 7) pool.push({ x: rand(-0.3, 1.1), y: rand(e.band[0], e.band[1]), vx: rand(0.006, 0.014), vy: 0, r: rand(0.2, 0.38), a: rand(0.6, 1), life: 1e9, age: 0, seed: Math.random() * 6.28 });
        break;
      }
    }
  }

  function draw(dt: number, now: number) {
    c.clearRect(0, 0, w, h);
    const wd = wind();
    o.effects.forEach((e, i) => {
      level[i] += (target(e) - level[i]) * Math.min(1, dt * 1.8);
      const L = level[i];
      spawn(e, i);
      const pool = pools[i];
      switch (e.kind) {
        case 'rain': {
          const clip = o.glass;
          c.save();
          if (clip) { c.beginPath(); c.rect(px(clip[0]), py(clip[1]), px(clip[2]) - px(clip[0]), py(clip[3]) - py(clip[1])); c.clip(); }
          c.lineCap = 'round';
          c.lineWidth = clip ? 1.1 : 1;
          const slant = 0.12 + wd * 0.18;
          const top = clip ? py(clip[1]) : -30, bottom = clip ? py(clip[3]) : h + 30;
          for (const p of pool) {
            p.y += p.vy * dt; p.x += p.vy * slant * dt;
            if (p.y > bottom) { p.y = top - rand(0, 60); p.x = rand(clip ? px(clip[0]) - 40 : -60, clip ? px(clip[2]) : w); }
            c.strokeStyle = `rgba(205,218,238,${Math.min(0.85, p.a * (clip ? 0.9 + L * 1.3 : 0.6 + L * 0.7)).toFixed(3)})`;
            c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.r * slant, p.y - p.r); c.stroke();
          }
          const drops = (pool as P[] & { drops?: P[] }).drops;
          if (drops) {
            for (const d of drops) {
              d.age += dt;
              if (d.age > d.life) { d.vy = rand(30, 90); }
              if (d.vy > 0) { d.y += d.vy * dt; d.vy *= 0.985; if (d.vy < 4) { d.vy = 0; d.age = 0; d.life = rand(3, 12); } }
              if (d.y > bottom) { d.y = rand(top, top + (bottom - top) * 0.5); d.x = rand(px(clip![0]), px(clip![2])); d.vy = 0; d.age = 0; }
              const g = c.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r * 1.6);
              g.addColorStop(0, `rgba(235,242,255,${d.a})`); g.addColorStop(1, 'rgba(235,242,255,0)');
              c.fillStyle = g; c.beginPath(); c.arc(d.x, d.y, d.r * 1.6, 0, 6.283); c.fill();
              if (d.vy > 0) { c.strokeStyle = `rgba(220,230,250,${(d.a * 0.35).toFixed(3)})`; c.lineWidth = d.r * 0.8; c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x, d.y - 26); c.stroke(); }
            }
          }
          c.restore();
          break;
        }
        case 'snow': {
          c.fillStyle = '#f4f6fb';
          for (const p of pool) {
            p.seed += dt * 0.9;
            p.y += p.vy * dt * (0.8 + L * 0.5);
            p.x += (Math.sin(p.seed) * 14 + wd * 26) * dt;
            if (p.y > h + 5) { p.y = -5; p.x = rand(-20, w); }
            if (p.x > w + 10) p.x = -10;
            c.globalAlpha = p.a * (0.55 + L * 0.6);
            c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
          }
          c.globalAlpha = 1;
          break;
        }
        case 'embers': {
          c.globalCompositeOperation = 'lighter';
          for (let k = pool.length - 1; k >= 0; k--) {
            const p = pool[k];
            p.age += dt;
            if (p.age > p.life) { pool.splice(k, 1); continue; }
            p.seed += dt * 3;
            p.x += (p.vx + Math.sin(p.seed) * 12 + wd * 10) * dt; p.y += p.vy * dt;
            const t = p.age / p.life, a = (1 - t) * (t < 0.1 ? t * 10 : 1) * (0.4 + L * 0.4);
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
            g.addColorStop(0, `rgba(255,214,140,${a.toFixed(3)})`); g.addColorStop(0.35, `rgba(255,140,50,${(a * 0.6).toFixed(3)})`); g.addColorStop(1, 'rgba(255,90,20,0)');
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r * 4, 0, 6.283); c.fill();
          }
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'fireflies': {
          c.globalCompositeOperation = 'lighter';
          const y0 = Math.max(0, py(e.band[0])), y1 = Math.min(h, py(e.band[1]));
          for (const p of pool) {
            p.age += dt;
            p.vx += rand(-14, 14) * dt; p.vy += rand(-10, 10) * dt;
            p.vx *= 0.99; p.vy *= 0.99;
            p.x += (p.vx + wd * 4) * dt; p.y += p.vy * dt;
            const gx0 = o.glass ? px(o.glass[0]) : -10, gx1 = o.glass ? px(o.glass[2]) : w + 10;
          if (p.x < gx0) p.x = gx1; if (p.x > gx1) p.x = gx0;
            if (p.y < y0) p.vy += 8 * dt * 10; if (p.y > y1) p.vy -= 8 * dt * 10;
            const blink = Math.max(0, Math.sin(p.age * 1.3 + p.seed)) ** (o.glass ? 2 : 3);
            const a = Math.min(1, blink * (o.glass ? 0.55 + L * 0.9 : 0.35 + L * 0.65));
            if (a < 0.01) continue;
            const fr = o.glass ? 7 + 9 * a : 9;
            const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, fr);
            g.addColorStop(0, `rgba(236,248,170,${a.toFixed(3)})`); g.addColorStop(0.3, `rgba(200,230,110,${(a * 0.45).toFixed(3)})`); g.addColorStop(1, 'rgba(160,210,80,0)');
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, fr, 0, 6.283); c.fill();
          }
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'leaves': {
          for (const p of pool) {
            p.seed += dt * (1.2 + L);
            p.y += p.vy * dt * (0.8 + L * 0.6);
            p.x += (p.vx * (0.4 + wd) + Math.sin(p.seed) * 22) * dt;
            if (p.y > h + 20 || p.x > w + 30) { p.y = rand(-80, -10); p.x = rand(-40, w * 0.8); }
            c.save();
            c.translate(p.x, p.y); c.rotate(p.seed * 0.8); c.scale(1, Math.abs(Math.cos(p.seed)) * 0.7 + 0.3);
            c.globalAlpha = p.a * (0.6 + L * 0.5);
            c.fillStyle = (p.r > 4.6) ? '#b8402c' : '#d0633a';
            c.beginPath(); c.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.283); c.fill();
            c.restore();
          }
          c.globalAlpha = 1;
          break;
        }
        case 'spray': {
          c.fillStyle = '#e8eef8';
          for (let k = pool.length - 1; k >= 0; k--) {
            const p = pool[k];
            p.age += dt;
            if (p.age > p.life) { pool.splice(k, 1); continue; }
            p.x += (p.vx + wd * 6) * dt; p.y += p.vy * dt;
            const t = p.age / p.life;
            c.globalAlpha = Math.sin(t * Math.PI) * (0.18 + L * 0.4);
            c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
          }
          c.globalAlpha = 1;
          break;
        }
        case 'glow': {
          const flicker = 0.78 + 0.12 * Math.sin(now / 130 + i) + 0.1 * Math.sin(now / 47 + i * 3);
          const a = (0.1 + L * 0.42) * flicker;
          const x = px(e.at[0]), y = py(e.at[1]), r = e.radius * map.dw;
          c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${e.color},${a.toFixed(3)})`); g.addColorStop(1, `rgba(${e.color},0)`);
          c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
          c.globalCompositeOperation = 'source-over';
          break;
        }
        case 'mist': {
          // Wide soft bands of cloud in the valley, drifting with the wind
          const g0 = o.glass;
          c.save();
          if (g0) { c.beginPath(); c.rect(px(g0[0]), py(g0[1]), px(g0[2]) - px(g0[0]), py(g0[3]) - py(g0[1])); c.clip(); }
          const span = g0 ? g0[2] - g0[0] : 1, start = g0 ? g0[0] : 0;
          for (const p of pool) {
            p.x += p.vx * dt * (0.4 + wd * 1.6);
            if (p.x > 1.35) p.x = -0.35;
            const x = px(start + p.x * span), y = py(p.y), rx = p.r * span * map.dw;
            const a = 0.16 * L * p.a;
            if (a < 0.004) continue;
            const g = c.createRadialGradient(x, y, 0, x, y, rx);
            g.addColorStop(0, `rgba(200,210,230,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(200,210,230,0)');
            c.fillStyle = g; c.save(); c.translate(x, y); c.scale(1, 0.2); c.translate(-x, -y);
            c.beginPath(); c.arc(x, y, rx, 0, 6.283); c.fill(); c.restore();
          }
          c.restore();
          break;
        }
        case 'clouds': {
          const img = clouds(), g0 = o.glass;
          if (!img || !offc) break;
          const x0 = g0 ? px(g0[0]) : 0, x1 = g0 ? px(g0[2]) : w;
          const y0 = Math.max(0, py(e.band[0])), y1 = Math.min(h, py(e.band[1]));
          const rw = Math.ceil(x1 - x0), rh = Math.ceil(y1 - y0);
          if (rw < 2 || rh < 2) break;
          if (off.width !== rw || off.height !== rh) { off.width = rw; off.height = rh; }
          // Wind sets the pace: a slow drift when still, clouds racing by in a gale
          const playing = state.playing && state.current === o.worldId;
          const windNow = faderLevel(o.worldId, e.sound) * (playing ? 0.85 + 0.5 * energy : 1);
          cloudSpeed += ((4 + 110 * windNow * windNow + 30 * windNow) - cloudSpeed) * Math.min(1, dt * 0.7);
          cloudX += cloudSpeed * dt;
          offc.clearRect(0, 0, rw, rh);
          // Two layers for depth: high thin cloud, and lower cloud moving faster
          const layers = [[1.0, 1.0, 0.45, 0], [1.45, 1.75, 0.68, 0.22]];
          for (const [scale, pace, alpha, drop] of layers) {
            const th = rh * scale, tw = img.naturalWidth * th / img.naturalHeight;
            let x = -((cloudX * pace + (scale > 1 ? tw * 0.5 : 0)) % tw);
            offc.globalAlpha = alpha;
            for (; x < rw; x += tw) offc.drawImage(img, x, rh * drop - th * 0.12, tw, th);
          }
          offc.globalAlpha = 1;
          // Moonlight catches the clouds that pass the moon
          if (e.moon) {
            const mx = px(e.moon[0]) - x0, my = py(e.moon[1]) - y0, mr = rh * 0.55;
            offc.globalCompositeOperation = 'source-atop';
            const mg = offc.createRadialGradient(mx, my, 0, mx, my, mr);
            mg.addColorStop(0, 'rgba(255,248,230,0.55)'); mg.addColorStop(1, 'rgba(255,248,230,0)');
            offc.fillStyle = mg; offc.fillRect(0, 0, rw, rh);
          }
          // Fade out at the top and above the mountains
          offc.globalCompositeOperation = 'destination-in';
          const fade = offc.createLinearGradient(0, 0, 0, rh);
          fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.12, 'rgba(0,0,0,1)');
          fade.addColorStop(0.62, 'rgba(0,0,0,0.9)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
          offc.fillStyle = fade; offc.fillRect(0, 0, rw, rh);
          offc.globalCompositeOperation = 'source-over';
          c.drawImage(off, x0, y0);
          break;
        }
        case 'lightning': {
          if (soundLevel(o.worldId, e.sound) > 0 && now > nextFlash) {
            flash = 0.12 + 0.2 * L; nextFlash = now + rand(7000, 18000);
            setTimeout(() => (flash = Math.max(flash, 0.1 + 0.12 * L)), 140);
          }
          if (flash > 0.002) {
            c.fillStyle = `rgba(210,222,255,${flash.toFixed(3)})`; c.fillRect(0, 0, w, h);
            flash *= Math.pow(0.02, dt);
          }
          break;
        }
      }
    });
  }

  let raf = 0, last = 0, visible = true;
  const frame = (now: number) => {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    draw(dt, now);
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  resize();
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  canvas.classList.add('is-live');
  start();

  return () => { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
}

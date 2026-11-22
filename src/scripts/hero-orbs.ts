/* Mix the room by touching it: a glowing control sits on each thing you can hear (the stove, the
   window, the pines, the sky). Drag one up or down to set its level; while you drag, the room dims
   except for what you are changing. Each control is a real slider for keyboards and screen readers
   (arrow keys, Page Up/Down, Home/End). The faders in the player bar stay in step with them. */
import { energy, faderLevel, soundLevel, state } from './engine';

export type OrbSpec = { id: string; label: string; icon: string; color: string; at: [number, number]; spot: number };
type Options = {
  worldId: string;
  natural: [number, number];
  position: [number, number];
  orbs: OrbSpec[];
  /** Called when an orb changes a level (0-100); the page keeps the engine and the bar in step. */
  onChange: (id: string, level: number) => void;
};

const R = 17, C = 2 * Math.PI * R;
const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

export function mountOrbs(hero: HTMLElement, art: HTMLElement, o: Options) {
  const layer = document.createElement('div');
  layer.className = 'orbs';
  const spot = document.createElement('div');
  spot.className = 'hero-spot';
  spot.setAttribute('aria-hidden', 'true');
  art.appendChild(spot);

  const els = o.orbs.map((spec) => {
    const b = document.createElement('div');
    b.className = 'orb';
    b.tabIndex = 0;
    b.setAttribute('role', 'slider');
    b.setAttribute('aria-label', spec.label + ' level');
    b.setAttribute('aria-valuemin', '0');
    b.setAttribute('aria-valuemax', '100');
    b.style.setProperty('--c', spec.color);
    b.innerHTML =
      '<svg class="orb-ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="orb-track" cx="22" cy="22" r="' + R + '"/><circle class="orb-fill" cx="22" cy="22" r="' + R + '"/></svg>' +
      '<span class="orb-core" aria-hidden="true"><svg class="icon"><use href="#i-' + spec.icon + '"></use></svg></span>' +
      '<span class="orb-tag" aria-hidden="true">' + spec.label + ' <b></b></span>';
    layer.appendChild(b);
    return { b, spec, fill: b.querySelector<SVGCircleElement>('.orb-fill')!, val: b.querySelector('b')! };
  });
  hero.appendChild(layer);

  const show = (e: (typeof els)[number], v: number) => {
    e.fill.style.strokeDasharray = (C * v / 100).toFixed(2) + ' ' + C.toFixed(2);
    e.val.textContent = v + '%';
    e.b.setAttribute('aria-valuenow', String(v));
    e.b.setAttribute('aria-valuetext', v === 0 ? 'off' : v + ' percent');
    e.b.classList.toggle('is-off', v === 0);
  };
  const sync = () => els.forEach((e) => show(e, Math.round(faderLevel(o.worldId, e.spec.id) * 100)));

  // Place each control on its thing in the picture, at any crop
  let map = { ox: 0, oy: 0, dw: 1, dh: 1 }, hw = 0;
  const place = () => {
    const r = art.getBoundingClientRect();
    const [iw, ih] = o.natural;
    const s = Math.max(r.width / iw, r.height / ih);
    map = { dw: iw * s, dh: ih * s, ox: (r.width - iw * s) * o.position[0], oy: (r.height - ih * s) * o.position[1] };
    hw = r.width;
    for (const e of els) {
      const x = map.ox + e.spec.at[0] * map.dw, y = map.oy + e.spec.at[1] * map.dh;
      e.b.style.left = x + 'px'; e.b.style.top = y + 'px';
      e.b.classList.toggle('tag-left', x > hw - 150);
    }
  };

  // Spotlight: dim the room except around the control being changed
  const light = (e: (typeof els)[number] | null) => {
    if (!e) { spot.classList.remove('is-on'); return; }
    const x = map.ox + e.spec.at[0] * map.dw, y = map.oy + e.spec.at[1] * map.dh;
    spot.style.setProperty('--sx', x + 'px'); spot.style.setProperty('--sy', y + 'px');
    spot.style.setProperty('--sr', e.spec.spot * map.dw + 'px');
    spot.classList.add('is-on');
  };

  const set = (e: (typeof els)[number], v: number) => { v = clamp(v); show(e, v); o.onChange(e.spec.id, v); };

  // Drag up for louder, down for softer: 160 px covers the whole range
  for (const e of els) {
    let drag: { y: number; v: number; id: number } | null = null;
    e.b.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      e.b.setPointerCapture(ev.pointerId);
      drag = { y: ev.clientY, v: Math.round(faderLevel(o.worldId, e.spec.id) * 100), id: ev.pointerId };
      e.b.classList.add('is-held'); layer.classList.add('is-busy'); light(e);
      e.b.focus({ preventScroll: true });
    });
    e.b.addEventListener('pointermove', (ev) => { if (drag) set(e, drag.v + (drag.y - ev.clientY) / 1.6); });
    const end = () => { if (!drag) return; drag = null; e.b.classList.remove('is-held'); layer.classList.remove('is-busy'); light(null); };
    e.b.addEventListener('pointerup', end); e.b.addEventListener('pointercancel', end);
    e.b.addEventListener('keydown', (ev) => {
      const now = Math.round(faderLevel(o.worldId, e.spec.id) * 100);
      const step: Record<string, number> = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 20, PageDown: -20 };
      if (ev.key in step) set(e, now + step[ev.key]);
      else if (ev.key === 'Home') set(e, 0);
      else if (ev.key === 'End') set(e, 100);
      else return;
      ev.preventDefault();
    });
    e.b.addEventListener('focus', () => light(e));
    e.b.addEventListener('blur', () => { if (!drag) light(null); });
  }

  // Each control glows with its own sound: brighter with the level, and pulsing while it plays
  let raf = 0;
  const frame = () => {
    const playing = state.playing && state.current === o.worldId;
    for (const e of els) {
      const f = faderLevel(o.worldId, e.spec.id);
      const live = playing ? soundLevel(o.worldId, e.spec.id) * (0.6 + 1.2 * energy) : 0;
      e.b.style.setProperty('--g', Math.min(1, 0.25 + f * 0.45 + live * 0.5).toFixed(3));
    }
    raf = requestAnimationFrame(frame);
  };

  sync(); place();
  const ro = new ResizeObserver(place); ro.observe(art);
  if (!reduced.matches) raf = requestAnimationFrame(frame);
  else els.forEach((e) => e.b.style.setProperty('--g', '0.6'));
  // On arrival the labels show for a moment, so people see what the lights are
  hero.classList.add('orbs-intro');
  const t = setTimeout(() => hero.classList.remove('orbs-intro'), 5200);

  return {
    sync,
    /** The bar's slider for this sound is being dragged or focused: light it up in the room. */
    spot(id: string | null) {
      const e = els.find((x) => x.spec.id === id) || null;
      light(e); layer.classList.toggle('is-busy', !!e);
      els.forEach((x) => x.b.classList.toggle('is-held', x === e));
    },
    /** The pointer is over the bar's slider for this sound: show its light's label. */
    mark(id: string | null) { els.forEach((x) => x.b.classList.toggle('is-linked', x.spec.id === id)); },
    destroy() { cancelAnimationFrame(raf); clearTimeout(t); ro.disconnect(); layer.remove(); spot.remove(); hero.classList.remove('orbs-intro'); },
  };
}

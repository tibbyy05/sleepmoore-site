/* Build your scene: drag a sound token into the night landscape (or tap it) and the thing appears
   where it lands, a campfire, a rain cloud, a stream, fireflies for the crickets, gusts of wind,
   and starts playing through the engine as the "Your scene" mix. Tap a placed thing to remove it. */
import { SCENE_MIX } from '../data/worlds';
import * as engine from './engine';

const ID = SCENE_MIX.id;
const NS = 'http://www.w3.org/2000/svg';
const LEVEL: Record<string, number> = { fire: 72, rain: 70, stream: 68, night: 62, wind: 55 };
const DEFAULT: Record<string, [number, number]> = { fire: [300, 350], rain: [540, 110], stream: [500, 406], night: [760, 300], wind: [500, 200] };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function build(kind: string, x: number, y: number) {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('class', 'placed');
  let h = '';
  if (kind === 'fire') {
    y = clamp(y, 318, 372);
    h = `<circle class="fireglow" cx="0" cy="-20" r="110" fill="url(#sb-fg)"/>
      <path d="M-26 4 L24 -6 M-24 -6 L26 4" stroke="#5a3d24" stroke-width="9" stroke-linecap="round"/>
      <path class="flame" d="M0 -2 C -20 -10 -18 -34 -6 -52 C -4 -38 6 -40 4 -56 C 18 -40 22 -14 0 -2Z" fill="#ff8a3c"/>
      <path class="flame f2" d="M0 -3 C -12 -10 -10 -26 -2 -38 C 0 -28 8 -28 6 -38 C 14 -24 12 -10 0 -3Z" fill="#ffc15c"/>
      <path class="flame f3" d="M0 -4 C -6 -8 -5 -16 0 -22 C 5 -16 6 -8 0 -4Z" fill="#fff2c2"/>
      <rect x="-40" y="-70" width="80" height="80" fill="transparent"/>`;
  } else if (kind === 'rain') {
    y = clamp(y, 70, 170);
    let drops = '';
    for (let i = 0; i < 26; i++) {
      const dx = rnd(-78, 78), dy = rnd(8, 30);
      drops += `<line class="drop" x1="${dx.toFixed(0)}" y1="${dy.toFixed(0)}" x2="${(dx - 4).toFixed(0)}" y2="${(dy + 16).toFixed(0)}" stroke="#a9bfe6" stroke-width="1.6" stroke-linecap="round" style="animation-delay:${(-Math.random()).toFixed(2)}s;animation-duration:${rnd(0.7, 1.1).toFixed(2)}s"/>`;
    }
    h = `<g>${drops}</g><g class="cloud"><ellipse cx="0" cy="0" rx="92" ry="26" fill="#3a4466"/><circle cx="-38" cy="-14" r="30" fill="#434e72"/><circle cx="14" cy="-26" r="38" fill="#4a557a"/><circle cx="54" cy="-8" r="26" fill="#3f4a6e"/></g>
      <rect x="-100" y="-70" width="200" height="120" fill="transparent"/>`;
  } else if (kind === 'stream') {
    y = clamp(y, 396, 416); x = 500;
    h = `<path d="M-520 0 C -380 -22 -260 18 -120 0 S 140 -20 260 2 S 440 18 520 -4" stroke="url(#sb-water)" stroke-width="26" fill="none" stroke-linecap="round"/>
      <path class="water" d="M-520 -2 C -380 -24 -260 16 -120 -2 S 140 -22 260 0 S 440 16 520 -6" stroke="#9fc0ef" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>
      <path class="water" style="animation-duration:3.4s" d="M-520 6 C -380 -16 -260 24 -120 6 S 140 -14 260 8 S 440 24 520 2" stroke="#c9dbf6" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".45"/>
      <rect x="-520" y="-24" width="1040" height="48" fill="transparent"/>`;
  } else if (kind === 'night') {
    y = clamp(y, 240, 380);
    for (let i = 0; i < 12; i++) {
      const fx = rnd(-110, 110), fy = rnd(-60, 40);
      h += `<g class="fly" style="animation-delay:${(-Math.random() * 5).toFixed(2)}s, ${(-Math.random() * 2.6).toFixed(2)}s"><circle cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" r="9" fill="url(#sb-ffg)"/><circle cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" r="1.8" fill="#fffbd0"/></g>`;
    }
    h += '<rect x="-120" y="-80" width="240" height="140" fill="transparent"/>';
  } else {
    y = clamp(y, 140, 270); x = 500;
    ['M-520 0 C -300 -30 -100 30 120 0 S 400 -20 520 -10', 'M-520 40 C -320 10 -140 60 80 36 S 380 10 520 30', 'M-520 -40 C -260 -60 -60 -14 160 -40 S 420 -50 520 -44']
      .forEach((d, i) => { h += `<path class="gust" d="${d}" stroke="#d9d2c4" stroke-width="2" fill="none" stroke-linecap="round" style="animation-delay:${(-i * 1.3).toFixed(1)}s"/>`; });
    h += '<rect x="-520" y="-60" width="1040" height="120" fill="transparent"/>';
  }
  g.innerHTML = `<g class="pop">${h}</g>`;
  g.setAttribute('transform', `translate(${x.toFixed(0)} ${y.toFixed(0)})`);
  return g;
}

export function mountBuilder(root: HTMLElement): () => void {
  const stage = root.querySelector<HTMLElement>('[data-scene-stage]')!;
  const svg = stage.querySelector<SVGSVGElement>('svg')!;
  const layer = stage.querySelector<SVGGElement>('[data-scene-layer]')!;
  const hint = stage.querySelector<HTMLElement>('[data-scene-hint]')!;
  const stars = stage.querySelector<SVGGElement>('[data-scene-stars]')!;
  for (let i = 0; i < 70; i++) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', (Math.random() * 1000).toFixed(1)); c.setAttribute('cy', (Math.random() * 220).toFixed(1));
    c.setAttribute('r', (0.6 + Math.random() * 1.2).toFixed(2)); c.setAttribute('opacity', '.7');
    if (i % 3 === 0) { c.setAttribute('class', 'twinkle'); c.style.animationDelay = (-Math.random() * 4) + 's'; }
    stars.appendChild(c);
  }
  const placed: Record<string, SVGGElement> = {};
  const tok = (kind: string) => root.querySelector<HTMLButtonElement>(`.tok[data-tok="${kind}"]`)!;
  const ours = () => engine.state.current === ID;

  function show(kind: string, x: number, y: number) {
    placed[kind]?.remove();
    const g = build(kind, x, y);
    if (kind === 'stream' || kind === 'wind') layer.insertBefore(g, layer.firstChild); else layer.appendChild(g);
    placed[kind] = g;
    g.addEventListener('click', () => remove(kind));
    tok(kind).setAttribute('aria-pressed', 'true');
    hint.classList.add('is-hidden');
    return g;
  }
  function place(kind: string, x: number, y: number) {
    show(kind, x, y).classList.add('is-new');
    engine.setLevel(ID, kind, LEVEL[kind]);
    if (!(engine.state.playing && ours())) engine.play(ID);
  }
  function remove(kind: string) {
    const g = placed[kind]; if (!g) return;
    delete placed[kind];
    g.classList.add('is-leaving');
    setTimeout(() => g.remove(), 450);
    tok(kind).setAttribute('aria-pressed', 'false');
    engine.setLevel(ID, kind, 0);
    if (!Object.keys(placed).length) {
      hint.classList.remove('is-hidden');
      if (ours() && engine.state.playing) engine.pause();
    }
  }
  const toSvg = (cx: number, cy: number) => {
    const m = svg.getScreenCTM(); if (!m) return { x: 500, y: 300 };
    const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
    return pt.matrixTransform(m.inverse());
  };
  const inStage = (x: number, y: number) => { const r = stage.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; };

  // Drag a token into the night, or tap it to add it in a good spot (tap again to take it away)
  const offs: (() => void)[] = [];
  root.querySelectorAll<HTMLButtonElement>('.tok[data-tok]').forEach((t) => {
    const kind = t.dataset.tok!;
    let start: { x: number; y: number } | null = null, ghost: HTMLElement | null = null, moved = false, viaPointer = false;
    const down = (e: PointerEvent) => { start = { x: e.clientX, y: e.clientY }; moved = false; viaPointer = true; t.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => {
      if (!start) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
        moved = true;
        ghost = t.querySelector<HTMLElement>('.tok-ico')!.cloneNode(true) as HTMLElement;
        ghost.className = 'tok-ghost'; document.body.appendChild(ghost);
      }
      if (ghost) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; stage.classList.toggle('is-over', inStage(e.clientX, e.clientY)); }
    };
    const up = (e: PointerEvent, cancel: boolean) => {
      if (!start) return;
      if (moved && ghost) {
        if (!cancel && inStage(e.clientX, e.clientY)) { const p = toSvg(e.clientX, e.clientY); place(kind, p.x, p.y); }
        ghost.remove(); ghost = null; stage.classList.remove('is-over');
      } else if (!cancel) {
        placed[kind] ? remove(kind) : place(kind, ...DEFAULT[kind]);
      }
      start = null;
    };
    const click = (e: MouseEvent) => {
      // Keyboard (Enter/Space) arrives as a click with no pointer before it
      if (viaPointer) { viaPointer = false; return; }
      e.preventDefault();
      placed[kind] ? remove(kind) : place(kind, ...DEFAULT[kind]);
    };
    const onUp = (e: PointerEvent) => up(e, false), onCancel = (e: PointerEvent) => up(e, true);
    t.addEventListener('pointerdown', down); t.addEventListener('pointermove', move);
    t.addEventListener('pointerup', onUp); t.addEventListener('pointercancel', onCancel); t.addEventListener('click', click);
    offs.push(() => { t.removeEventListener('pointerdown', down); t.removeEventListener('pointermove', move); t.removeEventListener('pointerup', onUp); t.removeEventListener('pointercancel', onCancel); t.removeEventListener('click', click); ghost?.remove(); });
  });
  const clear = root.querySelector<HTMLButtonElement>('[data-scene-clear]');
  const onClear = () => Object.keys(placed).forEach(remove);
  clear?.addEventListener('click', onClear);

  // Coming back to the page while your scene plays: put its things back where they belong
  if (ours()) engine.levelsFor(ID).forEach(([kind, level]) => { if (level > 0) show(kind, ...DEFAULT[kind]); });

  return () => { offs.forEach((f) => f()); clear?.removeEventListener('click', onClear); };
}

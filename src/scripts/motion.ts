/* Motion layer, built on Motion (motion.dev): scroll-linked parallax that runs on the browser's
   own scroll timeline where it can, spring lifts as sections arrive, and a magnetic pull on the
   main buttons. Everything is additive and transform-only: under prefers-reduced-motion this
   module is never loaded, and the page is the same page, just stiller.
   mountMotion() returns a cleanup, called before every page change. */
import { animate, hover, inView, scroll, stagger } from 'motion';

type Stop = () => void;
type Range = NonNullable<Parameters<typeof scroll>[1]>;
const span = (target: Element, offset: string[]) => ({ target, offset }) as unknown as Range;
const SPRING = { type: 'spring', visualDuration: 0.9, bounce: 0.18 } as const;

export function mountMotion(root: Document = document): Stop {
  const stops: Stop[] = [];
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string) => Array.from(root.querySelectorAll<T>(s));
  const small = window.matchMedia('(max-width: 1024px)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Hero: the copy drifts up and dims a little faster than the art as you leave it.
  const hero = $('.hero, .world-hero');
  if (hero) {
    const copy = hero.querySelector('.hero-copy, .world-copy');
    const art = hero.querySelector('.hero-art, .world-art');
    const range = span(hero, ['start start', 'end start']);
    if (copy) stops.push(scroll(animate(copy, { y: [0, -90], opacity: [1, 0.2] }, { ease: 'linear' }), range));
    if (art) stops.push(scroll(animate(art, { y: [0, 120] }, { ease: 'linear' }), range));
    const player = hero.querySelector('.player');
    if (player) stops.push(scroll(animate(player, { y: [0, 40], opacity: [1, 0] }, { ease: 'linear' }), span(hero, ['0.6 start', 'end start'])));
  }

  // Spring lifts as lists and cards arrive. Transform only, never opacity, so text is never dimmed.
  const groups: [string, string][] = [['.dest-list', '.dest'], ['.scene-strip', '.scene-strip li'], ['.preset-grid', '.preset'], ['.facts', '.facts div'], ['.sound-list', '.sound-list li'], ['.app-adds', '.app-adds div'], ['.more-worlds', '.more-card']];
  for (const [container, items] of groups) {
    const box = $(container);
    const els = $$(items);
    if (!box || !els.length) continue;
    els.forEach((el) => (el.style.transform = 'translateY(34px)'));
    stops.push(inView(box, () => { animate(els, { y: [34, 0] }, { ...SPRING, delay: stagger(0.07) }); }, { margin: '0px 0px -12% 0px' }));
  }

  // Section titles rise slightly ahead of their rule.
  for (const head of $$('.sec-head')) {
    const kids = Array.from(head.children) as HTMLElement[];
    kids.forEach((el) => (el.style.transform = 'translateY(24px)'));
    stops.push(inView(head, () => { animate(kids, { y: [24, 0] }, { ...SPRING, delay: stagger(0.1) }); }, { margin: '0px 0px -10% 0px' }));
  }

  // Night story: the phone tilts and lifts as the chapters pass; scenes breathe.
  const grid = $('.night-grid');
  const phone = $('.phone');
  if (grid && phone) {
    const lift = small ? 8 : 26, tilt = small ? 1.5 : 4;
    const range = span(grid, ['start end', 'end start']);
    stops.push(scroll(animate(phone, { y: [lift, -lift], rotateX: [tilt, -tilt], rotateZ: [-tilt * 0.3, tilt * 0.3], transformPerspective: [900, 900] }, { ease: 'linear' }), range));
    const scenes = $('.stage-scenes');
    if (scenes) stops.push(scroll(animate(scenes, { scale: [1, 1.06] }, { ease: 'linear' }), range));
  }

  // World page: the name settles in, then the details follow.
  const worldCopy = $('.world-copy');
  if (worldCopy) {
    const parts = Array.from(worldCopy.querySelectorAll<HTMLElement>('.cap, .world-line, .world-actions'));
    animate(parts, { y: [18, 0], filter: ['blur(6px)', 'blur(0px)'] }, { ...SPRING, delay: stagger(0.12, { startDelay: 0.45 }) });
  }

  if (finePointer) {
    // Magnetic pull on the hero buttons and the header pill.
    for (const el of $$('.play-pill, .top-actions .pill')) {
      const strength = el.classList.contains('play-pill') ? 14 : 8;
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        animate(el, { x: ((e.clientX - r.left) / r.width - 0.5) * strength * 2, y: ((e.clientY - r.top) / r.height - 0.5) * strength * 2 }, { type: 'spring', stiffness: 260, damping: 18, mass: 0.6 });
      };
      const leave = () => animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 200, damping: 14 });
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      stops.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
    }
    // Play rings grow toward the pointer on their card, with a little overshoot.
    for (const card of $$('.feature-card, .preset, .dest, .more-card')) {
      const ring = card.querySelector('.play-ring, .go-ring');
      if (!ring) continue;
      stops.push(hover(card, () => {
        animate(ring, { scale: 1.1 }, { type: 'spring', visualDuration: 0.35, bounce: 0.5 });
        return () => animate(ring, { scale: 1 }, { type: 'spring', visualDuration: 0.3, bounce: 0 });
      }));
    }
  }

  return () => stops.forEach((s) => { try { s(); } catch { /* already gone */ } });
}

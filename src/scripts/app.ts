/* Page wiring for sleepmoore.app. The sound engine (engine.ts) lives for the whole visit; this file
   binds whatever page is showing, on first load and after every client-side page change, and
   tears it down again before the next one. */
import { guidedKind, HERO_SCENE, isStory, MIXES_BY_ID, mixHref, SOUNDS, type SoundId, WORLDS_BY_ID } from '../data/worlds';
import * as engine from './engine';

const { state } = engine;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

document.documentElement.classList.remove('no-js');

// ---------- Rendering: every bound control reflects the engine ----------
const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
};

function stateText(worldId: string) {
  if (state.problem && worldId === state.current) return state.problem;
  if (state.busy && worldId === state.current) return 'Loading';
  if (!state.playing || worldId !== state.current) return 'Press play to hear it';
  const left = engine.timeLeft();
  if (isStory(worldId)) return left !== null ? (guidedKind(worldId) === 'meditation' ? 'The first minutes · ' : 'The opening · ') + fmt(left) + ' left' : 'Playing';
  return left !== null ? 'Playing · fades out in ' + fmt(left) : 'Playing all night';
}

function render() {
  const world = MIXES_BY_ID[state.current];
  const playingHere = (id: string) => state.playing && id === state.current;

  $$('[data-now]').forEach((el) => (el.textContent = world.name));
  $$<HTMLButtonElement>('button[data-play-world]').forEach((b) => {
    const on = playingHere(b.dataset.playWorld!);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-busy', String(state.busy && b.dataset.playWorld === state.current));
    const label = $('[data-label]', b);
    if (label) label.textContent = on ? 'Pause' : (label.dataset.idle || 'Play this soundscape');
  });
  $$('a[data-play-world]').forEach((a) => a.classList.toggle('is-playing', playingHere(a.dataset.playWorld!)));
  $$('[data-toggle]').forEach((t) => {
    const id = t.closest<HTMLElement>('[data-world]')?.dataset.world || state.current;
    const on = playingHere(id);
    t.setAttribute('aria-label', on ? 'Pause' : 'Play');
    t.classList.toggle('is-playing', on);
  });
  $$('.player').forEach((p) => p.classList.toggle('is-playing', state.playing));
  $$('.mixer').forEach((m) => {
    const id = m.dataset.world || state.current;
    m.classList.toggle('is-playing', playingHere(id));
    m.classList.toggle('has-problem', !!state.problem && id === state.current);
    const st = $('[data-state]', m);
    if (st) st.textContent = stateText(id);
    if (!m.dataset.world && m.dataset.rendered !== state.current) renderLayers(m, state.current);
  });
  document.body.classList.toggle('is-playing-page', state.playing);
  $$('[data-mute]').forEach((btn) => { btn.setAttribute('aria-pressed', String(state.muted)); btn.setAttribute('aria-label', state.muted ? 'Unmute' : 'Mute'); });
  $$('[data-timer]').forEach((chip) => chip.setAttribute('aria-checked', String(Number(chip.dataset.timer) === state.timerMinutes)));
  renderTimeBar();
  renderDock();
}

function renderTimeBar() {
  const left = engine.timeLeft();
  const frac = left !== null && state.timerTotal > 0 ? Math.max(0, left / state.timerTotal) : 1;
  $$('[data-time]').forEach((el) => (el.textContent = left !== null ? fmt(left) : state.timerMinutes > 0 ? fmt(state.timerMinutes * 60000) : '∞'));
  $$('[data-fill]').forEach((el) => (el.style.width = frac * 100 + '%'));
  $$('[data-knob]').forEach((el) => (el.style.left = frac * 100 + '%'));
  // A story card's thin line fills as its opening plays.
  $$<HTMLElement>('[data-progress-for]').forEach((el) => {
    const on = state.playing && el.dataset.progressFor === state.current;
    el.style.transform = 'scaleX(' + (on ? (1 - frac).toFixed(4) : '0') + ')';
  });
}

// ---------- Mixer: three faders for a world ----------
function renderLayers(mixer: HTMLElement, worldId: string) {
  const box = $('[data-layers]', mixer);
  if (!box) return;
  mixer.dataset.rendered = worldId;
  box.innerHTML = '';
  engine.levelsFor(worldId).forEach(([id, level], i) => {
    const s = SOUNDS[id as SoundId];
    const row = document.createElement('div');
    row.className = 'layer';
    const inputId = 'layer-' + worldId + '-' + id + '-' + i;
    row.innerHTML =
      '<svg class="icon" aria-hidden="true"><use href="#i-' + s.icon + '"></use></svg>' +
      '<label for="' + inputId + '">' + s.label + '</label>' +
      '<input type="range" id="' + inputId + '" min="0" max="100" step="1" value="' + level + '" aria-valuetext="' + level + ' percent" style="--p:' + level + '%">' +
      '<output for="' + inputId + '">' + level + '%</output>';
    box.appendChild(row);
    const input = $<HTMLInputElement>('input', row)!, out = $('output', row)!;
    input.addEventListener('input', () => {
      const v = Number(input.value);
      input.style.setProperty('--p', v + '%');
      input.setAttribute('aria-valuetext', v + ' percent');
      out.textContent = v + '%';
      engine.setLevel(worldId, id, v);
      // A fader always does something you can hear: if this mix is not the one playing, start it
      if (!(state.playing && state.current === worldId) && !state.busy) engine.play(worldId);
    });
  });
}

// ---------- Player dock: persists across pages, shows once sound has started ----------
let dockHidden = false; // a big player is on screen, so the dock steps aside
function renderDock() {
  const dock = document.getElementById('dock');
  if (!dock) return;
  const show = state.started && !dockHidden;
  dock.classList.toggle('is-shown', show);
  dock.toggleAttribute('inert', !show);
  dock.setAttribute('aria-hidden', String(!show));
  const world = MIXES_BY_ID[state.current];
  const link = $<HTMLAnchorElement>('[data-dock-link]', dock);
  if (link) link.href = mixHref(world.id);
  const thumb = $<HTMLImageElement>('[data-dock-thumb]', dock);
  const want = (JSON.parse(dock.dataset.thumbs || '{}') as Record<string, string>)[world.id];
  if (thumb && want && thumb.getAttribute('src') !== want) thumb.src = want;
  const st = $('[data-dock-state]', dock);
  if (st) {
    const left = engine.timeLeft();
    st.textContent = state.busy ? 'Loading' : !state.playing ? 'Paused'
      : isStory(world.id) ? (guidedKind(world.id) === 'meditation' ? 'Meditation' : 'Story') + (left !== null ? ' · ' + fmt(left) + ' left' : '')
      : left !== null ? 'Fades out in ' + fmt(left) : 'Playing all night';
  }
  dock.classList.toggle('is-playing', state.playing);
}

// ---------- Global wiring (once) ----------
engine.subscribe(render);

// One delegated click handler survives every page change.
document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const worldLink = t.closest<HTMLAnchorElement>('a[data-play-world]');
  if (worldLink) {
    // A plain click into a world starts its sound on the way in. Modified clicks just open the page.
    const me = e as MouseEvent;
    if (!me.metaKey && !me.ctrlKey && !me.shiftKey && !me.altKey && me.button === 0) {
      engine.ensurePlaying(worldLink.dataset.playWorld!);
      // Exactly one element may carry a transition name: clear any left from earlier.
      $$<HTMLElement>('[data-vt], [style*="view-transition-name"]').forEach((el) => { el.style.viewTransitionName = ''; delete el.dataset.vt; });
      const img = $<HTMLElement>('img', worldLink);
      if (img) { img.style.viewTransitionName = 'world-scene'; img.dataset.vt = ''; }
    }
    return;
  }
  const play = t.closest<HTMLButtonElement>('button[data-play-world]');
  if (play) { engine.toggle(play.dataset.playWorld); return; }
  const tgl = t.closest<HTMLElement>('[data-toggle]');
  if (tgl) { engine.toggle(tgl.closest<HTMLElement>('[data-world]')?.dataset.world || state.current); return; }
  const mute = t.closest('[data-mute]');
  if (mute) { engine.setMuted(!state.muted); return; }
  const chip = t.closest<HTMLElement>('[data-timer]');
  if (chip) { engine.setTimer(Number(chip.dataset.timer)); return; }
  const stop = t.closest('[data-dock-close]');
  if (stop) { engine.pause(); state.started = false; render(); return; }
});

document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (e.key === ' ' && !/INPUT|BUTTON|TEXTAREA|SELECT|A|SUMMARY/.test(tag)) { e.preventDefault(); engine.toggle(); }
  if (e.key === 'Escape') { const menu = $('#menu'); if (menu && !menu.hidden) setMenu(false); }
});

window.addEventListener('scroll', () => { const h = $('.top'); if (h) h.classList.toggle('is-stuck', window.scrollY > 24); }, { passive: true });

function setMenu(open: boolean) {
  const btn = $('.menu-btn'), menu = $('#menu');
  if (!btn || !menu) return;
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
}

// Fetch the first world's files on the first pointer movement so the first tap answers at once.
// Bytes only: decoding waits for the tap that creates the audio context.
const warm = () => engine.levelsFor(state.current).forEach(([id]) => engine.fetchBytes(id).catch(() => {}));
window.addEventListener('pointermove', warm, { once: true, passive: true });
window.addEventListener('touchstart', warm, { once: true, passive: true });

// The scene that grew into a world page shrinks back into its card on the way home.
document.addEventListener('astro:before-swap', (e) => {
  const ev = e as Event & { newDocument: Document; from: URL; to: URL };
  const m = ev.from.pathname.match(/^\/worlds\/([a-z-]+)\/?$/);
  // Only when going home: a world page already names its own hero.
  if (!m || ev.to.pathname !== '/') return;
  const card = ev.newDocument.querySelector<HTMLElement>(`a[data-play-world="${m[1]}"] img`);
  if (card) { card.style.viewTransitionName = 'world-scene'; card.dataset.vt = ''; }
});

// ---------- Lamp cord: light mode and dark mode ----------
function bindCord() {
  const cord = document.getElementById('cord');
  if (!cord || cord.dataset.bound) return;
  cord.dataset.bound = '1';
  const grab = cord.querySelector<HTMLElement>('.cord-grab')!, bead = cord.querySelector<HTMLButtonElement>('.cord-bead')!, note = cord.querySelector<HTMLElement>('.cord-note')!;
  const store = (k: string, v?: string) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* private mode */ } return null; };
  const label = () => {
    const light = document.documentElement.classList.contains('light');
    bead.setAttribute('aria-pressed', String(!light));
    bead.setAttribute('aria-label', light ? 'Pull the cord for dark mode' : 'Pull the cord for light mode');
  };
  const toggle = () => {
    const root = document.documentElement, light = !root.classList.contains('light');
    root.classList.add('theme-fade');
    root.classList.toggle('light', light);
    store('sm-theme', light ? 'light' : 'dark');
    store('sm-cord', '1');
    note.classList.remove('show');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#f3ecdf' : '#0b0e15');
    label();
    setTimeout(() => root.classList.remove('theme-fade'), 1000);
  };
  // A pull: the string stretches, springs back, and the lamp clicks
  const spring = (from: number) => {
    if (reduced.matches) { grab.style.transform = ''; return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      const y = from * Math.exp(-6 * t) * Math.cos(16 * t);
      grab.style.transform = Math.abs(y) < 0.3 && t > 0.3 ? '' : `translateY(${y.toFixed(2)}px)`;
      if (grab.style.transform) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  let pull: { y: number; d: number } | null = null;
  bead.addEventListener('pointerdown', (e) => { pull = { y: e.clientY, d: 0 }; bead.setPointerCapture(e.pointerId); });
  bead.addEventListener('pointermove', (e) => { if (!pull) return; pull.d = Math.max(0, Math.min(70, e.clientY - pull.y)); grab.style.transform = `translateY(${pull.d}px)`; });
  const end = (cancel: boolean) => {
    if (!pull) return;
    const d = pull.d; pull = null;
    if (cancel) { spring(d); return; }
    if (d < 6) { spring(38); setTimeout(toggle, 160); return; } // a tap: a quick tug
    spring(d);
    if (d > 26) toggle();
  };
  bead.addEventListener('pointerup', () => end(false));
  bead.addEventListener('pointercancel', () => end(true));
  bead.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spring(38); setTimeout(toggle, 160); } });
  document.addEventListener('astro:after-swap', label);
  label();
  if (!store('sm-cord')) setTimeout(() => { if (!store('sm-cord')) note.classList.add('show'); }, 5000);
}
bindCord();

// ---------- Launch list: an email for launch day (GetApp.astro, supabase/functions/signup) ----------
const SIGNUP = 'https://texlatkkshmbyojkjbnc.supabase.co/functions/v1/signup';
function bindLaunch() {
  $$<HTMLFormElement>('form[data-launch]').forEach((form) => {
    const msg = $('.launch-msg', form)!, email = $<HTMLInputElement>('input[type="email"]', form)!, go = $<HTMLButtonElement>('.launch-go', form)!;
    const radios = $$<HTMLButtonElement>('[data-platform]', form);
    let platform = radios.find((r) => r.getAttribute('aria-checked') === 'true')?.dataset.platform ?? 'iphone';
    const done = (text: string) => { form.classList.add('is-done'); msg.classList.remove('is-bad'); msg.textContent = text; };
    try { const joined = localStorage.getItem('sm-launch'); if (joined) done("You're on the list. We'll write once, on launch day."); } catch { /* private mode */ }
    radios.forEach((r) => r.addEventListener('click', () => {
      platform = r.dataset.platform!;
      radios.forEach((x) => x.setAttribute('aria-checked', String(x === r)));
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) { msg.classList.add('is-bad'); msg.textContent = 'That email looks incomplete. Check it and try again.'; email.focus(); return; }
      go.disabled = true; msg.classList.remove('is-bad'); msg.textContent = 'Adding you to the list';
      try {
        const res = await fetch(SIGNUP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: value, platform, source: location.pathname, website: (form.elements.namedItem('website') as HTMLInputElement | null)?.value || '' }) });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out.result === 'ok') {
          try { localStorage.setItem('sm-launch', platform); } catch { /* private mode */ }
          done("You're on the list. We'll write once, on launch day.");
        } else if (out.result === 'invalid') { msg.classList.add('is-bad'); msg.textContent = 'That email looks incomplete. Check it and try again.'; }
        else throw new Error(String(out.result || res.status));
      } catch {
        msg.classList.add('is-bad'); msg.textContent = 'That did not go through. Check your connection and try again.';
      } finally { go.disabled = false; }
    });
  });
}

// ---------- Per page ----------
let teardown: (() => void)[] = [];

document.addEventListener('astro:before-swap', () => {
  teardown.forEach((fn) => { try { fn(); } catch { /* gone */ } });
  teardown = [];
  setMenu(false);
});

document.addEventListener('astro:page-load', () => {
  const header = $('.top');
  if (header) header.classList.toggle('is-stuck', window.scrollY > 24);

  // Menu
  const menuBtn = $('.menu-btn'), menu = $('#menu');
  if (menuBtn && menu) {
    const onMenu = () => setMenu(menu.hidden !== false);
    menuBtn.addEventListener('click', onMenu);
    const close = () => setMenu(false);
    $$('a', menu).forEach((a) => a.addEventListener('click', close));
    teardown.push(() => menuBtn.removeEventListener('click', onMenu));
  }

  // A world page points the player at its world when nothing is playing yet.
  const page = $<HTMLElement>('[data-world-page]');
  if (page) engine.select(page.dataset.worldPage!);

  // Mixers fixed to a world render once; the home mixer follows the current world (render()).
  $$('.mixer[data-world]').forEach((m) => renderLayers(m, m.dataset.world!));
  engine.setMeterBars($$('[data-meter] i'));

  // The dock steps aside while a big player is on screen.
  dockHidden = false;
  const big = $$('[data-dock-hide]');
  if (big.length && 'IntersectionObserver' in window) {
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => seen.set(en.target, en.isIntersecting));
      dockHidden = Array.from(seen.values()).some(Boolean);
      renderDock();
    }, { threshold: 0.15 });
    big.forEach((el) => io.observe(el));
    teardown.push(() => io.disconnect());
  }

  bindNightStory();
  bindLaunch();
  bindHeroMix();
  const builder = $<HTMLElement>('[data-builder]');
  if (builder) import('./scene-builder').then(({ mountBuilder }) => { if (builder.isConnected) teardown.push(mountBuilder(builder)); }).catch(() => {});
  $$('[data-carousel]').forEach(bindCarousel);
  render();

  // iPhone: a hint about the silent switch, the first time sound starts on this page.
  const hint = $('[data-ios-hint]');
  if (hint && engine.isApple && /iP(hone|od)/.test(navigator.userAgent)) {
    let shown = false;
    teardown.push(engine.subscribe(() => {
      if (shown || !state.playing) return;
      shown = true; hint.classList.add('is-shown'); setTimeout(() => hint.classList.remove('is-shown'), 9000);
    }) as unknown as () => void);
  }

  const wv = $<HTMLVideoElement>('video.world-video');
  if (wv) teardown.push(bindWorldVideo(wv));

  if (!reduced.matches) {
    import('./motion').then(({ mountMotion }) => { teardown.push(mountMotion()); }).catch(() => {});
    const canvases = $$<HTMLCanvasElement>('canvas[data-ambience]');
    if (canvases.length) {
      import('./ambience').then(({ mountAmbience }) => {
        for (const cv of canvases) {
          const kind = cv.dataset.ambience!;
          if (kind === 'hero') {
            const L = window.matchMedia('(max-width: 760px)').matches ? HERO_SCENE.mobile : HERO_SCENE.desktop;
            teardown.push(mountAmbience(cv, {
              worldId: 'rainy-cabin',
              // Clouds sit behind the rain; everything else draws over it
              effects: [...L.effects.filter((e) => e.kind === 'clouds'), { kind: 'rain', sound: 'rain' }, ...L.effects.filter((e) => e.kind !== 'clouds')],
              natural: L.natural, position: L.position, glass: L.glass,
            }));
            import('./stove').then(({ mountStove }) => {
              teardown.push(mountStove(cv.parentElement!, { worldId: 'rainy-cabin', natural: L.natural, position: L.position, stove: L.stove }));
            }).catch(() => {});
          } else {
            const world = WORLDS_BY_ID[kind];
            if (!world) continue;
            const [fx, fy] = world.focus.split(' ').map((v) => parseFloat(v) / 100);
            teardown.push(mountAmbience(cv, { worldId: world.id, effects: world.effects, natural: [2560, 1434], position: [fx, fy] }));
          }
        }
      }).catch(() => {});
    }
  }
});

// ---------- One night: pinned stage follows the chapter in view ----------
function bindNightStory() {
  const steps = $$('[data-step]');
  const stageCard = $('.stage-card');
  if (!steps.length || !stageCard || !('IntersectionObserver' in window)) return;
  const sceneImgs = $$('[data-scene]'), screenImgs = $$('[data-screen]');
  const setStep = (i: number) => {
    steps.forEach((s) => s.classList.toggle('is-on', Number(s.dataset.step) === i));
    sceneImgs.forEach((im) => im.classList.toggle('is-on', Number(im.dataset.scene) === i));
    screenImgs.forEach((im) => im.classList.toggle('is-on', Number(im.dataset.screen) === i));
    stageCard.classList.toggle('is-dark', i === 3);
  };
  const ratios: Record<string, number> = {};
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { ratios[(en.target as HTMLElement).dataset.step!] = en.isIntersecting ? en.intersectionRatio : 0; });
    let best: number | null = null, bestRatio = 0;
    Object.keys(ratios).forEach((k) => { if (ratios[k] > bestRatio) { bestRatio = ratios[k]; best = Number(k); } });
    if (best !== null) setStep(best);
  }, { rootMargin: window.matchMedia('(max-width: 1024px)').matches ? '-56% 0px -6% 0px' : '-45% 0px -45% 0px', threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] });
  steps.forEach((s) => io.observe(s));
  teardown.push(() => io.disconnect());
}

// ---------- Story carousel: endless in both directions ----------
// The cards are rendered five times over; the middle copy is the real one. When a scroll settles
// in an outer copy, the track jumps by exactly one copy's width, so the same card sits in the
// same place and the jump cannot be seen. Swipe, scroll, the arrow buttons and the keyboard all work.
function bindCarousel(root: HTMLElement) {
  const track = $<HTMLElement>('[data-track]', root);
  if (!track) return;
  const cards = $$<HTMLElement>('[data-card]', track);
  const copies = Number(track.dataset.copies || 5);
  const per = cards.length / copies;
  if (!per) return;
  const middle = Math.floor(copies / 2);
  const setWidth = () => cards[per].offsetLeft - cards[0].offsetLeft;
  const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
  const home = () => cards[middle * per].offsetLeft - cards[0].offsetLeft;
  track.scrollLeft = home();

  let settle = 0, down = false;
  const recentre = () => {
    const w = setWidth(), x = track.scrollLeft - home();
    if (Math.abs(x) >= w * 0.5) {
      const shift = Math.round(x / w) * w;
      track.style.scrollSnapType = 'none';
      track.scrollLeft -= shift;
      requestAnimationFrame(() => (track.style.scrollSnapType = ''));
    }
  };
  const onScroll = () => { clearTimeout(settle); if (!down) settle = window.setTimeout(recentre, 140); };
  track.addEventListener('scroll', onScroll, { passive: true });
  const go = (dir: number) => track.scrollBy({ left: dir * step(), behavior: reduced.matches ? 'auto' : 'smooth' });
  const prev = $('[data-prev]', root), next = $('[data-next]', root);
  const onPrev = () => go(-1), onNext = () => go(1);
  prev?.addEventListener('click', onPrev);
  next?.addEventListener('click', onNext);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  track.addEventListener('keydown', onKey);
  const onResize = () => { track.scrollLeft = home(); };
  window.addEventListener('resize', onResize);

  // Mouse: drag the row like a touchscreen, then settle on the nearest card. Touch and trackpads scroll natively.
  let dragged = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, speed = 0, unsnap = 0;
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || (e.target as Element).closest('button, a')) return;
    down = true; dragged = false; startX = lastX = e.clientX; startLeft = track.scrollLeft; lastT = e.timeStamp; speed = 0;
    clearTimeout(unsnap);
  };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!dragged && Math.abs(dx) > 6) {
      dragged = true;
      track.setPointerCapture(e.pointerId);
      track.style.scrollSnapType = 'none';
      track.classList.add('is-dragging');
    }
    if (!dragged) return;
    const dt = Math.max(1, e.timeStamp - lastT);
    speed = (e.clientX - lastX) / dt; lastX = e.clientX; lastT = e.timeStamp;
    track.scrollLeft = startLeft - dx;
  };
  const onUp = () => {
    if (!down) return;
    down = false;
    if (!dragged) return;
    track.classList.remove('is-dragging');
    const s = step(), at = track.scrollLeft / s;
    const fling = Math.abs(speed) > 0.4 ? -Math.sign(speed) * 0.5 : 0;
    const target = Math.round(at + fling) * s;
    track.scrollTo({ left: target, behavior: reduced.matches ? 'auto' : 'smooth' });
    unsnap = window.setTimeout(() => (track.style.scrollSnapType = ''), 600);
  };
  // A drag must not count as a click on the card underneath.
  const onClickCapture = (e: MouseEvent) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } };
  const noImageDrag = (e: DragEvent) => e.preventDefault();
  // Tapping a cover plays that card, like its button.
  const onCover = (e: MouseEvent) => {
    const cover = (e.target as Element).closest('.story-cover');
    if (cover) cover.closest('[data-card]')?.querySelector<HTMLButtonElement>('.story-play')?.click();
  };
  track.addEventListener('pointerdown', onDown);
  track.addEventListener('pointermove', onMove);
  track.addEventListener('pointerup', onUp);
  track.addEventListener('pointercancel', onUp);
  track.addEventListener('click', onClickCapture, true);
  track.addEventListener('click', onCover);
  track.addEventListener('dragstart', noImageDrag);
  teardown.push(() => {
    track.removeEventListener('pointerdown', onDown); track.removeEventListener('pointermove', onMove);
    track.removeEventListener('pointerup', onUp); track.removeEventListener('pointercancel', onUp);
    track.removeEventListener('click', onClickCapture, true); track.removeEventListener('click', onCover);
    track.removeEventListener('dragstart', noImageDrag); clearTimeout(unsnap);
    track.removeEventListener('scroll', onScroll); track.removeEventListener('keydown', onKey);
    prev?.removeEventListener('click', onPrev); next?.removeEventListener('click', onNext);
    window.removeEventListener('resize', onResize); clearTimeout(settle);
  });
}

// ---------- Hero video: desktop, motion allowed, no data saver ----------
// ---------- Hero mix: four small faders in the hero player; the picture follows them ----------
/** Each hero sound's own colour: rain dusk blue, fire amber, crickets firefly green, wind silver. */
const HERO_COLORS: Record<string, string> = { rain: '134,169,227', fire: '240,160,80', night: '200,225,110', wind: '214,221,234' };

function bindHeroMix() {
  const box = $<HTMLElement>('[data-hero-mix]');
  if (!box) return;
  const worldId = box.dataset.heroMix!;
  box.innerHTML = '';
  const bars: Record<string, (v: number) => void> = {};
  let orbs: { sync: () => void; spot: (id: string | null) => void; mark: (id: string | null) => void } | null = null;
  const tracks: { id: string; canvas: HTMLCanvasElement; color: string }[] = [];
  const moods = $<HTMLElement>('[data-moods]');
  const clearMood = () => moods && $$('button', moods).forEach((b) => b.setAttribute('aria-pressed', 'false'));
  engine.levelsFor(worldId).forEach(([id, level]) => {
    const s = SOUNDS[id as SoundId];
    const label = document.createElement('label');
    label.className = 'hm';
    label.style.setProperty('--c', HERO_COLORS[id] || '213,162,79');
    label.innerHTML =
      '<span class="hm-name"><svg class="icon" aria-hidden="true"><use href="#i-' + s.icon + '"></use></svg>' + s.label + '<b class="hm-val" aria-hidden="true">' + level + '%</b></span>' +
      '<span class="hm-track"><canvas aria-hidden="true"></canvas>' +
      '<input type="range" min="0" max="100" step="1" value="' + level + '" style="--p:' + level + '%" aria-valuetext="' + level + ' percent"></span>';
    box.appendChild(label);
    const input = $<HTMLInputElement>('input', label)!, val = $('.hm-val', label)!;
    tracks.push({ id, canvas: $<HTMLCanvasElement>('canvas', label)!, color: HERO_COLORS[id] || '213,162,79' });
    // The bar and the room are one control: hover shows the light's label, dragging lights up its part of the room
    label.addEventListener('pointerenter', () => orbs?.mark(id));
    label.addEventListener('pointerleave', () => orbs?.mark(null));
    input.addEventListener('pointerdown', () => orbs?.spot(id));
    input.addEventListener('pointerup', () => orbs?.spot(null));
    input.addEventListener('pointercancel', () => orbs?.spot(null));
    input.addEventListener('focus', () => { if (input.matches(':focus-visible')) orbs?.spot(id); });
    input.addEventListener('blur', () => orbs?.spot(null));
    bars[id] = (v: number) => {
      input.value = String(v);
      input.style.setProperty('--p', v + '%');
      input.setAttribute('aria-valuetext', v + ' percent');
      val.textContent = v + '%';
    };
    input.addEventListener('input', () => {
      const v = Number(input.value);
      bars[id](v);
      engine.setLevel(worldId, id, v);
      orbs?.sync();
      clearMood();
    });
  });
  import('./hero-tracks').then(({ mountTracks, MOODS }) => {
    if (!box.isConnected) return;
    teardown.push(mountTracks(worldId, tracks));
    if (!moods) return;
    // Mood presets: one tap sweeps every fader to a mix, and the room follows
    moods.innerHTML = '';
    let sweep = 0;
    MOODS.forEach((m) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mood'; b.textContent = m.name;
      b.setAttribute('aria-pressed', 'false');
      moods.appendChild(b);
      b.addEventListener('click', () => {
        cancelAnimationFrame(sweep);
        $$('button', moods).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const from = Object.fromEntries(engine.levelsFor(worldId)) as Record<string, number>;
        const t0 = performance.now(), dur = reduced.matches ? 1 : 1100;
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          for (const id in m.levels) {
            if (!(id in from)) continue;
            const v = Math.round(from[id] + (m.levels[id] - from[id]) * e);
            engine.setLevel(worldId, id, v); bars[id]?.(v);
          }
          orbs?.sync();
          if (k < 1) sweep = requestAnimationFrame(step);
        };
        sweep = requestAnimationFrame(step);
      });
    });
    teardown.push(() => cancelAnimationFrame(sweep));
  }).catch(() => {});
  // The same controls, placed on the things themselves in the picture
  const hero = box.closest<HTMLElement>('.hero'), art = hero && $<HTMLElement>('.hero-art', hero);
  if (!hero || !art) return;
  const L = window.matchMedia('(max-width: 760px)').matches ? HERO_SCENE.mobile : HERO_SCENE.desktop;
  import('./hero-orbs').then(({ mountOrbs }) => {
    if (!hero.isConnected) return;
    const m = mountOrbs(hero, art, {
      worldId, natural: L.natural, position: L.position,
      orbs: L.orbs.map((o) => ({ ...o, label: SOUNDS[o.id].label, icon: SOUNDS[o.id].icon, color: HERO_COLORS[o.id] })),
      onChange: (id, v) => { engine.setLevel(worldId, id, v); bars[id]?.(v); },
    });
    orbs = m;
    teardown.push(m.destroy);
  }).catch(() => {});
}


// ---------- World video: a seamless loop over the still, after the page has loaded ----------
// Skipped for reduced motion and data saver. Paused while off screen.
function bindWorldVideo(v: HTMLVideoElement): () => void {
  const saveData = !!((navigator as any).connection && (navigator as any).connection.saveData);
  // Where the crop of the 16:9 picture ends on the right, given the screen's shape and the focus point.
  const fx = parseFloat(getComputedStyle(v).objectPosition) / 100;
  const shown = Math.min(1, (v.clientWidth / Math.max(1, v.clientHeight)) / (16 / 9));
  const leftEdge = (1 - shown) * (isNaN(fx) ? 0.5 : fx), rightEdge = leftEdge + shown;
  const offFrame = rightEdge < Number(v.dataset.from || 0) + 0.05 || leftEdge > Number(v.dataset.to || 1) - 0.05;
  if (reduced.matches || saveData || offFrame || !v.canPlayType) { v.remove(); return () => {}; }
  let io: IntersectionObserver | null = null, timer = 0, alive = true;
  const start = () => {
    if (!alive) return;
    const add = (src: string, type: string) => { const s = document.createElement('source'); s.src = src; s.type = type; v.appendChild(s); };
    if (v.canPlayType('video/webm; codecs=vp9')) add(v.dataset.webm!, 'video/webm');
    add(v.dataset.mp4!, 'video/mp4');
    v.addEventListener('playing', () => v.classList.add('is-live'), { once: true });
    io = new IntersectionObserver(([en]) => { if (en.isIntersecting) v.play().catch(() => {}); else v.pause(); });
    io.observe(v);
    v.load();
  };
  // After the still has painted and the page is idle, so the video never competes with it.
  const later = () => { timer = window.setTimeout(start, 600); };
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
  return () => { alive = false; clearTimeout(timer); window.removeEventListener('load', later); io?.disconnect(); v.pause(); };
}

// Diagnostics for devices we cannot attach to: open any page with ?debug=1 and press play.
if (/[?&]debug=1/.test(location.search)) {
  const panel = document.createElement('pre');
  panel.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99;margin:0;padding:10px 12px;border-radius:12px;background:rgba(11,14,21,.92);border:1px solid rgba(243,234,219,.3);color:#f3eadb;font:11px/1.5 Menlo,Consolas,monospace;white-space:pre-wrap;max-height:45vh;overflow:auto;pointer-events:none';
  (document.getElementById('dock') || document.body).appendChild(panel);
  setInterval(() => {
    const sm = (window as any).__sleepMoore;
    panel.textContent = [
      'ua: ' + navigator.userAgent.slice(0, 90),
      'apple: ' + sm.isApple + '  formats: ' + sm.formats.join(',') + '  secure: ' + window.isSecureContext,
      'diag: ' + JSON.stringify(sm.diag),
      'playing: ' + sm.playing + '  current: ' + sm.current + '  live: ' + Object.keys(sm.live).join(','),
      'bytes: ' + sm.bytes.join(' '),
      'problem: ' + (sm.problem || '-'),
    ].join('\n');
  }, 500);
}

/* Sleep Moore sound engine. Loaded once and kept alive across page changes (Astro's client
   router swaps the page, not the window), so sound never stops when you navigate.

   Web Audio, created inside the first tap (iOS needs that), with a format chain: AAC first on
   Apple browsers, then Opus, then FLAC. If a browser fails to decode one format we drop it and
   try the next, so every browser ends up with sound. */
import { type SoundId, WORLDS_BY_ID } from '../data/worlds';

type Live = { src: AudioBufferSourceNode; gain: GainNode; level: number };
type Listener = () => void;

const AC: typeof AudioContext | undefined = window.AudioContext || (window as any).webkitAudioContext;
const FADE_SECONDS = 20;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
const bytes: Record<string, { ext: string; data: ArrayBuffer }> = {};
const buffers: Record<string, AudioBuffer> = {};
const pending: Record<string, Promise<AudioBuffer>> = {};
const live: Record<string, Live> = {};
/** Fader levels per world, 0-100, starting from each world's defaults. */
const levels: Record<string, Record<string, number>> = {};

export const state = {
  current: 'rainy-cabin',
  playing: false,
  /** Something has been played this visit: the player dock may show. */
  started: false,
  busy: false,
  muted: false,
  problem: '',
  timerMinutes: 45,
  timerEnd: null as number | null,
};
let fadeStarted = false;

// ---------- Formats ----------
const probe = document.createElement('audio');
const can = (type: string) => !!(probe.canPlayType && probe.canPlayType(type));
export const isApple = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
  (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|OPR|Android/.test(navigator.userAgent));
let formats: string[] = [];
// WebKit decodes AAC reliably and may report Opus or FLAC as playable yet never finish decoding them.
if (isApple) formats.push('m4a');
if (can('audio/ogg; codecs=opus')) formats.push('opus');
if (can('audio/flac') || can('audio/x-flac')) formats.push('flac');
if (!isApple) formats.push('m4a');
const forced = (location.search.match(/[?&]audio=(opus|flac|m4a)/) || [])[1];
if (forced) formats = [forced];

// ---------- Listeners ----------
const listeners = new Set<Listener>();
export function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn()); }

// ---------- Context ----------
export const diag = { keepAliveError: '', lastError: '', rebuilt: 0 };
function ensureContext(): AudioContext {
  if (!AC) throw new Error('Web Audio is not available in this browser');
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = state.muted ? 0 : 1;
    master.connect(ctx.destination);
    analyser = ctx.createAnalyser(); analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.82;
    master.connect(analyser);
    ctx.onstatechange = () => { if (ctx && ctx.state === 'running' && state.problem === 'Tap play again to allow sound') { state.problem = ''; emit(); } };
  }
  if (ctx.state !== 'running' && ctx.resume) ctx.resume().catch(() => {});
  return ctx;
}

// iOS and some Android browsers only let sound start inside a tap: create the context and play
// one silent sample on the first gesture of any kind.
let keepAlive: HTMLAudioElement | null = null;
const KEEP_ALIVE_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMgAAAAAAAAAAAAAA//NwwAAAAAAAAAAAAEluZm8AAAAPAAAAGQAAA0MAPz8/SEhISFBQUFBXV1dXX19fX2dnZ2dvb29vd3d3d39/f3+IiIiIkJCQkJiYmJigoKCgqKioqK+vr6+3t7e3v7+/v8jIyMjQ0NDQ2NjY2ODg4ODo6Ojo8PDw8Pj4+Pj/////AAAAAExhdmM2Mi4yOAAAAAAAAAAAAAAAACQCUgAAAAAAAAND4AZebAAAAAAAAAAAAAAAAAD/8xDEAAAAA0gAAAAATEFNRTMuMTBMQU1FM//zEsQNAAADSAAAAAAuMTAwVVVVVUxBTUUzLv/zEMQbAAADSAAAAAAxMDBVVVVVTEFNRTMu//MQxCgAAANIAAAAADEwMFVVVVVMQU1FMy7/8xDENQAAA0gAAAAAMTAwVVVVVUxBTUUzLv/zEMRCAAADSAAAAAAxMDBVVVVVTEFNRTMu//MQxE8AAANIAAAAADEwMFVVVVVVVVVVVVX/8xDEXAAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMRpAAADSAAAAABVVVVVVVVVVVVVVVVV//MSxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVV//MQxIQAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDEkQAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMSeAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxKsAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDEuAAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTFAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxNIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xLE3wAAA0gAAAAAVVVVVVVVVVVVVVVVVVX/8xDE7QAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVf/zEMTyAAADSAAAAABVVVVVVVVVVVVVVVVV//MQxPIAAANIAAAAAFVVVVVVVVVVVVVVVVX/8xDE8gAAA0gAAAAAVVVVVVVVVVVVVVVVVQ==';
function unlock() {
  try {
    const c = ensureContext();
    const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate); s.connect(c.destination); s.start(0);
  } catch { /* no audio in this browser; play() reports it */ }
  if (isApple && !keepAlive) {
    // 0.6 s of silent MP3, looping: a playing media element moves iOS into its playback session,
    // so the side silent switch no longer mutes Web Audio. It lives in the persisted dock so a
    // page change never removes it.
    keepAlive = document.createElement('audio');
    keepAlive.setAttribute('playsinline', ''); keepAlive.setAttribute('aria-hidden', 'true');
    keepAlive.loop = true; keepAlive.preload = 'auto';
    keepAlive.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    keepAlive.src = KEEP_ALIVE_MP3;
    (document.getElementById('dock') || document.body).appendChild(keepAlive);
    const p = keepAlive.play(); if (p && p.catch) p.catch((e) => { diag.keepAliveError = String((e && e.name) || e); });
  }
  ['touchend', 'pointerdown', 'keydown'].forEach((ev) => document.removeEventListener(ev, unlock, true));
}
['touchend', 'pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, true));

// ---------- Loading ----------
export function fetchBytes(id: string) {
  if (bytes[id] && formats.includes(bytes[id].ext)) return Promise.resolve(bytes[id]);
  const ext = formats[0];
  return fetch('/audio/' + id + '.' + ext).then((r) => {
    if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + id + '.' + ext);
    return r.arrayBuffer();
  }).then((data) => (bytes[id] = { ext, data }));
}

function decode(data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const copy = data.slice(0); // Safari detaches the buffer it decodes
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('decode timed out')); } }, 9000);
    const ok = (b: AudioBuffer) => { if (!settled) { settled = true; clearTimeout(timer); resolve(b); } };
    const bad = (e?: unknown) => { if (!settled) { settled = true; clearTimeout(timer); reject(e || new Error('decode failed')); } };
    try {
      const done = ensureContext().decodeAudioData(copy, ok, bad);
      if (done && done.then) done.then(ok, bad);
    } catch (e) { bad(e); }
  });
}

function load(id: string): Promise<AudioBuffer> {
  if (buffers[id]) return Promise.resolve(buffers[id]);
  if (id in pending) return pending[id];
  pending[id] = fetchBytes(id).then((b) => decode(b.data).catch((err) => {
    // This browser cannot decode this format: drop it for the visit and try the next one.
    if (formats.length > 1 && formats[0] === b.ext) {
      formats.shift();
      console.warn('Sleep Moore: ' + b.ext + ' did not decode here, trying ' + formats[0], err);
      delete bytes[id];
      return fetchBytes(id).then((b2) => decode(b2.data));
    }
    throw err;
  })).then((buf) => { buffers[id] = buf; delete pending[id]; return buf; })
    .catch((err) => { delete pending[id]; throw err; });
  return pending[id];
}

// ---------- Levels ----------
export function levelsFor(worldId: string): [SoundId, number][] {
  const world = WORLDS_BY_ID[worldId];
  if (!world) return [];
  const set = (levels[worldId] ||= Object.fromEntries(world.layers));
  return world.layers.map(([id]) => [id, set[id]]);
}

const gainFor = (level: number) => { const v = level / 100; return v * v; }; // perceptual-ish taper

export function setLevel(worldId: string, id: string, level: number) {
  levelsFor(worldId);
  levels[worldId][id] = level;
  const l = live[id];
  if (!l || !ctx || worldId !== state.current) return;
  l.level = level;
  const t = ctx.currentTime;
  l.gain.gain.cancelScheduledValues(t);
  l.gain.gain.setTargetAtTime(Math.max(gainFor(level), 0.0001), t, 0.05);
}

/** A sound's share of what is audible now, 0-1, for the ambient visuals. */
export function soundLevel(worldId: string, id: string) {
  if (!state.playing || worldId !== state.current || !live[id]) return 0;
  return live[id].level / 100;
}

// ---------- Playback ----------
function startLayer(id: string, level: number, fadeIn: number) {
  const c = ensureContext();
  const src = c.createBufferSource();
  src.buffer = buffers[id];
  src.loop = true;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(gainFor(level), 0.0001), t + fadeIn);
  src.connect(g); g.connect(master!);
  src.start(t);
  live[id] = { src, gain: g, level };
}

function stopLayer(id: string, fadeOut: number) {
  const l = live[id]; if (!l || !ctx) return;
  const t = ctx.currentTime;
  l.gain.gain.cancelScheduledValues(t);
  l.gain.gain.setValueAtTime(Math.max(l.gain.gain.value, 0.0001), t);
  l.gain.gain.exponentialRampToValueAtTime(0.0001, t + fadeOut);
  try { l.src.stop(t + fadeOut + 0.05); } catch { /* already stopped */ }
  delete live[id];
}

export function play(worldId: string): Promise<void> {
  if (!WORLDS_BY_ID[worldId]) return Promise.resolve();
  try { ensureContext(); } catch { state.problem = 'This browser cannot play sound here'; emit(); return Promise.resolve(); }
  const switching = worldId !== state.current;
  state.current = worldId;
  const wanted = levelsFor(worldId);
  state.problem = '';
  state.busy = true;
  state.started = true;
  emit();
  return Promise.all(wanted.map(([id]) => load(id))).then(() => {
    ensureContext();
    const want: Record<string, number> = Object.fromEntries(wanted);
    Object.keys(live).forEach((id) => { if (!(id in want)) stopLayer(id, 1.2); });
    // A world changed while loading: the newest request wins.
    if (state.current !== worldId) return;
    wanted.forEach(([id, level]) => {
      if (live[id]) setLevel(worldId, id, level); else startLayer(id, level, switching ? 1.6 : 1.2);
    });
    state.playing = true;
    state.busy = false;
    fadeStarted = false;
    if (master && ctx) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(state.muted ? 0 : 1, t, 0.05); }
    state.timerEnd = state.timerMinutes > 0 ? Date.now() + state.timerMinutes * 60000 : null;
    emit();
    meterStart();
    if (isApple) rebuildContextIfStuck();
    // If the browser kept the context suspended (no gesture reached it), say so.
    setTimeout(() => {
      if (state.playing && ctx && ctx.state !== 'running') { ctx.resume().catch(() => {}); state.problem = 'Tap play again to allow sound'; emit(); }
    }, 700);
  }).catch((err) => {
    state.busy = false;
    state.playing = false;
    state.problem = 'Sound could not load. Check your connection and try again';
    diag.lastError = String((err && (err.message || err.name)) || err);
    console.error('Sleep Moore: audio failed', err);
    emit();
  });
}

// iOS can hand out a context that reports "running" yet never advances its clock (and plays
// nothing). If that happens right after play, build a fresh context and restart the layers.
function rebuildContextIfStuck() {
  if (!state.playing || !ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  setTimeout(() => {
    if (!state.playing || !ctx || ctx.currentTime > t0 + 0.05) return;
    diag.rebuilt++;
    const now = levelsFor(state.current);
    Object.keys(live).forEach((id) => { try { live[id].src.stop(); } catch { /* gone */ } delete live[id]; });
    try { ctx.close(); } catch { /* gone */ }
    ctx = null; master = null; analyser = null;
    ensureContext();
    now.forEach(([id, level]) => { if (buffers[id]) startLayer(id, level, 0.6); });
    meterStart();
  }, 1000);
}

export function pause() {
  Object.keys(live).forEach((id) => stopLayer(id, 0.8));
  state.playing = false;
  state.timerEnd = null;
  fadeStarted = false;
  meterStop();
  emit();
}

/** Buttons toggle; links into a world only ever start it. */
export function toggle(worldId = state.current) {
  if (state.playing && worldId === state.current) pause(); else play(worldId);
}
export function ensurePlaying(worldId: string) {
  if (!(state.playing && worldId === state.current)) play(worldId);
}

/** Point the player at a world without starting it (a world page opened while nothing plays). */
export function select(worldId: string) {
  if (state.playing || !WORLDS_BY_ID[worldId] || worldId === state.current) return;
  state.current = worldId;
  emit();
}

export function setMuted(m: boolean) {
  try { ensureContext(); } catch { /* no audio */ }
  state.muted = m;
  if (master && ctx) { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(m ? 0 : 1, t, 0.03); }
  emit();
}

export function setTimer(minutes: number) {
  state.timerMinutes = minutes;
  if (state.playing) {
    state.timerEnd = minutes > 0 ? Date.now() + minutes * 60000 : null;
    if (fadeStarted && master && ctx) { fadeStarted = false; const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(state.muted ? 0 : 1, t, 0.3); }
  }
  emit();
}

/** Milliseconds left on the sleep timer, or null when it is off or nothing plays. */
export function timeLeft() { return state.playing && state.timerEnd ? state.timerEnd - Date.now() : null; }

setInterval(() => {
  if (!state.playing) return;
  const left = timeLeft();
  if (left !== null && master && ctx) {
    if (left <= FADE_SECONDS * 1000 && !fadeStarted) {
      fadeStarted = true;
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + FADE_SECONDS);
    }
    if (left <= 0) { pause(); master.gain.setValueAtTime(state.muted ? 0 : 1, ctx.currentTime + 0.1); return; }
  }
  emit();
}, 1000);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.playing && ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
});

// ---------- Meter and energy ----------
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let meterBars: HTMLElement[] = [];
let meterRaf = 0;
let meterData: Uint8Array<ArrayBuffer> | null = null;
/** Smoothed loudness 0-1, read by the ambient visuals every frame. */
export let energy = 0;
const BANDS = [[1, 3], [3, 7], [7, 14], [14, 28], [28, 56]];

/** The page has new meter bars (after a page change). */
export function setMeterBars(els: HTMLElement[]) { meterBars = els; if (!state.playing) els.forEach((i) => (i.style.transform = '')); }

function meterFrame() {
  if (!analyser || !state.playing) { meterRaf = 0; return; }
  if (!meterData) meterData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(meterData);
  let total = 0;
  const values = BANDS.map(([lo, hi]) => {
    let sum = 0;
    for (let k = lo; k < hi; k++) sum += meterData![k];
    const v = sum / (hi - lo) / 255;
    total += v;
    return v;
  });
  const bars = reduced.matches ? 0 : meterBars.length;
  for (let b = 0; b < bars; b++) {
    const v = values[b % 5];
    meterBars[b].style.transform = 'scaleY(' + Math.max(0.12, Math.min(1, v * 1.15)).toFixed(3) + ')';
  }
  const level = total / BANDS.length;
  energy += (level - energy) * 0.12;
  document.documentElement.style.setProperty('--level', level.toFixed(3));
  meterRaf = requestAnimationFrame(meterFrame);
}
function meterStart() { if (!meterRaf) meterRaf = requestAnimationFrame(meterFrame); }
function meterStop() {
  if (meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf = 0; energy = 0;
  meterBars.forEach((i) => (i.style.transform = ''));
  document.documentElement.style.setProperty('--level', '0');
}
// Bars are skipped (not the analyser) under reduced motion; the visuals check it themselves.
export const motionAllowed = () => !reduced.matches;

// ---------- Read-only hook for the automated checks in test/ ----------
(window as any).__sleepMoore = {
  get ctx() { return ctx; }, get live() { return live; }, get buffers() { return buffers; },
  get playing() { return state.playing; }, get current() { return state.current; }, get formats() { return formats.slice(); },
  get isApple() { return isApple; }, get problem() { return state.problem; }, get started() { return state.started; },
  get keepAlive() { return keepAlive ? { paused: keepAlive.paused, error: keepAlive.error && keepAlive.error.code, ready: keepAlive.readyState } : null; },
  get bytes() { return Object.keys(bytes).map((k) => k + ':' + bytes[k].ext); },
  get diag() { return { ...diag, ctxState: ctx ? ctx.state : 'none', time: ctx ? ctx.currentTime : 0, master: master ? master.gain.value : null, keepAlive: keepAlive ? { paused: keepAlive.paused, ready: keepAlive.readyState, t: keepAlive.currentTime } : null }; },
};

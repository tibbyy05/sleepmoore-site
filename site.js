/* Sleep Moore website: live sound mixer, mini player, nav. No dependencies. */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  /* ---------- Data ---------- */
  var SOUNDS = {
    rain:    { label: 'Rain',     icon: 'rain' },
    fire:    { label: 'Fire',     icon: 'fire' },
    wind:    { label: 'Wind',     icon: 'wind' },
    ocean:   { label: 'Surf',     icon: 'wave' },
    night:   { label: 'Crickets', icon: 'night' },
    snow:    { label: 'Snow',     icon: 'snow' },
    thunder: { label: 'Thunder',  icon: 'thunder' },
    stream:  { label: 'Water',    icon: 'water' },
    chimes:  { label: 'Chimes',   icon: 'chimes' },
    palms:   { label: 'Palms',    icon: 'palms' }
  };
  var WORLDS = {
    'rainy-cabin':        { name: 'Rainy Cabin',        layers: [['rain', 75], ['fire', 70], ['wind', 30]] },
    'moonlit-cove':       { name: 'Moonlit Cove',       layers: [['ocean', 75], ['wind', 50], ['night', 35]] },
    'snowfall-lodge':     { name: 'Snowfall Lodge',     layers: [['snow', 70], ['fire', 75], ['wind', 35]] },
    'rainfall-sanctuary': { name: 'Rainfall Sanctuary', layers: [['rain', 70], ['stream', 65], ['thunder', 30]] },
    'ocean-hideaway':     { name: 'Ocean Hideaway',     layers: [['ocean', 80], ['wind', 45], ['palms', 40]] },
    'temple-garden':      { name: 'Temple Garden',      layers: [['stream', 65], ['chimes', 35], ['wind', 30]] },
    'desert-camp':        { name: 'Desert Camp',        layers: [['wind', 55], ['fire', 70], ['night', 30]] },
    'alpine-lake':        { name: 'Alpine Lake',        layers: [['wind', 45], ['night', 35], ['stream', 25]] }
  };
  var ICONS = {
    rain: '<path d="M7 15a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 8.5a3.5 3.5 0 0 1-.5 7H7z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
    fire: '<path d="M12 22c4 0 7-2.8 7-6.6 0-3.2-2.2-5.3-3.8-7.4-.6 1.4-1.4 2.2-2.4 2.6.3-2.4-.6-5.6-3.3-8.6C8.8 5 5 8.6 5 13.4 5 19 8 22 12 22z"/>',
    wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8a2.5 2.5 0 1 1-2.5 2.5"/>',
    wave: '<path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 7c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>',
    night: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/><path d="M17 3v3M15.5 4.5h3"/>',
    snow: '<path d="M12 2v20M4 6l16 12M20 6 4 18M8 3l4 3 4-3M8 21l4-3 4 3M2.5 9.5 6 12l-3.5 2.5M21.5 9.5 18 12l3.5 2.5"/>',
    thunder: '<path d="M7 16a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9.5a3.5 3.5 0 0 1-.5 7H15"/><path d="M12 12l-2 5h4l-2 5"/>',
    water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    chimes: '<path d="M4 4h16M8 4v9M12 4v12M16 4v7"/><circle cx="8" cy="15" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="16" cy="13" r="2"/>',
    palms: '<path d="M12 22V9M12 9c-3-4-8-4-9-1 3 0 6 1 9 1zM12 9c3-4 8-4 9-1-3 0-6 1-9 1zM12 9c-1-4 1-7 4-7-1 2-2 4-4 7zM12 9c1-4-1-7-4-7 1 2 2 4 4 7z"/>'
  };

  /* ---------- Elements ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var header = $('.top');
  var menuBtn = $('.menu-btn');
  var menu = $('#menu');
  var player = $('#player');
  var mixer = $('#mixer');
  var layersEl = $('[data-layers]');
  var heroPill = $('.play-pill');
  var nowEls = $$('[data-now]');
  var stateEl = $('[data-state]');
  var timeEl = $('[data-time]');
  var fillEl = $('[data-fill]');
  var knobEl = $('[data-knob]');
  var worldButtons = $$('[data-play-world]');
  var timerChips = $$('[data-timer]');

  /* ---------- Header ---------- */
  var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var setMenu = function (open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  if (!player || !mixer) return; // text pages: header and menu only

  /* ---------- Audio engine ----------
     Web Audio, created inside the first tap (iOS needs that), with a format
     chain: Opus first, then FLAC, then AAC. If a browser fails to decode one
     format we drop it and try the next, so every browser ends up with sound. */
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null;
  var bytes = {};            // sound id -> { ext, data: ArrayBuffer }
  var buffers = {};          // sound id -> AudioBuffer
  var pending = {};          // sound id -> Promise
  var live = {};             // sound id -> { src, gain, level }
  var current = 'rainy-cabin';
  var playing = false;
  var muted = false;
  var problem = '';          // message shown in the mixer when sound fails
  var timerMinutes = 45;
  var timerEnd = null;       // ms timestamp
  var fadeStarted = false;
  var FADE_SECONDS = 20;
  var probe = document.createElement('audio');
  var can = function (type) { return !!(probe.canPlayType && probe.canPlayType(type)); };
  var formats = [];
  if (can('audio/ogg; codecs=opus')) formats.push('opus');
  if (can('audio/flac') || can('audio/x-flac')) formats.push('flac');
  formats.push('m4a');
  var forced = (location.search.match(/[?&]audio=(opus|flac|m4a)/) || [])[1];
  if (forced) formats = [forced];
  var blobCount = 0;

  function ensureContext() {
    if (!AC) throw new Error('Web Audio is not available in this browser');
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      ctx.onstatechange = function () { if (ctx.state === 'running' && problem === 'Tap play again to allow sound') { problem = ''; render(); } };
    }
    if (ctx.state !== 'running' && ctx.resume) ctx.resume().catch(function () {});
    return ctx;
  }

  // iOS and some Android browsers only let sound start from inside a tap. Create the
  // context and play one silent sample on the first gesture of any kind.
  function unlock() {
    try {
      var c = ensureContext();
      var b = c.createBuffer(1, 1, c.sampleRate);
      var s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) { /* no audio in this browser; play() reports it */ }
    ['touchend', 'pointerdown', 'keydown'].forEach(function (ev) { document.removeEventListener(ev, unlock, true); });
  }
  ['touchend', 'pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, true); });

  function fetchBytes(id) {
    if (bytes[id] && formats.indexOf(bytes[id].ext) !== -1) return Promise.resolve(bytes[id]);
    var ext = formats[0];
    return fetch('/audio/' + id + '.' + ext).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + id + '.' + ext);
      return r.arrayBuffer();
    }).then(function (data) { bytes[id] = { ext: ext, data: data }; return bytes[id]; });
  }

  function decode(data) {
    return new Promise(function (resolve, reject) {
      var copy = data.slice(0); // Safari detaches the buffer it decodes
      var done = ensureContext().decodeAudioData(copy, resolve, reject);
      if (done && done.then) done.then(resolve, reject);
    });
  }

  function load(id) {
    if (buffers[id]) return Promise.resolve(buffers[id]);
    if (pending[id]) return pending[id];
    pending[id] = fetchBytes(id).then(function (b) {
      return decode(b.data).catch(function (err) {
        // This browser cannot decode this format: drop it for the session and try the next one.
        if (formats.length > 1 && formats[0] === b.ext) {
          formats.shift();
          if (window.console) console.warn('Sleep Moore: ' + b.ext + ' did not decode here, trying ' + formats[0], err);
          delete bytes[id];
          return fetchBytes(id).then(function (b2) { return decode(b2.data); });
        }
        throw err;
      });
    }).then(function (buf) {
      buffers[id] = buf; delete pending[id]; blobCount++; return buf;
    }).catch(function (err) { delete pending[id]; throw err; });
    return pending[id];
  }

  function gainFor(level) { var v = level / 100; return v * v; }  // perceptual-ish taper

  function startLayer(id, level, fadeIn) {
    var c = ensureContext();
    var src = c.createBufferSource();
    src.buffer = buffers[id];
    src.loop = true;
    var g = c.createGain();
    var t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(gainFor(level), 0.0001), t + (fadeIn || 1.2));
    src.connect(g); g.connect(master);
    src.start(t);
    live[id] = { src: src, gain: g, level: level };
  }

  function stopLayer(id, fadeOut) {
    var l = live[id]; if (!l) return;
    var t = ctx.currentTime;
    l.gain.gain.cancelScheduledValues(t);
    l.gain.gain.setValueAtTime(Math.max(l.gain.gain.value, 0.0001), t);
    l.gain.gain.exponentialRampToValueAtTime(0.0001, t + (fadeOut || 1));
    try { l.src.stop(t + (fadeOut || 1) + 0.05); } catch (e) { /* already stopped */ }
    delete live[id];
  }

  function setLevel(id, level) {
    var l = live[id]; if (!l) return;
    l.level = level;
    var t = ctx.currentTime;
    l.gain.gain.cancelScheduledValues(t);
    l.gain.gain.setTargetAtTime(Math.max(gainFor(level), 0.0001), t, 0.05);
  }

  function currentLevels() {
    return $$('input[type="range"]', layersEl).map(function (r) { return [r.dataset.sound, Number(r.value)]; });
  }

  function play(worldId) {
    var world = WORLDS[worldId];
    if (!world) return Promise.resolve();
    try { ensureContext(); } catch (e) { problem = 'This browser cannot play sound here'; render(); return Promise.resolve(); }
    var switching = worldId !== current;
    if (switching) { current = worldId; renderLayers(world); }
    var levels = currentLevels();
    problem = '';
    setBusy(true);
    stateEl.textContent = 'Loading';
    return Promise.all(levels.map(function (l) { return load(l[0]); })).then(function () {
      ensureContext();
      var wanted = {};
      levels.forEach(function (l) { wanted[l[0]] = l[1]; });
      Object.keys(live).forEach(function (id) { if (!(id in wanted)) stopLayer(id, 1.2); });
      levels.forEach(function (l) {
        if (live[l[0]]) setLevel(l[0], l[1]); else startLayer(l[0], l[1], switching ? 1.6 : 1.2);
      });
      playing = true;
      fadeStarted = false;
      if (timerMinutes > 0) timerEnd = Date.now() + timerMinutes * 60000; else timerEnd = null;
      setBusy(false);
      render();
      // If the browser kept the context suspended (no gesture reached it), say so.
      setTimeout(function () {
        if (playing && ctx && ctx.state !== 'running') { ctx.resume().catch(function () {}); problem = 'Tap play again to allow sound'; render(); }
      }, 700);
    }).catch(function (err) {
      setBusy(false);
      playing = false;
      problem = 'Sound could not load. Check your connection and try again';
      render();
      if (window.console) console.error('Sleep Moore: audio failed', err);
    });
  }

  function pause() {
    Object.keys(live).forEach(function (id) { stopLayer(id, 0.8); });
    playing = false;
    timerEnd = null;
    fadeStarted = false;
    render();
  }

  function toggle(worldId) {
    var id = worldId || current;
    if (playing && id === current) pause(); else play(id);
  }

  function setBusy(b) { if (heroPill) heroPill.setAttribute('aria-busy', String(b)); }

  function setMuted(m) {
    muted = m;
    if (master) { var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(m ? 0 : 1, t, 0.03); }
    var btn = $('[data-mute]');
    btn.setAttribute('aria-pressed', String(m));
    btn.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
  }

  /* ---------- Mixer UI ---------- */
  function renderLayers(world) {
    layersEl.innerHTML = '';
    world.layers.forEach(function (l, i) {
      var id = l[0], level = l[1], s = SOUNDS[id];
      var row = document.createElement('div');
      row.className = 'layer';
      var inputId = 'layer-' + id + '-' + i;
      row.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[s.icon] + '</svg>' +
        '<label for="' + inputId + '">' + s.label + '</label>' +
        '<input type="range" id="' + inputId + '" min="0" max="100" step="1" value="' + level + '" data-sound="' + id + '" aria-valuetext="' + level + ' percent" style="--p:' + level + '%">' +
        '<output for="' + inputId + '">' + level + '%</output>';
      layersEl.appendChild(row);
      var input = $('input', row), out = $('output', row);
      input.addEventListener('input', function () {
        var v = Number(input.value);
        input.style.setProperty('--p', v + '%');
        input.setAttribute('aria-valuetext', v + ' percent');
        out.textContent = v + '%';
        if (playing) setLevel(id, v);
      });
    });
  }

  function fmt(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function stateText() {
    if (problem) return problem;
    if (!playing) return 'Press play to hear it';
    return timerMinutes > 0 ? 'Playing · fades out in ' + fmt(timerEnd - Date.now()) : 'Playing all night';
  }

  function render() {
    var world = WORLDS[current];
    nowEls.forEach(function (el) { el.textContent = world.name; });
    worldButtons.forEach(function (b) {
      var on = playing && b.dataset.playWorld === current;
      b.setAttribute('aria-pressed', String(on));
      var label = $('[data-label]', b);
      if (label) label.textContent = on ? 'Pause' : 'Play this soundscape';
    });
    player.classList.toggle('is-playing', playing);
    mixer.classList.toggle('is-playing', playing);
    mixer.classList.toggle('has-problem', !!problem);
    var tgl = $('[data-toggle]');
    tgl.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    stateEl.textContent = stateText();
    tick();
  }

  function tick() {
    if (playing && timerEnd) {
      var left = timerEnd - Date.now();
      var frac = Math.max(0, left / (timerMinutes * 60000));
      timeEl.textContent = fmt(left);
      fillEl.style.width = (frac * 100) + '%';
      knobEl.style.left = (frac * 100) + '%';
      if (left <= FADE_SECONDS * 1000 && !fadeStarted) {
        fadeStarted = true;
        var t = ctx.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(0.0001, t + FADE_SECONDS);
      }
      if (left <= 0) { pause(); if (master) master.gain.setValueAtTime(muted ? 0 : 1, ctx.currentTime + 0.1); }
    } else {
      timeEl.textContent = timerMinutes > 0 ? fmt(timerMinutes * 60000) : '∞';
      fillEl.style.width = '100%';
      knobEl.style.left = '100%';
    }
  }
  setInterval(function () { if (playing) { tick(); stateEl.textContent = stateText(); } }, 1000);

  /* ---------- Wire up ---------- */
  worldButtons.forEach(function (b) {
    b.addEventListener('click', function () { toggle(b.dataset.playWorld); });
  });
  $('[data-toggle]').addEventListener('click', function () { toggle(); });
  $('[data-mute]').addEventListener('click', function () { try { ensureContext(); } catch (e) {} setMuted(!muted); });
  timerChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      timerChips.forEach(function (c) { c.setAttribute('aria-checked', 'false'); });
      chip.setAttribute('aria-checked', 'true');
      timerMinutes = Number(chip.dataset.timer);
      if (playing) {
        timerEnd = timerMinutes > 0 ? Date.now() + timerMinutes * 60000 : null;
        if (fadeStarted && master) { fadeStarted = false; var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.3); }
      }
      render();
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ' && !/INPUT|BUTTON|TEXTAREA|SELECT|A/.test(document.activeElement.tagName)) { e.preventDefault(); toggle(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && playing) { tick(); if (ctx && ctx.state !== 'running') ctx.resume().catch(function () {}); }
  });

  // Fetch the first world's files on the first pointer movement so the hero button answers
  // instantly. Bytes only: decoding waits for the tap that creates the audio context.
  var warmed = false;
  var warm = function () {
    if (warmed) return; warmed = true;
    WORLDS[current].layers.forEach(function (l) { fetchBytes(l[0]).catch(function () {}); });
  };
  window.addEventListener('pointermove', warm, { once: true, passive: true });
  window.addEventListener('touchstart', warm, { once: true, passive: true });

  renderLayers(WORLDS[current]);
  render();

  // Read-only hook for the automated checks in test/.
  window.__sleepMoore = {
    get ctx() { return ctx; }, get live() { return live; }, get buffers() { return buffers; },
    get playing() { return playing; }, get current() { return current; }, get formats() { return formats.slice(); },
    get problem() { return problem; }, get bytes() { return Object.keys(bytes).map(function (k) { return k + ':' + bytes[k].ext; }); }
  };
})();

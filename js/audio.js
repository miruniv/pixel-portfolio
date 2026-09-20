/* ============================================================================
   audio.js — 8-битные блипы через Web Audio API, без единого mp3.

   Два момента, на которых это обычно ломается:
   1. Браузер запрещает автоплей: AudioContext стартует в состоянии suspended.
      Поэтому контекст создаётся ЛЕНИВО, внутри первого пользовательского клика.
   2. Резкий старт/стоп осциллятора даёт щелчок в динамике. Лечится ADSR-
      огибающей на GainNode. exponentialRamp не умеет идти в ноль, поэтому
      затухаем до 0.0001.

   По умолчанию звук ВЫКЛЮЧЕН, состояние живёт в localStorage.
   ============================================================================ */
(function (M) {
  "use strict";

  var KEY = "mira.sound";
  var ctx = null;
  var muted = true;
  var lastHover = 0;
  var listeners = [];

  try {
    muted = window.localStorage.getItem(KEY) !== "on";
  } catch (e) { muted = true; }          // приватный режим / отключённое хранилище

  function save() {
    try { window.localStorage.setItem(KEY, muted ? "off" : "on"); } catch (e) {}
  }

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }

  /* Одна нота: square-волна с мягкой огибающей. */
  function tone(freq, startAt, dur, peak) {
    var c = ctx;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.02);
  }

  function play(notes) {
    if (muted) return;
    if (!ensureCtx()) return;
    var t = ctx.currentTime + 0.001;
    notes.forEach(function (n) {
      tone(n[0], t, n[1], n[2]);
      t += n[1];
    });
  }

  var api = {
    isMuted: function () { return muted; },

    toggle: function () {
      muted = !muted;
      save();
      if (!muted) { ensureCtx(); api.click(); }
      listeners.forEach(function (fn) { fn(muted); });
      return muted;
    },

    onChange: function (fn) { listeners.push(fn); },

    hover: function () {
      var now = Date.now();
      if (now - lastHover < 80) return;   // троттлинг: без него hover трещит
      lastHover = now;
      play([[660, 0.035, 0.035]]);
    },
    click: function () { play([[880, 0.035, 0.06], [1320, 0.045, 0.05]]); },
    back:  function () { play([[520, 0.04, 0.05], [390, 0.05, 0.045]]); },
    open:  function () { play([[740, 0.03, 0.05], [988, 0.03, 0.05], [1244, 0.06, 0.045]]); }
  };

  M.audio = api;
})(window.MIRA);

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
  var masterGain = null;      // единственная точка правды для громкости:
                               // музыка, blip'ы диалога и sfx — все в неё
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
    try {
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);
    } catch (e) { return null; }
    return ctx;
  }

  /* Одна нота с мягкой огибающей. Тип волны параметром: голосу идёт
     треугольник, интерфейсу — квадрат. Всё, что звучит — музыка, blip'ы,
     голос — сходится в masterGain, а не в ctx.destination напрямую:
     mute должен глушить ВСЁ одним узлом, а не гоняться за каждым источником. */
  function tone(freq, startAt, dur, peak, type) {
    var c = ctx;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

    osc.connect(gain);
    gain.connect(masterGain);
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

  /* ---------------------------------------------------------- МУЗЫКА ----
     Короткая зацикленная мелодия на тех же square-осцилляторах, без mp3.
     Ноты планируются барами вперёд по ctx.currentTime: setInterval сам по
     себе для музыки не годится — он плывёт и дросселируется во вкладке.

     Автостарта нет и быть не может: браузер блокирует звук до жеста
     пользователя. Кнопка PLAY MUSIC и есть этот жест. Состояние пишем в
     localStorage, но при следующем заходе НЕ восстанавливаем — Safari
     молча откажет, и кнопка будет врать о том, что играет. */
  var MUSIC_KEY = "mira.music";
  var NOTES = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.00, 698.46];
  var BEAT = 0.22;
  var music = { on: false, timer: 0, nextAt: 0, listeners: [] };
  var resumeMusicOnUnmute = false;   // помнит, что музыка играла ДО mute

  function scheduleBar(at) {
    for (var i = 0; i < NOTES.length; i++) {
      tone(NOTES[i], at + i * BEAT, BEAT * 0.75, 0.04);
      if (i % 2 === 0) tone(NOTES[i] / 2, at + i * BEAT, BEAT * 0.9, 0.018);
    }
    return at + NOTES.length * BEAT;
  }

  function pump() {
    if (!music.on || !ctx) return;
    // планируем на полсекунды вперёд, чтобы петля не рвалась
    while (music.nextAt < ctx.currentTime + 0.5) {
      music.nextAt = scheduleBar(Math.max(music.nextAt, ctx.currentTime + 0.05));
    }
  }

  function musicChanged() {
    music.listeners.forEach(function (fn) { fn(music.on); });
    try { window.localStorage.setItem(MUSIC_KEY, music.on ? "on" : "off"); } catch (e) {}
  }

  /* ----------------------------------------------------------- ГОЛОС ----
     Очень короткий blip на символ, как в диалогах RPG. Играет не на каждый
     символ и не на пробелы с пунктуацией — иначе получается треск. Высота
     чуть гуляет, иначе выходит телеграф. */
  function voiceBlip(v) {
    if (muted || !ensureCtx()) return;
    v = v || {};
    var base = v.note || 440;
    var spread = v.detune == null ? 2 : v.detune;
    var semis = (Math.random() * 2 - 1) * spread;
    var freq = base * Math.pow(2, semis / 12);
    tone(freq, ctx.currentTime + 0.001, v.dur || 0.03, v.gain || 0.03,
         v.type || "triangle");
  }

  /* Короткие эффекты действий. Тоже кодом, без файлов. */
  var SFX = {
    shutter: [[1800, 0.02, 0.05, "square"], [900, 0.03, 0.04, "square"]],
    can:     [[300, 0.05, 0.03, "sawtooth"], [1200, 0.06, 0.025, "triangle"]],
    bug:     [[220, 0.05, 0.04, "square"], [660, 0.04, 0.045, "square"], [990, 0.06, 0.04, "square"]],
    wave:    [[660, 0.05, 0.04, "triangle"], [880, 0.07, 0.04, "triangle"]],
    think:   [[330, 0.09, 0.03, "triangle"], [262, 0.11, 0.03, "triangle"]]
  };

  function playSfx(name) {
    var seq = SFX[name];
    if (!seq || muted || !ensureCtx()) return false;
    var t = ctx.currentTime + 0.001;
    for (var i = 0; i < seq.length; i++) {
      tone(seq[i][0], t, seq[i][1], seq[i][2], seq[i][3]);
      t += seq[i][1];
    }
    return true;
  }

  var api = {
    isMuted: function () { return muted; },
    voice: voiceBlip,
    sfx: playSfx,
    hasSfx: function (n) { return !!SFX[n]; },

    music: {
      isPlaying: function () { return music.on; },
      onChange: function (fn) { music.listeners.push(fn); },

      start: function () {
        // Нажатие на PLAY MUSIC — это и есть разрешение на звук,
        // поэтому заодно снимаем общий mute, иначе кнопка молчала бы.
        if (muted) api.toggle();
        if (!ensureCtx()) return false;
        if (music.on) return true;
        music.on = true;
        music.nextAt = ctx.currentTime + 0.05;
        pump();
        music.timer = window.setInterval(pump, 200);
        musicChanged();
        return true;
      },

      stop: function () {
        if (!music.on) return;
        music.on = false;
        window.clearInterval(music.timer);
        music.timer = 0;
        musicChanged();
      },

      toggle: function () {
        if (music.on) { api.music.stop(); return false; }
        return api.music.start();
      }
    },

    /* Единственная точка правды для громкости: масштабирует masterGain,
       которого слушают ВСЕ источники звука. Музыку при этом не просто
       глушит — по-настоящему останавливает (music.stop чистит таймер),
       иначе она продолжала бы впустую планировать ноты в фоне. Какая
       музыка играла — запоминается и возвращается при unmute; если музыки
       не было, unmute просто отдаёт короткий click, как и раньше. */
    toggle: function () {
      muted = !muted;
      save();
      if (muted) {
        resumeMusicOnUnmute = music.on;
        if (music.on) api.music.stop();
        if (masterGain) masterGain.gain.setValueAtTime(0, ctx.currentTime);
      } else {
        ensureCtx();
        if (masterGain) masterGain.gain.setValueAtTime(1, ctx.currentTime);
        if (resumeMusicOnUnmute) { resumeMusicOnUnmute = false; api.music.start(); }
        else api.click();
      }
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

/* ============================================================================
   typewriter.js — посимвольная печать в духе RPG-диалога.

   Почему rAF, а не setInterval на символ: при уходе на другую вкладку таймеры
   дросселируются и текст «уплывает». Здесь один цикл с накоплением времени —
   сколько бы кадров ни пропустили, символов допечатается ровно столько,
   сколько прошло миллисекунд.

   Разбивка через Intl.Segmenter, чтобы не резать эмодзи пополам.

   Доступность: печатающийся слой целиком aria-hidden, а полный текст лежит
   рядом в .sr-only и читается скринридером сразу и один раз. aria-live здесь
   был бы вредом — SR начал бы тараторить по букве.
   ============================================================================ */
(function (M) {
  "use strict";

  var segmenter = null;
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    try { segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" }); } catch (e) {}
  }

  function graphemes(str) {
    if (segmenter) {
      var out = [];
      var it = segmenter.segment(str)[Symbol.iterator]();
      for (var r = it.next(); !r.done; r = it.next()) out.push(r.value.segment);
      return out;
    }
    return Array.from(str);
  }

  function create() {
    var raf = 0;
    var jobs = [];
    var jobIndex = 0;
    var charIndex = 0;
    var budget = 0;
    var prevTime = 0;
    var speed = 25;
    var onDone = null;

    function clearCaret() {
      jobs.forEach(function (j) { j.ink.classList.remove("is-typing"); });
    }

    function finish() {
      raf = 0;
      clearCaret();
      var cb = onDone; onDone = null;
      if (cb) cb();
    }

    function complete() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      jobs.forEach(function (j) { j.ink.textContent = j.text; });
      jobIndex = jobs.length;
      finish();
    }

    function cancel() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      clearCaret();
      jobs = [];
      jobIndex = 0;
      charIndex = 0;
      onDone = null;
    }

    function step(now) {
      if (!prevTime) prevTime = now;
      budget += now - prevTime;
      prevTime = now;

      // Защита от вкладки, которая была свёрнута полчаса: не печатаем всё разом
      // рывком, но и не копим бесконечный долг.
      if (budget > 500) budget = 500;

      while (budget >= speed) {
        budget -= speed;
        var job = jobs[jobIndex];
        if (!job) { finish(); return; }

        if (charIndex === 0) job.ink.classList.add("is-typing");
        charIndex++;
        job.ink.textContent = job.chars.slice(0, charIndex).join("");

        if (charIndex >= job.chars.length) {
          job.ink.classList.remove("is-typing");
          jobIndex++;
          charIndex = 0;
          if (jobIndex >= jobs.length) { finish(); return; }
        }
      }
      raf = requestAnimationFrame(step);
    }

    return {
      /* items: [{ ink: HTMLElement, text: string }] */
      play: function (items, opts) {
        cancel();
        opts = opts || {};
        speed = opts.speed || 25;
        onDone = opts.onDone || null;

        jobs = (items || []).map(function (it) {
          it.ink.textContent = "";
          return { ink: it.ink, text: it.text, chars: graphemes(it.text) };
        });

        if (!jobs.length) { finish(); return; }

        // Уважение к системной настройке: текст появляется целиком.
        if (M.dom.reducedMotion() || opts.instant) { complete(); return; }

        jobIndex = 0; charIndex = 0; budget = 0; prevTime = 0;
        raf = requestAnimationFrame(step);
      },
      complete: complete,
      cancel: cancel,
      isRunning: function () { return raf !== 0; }
    };
  }

  M.createTypewriter = create;
})(window.MIRA);

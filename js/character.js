/* ============================================================================
   character.js — персонаж в центральной колонке.

   Пока нет своего арта, рисуется SVG-плейсхолдер на сетке 16x16 — тем же
   стилем, что и весь интерфейс, чтобы сайт выглядел цельно с первого дня.
   Как только в data.js появится character.sprite, плейсхолдер сам уступит
   место спрайт-листу.

   Idle-анимация спрайта: см. .char--sprite в 05-components.css. Ключевой
   момент — анимировать на ПОЛНУЮ ширину листа со steps(frames), иначе
   последний кадр висит вдвое дольше остальных.
   ============================================================================ */
(function (M) {
  "use strict";

  var d = M.dom;

  /* Кролик 16x16: [цвет, x, y, w, h] */
  var BUNNY = [
    ["i", 4, 0, 4, 6], ["i", 9, 0, 4, 6],          // уши, контур
    ["f", 5, 1, 2, 4], ["f", 10, 1, 2, 4],         // уши, заливка
    ["i", 2, 4, 12, 7],                            // голова, контур  y4..10
    ["f", 3, 5, 10, 5],                            // голова, заливка y5..9
    ["i", 3, 10, 10, 6],                           // тело, контур    y10..15
    ["f", 4, 10, 8, 5],                            // тело, заливка   y10..14
    ["i", 2, 11, 1, 3], ["i", 13, 11, 1, 3],       // лапки
    ["f", 7, 15, 2, 1],                            // щель между ступнями
    ["i", 5, 6, 1, 2], ["i", 10, 6, 1, 2],         // глаза
    ["p", 3, 8, 2, 1], ["p", 11, 8, 2, 1],         // румянец
    ["i", 7, 8, 2, 1]                              // рот
  ];

  var charEl = null;
  var stageEl = null;            // обёртка, на которой живут анимации состояний
  var gazeOn = false;
  var curState = "idle";
  var bubbleInk = null;
  var bubbleSr = null;
  var typer = null;
  var cfg = {};

  function renderPlaceholder() {
    charEl.setAttribute("class", "char char--placeholder");
    charEl.style.removeProperty("--sheet");
    d.clear(charEl);
    charEl.appendChild(d.pixelArt(BUNNY, 16, cfg.alt || "Character"));
  }

  /* Слежение за курсором: ОДИН <img>, у которого меняется только src.
     Пересоздавать элемент нельзя — сбросится состояние gaze и мигнёт картинка. */
  function renderGaze() {
    charEl.setAttribute("class", "char char--gaze");
    d.clear(charEl);
    var img = d.el("img", {
      class: "char__img",
      src: (cfg.gaze.base || "") + (cfg.gaze.center || "look-center.png"),
      alt: cfg.alt || "Character",
      draggable: "false"
    });
    charEl.appendChild(img);
    M.gaze.init({ img: img, cfg: cfg.gaze });
  }

  function renderSprite(src) {
    charEl.setAttribute("class", "char char--sprite");
    d.clear(charEl);
    charEl.style.setProperty("--sheet", 'url("' + src + '")');
    charEl.style.setProperty("--frames", String(cfg.frames || 4));
    charEl.style.setProperty("--sheet-dur", ((cfg.frames || 4) / (cfg.fps || 4)) + "s");
    charEl.setAttribute("role", "img");
    charEl.setAttribute("aria-label", cfg.alt || "Character");
  }

  M.character = {
    init: function (opts) {
      charEl = opts.charEl;
      stageEl = opts.stageEl || null;
      bubbleInk = opts.bubbleInk;
      bubbleSr = opts.bubbleSr;
      cfg = M.store.character || {};
      typer = M.createTypewriter();

      document.documentElement.style.setProperty(
        "--char-size", (cfg.frameSize || 64) + "px"
      );

      gazeOn = !!(cfg.gaze && M.gaze);
      if (gazeOn) renderGaze();
      else if (cfg.sprite) renderSprite(cfg.sprite);
      else renderPlaceholder();
      return this;
    },

    /* Поза меняется только когда слежение выключено: иначе картинкой
       владеет gaze.js и пересоздавать её нельзя. */
    set: function (section) {
      if (!gazeOn) {
        var pose = (section && section.pose) || cfg.sprite;
        if (pose) renderSprite(pose); else renderPlaceholder();
      }
    },

    /* Одна реплика за раз. Полный текст сразу кладём в .sr-only,
       печатается только видимый слой. */
    say: function (text) {
      text = text || "";
      if (bubbleSr.textContent === text && !typer.isRunning()) return;
      bubbleSr.textContent = text;
      typer.play([{ ink: bubbleInk, text: text }], { speed: 18 });
    },

    /* Состояние сцены — это класс на обёртке, а не на <img>.
       Анимации крутятся на ней, src картинки остаётся за gaze.js. */
    setState: function (name) {
      curState = name || "idle";
      if (!stageEl) return;
      stageEl.dataset.state = curState;
      // При системной настройке «меньше движения» анимацию не навешиваем
      // вовсе: остаётся статичная поза, но состояние всё равно известно.
      if (M.dom.reducedMotion()) stageEl.dataset.motion = "off";
      else stageEl.removeAttribute("data-motion");
    },
    state: function () { return curState; },

    stop: function () {
      if (typer) typer.cancel();
      if (gazeOn && M.gaze) M.gaze.destroy();
    }
  };
})(window.MIRA);

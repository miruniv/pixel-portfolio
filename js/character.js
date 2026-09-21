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
  var innerEl = null;            // сцена: по её высоте считается множитель
  var fitPending = 0;
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
    // Сцена нужна gaze, чтобы понимать «курсор внутри рамки персонажа»
    M.gaze.init({
      img: img,
      cfg: cfg.gaze,
      stageEl: charEl.closest(".display") || charEl.parentElement
    });
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

  /* --------------------------------------------------- РАЗМЕР СПРАЙТА ---
     Коробку сцены не трогаем — она своя, из CSS. Внутри неё подбираем
     размер спрайта так, чтобы он занимал FIT.fill высоты сцены.

     Два режима, и выбирает их сам исходник:

     1. Пиксель-арт (сторона кадра <= pixelArtMax). Множитель обязан быть
        ЦЕЛЫМ: при дробном часть «пикселя» станет 3px, часть 4px.
        N = floor(высотаСцены * fill / natural.height), не меньше min,
        дальше опускается, пока кадр не влезет по обеим осям.

     2. Крупный исходник (как сейчас: 1080px, сглаженный рендер, а не
        пиксель-арт). Целого множителя там не существует — даже 1x вдвое
        выше сцены, — поэтому кадр вписывается целиком, а размер
        округляется до целых пикселей. Дробного пиксельного грида такой
        файл всё равно не имеет, ломать нечего.

     Поля и смещение — целые пиксели в обоих режимах: дробная позиция
     размывает картинку ровно так же, как дробный масштаб. */
  var FIT = {
    fill: 0.85,        // какую долю высоты сцены должен занять кадр
    min: 3,            // минимальный целый множитель для пиксель-арта
    pixelArtMax: 256,  // сторона исходника, до которой это пиксель-арт
    bias: 0.07,        // насколько центр спрайта ниже центра сцены
    minBottomPx: 16,   // под ногами всегда остаётся воздух...
    minBottomPct: 0.06 // ...но на низкой сцене не больше этой доли
  };
  var lastFit = null;

  function fitSprite() {
    if (!innerEl) return null;
    var img = charEl && charEl.querySelector(".char__img");
    if (!img || !img.naturalWidth) return null;

    /* Высоту берём у РАМКИ, а не у .display__inner: та равна своему
       содержимому, то есть прошлому размеру спрайта — измерять её значит
       измерять собственный результат. И картинку перед замером обнуляем,
       иначе она же и распирает рамку. */
    var frame = innerEl.parentElement;
    if (!frame) return null;
    img.style.width = "0px";
    img.style.height = "0px";
    img.style.marginTop = "0px";
    img.style.marginBottom = "0px";
    img.style.marginLeft = "0px";
    img.style.marginRight = "0px";

    var fcs = getComputedStyle(frame);
    var ics = getComputedStyle(innerEl);
    var H = frame.clientHeight
          - parseFloat(fcs.paddingTop) - parseFloat(fcs.paddingBottom)
          - parseFloat(ics.paddingTop) - parseFloat(ics.paddingBottom);
    var W = frame.clientWidth
          - parseFloat(fcs.paddingLeft) - parseFloat(fcs.paddingRight)
          - parseFloat(ics.paddingLeft) - parseFloat(ics.paddingRight);
    if (!(H > 0) || !(W > 0)) return null;

    var nw = img.naturalWidth, nh = img.naturalHeight;
    var pixelArt = nw <= FIT.pixelArtMax && nh <= FIT.pixelArtMax;
    var sw, sh, n = null, nRaw = null;

    if (pixelArt) {
      n = Math.floor(H * FIT.fill / nh);
      nRaw = n;
      if (n < FIT.min) n = FIT.min;
      while (n > 1 && (nw * n > W || nh * n > H)) n--;
      sw = nw * n;
      sh = nh * n;
    } else {
      sh = Math.round(H * FIT.fill);
      sw = Math.round(sh * nw / nh);
      if (sw > W) { sw = Math.floor(W); sh = Math.round(sw * nh / nw); }
      if (sh > H) { sh = Math.floor(H); sw = Math.round(sh * nw / nh); }
    }

    img.style.width = sw + "px";
    img.style.height = sh + "px";

    /* Смещение вниз и нижнее поле спорят за одно и то же место. Если
       кадр не оставляет им обоим места — уменьшаем КАДР, а не поле:
       персонаж, прижатый к нижней грани, выглядит хуже, чем на пару
       процентов меньший. */
    var Hr = Math.round(H);
    var minBottom = Math.min(FIT.minBottomPx, Math.round(Hr * FIT.minBottomPct));
    var shiftWant = Math.round(Hr * FIT.bias);
    var needFree = 2 * minBottom + 2 * shiftWant;
    if (Hr - sh < needFree) {
      sh = Math.max(1, Hr - needFree);
      sw = Math.round(sh * nw / nh);
      if (sw > W) { sw = Math.floor(W); sh = Math.round(sw * nh / nw); }
      img.style.width = sw + "px";
      img.style.height = sh + "px";
    }

    var free = Hr - sh;
    var half = Math.round(free / 2);
    var shift = Math.min(shiftWant, Math.max(0, half - minBottom));
    var top = half + shift;
    var bottom = free - top;
    if (bottom < 0) { top += bottom; bottom = 0; }
    /* Горизонталь тоже руками: центрирование сеткой при нечётной разнице
       ставит картинку на половину пикселя. */
    var freeX = Math.round(W) - sw;
    var left = Math.round(freeX / 2);
    var right = freeX - left;

    img.style.marginTop = top + "px";
    img.style.marginBottom = bottom + "px";
    img.style.marginLeft = left + "px";
    img.style.marginRight = right + "px";

    lastFit = { mode: pixelArt ? "целый множитель" : "вписан",
                n: n, nRaw: nRaw, natW: nw, natH: nh,
                spriteW: sw, spriteH: sh,
                stageW: Math.round(W), stageH: Math.round(H),
                top: top, bottom: bottom, left: left, right: right,
                pct: +(sh / Math.round(H) * 100).toFixed(1),
                boundBy: sw >= Math.floor(W) ? "ширина" : "высота" };
    return lastFit;
  }

  function scheduleFit() {
    if (fitPending) return;
    fitPending = requestAnimationFrame(function () {
      fitPending = 0;
      fitSprite();
      if (M.gaze && M.gaze.update) M.gaze.update();
    });
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

      innerEl = charEl.closest(".display__inner");

      gazeOn = !!(cfg.gaze && M.gaze);
      if (gazeOn) renderGaze();
      else if (cfg.sprite) renderSprite(cfg.sprite);
      else renderPlaceholder();

      var img = charEl.querySelector(".char__img");
      if (img) {
        /* Первый расчёт — без gaze.update(): на старте курсор ещё нигде
           не был, и пересчёт увёл бы взгляд по его позиции по умолчанию
           вместо look-center. Направление придёт с первым движением. */
        if (img.complete && img.naturalWidth) fitSprite();
        img.addEventListener("load", function () { fitSprite(); });
      }
      window.addEventListener("resize", scheduleFit);
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
       печатается только видимый слой — и только здесь, больше нигде.
       voice: { note, detune, dur, type, every, speed } */
    say: function (text, voice) {
      text = text || "";
      if (bubbleSr.textContent === text && !typer.isRunning()) return;
      bubbleSr.textContent = text;

      var v = voice || cfg.voice || {};
      var every = Math.max(1, v.every || 1);
      var spoken = 0;

      typer.play([{ ink: bubbleInk, text: text }], {
        speed: v.speed || 30,
        onChar: function (ch) {
          // Пробелы и пунктуация молчат, иначе трещит
          if (!ch || !/[0-9A-Za-z\u00C0-\u024F]/.test(ch)) return;
          spoken++;
          if (spoken % every !== 0) return;
          M.audio.voice(v);
        }
      });
    },

    /* Мгновенно допечатать реплику; оставшиеся blip'ы просто не сыграют */
    finishLine: function () { typer.complete(); },
    isSpeaking: function () { return typer.isRunning(); },

    /* Размер спрайта: пересчёт и последний результат — для тестов и для
       ручного вызова, если лейаут поменяли программно. */
    fit: function () { return fitSprite(); },
    lastFit: function () { return lastFit; },
    fitConfig: FIT,

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

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
  var innerEl = null;            // сцена: по ней считается множитель
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

  /* ------------------------------------------------- РАЗМЕР СПРАЙТА ----
     Множитель обязан быть ЦЕЛЫМ, иначе пиксели размывает. Поэтому не
     clamp() и не проценты, а ступенька: берём наибольшее N, при котором
     спрайт ещё влезает в сцену с полями, и зажимаем в 3..6.
     Поля и смещение — тоже целые пиксели: дробная позиция размывает
     картинку ровно так же, как дробный масштаб. */
  var FIT = {
    min: 3, max: 6,
    marginY: 0.08,   // поля сверху и снизу, доля высоты сцены
    marginX: 0.03,   // боковой зазор до рамки
    minBottom: 0.05,   // нижнее поле не тоньше этой доли высоты сцены...
    minBottomPx: 16,   // ...и не тоньше этого в пикселях: на низкой сцене
                       //    5% вырождаются в пару пикселей воздуха под ногами
    bias: 0.07,      // насколько центр спрайта ниже центра сцены
    flowQuery: "(max-width: 900px)"  // ниже — колонка растёт по содержимому
  };
  var lastFit = null;

  function fitSprite() {
    if (!innerEl) return null;
    var img = charEl && charEl.querySelector(".char__img");
    if (!img || !img.naturalWidth) return null;

    var stageBox = innerEl.closest(".hero__stage");
    var hero = innerEl.closest(".hero");
    if (!stageBox || !hero) return null;

    /* Высоту берём НЕ у самой сцены: она равна своему содержимому, и
       измерять её — значит измерять собственный прошлый результат.
       Считаем, сколько колонка вообще может отдать: её внутренняя высота
       минус братья сцены и зазоры между ними. */
    var hcs = getComputedStyle(hero);
    var gap = parseFloat(hcs.rowGap) || 0;
    var avail = hero.clientHeight
              - parseFloat(hcs.paddingTop) - parseFloat(hcs.paddingBottom);
    var kids = hero.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i] !== stageBox) avail -= kids[i].getBoundingClientRect().height;
    }
    avail -= gap * Math.max(0, kids.length - 1);

    var scs = getComputedStyle(stageBox);
    avail -= parseFloat(scs.borderTopWidth) + parseFloat(scs.borderBottomWidth);

    var ics = getComputedStyle(innerEl);
    var W = innerEl.clientWidth
          - parseFloat(ics.paddingLeft) - parseFloat(ics.paddingRight);
    var H = Math.max(0, avail);

    /* Ниже 900px колонка перестаёт быть ограниченной по высоте: строки
       грида растут под содержимое, и «доступная высота» там не значит
       ничего. Ограничителем остаётся только ширина. */
    var flow = !!(window.matchMedia && window.matchMedia(FIT.flowQuery).matches);

    var byW = (W * (1 - 2 * FIT.marginX)) / img.naturalWidth;
    var byH = (H * (1 - 2 * FIT.marginY)) / img.naturalHeight;
    var n = Math.floor(flow ? byW : Math.min(byH, byW));
    if (!isFinite(n)) n = FIT.min;
    var nRaw = n;
    n = Math.max(FIT.min, Math.min(FIT.max, n));

    /* Минимум 3 — требование к чёткости, но рамку он переполнять не
       должен: если 3× не влезает, опускаемся ниже минимума. */
    while (n > 1 && (img.naturalWidth * n > W ||
                     (!flow && img.naturalHeight * n > H))) n--;

    var sw = img.naturalWidth * n;
    var sh = img.naturalHeight * n;
    img.style.width = sw + "px";
    img.style.height = sh + "px";

    /* Свободное место делим так, чтобы центр спрайта был ниже центра
       сцены на bias. Всё в целых пикселях: дробная позиция размывает
       картинку так же, как дробный масштаб. */
    var minPad = Math.round(sh * FIT.marginY / (1 - 2 * FIT.marginY));
    var stageH = flow ? sh + 2 * minPad : Math.round(H);
    var free = stageH - sh;
    var half = Math.round(free / 2);
    /* Смещение вниз и толстое нижнее поле тянут в разные стороны: сдвиг
       на 7% высоты забирает ровно эти 7% снизу. Сдвигаем настолько,
       насколько позволяет нижнее поле, а не на сколько хочется. */
    var floor = Math.max(Math.round(stageH * FIT.minBottom), FIT.minBottomPx);
    var shift = Math.min(Math.round(stageH * FIT.bias), Math.max(0, half - floor));
    var top = half + shift;
    var bottom = free - top;

    img.style.marginTop = top + "px";
    img.style.marginBottom = bottom + "px";
    innerEl.style.minHeight = (sh + top + bottom) + "px";

    lastFit = { n: n, nRaw: nRaw, spriteW: sw, spriteH: sh,
                availH: Math.round(H), availW: Math.round(W),
                stageH: stageH, top: top, bottom: bottom,
                flow: flow, shift: shift,
                boundBy: flow ? "ширина" : (byH < byW ? "высота" : "ширина") };
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

      gazeOn = !!(cfg.gaze && M.gaze);
      if (gazeOn) renderGaze();
      else if (cfg.sprite) renderSprite(cfg.sprite);
      else renderPlaceholder();

      innerEl = charEl.closest(".display__inner");
      var img0 = charEl.querySelector(".char__img");
      if (img0) {
        if (img0.complete && img0.naturalWidth) fitSprite();
        else img0.addEventListener("load", fitSprite, { once: true });
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

    fit: fitSprite,
    lastFit: function () { return lastFit; },
    fitConfig: FIT,

    stop: function () {
      if (typer) typer.cancel();
      if (gazeOn && M.gaze) M.gaze.destroy();
    }
  };
})(window.MIRA);

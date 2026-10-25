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
  var actionsCfg = {};           // M.store.actions — путь к спрайтам, дефолты

  /* ---- Кадровые анимации действий: состояние проигрывателя ---- */
  var actionImg = null;          // второй <img>, независимый от gaze
  var animToken = 0;             // растёт при каждом start/stop — отменяет старое
  var animActive = null;         // { id, timer } текущего проигрывания, иначе null
  var frameListCache = {};       // имя папки -> [урлы], после автоопределения
  var frameListPromise = {};     // имя папки -> Promise, чтобы не пробовать дважды
  var imgCache = {};             // урл -> предзагруженный Image()

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
  /* fill — это доля высоты СЦЕНЫ, а не доля высоты персонажа: кадры gaze и
     всех действий — это 1080-пиксельные холсты с прозрачными полями вокруг
     фигуры (bounding box непрозрачных пикселей — 79-82% высоты кадра у
     gaze, измерено по всем 9 направлениям). Это жёсткий потолок: даже при
     fill=1 (кадр вплотную к стенкам сцены, без отступа и смещения) видимый
     персонаж не превысит ~80-82% высоты сцены. Обрезать поля в самих PNG
     нельзя — обрезка должна быть согласована по всем кадрам всех действий
     разом, иначе персонаж скачет при смене действия; отдельная задача.
     Здесь — компромисс без правки файлов: fill поднят почти до предела,
     отступ снизу и смещение вниз сжаты до минимума, чтобы отдать их
     бюджет kadру. Итог — заметно больше прежних 65-67% видимой высоты,
     но не формальные 80-85%: до них не хватает именно прозрачных полей. */
  var FIT = {
    fill: 0.98,         // какую долю высоты сцены должен занять кадр
    min: 3,             // минимальный целый множитель для пиксель-арта
    pixelArtMax: 256,   // сторона исходника, до которой это пиксель-арт
    bias: 0.015,        // насколько центр спрайта ниже центра сцены
    minBottomPx: 4,      // под ногами всегда остаётся воздух...
    minBottomPct: 0.015 // ...но на низкой сцене не больше этой доли
  };
  var lastFit = null;

  /* Вся арифметика в одном месте: сколько места есть и какого размера
     должен быть кадр с natural-размером nw x nh. Ничего не пишет в DOM —
     чистая функция, чтобы её могли использовать и gaze-картинка, и кадры
     анимаций действий (у них разные natural-размеры и папки, но сцена
     и правила вписывания те же самые). */
  function computeFit(nw, nh) {
    if (!innerEl || !nw || !nh) return null;

    /* Высоту берём у РАМКИ, а не у .display__inner: та равна своему
       содержимому, то есть прошлому размеру спрайта — измерять её значит
       измерять собственный результат. */
    var frame = innerEl.parentElement;
    if (!frame) return null;

    var fcs = getComputedStyle(frame);
    var ics = getComputedStyle(innerEl);
    var H = frame.clientHeight
          - parseFloat(fcs.paddingTop) - parseFloat(fcs.paddingBottom)
          - parseFloat(ics.paddingTop) - parseFloat(ics.paddingBottom);
    var W = frame.clientWidth
          - parseFloat(fcs.paddingLeft) - parseFloat(fcs.paddingRight)
          - parseFloat(ics.paddingLeft) - parseFloat(ics.paddingRight);
    if (!(H > 0) || !(W > 0)) return null;

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

    return { mode: pixelArt ? "целый множитель" : "вписан",
             n: n, nRaw: nRaw, natW: nw, natH: nh,
             spriteW: sw, spriteH: sh,
             stageW: Math.round(W), stageH: Math.round(H),
             top: top, bottom: bottom, left: left, right: right,
             pct: +(sh / Hr * 100).toFixed(1),
             boundBy: sw >= Math.floor(W) ? "ширина" : "высота" };
  }

  function applyFit(img, fit) {
    img.style.width = fit.spriteW + "px";
    img.style.height = fit.spriteH + "px";
    img.style.marginTop = fit.top + "px";
    img.style.marginBottom = fit.bottom + "px";
    img.style.marginLeft = fit.left + "px";
    img.style.marginRight = fit.right + "px";
  }

  function zeroImg(img) {
    img.style.width = "0px";
    img.style.height = "0px";
    img.style.marginTop = "0px";
    img.style.marginBottom = "0px";
    img.style.marginLeft = "0px";
    img.style.marginRight = "0px";
  }

  function fitSprite() {
    if (!innerEl) return null;
    var img = charEl && charEl.querySelector(".char__img");
    if (!img || !img.naturalWidth) return null;

    // Обнуляем перед замером, иначе картинка сама распирает рамку,
    // по которой считаем доступное место.
    zeroImg(img);
    var fit = computeFit(img.naturalWidth, img.naturalHeight);
    if (!fit) return null;
    applyFit(img, fit);
    lastFit = fit;
    return fit;
  }

  /* То же самое, но для .char__action (кадры анимаций действий) —
     без побочного эффекта на lastFit(), это API про gaze-картинку. */
  function fitActionImg(img) {
    if (!img || !img.naturalWidth) return null;
    zeroImg(img);
    var fit = computeFit(img.naturalWidth, img.naturalHeight);
    if (fit) applyFit(img, fit);
    return fit;
  }

  function scheduleFit() {
    if (fitPending) return;
    fitPending = requestAnimationFrame(function () {
      fitPending = 0;
      fitSprite();
      if (M.gaze && M.gaze.update) M.gaze.update();
    });
  }

  /* ----------------------------------------------- КАДРОВЫЕ АНИМАЦИИ ----
     Один реиспользуемый проигрыватель для всех действий (THINK/DEBUG/
     DRINK ENERGY DRINK/TAKE PHOTO/SAY HI/PLAY MUSIC), а не шесть отдельных
     таймеров. Владеет ВТОРЫМ <img class="char__action">, который живёт
     рядом с .char__img и никогда не трогает его src: пока играет действие,
     .char__img просто скрыт атрибутом hidden. gaze.js за это время не
     останавливается — он как ни в чём не бывало продолжает писать в
     скрытый <img> направление взгляда, поэтому когда действие кончается
     и gaze-картинка возвращается, на ней уже стоит верный кадр, без
     рывка к look-center. Это и есть решение «не пускать двух хозяев
     к одной <img>»: у каждого — своя, а конфликтовать нечему.

     Один активный токен на всё: playAction()/stopAction() всегда
     увеличивают animToken, и любой отложенный шаг сверяется с ним перед
     тем, как что-то сделать — просроченный setTimeout от отменённой
     анимации молча не сработает. */

  function ensureActionImg() {
    var img = charEl && charEl.querySelector(".char__action");
    if (!img) {
      img = d.el("img", {
        class: "char__action", alt: "", "aria-hidden": "true",
        draggable: "false", hidden: true
      });
      charEl.appendChild(img);
    }
    actionImg = img;
    return img;
  }

  /* Список кадров для папки actions/<name>/. Ручной override из data.js
     (actions.frames[name]) побеждает, если непуст. Иначе — автоопределение:
     пробуем 1.<ext>, 2.<ext>, … пока очередной не даст 404, и на этом
     останавливаемся. Результат кэшируется, повторный вызов файлов не
     перезапрашивает. */
  var FRAME_PROBE_CAP = 200;     // защита от бесконечного перебора

  function actionFrameUrls(name) {
    if (!name) return Promise.resolve([]);
    if (frameListCache[name]) return Promise.resolve(frameListCache[name]);
    if (frameListPromise[name]) return frameListPromise[name];

    var base = (actionsCfg.spriteBase || "./assets/sprites/") + name + "/";
    var manual = actionsCfg.frames && actionsCfg.frames[name];

    var p;
    if (Array.isArray(manual) && manual.length) {
      p = Promise.resolve(manual.map(function (f) { return base + f; }));
    } else {
      p = (function probe() {
        var urls = [];
        function step(i) {
          if (i > FRAME_PROBE_CAP) return urls;
          var url = base + i + ".png";
          return new Promise(function (resolve) {
            var im = new Image();
            im.onload = function () { imgCache[url] = im; urls.push(url); resolve(true); };
            im.onerror = function () { resolve(false); };
            im.src = url;
          }).then(function (ok) { return ok ? step(i + 1) : urls; });
        }
        return step(1);
      })();
    }

    p = p.then(function (list) { frameListCache[name] = list; return list; });
    frameListPromise[name] = p;
    return p;
  }

  function cancelAnimTimer() {
    if (animActive && animActive.timer) window.clearTimeout(animActive.timer);
  }

  /* Возвращает сцену к тому, что было до действия: у gaze — снова видимый
     .char__img (он всё это время сам следил за курсором, просто невидимо);
     без gaze — заново отрисовать позу/плейсхолдер, как и раньше делал set(). */
  function restoreIdleVisual() {
    if (actionImg) actionImg.hidden = true;
    if (gazeOn) {
      var gi = charEl && charEl.querySelector(".char__img");
      if (gi) gi.hidden = false;
      /* gaze.js меряет сам <img>: пока он hidden, getBoundingClientRect()
         даёт нулевой прямоугольник, и gaze.js честно отказывается что-то
         считать (см. "спрайт скрыт — считать нечего" в frame()). Курсор
         при этом не перестаёт отслеживаться — просто направление не
         пересчитывается. Без принудительного update() картинка вернулась
         бы с тем направлением, что было ДО начала действия, а не с тем,
         куда курсор ушёл, пока играла анимация. */
      if (M.gaze && M.gaze.update) M.gaze.update();
    } else {
      if (cfg.sprite) renderSprite(cfg.sprite); else renderPlaceholder();
      ensureActionImg();
    }
  }

  function finishAnim(token) {
    if (token !== animToken) return;
    animActive = null;
    restoreIdleVisual();
  }

  function startPlayback(token, action, urls, loop) {
    ensureActionImg();
    if (gazeOn) {
      var gi = charEl.querySelector(".char__img");
      if (gi) gi.hidden = true;
    }
    actionImg.hidden = false;

    var duration = action.frameDuration || actionsCfg.frameDuration || 100;
    var reduced = M.dom.reducedMotion();
    var sized = false;

    function place(i, done) {
      if (token !== animToken) return;
      var img = actionImg;
      function ready() {
        if (token !== animToken) return;
        // Кадры внутри одной папки — одного размера (иначе персонаж
        // прыгал бы), поэтому считаем размер один раз на всё проигрывание.
        if (!sized) { fitActionImg(img); sized = true; }
        if (done) done();
      }
      img.src = urls[i];
      if (img.complete && img.naturalWidth) ready(); else img.onload = ready;
    }

    animActive = { id: action.id, timer: 0 };

    if (reduced) {
      // Движение подавлено, но действие и диалог всё равно отрабатывают:
      // статичный представительный кадр вместо цикла.
      place(Math.floor(urls.length / 2));
      if (!loop) {
        animActive.timer = window.setTimeout(function () { finishAnim(token); },
                                              urls.length * duration);
      }
      return;
    }

    var idx = 0;
    function step() {
      if (token !== animToken) return;
      place(idx, function () {
        idx++;
        if (idx >= urls.length) {
          if (loop) {
            idx = 0;
            animActive.timer = window.setTimeout(step, duration);
          } else {
            animActive.timer = window.setTimeout(function () { finishAnim(token); }, duration);
          }
        } else {
          animActive.timer = window.setTimeout(step, duration);
        }
      });
    }
    step();
  }

  M.character = {
    init: function (opts) {
      charEl = opts.charEl;
      stageEl = opts.stageEl || null;
      bubbleInk = opts.bubbleInk;
      bubbleSr = opts.bubbleSr;
      cfg = M.store.character || {};
      actionsCfg = M.store.actions || {};
      typer = M.createTypewriter();

      document.documentElement.style.setProperty(
        "--char-size", (cfg.frameSize || 64) + "px"
      );

      innerEl = charEl.closest(".display__inner");

      gazeOn = !!(cfg.gaze && M.gaze);
      if (gazeOn) renderGaze();
      else if (cfg.sprite) renderSprite(cfg.sprite);
      else renderPlaceholder();
      ensureActionImg();

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
        ensureActionImg();
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

    /* ---- Кадровые анимации действий (THINK/DEBUG/…/PLAY MUSIC) ---- */

    /* action — нормализованный объект из store.actions.byId[...]. Решает
       loop/oneshot по a.type сама, ничего дополнительно передавать не
       нужно. Повторный вызов ВСЕГДА отменяет то, что играло, и стартует
       заново — кроме повторного клика по ТОЙ ЖЕ анимации, когда
       actions.restartOnRepeat === false (тогда клик молча игнорируется). */
    playAction: function (action) {
      if (!action || !action.sprites) return;
      var loop = action.type === "toggle";
      if (animActive && animActive.id === action.id &&
          actionsCfg.restartOnRepeat === false) {
        return;
      }

      var myToken = ++animToken;
      cancelAnimTimer();

      actionFrameUrls(action.sprites).then(function (urls) {
        if (myToken !== animToken) return;     // отменили, пока грузили список
        if (!urls.length) { animActive = null; return; }   // папки/файлов нет
        startPlayback(myToken, action, urls, loop);
      });
    },

    /* Чисто останавливает то, что играет (или ничего не делает, если
       ничего не играло), и возвращает сцену к идле. */
    stopAction: function () {
      animToken++;
      cancelAnimTimer();
      animActive = null;
      restoreIdleVisual();
    },

    /* Прогрев кадров одного действия — дёшево вызывать повторно (кэш).
       Используется на hover/focus кнопки и один раз скопом после boot. */
    preloadAction: function (name) { if (name) actionFrameUrls(name); },

    /* id действия, чья анимация сейчас на экране, иначе null — для тестов. */
    currentAction: function () { return animActive ? animActive.id : null; },

    stop: function () {
      if (typer) typer.cancel();
      if (gazeOn && M.gaze) M.gaze.destroy();
      animToken++;
      cancelAnimTimer();
      animActive = null;
    }
  };
})(window.MIRA);

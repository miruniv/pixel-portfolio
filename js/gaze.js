/* ============================================================================
   gaze.js — персонаж следит за курсором.

   Круг вокруг центра спрайта делится на 8 секторов по 45°, каждый сектор —
   свой файл. Внутри мёртвой зоны показывается взгляд прямо.

   Три вещи, без которых это работает плохо:

   1. ГИСТЕРЕЗИС. На стыке двух секторов курсор дрожит на доли градуса, и
      картинка начинает мигать. Поэтому направление меняется только когда
      курсор ушёл от центра ТЕКУЩЕГО сектора дальше, чем на 22.5° + запас.
      Та же логика на границе мёртвой зоны — иначе мигание на радиусе.

   2. ОДИН ПЕРЕСЧЁТ НА КАДР. mousemove сыплется чаще, чем браузер рисует, и
      getBoundingClientRect в нём — это принудительный reflow на каждое
      событие. Обработчик только запоминает координаты, вся работа в rAF.

   3. ПРЕДЗАГРУЗКА. Без неё первый поворот головы мигнёт пустотой, пока
      картинка качается.

   На тач-устройствах и при prefers-reduced-motion обработчики не вешаются
   вообще — показывается взгляд прямо.
   ============================================================================ */
(function (M) {
  "use strict";

  /* Порядок = номер сектора. 0° — вправо, дальше по часовой стрелке
     (ось Y экрана растёт вниз, поэтому положительный угол — это вниз). */
  var ORDER = ["right", "downRight", "down", "downLeft", "left", "upLeft", "up", "upRight"];
  var CENTER = "center";
  var SECTOR = 360 / ORDER.length;          // 45°
  var HALF = SECTOR / 2;                    // 22.5°

  var DEFAULTS = { deadZone: 60, hysteresis: 8, returnDelay: 120, fade: 120 };

  function normDeg(d) { d %= 360; return d < 0 ? d + 360 : d; }

  /* Знаковая разница углов в диапазоне (-180, 180] */
  function angleDiff(a, b) { return normDeg(a - b + 180) - 180; }

  /* Чистая функция — вся математика выбора направления. Тестируется отдельно.
     dx, dy — вектор от центра спрайта к курсору в экранных координатах. */
  function pickDirection(dx, dy, current, opts) {
    opts = opts || {};
    var dead = opts.deadZone == null ? DEFAULTS.deadZone : opts.deadZone;
    var hyst = opts.hysteresis == null ? DEFAULTS.hysteresis : opts.hysteresis;
    var r = Math.sqrt(dx * dx + dy * dy);

    // Мёртвая зона с гистерезисом: входим на dead, выходим только на dead+hyst.
    if (current === CENTER) {
      if (r <= dead + hyst) return CENTER;
    } else if (r < dead) {
      return CENTER;
    }

    var deg = normDeg(Math.atan2(dy, dx) * 180 / Math.PI);

    var idx = ORDER.indexOf(current);
    if (idx >= 0 && Math.abs(angleDiff(deg, idx * SECTOR)) <= HALF + hyst) {
      return current;                       // ещё не вышли за границу с запасом
    }
    return ORDER[Math.round(deg / SECTOR) % ORDER.length];
  }

  function resolve(cfg) {
    var base = cfg.base || "";
    var urls = {};
    urls[CENTER] = base + (cfg[CENTER] || "look-center.png");
    ORDER.forEach(function (k) { if (cfg[k]) urls[k] = base + cfg[k]; });
    return urls;
  }

  var active = null;

  function destroy() {
    if (!active) return;
    active.off.forEach(function (fn) { fn(); });
    if (active.raf) cancelAnimationFrame(active.raf);
    clearTimeout(active.leaveTimer);
    clearTimeout(active.fadeTimer);
    active = null;
  }

  /* opts: { img, cfg } */
  function init(opts) {
    destroy();

    var img = opts.img;
    var cfg = opts.cfg || {};
    var urls = resolve(cfg);
    var dead = cfg.deadZone == null ? DEFAULTS.deadZone : cfg.deadZone;
    var hyst = cfg.hysteresis == null ? DEFAULTS.hysteresis : cfg.hysteresis;
    var returnDelay = cfg.returnDelay == null ? DEFAULTS.returnDelay : cfg.returnDelay;
    var fade = cfg.fade == null ? DEFAULTS.fade : cfg.fade;

    // Предзагрузка: ссылки держим, иначе сборщик выкинет Image до показа.
    var preload = Object.keys(urls).map(function (k) {
      var im = new Image();
      im.src = urls[k];
      return im;
    });

    img.src = urls[CENTER];

    var fine = window.matchMedia
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : true;

    if (!fine || M.dom.reducedMotion()) {
      // Тач или reduced-motion: обработчиков нет вообще, взгляд прямо.
      active = { enabled: false, key: CENTER, off: [], preload: preload };
      return active;
    }

    var st = {
      enabled: true, key: CENTER, off: [], preload: preload,
      x: 0, y: 0, hasPointer: false,
      rect: null, dirty: true,
      raf: 0, leaveTimer: 0, fadeTimer: 0
    };
    active = st;

    function setKey(key) {
      if (key === st.key) return;
      st.key = key;
      var url = urls[key] || urls[CENTER];
      if (img.getAttribute("src") !== url) img.setAttribute("src", url);
    }

    function measure() {
      st.rect = img.getBoundingClientRect();
      st.dirty = false;
    }

    function frame() {
      st.raf = 0;
      if (st.dirty || !st.rect) measure();
      var r = st.rect;
      if (!r || !r.width || !r.height) return;   // спрайт скрыт — считать нечего
      var dx = st.x - (r.left + r.width / 2);
      var dy = st.y - (r.top + r.height / 2);
      setKey(pickDirection(dx, dy, st.key, { deadZone: dead, hysteresis: hyst }));
    }

    function schedule() { if (!st.raf) st.raf = requestAnimationFrame(frame); }

    // Принудительный пересчёт вне кадра: нужен, когда лейаут поменяли
    // программно и ждать следующего mousemove нельзя.
    st.frame = function () { st.dirty = true; frame(); };

    function cancelReturn() {
      clearTimeout(st.leaveTimer); st.leaveTimer = 0;
      clearTimeout(st.fadeTimer); st.fadeTimer = 0;
      img.classList.remove("is-settling");
    }

    function onMove(e) {
      cancelReturn();
      st.x = e.clientX; st.y = e.clientY; st.hasPointer = true;
      schedule();
    }

    // Курсор ушёл из окна — возвращаемся к взгляду прямо не рывком,
    // а через короткое затухание.
    function onLeave() {
      st.hasPointer = false;
      clearTimeout(st.leaveTimer);
      st.leaveTimer = setTimeout(function () {
        img.classList.add("is-settling");
        st.fadeTimer = setTimeout(function () {
          setKey(CENTER);
          img.classList.remove("is-settling");
        }, fade);
      }, returnDelay);
    }

    function onDirty() { st.dirty = true; if (st.hasPointer) schedule(); }

    function bind(target, type, fn, o) {
      target.addEventListener(type, fn, o);
      st.off.push(function () { target.removeEventListener(type, fn, o); });
    }

    bind(document, "mousemove", onMove, { passive: true });
    bind(document, "mouseleave", onLeave);
    bind(window, "blur", onLeave);
    bind(window, "resize", onDirty);
    // capture: true — ловим скролл и внутренних панелей, а не только страницы
    bind(document, "scroll", onDirty, { capture: true, passive: true });

    return st;
  }

  M.gaze = {
    ORDER: ORDER,
    CENTER: CENTER,
    DEFAULTS: DEFAULTS,
    pickDirection: pickDirection,
    init: init,
    destroy: destroy,
    current: function () { return active ? active.key : null; },
    isEnabled: function () { return !!(active && active.enabled); },
    update: function () { if (active && active.frame) active.frame(); }
  };
})(window.MIRA);

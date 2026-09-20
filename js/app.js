/* ============================================================================
   app.js — машина состояний, фокус, звук, boot, модалка.

   Состояния:
     IDLE       #                     подсказка в правой панели
     SECTION    #projects             сетка карточек
     PAGE       #about                контент сразу (mode: "page")
     DETAIL     #projects/pixel-timer деталь; на <=900px — полноэкранная модалка
     NOT_FOUND  битый хэш             чинится router'ом через replaceState
   ============================================================================ */
(function (M) {
  "use strict";

  var d = M.dom, el = d.el;
  var store = M.store, router = M.router, render = M.render, audio = M.audio;
  var ui = store.ui || {};

  var refs = {};
  var typer = M.createTypewriter();
  var state = { sectionId: null, itemId: null };
  var gridScroll = {};     // sectionId -> scrollTop сетки, чтобы BACK возвращал на место
  var lastCard = {};       // sectionId -> itemId, чтобы BACK возвращал фокус на карточку
  var lastFocusBeforeModal = null;

  var mqMobile = window.matchMedia("(max-width: 900px)");

  var SOUND_ON = [["i",2,6,3,4],["i",5,4,2,8],["i",7,2,2,12],["a",11,5,2,6],["a",14,3,1,10]];
  var SOUND_OFF = [["i",2,6,3,4],["i",5,4,2,8],["i",7,2,2,12],
                   ["a",10,5,2,2],["a",12,7,2,2],["a",14,9,2,2],
                   ["a",14,5,2,2],["a",10,9,2,2]];

  /* ======================================================== ОТРИСОВКА ==== */

  function setContent(frag) {
    d.clear(refs.content);
    refs.content.appendChild(frag);
  }

  /* На десктопе скроллит правая панель, на мобилке — вся рабочая область
     (см. 07-responsive.css). Память позиции сетки должна смотреть на тот
     элемент, который реально скроллит, иначе на мобилке она молча не работает. */
  function scroller() {
    return mqMobile.matches ? refs.workspace : refs.content;
  }

  function updateStats(sectionId) {
    d.qsa(".stat", refs.statList).forEach(function (b) {
      b.setAttribute("aria-current", b.dataset.section === sectionId ? "true" : "false");
    });
  }

  function docTitle(section, item) {
    var base = (store.meta && store.meta.shortName) || "Portfolio";
    if (item) document.title = section.label + " / " + item.title + " — " + base;
    else if (section) document.title = section.label + " — " + base;
    else document.title = base;
  }

  function apply(next, meta) {
    typer.cancel();

    // Запоминаем позицию сетки до того, как уйдём с неё.
    if (state.sectionId && !state.itemId && refs.content) {
      gridScroll[state.sectionId] = scroller().scrollTop;
    }

    var section = store.section(next.sectionId);
    var item = next.itemId ? store.item(next.sectionId, next.itemId) : null;
    var wasDetail = !!state.itemId;
    state = { sectionId: next.sectionId, itemId: next.itemId };

    updateStats(next.sectionId);
    M.character.set(section);
    refreshBubble();
    docTitle(section, item);

    var jobs = [];
    var mobileDetail = !!item && mqMobile.matches;

    if (!section) {
      setContent(render.hint(ui.hint || "← PICK A STAT"));
      closeModal();
    } else if (section.mode === "page") {
      setContent(render.page(section, jobs));
      closeModal();
    } else if (!item) {
      setContent(render.grid(section));
      closeModal();
      scroller().scrollTop = gridScroll[section.id] || 0;
    } else if (mobileDetail) {
      // На мобилке сетка остаётся под модалкой — так «назад» ощущается честнее.
      setContent(render.grid(section));
      scroller().scrollTop = gridScroll[section.id] || 0;
      openModal(section, item, jobs);
    } else {
      setContent(render.detail(section, item, jobs, { backLabel: ui.back }));
      closeModal();
      scroller().scrollTop = 0;
    }

    if (item) lastCard[section.id] = item.id;

    if (jobs.length) typer.play(jobs, { speed: 25 });

    if (meta && meta.fromUser) moveFocus(section, item, wasDetail, mobileDetail);
  }

  /* ========================================================== ФОКУС ==== */

  /* preventScroll обязателен: обычный focus() подкручивает элемент в видимую
     область и затирает позицию скролла, которую мы только что восстановили
     из gridScroll. Прокруткой здесь управляем мы, а не браузер. */
  function focusNoScroll(node) {
    try { node.focus({ preventScroll: true }); }
    catch (e) { node.focus(); }          // старые браузеры игнорируют объект опций
  }

  function moveFocus(section, item, wasDetail, mobileDetail) {
    if (mobileDetail) return;            // фокус ставит openModal

    if (item) {
      var back = d.qs('[data-action="back"]', refs.content);
      if (back) { focusNoScroll(back); return; }
    }
    if (section && wasDetail) {
      // Вернулись из детали — фокус на ту карточку, с которой ушли.
      var id = lastCard[section.id];
      var card = id && d.qs('.card[data-item="' + CSS.escape(id) + '"]', refs.content);
      if (card) { focusNoScroll(card); return; }
    }
    var heading = d.qs("#content-title", refs.content);
    if (heading) focusNoScroll(heading);
  }

  /* ======================================================== МОДАЛКА ==== */

  function openModal(section, item, jobs) {
    lastFocusBeforeModal = document.activeElement;
    refs.modalTitle.textContent = item.title;
    d.clear(refs.modalBody);
    refs.modalBody.appendChild(
      // titleId: null — модалка уже подписана через aria-labelledby="modal-title"
      render.detail(section, item, jobs, { hideBack: true, titleId: null })
    );
    refs.modal.dataset.open = "true";
    refs.screen.setAttribute("inert", "");
    refs.screen.setAttribute("aria-hidden", "true");
    refs.modalClose.focus();
  }

  function closeModal() {
    if (refs.modal.dataset.open !== "true") return;
    refs.modal.dataset.open = "false";
    refs.screen.removeAttribute("inert");
    refs.screen.removeAttribute("aria-hidden");
    d.clear(refs.modalBody);
    if (lastFocusBeforeModal && document.contains(lastFocusBeforeModal)) {
      lastFocusBeforeModal.focus();
    }
    lastFocusBeforeModal = null;
  }

  var FOCUSABLE = 'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

  function trapTab(e) {
    if (refs.modal.dataset.open !== "true" || e.key !== "Tab") return;
    var items = d.qsa(FOCUSABLE, refs.modal).filter(function (n) {
      return n.offsetParent !== null;
    });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ====================================================== НАВИГАЦИЯ ==== */

  /* ====================================================== ДЕЙСТВИЯ ==== */
  /* Одна реплика за раз. Приоритет: временная (наведение, фокус, нажатие)
     -> включённый переключатель -> реплика текущего раздела -> дефолт. */
  var transientLine = null;
  var transientTimer = 0;
  var musicOn = false;

  function currentLine() {
    if (transientLine) return transientLine;
    if (musicOn) {
      var m = store.actions.byId.music;
      if (m) return m.line;
    }
    var s = store.section(state.sectionId);
    return (s && s.bubble) || (store.character && store.character.idleBubble) || "";
  }

  function refreshBubble() { M.character.say(currentLine()); }

  function showLine(text, holdMs) {
    window.clearTimeout(transientTimer);
    transientTimer = 0;
    transientLine = text || null;
    refreshBubble();
    if (text && holdMs) {
      transientTimer = window.setTimeout(function () {
        transientLine = null;
        refreshBubble();
      }, holdMs);
    }
  }

  function setFeedback(text) {
    if (refs.feedback) refs.feedback.textContent = text || store.actions.feedbackIdle || "";
  }

  /* Одноразовые действия мигают нажатым состоянием и возвращаются */
  function flash(node) {
    node.classList.add("is-pressed");
    window.setTimeout(function () { node.classList.remove("is-pressed"); }, 150);
  }

  function setMusic(on, node) {
    // Сначала реально запускаем звук. Если браузер отказал (нет
    // AudioContext), кнопка не должна врать, что музыка играет.
    if (on) { if (!audio.music.start()) on = false; }
    else audio.music.stop();

    musicOn = on;
    var a = store.actions.byId.music;
    if (node) node.setAttribute("aria-pressed", on ? "true" : "false");
    refs.bubble.classList.toggle("is-music", on);
    M.character.setState(on ? (a && a.state) || "dance" : "idle");
    setFeedback(on ? a.feedback : a.feedbackOff);
    showLine(on ? a.line : a.lineOff, on ? 0 : 2600);
  }

  function activateAction(node) {
    var a = store.actions.byId[node.dataset.action];
    if (!a || a.enabled === false) return;

    // MUTE — та же переменная, что у кнопки в шапке окна. Своего состояния
    // у действия нет: переключаем общий mute, а обе кнопки перерисует
    // подписчик audio.onChange.
    if (a.shares === "sound") {
      audio.toggle();
      return;
    }
    if (a.id === "music") {
      // Нажатие — это и есть пользовательский жест, которого ждёт браузер
      setMusic(!musicOn, node);
      return;
    }
    if (a.type === "toggle") {
      var on = node.getAttribute("aria-pressed") !== "true";
      node.setAttribute("aria-pressed", on ? "true" : "false");
      M.character.setState(on ? a.state : "idle");
      setFeedback(on ? a.feedback : null);
      showLine(a.line, on ? 0 : 2600);
      return;
    }
    // Ссылки и одноразовые: мигаем и показываем реплику, навигация — своим ходом
    flash(node);
    setFeedback(a.feedback);
    showLine(a.line, 2600);
  }

  function goBack() {
    audio.back();
    router.go(state.sectionId, null);
  }

  function onActivate(target) {
    var statBtn = target.closest("[data-section]");
    if (!statBtn) return false;

    var sectionId = statBtn.dataset.section;
    var itemId = statBtn.dataset.item || null;

    if (itemId) {
      audio.open();
      // Переключение между соседями через ленту не должно засорять историю.
      router.go(sectionId, itemId, { replace: !!statBtn.dataset.sibling });
      return true;
    }

    audio.click();
    // Повторный клик по активному стату сворачивает раздел.
    if (state.sectionId === sectionId && !state.itemId) router.go(null, null);
    else router.go(sectionId, null);

    if (mqMobile.matches) collapseStats(true);
    return true;
  }

  function collapseStats(collapsed) {
    refs.stats.dataset.collapsed = collapsed ? "true" : "false";
    refs.menuBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  /* ========================================================== BOOT ==== */

  function runBoot() {
    var skip = false;
    try { skip = window.sessionStorage.getItem("mira.booted") === "1"; } catch (e) {}
    if (skip || d.reducedMotion()) { finishBoot(); return; }

    var start = performance.now();
    var MIN = 500, MAX = 2000;
    var raf = 0;

    function tick(now) {
      var p = Math.min(1, (now - start) / MAX);
      refs.bootFill.style.width = Math.round(p * 100) + "%";
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    var waits = [delay(MIN)];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    var sprite = store.character && store.character.sprite;
    if (sprite) {
      waits.push(new Promise(function (r) {
        var img = new Image();
        img.onload = img.onerror = r;
        img.src = sprite;
      }));
    }

    Promise.race([Promise.all(waits), delay(MAX)]).then(function () {
      cancelAnimationFrame(raf);
      refs.bootFill.style.width = "100%";
      setTimeout(finishBoot, 120);
    });
  }

  function finishBoot() {
    refs.boot.hidden = true;
    try { window.sessionStorage.setItem("mira.booted", "1"); } catch (e) {}
  }

  /* ========================================================== ЗВУК ==== */

  /* Одно состояние звука на две кнопки: ♪ в шапке и MUTE в панели действий.
     Обе читают audio.isMuted() и обе перерисовываются здесь. */
  function syncSound() {
    var muted = audio.isMuted();

    d.clear(refs.soundGlyph);
    refs.soundGlyph.appendChild(d.pixelArt(muted ? SOUND_OFF : SOUND_ON, 16));
    refs.soundBtn.setAttribute("aria-pressed", muted ? "false" : "true");
    refs.soundBtn.setAttribute("aria-label",
      muted ? (ui.soundOff || "Sound off") : (ui.soundOn || "Sound on"));

    var muteBtn = d.qs('.act[data-action="mute"]');
    if (muteBtn) {
      // MUTE «нажат», когда звук выключен
      muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
      var icon = d.qs(".act__icon", muteBtn);
      if (icon) {
        d.clear(icon);
        icon.appendChild(d.pixelArt(
          render.icons[muted ? "speakerOff" : "speaker"], 16));
      }
      var act = store.actions.byId.mute;
      if (act && refs.feedback && refs.feedback.dataset.owner === "mute") {
        refs.feedback.textContent = muted ? act.feedback : act.feedbackOff;
      }
    }
  }

  /* ========================================================== СТАРТ ==== */

  function init() {
    refs.screen = d.qs("#screen");
    refs.workspace = d.qs("#workspace");
    refs.actions = d.qs("#actions");
    refs.stage = d.qs("#stage");
    refs.bubble = d.qs(".hero__bubble");
    refs.charstats = d.qs("#charstats");
    refs.footer = d.qs("#footer");
    refs.stats = d.qs("#stats");
    refs.statList = d.qs("#stat-list");
    refs.content = d.qs("#content");
    refs.modal = d.qs("#modal");
    refs.modalBody = d.qs("#modal-body");
    refs.modalTitle = d.qs("#modal-title");
    refs.modalClose = d.qs("#modal-close");
    refs.boot = d.qs("#boot");
    refs.bootFill = d.qs("#boot-fill");
    refs.soundBtn = d.qs("#sound-btn");
    refs.soundGlyph = d.qs("#sound-glyph");
    refs.menuBtn = d.qs("#menu-btn");
    refs.titleText = d.qs("#window-title");
    refs.titleIcon = d.qs("#window-icon");

    if (!store.ok) {
      d.clear(refs.content);
      refs.content.appendChild(el("p", { text: "data.js содержит ошибки — смотрите консоль." }));
      finishBoot();
      return;
    }

    // Шапка
    refs.titleText.textContent = (store.meta && store.meta.name) || "PORTFOLIO";
    refs.titleIcon.replaceWith(render.appIcon(store.meta && store.meta.appIcon));
    refs.titleIcon = d.qs(".titlebar__icon");

    // Статы
    refs.statList.appendChild(render.stats(store.sections));

    // Инвентарь, статы персонажа и подвал — статичны, рисуем один раз
    refs.actions.appendChild(render.actions(store.actions));
    refs.feedback = d.qs("#act-feedback");
    refs.bubble.appendChild(render.bubbleDecor());
    refs.charstats.appendChild(render.charStats(store.profile, {
      name: (store.character && store.character.plate) || ""
    }));
    refs.footer.appendChild(render.footer(store.footer));

    // Персонаж
    M.character.init({
      charEl: d.qs("#char"),
      stageEl: refs.stage,
      bubbleInk: d.qs("#bubble-ink"),
      bubbleSr: d.qs("#bubble-sr")
    });
    syncSound();
    audio.onChange(syncSound);

    /* --- Делегирование кликов --- */
    d.on(document, "click", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;

      if (t.closest('[data-action="back"]')) { goBack(); return; }
      if (t.closest("#modal-close") || t.closest(".modal__backdrop")) { goBack(); return; }
      if (t.closest("#sound-btn")) { audio.toggle(); return; }

      var act = t.closest(".act");
      if (act) { audio.click(); activateAction(act); return; }
      if (t.closest("#menu-btn")) {
        audio.click();
        collapseStats(refs.stats.dataset.collapsed !== "true");
        return;
      }
      if (t.closest(".link")) { audio.click(); return; }

      if (onActivate(t)) return;

      // Клик по тексту мгновенно допечатывает остаток.
      if (typer.isRunning() && (t.closest("#content") || t.closest("#modal-body"))) {
        typer.complete();
      }
    });

    /* --- Звук на наведение --- */
    d.on(document, "pointerover", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".stat, .card, .link, .back, .ribbon__item, .tbtn, .footer__link, .act")) audio.hover();

      // Реплика обновляется и по наведению, и по фокусу (тач hover не даёт)
      var over = t.closest(".act");
      if (over && !over.disabled) {
        var ao = store.actions.byId[over.dataset.action];
        if (ao) showLine(ao.line, 0);
      }
    });

    /* --- Реплика обновляется по фокусу: на тач-устройствах hover'а нет --- */
    d.on(document, "focusin", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      var a = t.closest(".act");
      if (a && !a.disabled) {
        var ao = store.actions.byId[a.dataset.action];
        if (ao) showLine(ao.line, 0);
      }
    });
    d.on(document, "focusout", function (e) {
      var t = e.target;
      if (t instanceof Element && t.closest(".act")) showLine(null);
    });
    d.on(document, "pointerout", function (e) {
      var t = e.target;
      if (!(t instanceof Element)) return;
      var a = t.closest(".act");
      if (a && !(e.relatedTarget instanceof Node && a.contains(e.relatedTarget))) showLine(null);
    });

    /* --- Клавиатура --- */
    d.on(document, "keydown", function (e) {
      trapTab(e);

      if (e.key === "Escape") {
        if (refs.modal.dataset.open === "true" || state.itemId) { e.preventDefault(); goBack(); }
        return;
      }
      if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") { audio.toggle(); }
        return;
      }
      // Стрелки ходят по статам — как бонус к обычному Tab, не вместо него.
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
        var active = document.activeElement;
        if (!active || !active.classList.contains("stat")) return;
        var all = d.qsa(".stat", refs.statList);
        var i = all.indexOf(active);
        var next = e.key === "Home" ? 0
                 : e.key === "End" ? all.length - 1
                 : e.key === "ArrowDown" ? (i + 1) % all.length
                 : (i - 1 + all.length) % all.length;
        e.preventDefault();
        all[next].focus();
      }
    });

    /* --- Смена десктоп/мобилка: деталь переезжает между панелью и модалкой --- */
    var onMq = function () { apply(state, { fromUser: false }); };
    if (mqMobile.addEventListener) mqMobile.addEventListener("change", onMq);
    else mqMobile.addListener(onMq);

    /* --- Реакция на смену системной настройки анимации --- */
    var onRm = function () { if (d.reducedMotion() && typer.isRunning()) typer.complete(); };
    if (d.rmQuery.addEventListener) d.rmQuery.addEventListener("change", onRm);

    collapseStats(false);
    router.onChange(apply);
    router.start();
    runBoot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.MIRA);

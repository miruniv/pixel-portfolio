/* ============================================================================
   router.js — URL как единственный источник истины.

   Ни один обработчик клика не трогает DOM напрямую: он только пишет хэш.
   Всё рисует единственный подписчик на hashchange. Бесплатно получаем
   рабочую кнопку «Назад», deeplink и отсутствие рассинхрона состояния.

     #                        -> IDLE
     #projects                -> SECTION / PAGE
     #projects/pixel-timer    -> DETAIL
     мусор                    -> NOT_FOUND -> replaceState на IDLE
   ============================================================================ */
(function (M) {
  "use strict";

  var listeners = [];
  var last = null;

  function parse() {
    var raw = String(window.location.hash || "").replace(/^#\/?/, "");
    if (!raw) return { sectionId: null, itemId: null, valid: true };

    var parts = raw.split("/").filter(Boolean).map(function (p) {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    });

    var sectionId = parts[0] || null;
    var itemId = parts[1] || null;

    var section = M.store.section(sectionId);
    if (!section) return { sectionId: null, itemId: null, valid: false };

    if (itemId) {
      if (section.mode !== "list" || !M.store.item(sectionId, itemId)) {
        // Секция есть, карточки нет — не 404, просто откатываемся на уровень 1.
        return { sectionId: sectionId, itemId: null, valid: false };
      }
    }
    return { sectionId: sectionId, itemId: itemId, valid: true };
  }

  function toHash(sectionId, itemId) {
    if (!sectionId) return "#";
    return "#" + encodeURIComponent(sectionId) + (itemId ? "/" + encodeURIComponent(itemId) : "");
  }

  /* replace: true — не плодим записи в истории (например, при переключении
     между соседними карточками через ленту, иначе «Назад» листала бы их все). */
  function go(sectionId, itemId, opts) {
    var hash = toHash(sectionId, itemId);
    if (hash === (window.location.hash || "#")) { emit(); return; }
    if (opts && opts.replace && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", hash);
      emit();
    } else {
      window.location.hash = hash;   // hashchange прилетит сам
    }
  }

  function emit() {
    var state = parse();
    if (!state.valid) {
      // Чиним адрес, не добавляя запись в историю.
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", toHash(state.sectionId, state.itemId));
      }
    }
    var key = state.sectionId + "|" + state.itemId;
    var fromUser = last !== null && last !== key;
    last = key;
    listeners.forEach(function (fn) { fn(state, { fromUser: fromUser }); });
  }

  M.router = {
    parse: parse,
    toHash: toHash,
    go: go,
    onChange: function (fn) { listeners.push(fn); },
    start: function () {
      window.addEventListener("hashchange", emit);
      emit();
    }
  };
})(window.MIRA);

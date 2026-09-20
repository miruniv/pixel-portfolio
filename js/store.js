/* ============================================================================
   store.js — индексация и валидация SITE_DATA.

   Проверки выполняются один раз на старте и пишут понятные сообщения в консоль.
   Битые данные не должны валить весь сайт: секция с ошибкой пропускается,
   остальное продолжает работать.
   ============================================================================ */
(function (M) {
  "use strict";

  var ID_RE = /^[a-z0-9-]+$/;

  function warn(msg) { console.warn("[data.js] " + msg); }

  function build() {
    if (typeof SITE_DATA === "undefined") {
      console.error("[data.js] SITE_DATA не найден — проверьте, что data.js подключён первым.");
      return { sections: [], byId: {}, ok: false };
    }

    var raw = Array.isArray(SITE_DATA.sections) ? SITE_DATA.sections : [];
    var sections = [];
    var byId = {};

    raw.forEach(function (s, si) {
      var where = 'sections[' + si + ']' + (s && s.id ? ' ("' + s.id + '")' : "");

      if (!s || !s.id || !ID_RE.test(s.id)) {
        warn(where + ": id обязателен и должен состоять из a-z, 0-9 и дефиса. Секция пропущена.");
        return;
      }
      if (byId[s.id]) { warn(where + ": id продублирован. Секция пропущена."); return; }
      if (!s.label) warn(where + ": нет label — на кнопке будет id.");

      var mode = s.mode === "page" ? "page" : "list";
      if (mode === "list" && (!Array.isArray(s.items) || !s.items.length)) {
        warn(where + ': mode "list" требует непустой items. Переключаю на "page".');
        mode = "page";
      }
      if (mode === "page" && !s.page) {
        warn(where + ': mode "page" требует объект page. Секция пропущена.');
        return;
      }

      var items = [];
      var itemsById = {};
      if (mode === "list") {
        s.items.forEach(function (it, ii) {
          var iw = where + ".items[" + ii + "]";
          if (!it || !it.id || !ID_RE.test(it.id)) {
            warn(iw + ": id обязателен (a-z, 0-9, дефис). Карточка пропущена."); return;
          }
          if (itemsById[it.id]) { warn(iw + ": id продублирован. Карточка пропущена."); return; }
          if (!it.detail) { warn(iw + ": нет detail. Карточка пропущена."); return; }
          if (it.thumb && !it.thumbAlt) warn(iw + ": у thumb нет thumbAlt.");
          if (it.detail.hero && !it.detail.heroAlt) warn(iw + ": у detail.hero нет heroAlt.");
          itemsById[it.id] = it;
          items.push(it);
        });
        if (!items.length) { warn(where + ": не осталось валидных карточек. Секция пропущена."); return; }
      }

      var sec = {
        id: s.id,
        label: s.label || s.id.toUpperCase(),
        icon: s.icon || null,
        mode: mode,
        pose: s.pose || null,
        bubble: s.bubble || "",
        intro: s.intro || "",
        page: s.page || null,
        items: items,
        itemsById: itemsById
      };
      byId[s.id] = sec;
      sections.push(sec);
    });

    if (!sections.length) console.error("[data.js] Нет ни одной валидной секции.");

    return {
      meta: SITE_DATA.meta || {},
      ui: SITE_DATA.ui || {},
      character: SITE_DATA.character || {},
      sections: sections,
      byId: byId,
      ok: sections.length > 0,

      section: function (id) { return (id && byId[id]) || null; },
      item: function (sectionId, itemId) {
        var s = byId[sectionId];
        return (s && s.itemsById[itemId]) || null;
      },
      itemIndex: function (sectionId, itemId) {
        var s = byId[sectionId];
        if (!s) return -1;
        for (var i = 0; i < s.items.length; i++) if (s.items[i].id === itemId) return i;
        return -1;
      }
    };
  }

  M.store = build();
})(window.MIRA);

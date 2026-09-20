/* ============================================================================
   render.js — чистые функции отрисовки. Ничего не знают о состоянии и истории:
   получают данные, возвращают DOM-узлы. События вешает app.js делегированием.
   ============================================================================ */
(function (M) {
  "use strict";

  var d = M.dom;
  var el = d.el;

  /* ---- Пиксельные иконки-заглушки, пока нет своих PNG ---- */
  var ICONS = {
    heart: [
      ["i",4,3,3,1],["i",9,3,3,1],["i",3,4,10,3],["i",4,7,8,1],["i",5,8,6,1],
      ["i",6,9,4,1],["i",7,10,2,1],
      ["f",5,4,2,1],["f",10,4,2,1],["f",4,5,8,2],["f",5,7,6,1],["f",6,8,4,1],["f",7,9,2,1]
    ],
    briefcase: [
      ["i",6,2,4,1],["i",6,3,1,1],["i",9,3,1,1],["i",2,4,12,9],
      ["f",3,5,10,7],["i",6,7,4,2]
    ],
    monitor: [
      ["i",2,3,12,9],["f",3,4,10,7],["a",5,6,4,3],["i",6,12,4,1],["i",4,13,8,1]
    ],
    star: [
      ["i",7,2,2,2],["i",6,4,4,1],["i",2,5,12,1],["i",3,6,10,1],["i",4,7,8,1],
      ["i",5,8,6,1],["i",4,9,8,1],["i",3,10,3,1],["i",10,10,3,1],
      ["i",2,11,3,1],["i",11,11,3,1],["i",2,12,2,1],["i",12,12,2,1],
      ["g",7,3,2,1],["g",6,5,4,1],["g",4,6,8,1],["g",5,7,6,1],["g",6,8,4,1],["g",5,9,6,1]
    ],
    envelope: [
      ["i",2,4,12,8],["f",3,5,10,6],
      ["i",3,5,2,1],["i",5,6,2,1],["i",7,7,2,1],["i",9,6,2,1],["i",11,5,2,1]
    ],
    window: [["i",1,3,14,10],["a",2,4,12,3],["f",2,7,12,5]],
    // В Press Start 2P нет U+2190 и U+2197 — рисуем стрелки пикселями,
    // иначе браузер подставляет глиф из фоллбэк-шрифта и он выбивается из стиля.
    arrowLeft: [
      ["i",3,7,2,2],
      ["i",5,5,2,2],["i",5,9,2,2],
      ["i",7,3,2,2],["i",7,11,2,2],
      ["i",5,7,9,2]
    ],
    external: [
      ["i",8,3,6,2],["i",12,3,2,6],
      ["i",10,5,2,2],["i",8,7,2,2],["i",6,9,2,2],["i",4,11,2,2]
    ]
  };
  var ICON_ORDER = ["heart", "briefcase", "monitor", "star", "envelope"];
  var ICON_BY_ID = {
    about: "heart", work: "briefcase", projects: "monitor",
    extra: "star", contacts: "envelope"
  };

  function sectionIcon(section, index) {
    if (section.icon) {
      return el("img", { src: section.icon, alt: "", "aria-hidden": "true" });
    }
    var name = ICON_BY_ID[section.id] || ICON_ORDER[index % ICON_ORDER.length];
    return d.pixelArt(ICONS[name], 16);
  }

  function appIcon(src) {
    if (src) return el("img", { class: "titlebar__icon", src: src, alt: "", "aria-hidden": "true" });
    var node = el("span", { class: "titlebar__icon" }, d.pixelArt(ICONS.window, 16));
    return node;
  }

  /* ---------------------------------------------------------- СТАТЫ ---- */
  function stats(sections) {
    var frag = document.createDocumentFragment();
    sections.forEach(function (s, i) {
      var btn = el("button", {
        type: "button",
        class: "stat px-box px-bevel",
        "aria-current": "false",
        dataset: { section: s.id }
      }, [
        el("span", { class: "stat__icon" }, sectionIcon(s, i)),
        el("span", { class: "stat__label", text: s.label })
      ]);
      frag.appendChild(el("li", null, btn));
    });
    return frag;
  }

  /* ----------------------------------------------------- ПОДСКАЗКА ---- */
  function hint(text) {
    return el("div", { class: "hint" }, [
      el("span", { class: "hint__arrow", "aria-hidden": "true" }, d.pixelArt(ICONS.arrowLeft, 16)),
      el("span", { text: text }),
      el("span", { class: "caret", "aria-hidden": "true" })
    ]);
  }

  function title(text) {
    return el("h2", { class: "content__title", id: "content-title", tabindex: "-1", text: text });
  }

  /* ------------------------------------------------------- ПРЕВЬЮ ---- */
  function thumb(item, cls) {
    var inner = item.thumb
      ? el("img", { src: item.thumb, alt: item.thumbAlt || "" })
      : el("span", { class: "card__letter", "aria-hidden": "true",
                     text: (item.title || "?").charAt(0) });
    return el("span", { class: cls + " px-box px-inset" }, inner);
  }

  /* ------------------------------------------- СЕТКА (уровень 1) ---- */
  function grid(section) {
    var frag = document.createDocumentFragment();
    frag.appendChild(title(section.label));
    if (section.intro) frag.appendChild(el("p", { class: "content__intro", text: section.intro }));

    var list = el("ul", { class: "cards" });
    section.items.forEach(function (it) {
      var btn = el("button", {
        type: "button",
        class: "card px-box px-bevel",
        dataset: { section: section.id, item: it.id }
      }, [
        thumb(it, "card__thumb"),
        el("span", { class: "card__title", text: it.title }),
        it.subtitle ? el("span", { class: "card__sub", text: it.subtitle }) : null
      ]);
      list.appendChild(el("li", null, btn));
    });
    frag.appendChild(list);
    return frag;
  }

  /* ---------------------------------------------- ТЕЛО КОНТЕНТА ---- */
  /* jobs наполняется парами {ink, text} для typewriter.js */
  function body(data, jobs) {
    var frag = document.createDocumentFragment();

    if (data.hero) {
      frag.appendChild(el("figure", { class: "detail__hero px-box px-inset" },
        el("img", { src: data.hero, alt: data.heroAlt || "" })));
    }

    var texts = Array.isArray(data.text) ? data.text : [];
    if (texts.length) {
      // Видимый слой печатается и целиком скрыт от скринридера...
      var wrap = el("div", { class: "detail__text", "aria-hidden": "true" });
      texts.forEach(function (t) {
        var ink = el("span", { class: "typed__ink" });
        wrap.appendChild(el("p", { class: "typed" }, [
          // «Призрак» держит высоту, иначе панель дёргалась бы на каждом символе
          el("span", { class: "typed__ghost", text: t }),
          ink
        ]));
        jobs.push({ ink: ink, text: t });
      });
      frag.appendChild(wrap);

      // ...а полный текст лежит рядом и читается сразу и один раз.
      var sr = el("div", { class: "sr-only" });
      texts.forEach(function (t) { sr.appendChild(el("p", { text: t })); });
      frag.appendChild(sr);
    }

    if (Array.isArray(data.tags) && data.tags.length) {
      var tags = el("ul", { class: "tags" });
      data.tags.forEach(function (t) {
        var vals = (t.values || []).map(function (v) {
          return el("span", { class: "tag__val", text: v });
        });
        tags.appendChild(el("li", { class: "tag" }, [
          el("span", { class: "tag__label", text: (t.label || "") + ":" })
        ].concat(vals)));
      });
      frag.appendChild(tags);
    }

    if (Array.isArray(data.links) && data.links.length) {
      var links = el("ul", { class: "links" });
      data.links.forEach(function (l) {
        if (!l || !l.url) return;
        var external = /^https?:/i.test(l.url);
        links.appendChild(el("li", null, el("a", {
          class: "link px-box px-face",
          href: l.url,
          target: external ? "_blank" : null,
          rel: external ? "noopener noreferrer" : null
        }, [
          el("span", { text: l.label || l.url }),
          external
            ? el("span", { class: "link__ext", "aria-hidden": "true" }, d.pixelArt(ICONS.external, 16))
            : null
        ])));
      });
      frag.appendChild(links);
    }

    return frag;
  }

  /* -------------------------------------- СТРАНИЦА (без ур. 2) ---- */
  function page(section, jobs) {
    var frag = document.createDocumentFragment();
    frag.appendChild(title(section.label));
    frag.appendChild(el("div", { class: "detail" }, body(section.page, jobs)));
    return frag;
  }

  /* ------------------------------------------ ДЕТАЛЬ (уровень 2) ---- */
  function detail(section, item, jobs, opts) {
    opts = opts || {};
    var frag = document.createDocumentFragment();
    var bar = el("div", { class: "detail__bar" });

    if (!opts.hideBack) {
      bar.appendChild(el("button", {
        type: "button",
        class: "back px-box px-face",
        dataset: { action: "back" },
        "aria-label": opts.backLabel || "BACK"
      }, [
        el("span", { class: "back__arrow", "aria-hidden": "true" }, d.pixelArt(ICONS.arrowLeft, 16)),
        el("span", { text: opts.backLabel || "BACK" })
      ]));
    }

    // Лента соседних карточек — компенсирует то, что сетка ушла из виду.
    if (section.items.length > 1) {
      var ribbon = el("nav", { class: "ribbon", "aria-label": "Other entries" });
      section.items.forEach(function (it) {
        var current = it.id === item.id;
        ribbon.appendChild(el("button", {
          type: "button",
          class: "ribbon__item px-box px-bevel",
          "aria-current": current ? "true" : "false",
          "aria-label": it.title,
          title: it.title,
          dataset: { section: section.id, item: it.id, sibling: "1" }
        }, it.thumb
          ? el("img", { src: it.thumb, alt: "" })
          : el("span", { "aria-hidden": "true", text: (it.title || "?").charAt(0) })
        ));
      });
      bar.appendChild(ribbon);
    }

    var head = el("div", null, [
      el("h2", { class: "detail__title", id: "content-title", tabindex: "-1", text: item.title }),
      item.subtitle ? el("p", { class: "detail__sub", text: item.subtitle }) : null
    ]);

    frag.appendChild(el("div", { class: "detail" }, [bar, head, body(item.detail, jobs)]));
    return frag;
  }

  M.render = {
    stats: stats, hint: hint, grid: grid, page: page, detail: detail,
    appIcon: appIcon, icons: ICONS
  };
})(window.MIRA);

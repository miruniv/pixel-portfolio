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
    ],
    arrowRight: [
      ["i",11,7,2,2],
      ["i",9,5,2,2],["i",9,9,2,2],
      ["i",7,3,2,2],["i",7,11,2,2],
      ["i",2,7,9,2]
    ],
    // Обобщённая «карточка» — для квадратных кнопок ленты соседей,
    // у которых нет своего превью. Название несут title и aria-label.
    item: [["i",3,3,10,10],["f",4,4,8,8],["a",5,6,6,1],["a",5,8,4,1]],

    /* ---- Инвентарь ---- */
    keyboard: [
      ["i",1,5,14,7],["f",2,6,12,5],
      ["i",3,7,1,1],["i",5,7,1,1],["i",7,7,1,1],["i",9,7,1,1],["i",11,7,1,1],
      ["i",5,9,6,1]
    ],
    mouse: [["i",4,2,8,12],["f",5,3,6,10],["i",5,8,6,1],["a",7,4,2,3]],
    coffee: [
      ["i",2,5,9,7],["f",3,6,7,5],
      ["i",11,6,3,1],["i",13,7,1,2],["i",11,9,3,1],
      ["i",1,13,11,1],
      ["a",4,2,1,2],["a",7,2,1,2]
    ],
    floppy: [
      ["i",2,2,12,12],["f",3,3,10,10],
      ["i",5,3,6,4],["f",8,4,2,2],
      ["i",4,9,8,4],["f",5,10,6,2]
    ],
    headphones: [
      ["i",4,2,8,2],["i",3,3,1,4],["i",12,3,1,4],
      ["i",2,7,3,5],["i",11,7,3,5],
      ["f",3,8,1,3],["f",12,8,1,3]
    ],
    book: [
      ["i",3,2,10,12],["f",4,3,8,10],["a",4,3,2,10],
      ["i",7,5,4,1],["i",7,7,4,1],["i",7,9,4,1]
    ],
    cassette: [
      ["i",1,4,14,8],["f",2,5,12,6],
      ["i",4,7,3,3],["i",9,7,3,3],
      ["f",5,8,1,1],["f",10,8,1,1],
      ["a",7,8,2,1]
    ],
    plant: [
      ["i",4,10,8,5],["f",5,11,6,3],["i",7,6,2,5],
      ["m",3,4,4,3],["m",9,4,4,3],["m",6,2,4,3]
    ],

    /* ---- Подвал. Логотипы брендов не воспроизводим: рисуем нейтральные
       глифы, а название несут title и aria-label. ---- */
    code: [
      ["i",4,4,2,2],["i",2,6,2,3],["i",4,9,2,2],
      ["i",10,4,2,2],["i",12,6,2,3],["i",10,9,2,2],
      ["a",9,3,1,3],["a",8,6,1,3],["a",7,9,1,3]
    ],
    badge: [["i",6,2,4,4],["f",7,3,2,2],["i",3,8,10,6],["f",4,9,8,4]],
    note: [
      ["i",10,2,2,9],["i",12,2,3,3],["i",12,5,2,2],
      ["i",6,10,6,4]
    ],
    shirt: [
      ["i",6,2,4,3],["i",2,3,12,4],["i",4,5,8,9],
      ["f",5,6,6,7],["a",6,10,4,2]
    ],
    clock: [
      ["i",2,2,12,12],["f",3,3,10,10],
      ["i",7,5,2,4],["i",9,8,3,2]
    ],
    think: [
      ["i",3,3,10,6],["f",4,4,8,4],
      ["i",5,10,2,2],["i",8,13,2,2]
    ],
    can: [
      ["i",5,2,6,12],["f",6,3,4,10],
      ["i",6,2,4,1],["a",6,5,4,4]
    ],
    bug: [
      ["i",6,4,4,8],["f",7,5,2,6],
      ["i",3,5,3,1],["i",10,5,3,1],
      ["i",3,8,3,1],["i",10,8,3,1],
      ["i",3,11,3,1],["i",10,11,3,1],
      ["i",6,2,1,2],["i",9,2,1,2]
    ],
    camera: [
      ["i",2,5,12,8],["f",3,6,10,6],
      ["i",6,3,4,2],["i",6,7,4,4],["a",7,8,2,2]
    ],
    wave: [
      ["i",5,3,2,6],["i",7,2,2,7],["i",9,3,2,6],
      ["i",4,8,8,6],["f",5,9,6,4]
    ],
    speaker: [
      ["i",2,6,3,4],["i",5,4,2,8],["i",7,2,2,12],
      ["a",11,5,2,6],["a",14,3,1,10]
    ],
    speakerOff: [
      ["i",2,6,3,4],["i",5,4,2,8],["i",7,2,2,12],
      ["a",10,5,2,2],["a",12,7,2,2],["a",14,9,2,2],
      ["a",14,5,2,2],["a",10,9,2,2]
    ],
    bulb: [
      ["g",5,2,6,7],["i",4,3,1,5],["i",11,3,1,5],
      ["i",5,1,6,1],["i",6,9,4,1],["i",6,11,4,1],["i",7,13,2,1]
    ],
    document: [
      ["i",3,1,10,14],["f",4,2,8,12],
      ["a",5,4,6,1],["a",5,6,6,1],["a",5,8,6,1],["a",5,10,4,1]
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
      // Обычные абзацы: голос персонажа звучит только в верхнем окне реплики,
      // здесь текст появляется целиком. Значит и «призрак» с дублем для
      // скринридера больше не нужны — текст сразу настоящий.
      var wrap = el("div", { class: "detail__text" });
      texts.forEach(function (t) { wrap.appendChild(el("p", { text: t })); });
      frag.appendChild(wrap);
    }

    if (Array.isArray(data.tags) && data.tags.length) {
      var tags = el("ul", { class: "tags" });
      data.tags.forEach(function (t) {
        var vals = (t.values || []).map(function (v) {
          return el("span", { class: "tag__val", text: v });
        });
        // tone: "alt" — второй цвет чипов, "plain" — значение без чипа
        var cls = "tag" + (t.tone ? " tag--" + t.tone : "");
        tags.appendChild(el("li", { class: cls }, [
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
          : d.pixelArt(ICONS.item, 16)
        ));
      });
      bar.appendChild(ribbon);
    }

    // В модалке заголовок НЕ должен занимать id="content-title": он уже
    // занят заголовком сетки в правой панели, а два одинаковых id ломают
    // и aria-labelledby, и любой поиск по id.
    var head = el("div", null, [
      el("h2", {
        class: "detail__title",
        id: opts.titleId === null ? null : (opts.titleId || "content-title"),
        tabindex: "-1",
        text: item.title
      }),
      item.subtitle ? el("p", { class: "detail__sub", text: item.subtitle }) : null
    ]);

    frag.appendChild(el("div", { class: "detail" }, [bar, head, body(item.detail, jobs)]));
    return frag;
  }

  /* ------------------------------------------------------- ДЕЙСТВИЯ ---- */
  function actionNode(a, onBadge) {
    var isLink = a.type === "link" && a.href;
    var external = isLink && /^https?:/i.test(a.href);
    var disabled = a.enabled === false;

    var kids = [
      el("span", { class: "act__icon", "aria-hidden": "true" },
         d.pixelArt(ICONS[a.icon] || ICONS.item, 16)),
      el("span", { class: "act__label", text: a.label })
    ];
    // Бейдж ON живёт всегда, показывается только у включённого переключателя
    if (a.type === "toggle") {
      kids.unshift(el("span", { class: "act__badge", "aria-hidden": "true", text: onBadge }));
    }

    var cls = "act act--" + a.kind + " px-box px-bevel" +
              (a.kind === "primary" ? " px-shadow" : "") +
              (a.tone ? " act--" + a.tone : "");

    var attrs = {
      class: cls,
      dataset: { action: a.id, type: a.type },
      title: disabled ? a.label + " \u2014 " + a.disabledNote : a.label,
      "aria-label": disabled ? a.label + " \u2014 " + a.disabledNote : a.label
    };

    var node;
    if (disabled) {
      attrs.type = "button";
      attrs.disabled = true;
      attrs["aria-disabled"] = "true";
      node = el("button", attrs, kids);
    } else if (isLink) {
      attrs.href = a.href;
      if (external) { attrs.target = "_blank"; attrs.rel = "noopener noreferrer"; }
      node = el("a", attrs, kids);
    } else {
      attrs.type = "button";
      if (a.type === "toggle") attrs["aria-pressed"] = "false";
      node = el("button", attrs, kids);
    }
    return node;
  }

  function actions(act) {
    var frag = document.createDocumentFragment();

    frag.appendChild(el("h2", { class: "actions__title", id: "act-title" }, [
      el("span", { text: act.title }),
      el("span", { class: "actions__rule", "aria-hidden": "true" }),
      act.hint ? el("span", { class: "actions__hint", text: act.hint }) : null
    ]));

    var primary = act.items.filter(function (a) { return a.kind === "primary"; });
    var slots = act.items.filter(function (a) { return a.kind !== "primary"; });

    // Обёртка нужна мобильной раскладке: там оба блока становятся одной
    // горизонтальной лентой, два главных действия идут первыми.
    var row = el("div", { class: "actions__row" });
    if (primary.length) {
      var top = el("div", { class: "actions__primary" });
      primary.forEach(function (a) { top.appendChild(actionNode(a, act.onBadge)); });
      row.appendChild(top);
    }
    if (slots.length) {
      var grid = el("ul", { class: "actions__grid" });
      slots.forEach(function (a) {
        grid.appendChild(el("li", null, actionNode(a, act.onBadge)));
      });
      row.appendChild(grid);
    }
    frag.appendChild(row);

    // role="status" — строка обратной связи читается сама, без фокуса
    frag.appendChild(el("p", {
      class: "actions__feedback px-box",
      id: "act-feedback",
      role: "status",
      text: act.feedbackIdle
    }));
    return frag;
  }

  /* Эквалайзер и вторая нота в углу диалогового окна. Живут всегда,
     показываются только когда играет музыка (класс на самом окне). */
  function bubbleDecor() {
    var frag = document.createDocumentFragment();
    var eq = el("span", { class: "eq", "aria-hidden": "true" });
    for (var i = 0; i < 4; i++) eq.appendChild(el("span", { class: "eq__bar" }));
    frag.appendChild(eq);
    frag.appendChild(el("span", { class: "bubble__note", "aria-hidden": "true" },
                        d.pixelArt(ICONS.note, 16)));
    return frag;
  }

  /* ------------------------------------------- КАРТОЧКА ПРОФИЛЯ ---- */
  function charStats(p, opts) {
    opts = opts || {};
    var frag = document.createDocumentFragment();

    // Имя слева, уровень справа, одной строкой — стрелок в макете нет
    frag.appendChild(el("div", { class: "profile__head" }, [
      el("p", { class: "profile__name", text: opts.name || "" }),
      p.level == null ? null : el("p", { class: "profile__lvl", text: "LVL " + p.level })
    ]));

    // Шкала из отдельных квадратиков, а не градиент: так она остаётся
    // пиксельной на любом масштабе.
    var bar = el("div", {
      class: "lvlbar",
      role: "img",
      "aria-label": "Level " + p.level + ": " + p.filled + " of " + p.total
    });
    for (var i = 0; i < p.total; i++) {
      bar.appendChild(el("span", {
        class: "lvlbar__cell" + (i < p.filled ? " is-on" : ""),
        "aria-hidden": "true"
      }));
    }
    frag.appendChild(el("div", { class: "charstats__lvl" }, [
      el("span", { class: "charstats__lvlnum", text: "XP" }),
      bar
    ]));

    var dl = el("dl", { class: "charstats__rows" });
    p.rows.forEach(function (r) {
      dl.appendChild(el("dt", { text: r.label }));
      dl.appendChild(el("dd", { text: r.value }));
    });
    frag.appendChild(dl);
    return frag;
  }

  /* ---------------------------------------------------------- ПОДВАЛ ---- */
  function footer(f) {
    var frag = document.createDocumentFragment();

    var links = el("ul", { class: "footer__links" });
    f.links.forEach(function (l) {
      var external = /^https?:/i.test(l.url);
      links.appendChild(el("li", null, el("a", {
        class: "footer__link px-box",
        href: l.url,
        title: l.label,
        "aria-label": l.label,
        target: external ? "_blank" : null,
        rel: external ? "noopener noreferrer" : null
      }, d.pixelArt(ICONS[l.icon] || ICONS.document, 16))));
    });
    frag.appendChild(links);

    if (f.copyright) frag.appendChild(el("p", { class: "footer__copy", text: f.copyright }));
    return frag;
  }

  M.render = {
    stats: stats, hint: hint, grid: grid, page: page, detail: detail,
    appIcon: appIcon, icons: ICONS,
    charStats: charStats, footer: footer,
    actions: actions, bubbleDecor: bubbleDecor
  };
})(window.MIRA);

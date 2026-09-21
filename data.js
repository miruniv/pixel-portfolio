/* ============================================================================
   data.js — ЕДИНСТВЕННЫЙ ФАЙЛ, КОТОРЫЙ НУЖНО РЕДАКТИРОВАТЬ.
   Разметку и стили трогать не надо.

   Полная схема полей — в README.md.
   Быстрая шпаргалка:
     section.mode = "list"  -> сетка карточек, у каждой свой экран (уровень 2)
     section.mode = "page"  -> контент показывается сразу, без второго уровня
     любой путь к картинке можно поставить null — нарисуется плейсхолдер
     id попадает в адрес страницы:  #projects/pixel-timer
   ============================================================================ */

const SITE_DATA = {

  /* ---------------------------------------------------------------- META -- */
  meta: {
    name: "HI, I'M MIRA",                    // текст в шапке окна
    shortName: "Mira",                       // для <title> вкладки
    appIcon: null,                           // "./assets/icons/app.png" (16x16)
    description: "Frontend developer and pixel artist. Portfolio."
  },

  /* ------------------------------------------------------------------ UI -- */
  ui: {
    hint: "PICK A STAT",
    back: "BACK",
    notFound: "404 — NOTHING HERE",
    loading: "LOADING",
    soundOn: "SOUND ON",
    soundOff: "SOUND OFF",
    menu: "TOGGLE MENU",
    close: "CLOSE",
    prevSection: "Previous section",
    nextSection: "Next section"
  },

  /* ----------------------------------------------------------- ПЕРСОНАЖ -- */
  character: {
    // Спрайт-лист для idle-анимации: frames кадров по frameSize px в ряд.
    // Используется, только когда gaze выключен. null -> SVG-плейсхолдер.
    sprite: null,                            // "./assets/sprites/char-idle.png"
    frames: 4,
    frameSize: 128,                          // размер кадра = размер спрайтов gaze
    fps: 4,

    // Слежение за курсором. Девять картинок по сторонам света + взгляд прямо.
    // Уберите этот блок (или поставьте null), чтобы вернуться к sprite/плейсхолдеру.
    gaze: {
      // Папка со спрайтами слежения. gaze.js берёт путь отсюда.
      base: "./assets/sprites/cursorWatcher/",
      center:    "look-center.png",
      right:     "look-right.png",
      downRight: "look-down-right.png",
      down:      "look-down.png",
      downLeft:  "look-down-left.png",
      left:      "look-left.png",
      upLeft:    "look-up-left.png",
      up:        "look-up.png",
      upRight:   "look-up-right.png",
      deadZone: 120,       // px: ближе к центру спрайта — взгляд прямо
      hysteresis: 14,      // градусы запаса, чтобы не мигало на стыке секторов
      minSwitchMs: 120     // не чаще одного переключения направления
    },
    plate: "MIRA",                           // плашка под рамкой
    alt: "Pixel-art character: a girl with brown hair, glasses, a green sweater and jeans",
    idleBubble: "NICE TO MEET YOU!",

    /* Голос персонажа. Работает ТОЛЬКО в верхнем окне реплики: нигде больше
       текст по буквам не печатается и blip'ы не играют. */
    voice: {
      note: 420,      // базовая нота, Гц
      detune: 2,      // разброс высоты в полутонах — иначе выходит телеграф
      dur: 0.03,      // длительность blip'а, сек
      type: "triangle",
      every: 2,       // играть через каждые N озвученных символов
      speed: 30       // мс на символ
    },

    /* Состояния сцены. Класс вешается на обёртку #stage, НЕ на <img>:
       src картинки принадлежит gaze.js, он подставляет туда направление
       взгляда. Так персонаж одновременно следит за курсором и дышит. */
    states: {
      idle:   { line: "NICE TO MEET YOU!" },
      dance:  { line: "\u266A LET'S DANCE! \u266A" },
      outfit: { line: "THIS IS HOW YOU SEE ME ON LECTURES" }
    },

    /* Второй комплект спрайтов под CHANGE OUTFIT. Пока файлов нет —
       enabled: false, и кнопка выводится недоступной. Что положить и как
       включить, описано в README, раздел «Второй комплект спрайтов». */
    outfits: {
      lecture: {
        enabled: false,
        label: "Lecture outfit",
        base: "./assets/sprites/lecture/",
        center:    "look-center.png",
        right:     "look-right.png",
        downRight: "look-down-right.png",
        down:      "look-down.png",
        downLeft:  "look-down-left.png",
        left:      "look-left.png",
        upLeft:    "look-up-left.png",
        up:        "look-up.png",
        upRight:   "look-up-right.png"
      }
    }
  },

  /* ------------------------------------------------- СТАТЫ ПЕРСОНАЖА -- */
  /* Панель под плашкой с именем в центральной колонке. */
  profile: {
    level: 22,
    levelFilled: 7,          // сколько ячеек шкалы закрашено
    levelTotal: 10           // всего ячеек; счётчик в aria берётся отсюда
  },

  /* ------------------------------------------------------------ ДЕЙСТВИЯ -- */
  /* Панель в левой колонке. Два primary сверху, шесть слотов снизу.
     line — реплика в диалоговом окне; показывается по наведению, по фокусу
     и при нажатии. feedback — строка под сеткой. */
  actions: {
    title: "ACTIONS",
    hint: "TAP TO USE",
    feedbackIdle: "PICK AN ACTION",
    onBadge: "ON",

    // Кадры анимаций живут в assets/sprites/<sprites>/, файлы пронумерованы
    // без нулей слева (1.png, 2.png, … 10.png). Считать их не нужно:
    // character.js пробует номера по порядку, пока очередной не даст 404,
    // и на этом останавливается — добавили 11.png в папку, он подхватится
    // сам. actions.frames ниже — РУЧНОЙ override на случай нестандартной
    // нумерации; для пустого списка работает автоопределение.
    spriteBase: "./assets/sprites/",
    frameDuration: 100,             // мс на кадр = 10 fps; можно переопределить
                                     // у отдельного действия полем frameDuration
    items: [
      {
        id: "music", label: "PLAY MUSIC", icon: "note",
        kind: "primary", type: "toggle", state: "dance", sprites: "playMusic",
        line: "\u266A LET'S DANCE! \u266A",
        lineOff: "OK, BACK TO WORK",
        feedback: "PLAY MUSIC \u00B7 SHE'S DANCING NOW",
        feedbackOff: "MUSIC OFF \u00B7 BACK TO WORK"
      },
      { id: "think", label: "THINK", icon: "think",
        kind: "slot", type: "oneshot", sprites: "think", sfx: "think",
        // Ниже и медленнее обычного — своя интонация
        voice: { note: 300, speed: 46 },
        line: "LET ME THINK ABOUT IT\u2026",
        feedback: "THINK \u00B7 WORKING ON IT",
        overlays: ["dots", "bulb"] },
      { id: "energy", label: "ENERGY", icon: "can",
        kind: "slot", type: "oneshot", sprites: "drinkEnergydrink", sfx: "can",
        line: "ONE MORE AND I CAN SHIP THIS",
        feedback: "ENERGY \u00B7 +10 ENERGY",
        overlays: ["energy"] },
      { id: "debug", label: "DEBUG", icon: "bug",
        kind: "slot", type: "oneshot", sprites: "debug", sfx: "bug",
        line: "FOUND YOU, LITTLE BUG",
        feedback: "DEBUG \u00B7 ONE LESS BUG",
        overlays: ["bug"] },
      { id: "photo", label: "TAKE PHOTO", icon: "camera",
        kind: "slot", type: "oneshot", sprites: "takePhoto", sfx: "shutter",
        line: "SAY CHEESE!",
        feedback: "TAKE PHOTO \u00B7 SMILE",
        overlays: ["flash"] },
      { id: "sayhi", label: "SAY HI", icon: "wave",
        kind: "slot", type: "oneshot", sprites: "sayHi", sfx: "wave",
        // Выше обычного
        voice: { note: 560 },
        line: "Hi, I am Mira!",
        feedback: "SAY HI \u00B7 HELLO THERE" },
      { id: "mute", label: "MUTE", icon: "speaker",
        // primary, не slot: делит верхний ряд с PLAY MUSIC поровну —
        // см. references/actions-target.png.
        kind: "primary", type: "toggle",
        // Состояние звука живёт в js/audio.js и общее с кнопкой в шапке окна.
        // Отдельной переменной здесь НЕТ намеренно.
        shares: "sound",
        line: "SHH\u2026", lineOff: "SOUND IS BACK",
        feedback: "MUTE \u00B7 SOUND OFF", feedbackOff: "MUTE \u00B7 SOUND ON" }
    ],

    /* Ручной список кадров — НЕ обязателен. Папка указана у действия в
       поле sprites; пока список здесь пуст, character.js сам находит
       файлы в assets/sprites/<sprites>/ (1.png, 2.png, … по порядку,
       пока очередной номер не даст 404). Заполняйте эти списки только
       если нумерация нестандартная (не с 1, с пропусками, не .png) —
       тогда автоопределение отключается и используется ровно этот
       порядок. Подробности — в README, раздел «Кадры действий». */
    frames: {
      playMusic: [],
      think: [],
      drinkEnergydrink: [],
      debug: [],
      takePhoto: [],
      sayHi: []
    },

    /* Повторный клик во время проигрывания перезапускает анимацию с начала
       (а не игнорируется): так действие всегда откликается на нажатие. */
    restartOnRepeat: true,

    /* Накладки поверх сцены: живут секунду-полторы и исчезают.
       В спрайт не вшиты, рисуются отдельными элементами. */
    overlays: {
      dots:   { text: "\u2026",          hold: 900 },
      bulb:   { icon: "bulb",        hold: 700, delay: 800 },
      energy: { text: "+10 ENERGY",  hold: 1200 },
      bug:    { icon: "bug",         hold: 900 },
      flash:  { flash: true,         hold: 220 }
    }
  },

  /* -------------------------------------------------------------- ПОДВАЛ -- */
  /* Прибит к низу правой панели. Иконки — имена из ICONS в js/render.js. */
  footer: {
    copyright: "\u00A9 2026 Mira \u00B7 Made with HTML",
    links: [
      { label: "GitHub",   url: "https://github.com/example",       icon: "code" },
      { label: "Email",    url: "mailto:mira@example.com",          icon: "envelope" },
      { label: "LinkedIn", url: "https://linkedin.com/in/example",  icon: "badge" },
      { label: "CV",       url: "./cv.pdf",                         icon: "document" }
    ]
  },

  /* ------------------------------------------------------------- СЕКЦИИ -- */
  sections: [

    {
      id: "about",
      label: "ABOUT ME",
      icon: null,                            // "./assets/icons/stat-about.png" (16x16)
      mode: "page",                          // без второго уровня
      pose: null,                            // "./assets/sprites/char-wave.png"
      bubble: "nice to meet you!",
      page: {
        hero: null,
        heroAlt: "",
        // Первый абзац выводится крупнее остальных — это вводное предложение.
        text: [
          "Frontend developer who likes small, handmade interfaces.",
          "I like things that feel like objects you can pick up: buttons that click, edges you can see, nothing that slides around for no reason.",
          "Everything here is hand-written HTML, CSS and JavaScript. No framework, no build step."
        ],
        // tone: "alt" — второй цвет чипов, "plain" — значение строкой без чипа
        tags: [
          { label: "BASED IN",  values: ["Almaty / London"], tone: "plain" },
          { label: "STACK",     values: ["HTML", "CSS", "JavaScript"] },
          { label: "ALSO",      values: ["Figma", "Aseprite", "Three.js"], tone: "alt" },
          { label: "CURRENTLY", values: ["Building small tools \u00B7 Learning Three.js"], tone: "plain" }
        ],
        links: []
      }
    },

    {
      id: "work",
      label: "WORK EXPERIENCE",
      icon: null,
      mode: "list",
      pose: null,
      bubble: "here's where I've been working.",
      intro: "SELECT A PLACE",
      items: [
        {
          id: "studio-nova",
          title: "STUDIO NOVA",
          subtitle: "2023 — now · Frontend",
          thumb: null,                       // "./assets/cards/work-studio-nova.png" (64x64)
          thumbAlt: "Pixel icon of an office building",
          detail: {
            hero: null,                      // "./assets/cards/work-studio-nova@hero.png" (192x128)
            heroAlt: "",
            text: [
              "Building and maintaining marketing sites for a design studio.",
              "Rebuilt the component library from scratch, which cut page weight by roughly 40% and finally made the team stop fighting the old grid."
            ],
            tags: [
              { label: "ROLE", values: ["Frontend"] },
              { label: "SKILLS", values: ["CSS Grid", "a11y", "Performance"] }
            ],
            links: [{ label: "SITE", url: "https://example.com", kind: "live" }]
          }
        },
        {
          id: "pixel-lab",
          title: "PIXEL LAB",
          subtitle: "2021 — 2023 · Junior dev",
          thumb: null,
          thumbAlt: "Pixel icon of a flask",
          detail: {
            hero: null,
            heroAlt: "",
            text: [
              "Small agency, lots of landing pages, very short deadlines.",
              "This is where I learned to write CSS that survives a client changing their mind three times in one afternoon."
            ],
            tags: [
              { label: "ROLE", values: ["Junior dev"] },
              { label: "SKILLS", values: ["HTML", "SCSS", "Webpack"] }
            ],
            links: []
          }
        }
      ]
    },

    {
      id: "projects",
      label: "PROJECTS",
      icon: null,
      mode: "list",
      pose: null,
      bubble: "let me show you my projects!",
      intro: "SELECT A PROJECT",
      items: [
        {
          id: "site-redesign",
          title: "SITE REDESIGN",
          subtitle: "2025 · solo",
          thumb: null,
          thumbAlt: "Pixel icon of a pink computer monitor",
          detail: {
            hero: null,
            heroAlt: "Screenshot of the redesigned landing page",
            text: [
              "A full redesign of a local bakery's website.",
              "Cut the load time in half and doubled mobile orders in the first month. No framework, no build step, just careful HTML."
            ],
            tags: [
              { label: "SKILLS", values: ["HTML", "CSS", "JS"] },
              { label: "ROLE", values: ["Design", "Build"] }
            ],
            links: [
              { label: "LIVE", url: "https://example.com", kind: "live" },
              { label: "CODE", url: "https://github.com/example/bakery", kind: "repo" }
            ]
          }
        },
        {
          id: "pixel-timer",
          title: "PIXEL TIMER",
          subtitle: "2024 · pet project",
          thumb: null,
          thumbAlt: "Pixel icon of a pink alarm clock",
          detail: {
            hero: null,
            heroAlt: "The timer interface: a pink pixel window with a countdown",
            text: [
              "A pomodoro timer that looks like a Game Boy.",
              "Sounds are generated with the Web Audio API so the whole thing is one HTML file and about 12 KB.",
              "Around 300 people use it daily, which still surprises me."
            ],
            tags: [
              { label: "SKILLS", values: ["Vanilla JS", "Web Audio", "Canvas"] }
            ],
            links: [{ label: "TRY IT", url: "https://example.com/timer", kind: "live" }]
          }
        },
        {
          id: "sprite-sheeter",
          title: "SPRITE SHEETER",
          subtitle: "2023 · tool",
          thumb: null,
          thumbAlt: "Pixel icon of a grid of tiny frames",
          detail: {
            hero: null,
            heroAlt: "",
            text: [
              "Drag a folder of PNGs in, get a packed sprite sheet and the CSS to animate it out.",
              "Written because I was tired of counting frame offsets by hand."
            ],
            tags: [
              { label: "SKILLS", values: ["JS", "File API", "Canvas"] }
            ],
            links: [{ label: "CODE", url: "https://github.com/example/sheeter", kind: "repo" }]
          }
        }
      ]
    },

    {
      id: "extra",
      label: "EXTRA",
      icon: null,
      mode: "list",
      pose: null,
      bubble: "the stuff I do when nobody's watching.",
      intro: "SELECT A HOBBY",
      items: [
        {
          id: "pixel-art",
          title: "PIXEL ART",
          subtitle: "since 2019",
          thumb: null,
          thumbAlt: "Pixel icon of a paintbrush",
          detail: {
            hero: null,
            heroAlt: "",
            text: [
              "Mostly tiny food and tinier animals, drawn in Aseprite at 32x32.",
              "It is the reason this entire site has a 4px grid."
            ],
            tags: [{ label: "TOOLS", values: ["Aseprite", "Piskel"] }],
            links: []
          }
        },
        {
          id: "chiptune",
          title: "CHIPTUNE",
          subtitle: "occasionally",
          thumb: null,
          thumbAlt: "Pixel icon of a music note",
          detail: {
            hero: null,
            heroAlt: "",
            text: [
              "Four channels, no mercy.",
              "The blips on this site are distant relatives of that hobby."
            ],
            tags: [{ label: "TOOLS", values: ["FamiTracker", "LMMS"] }],
            links: []
          }
        },
        {
          id: "mech-keyboards",
          title: "KEYBOARDS",
          subtitle: "an expensive habit",
          thumb: null,
          thumbAlt: "Pixel icon of a keyboard",
          detail: {
            hero: null,
            heroAlt: "",
            text: [
              "Currently on a 65% with linear switches and a pink keycap set that matches this page a little too well."
            ],
            tags: [{ label: "CURRENT", values: ["65%", "Linear"] }],
            links: []
          }
        }
      ]
    },

    {
      id: "contacts",
      label: "CONTACTS",
      icon: null,
      mode: "page",
      pose: null,
      bubble: "say hi any time ♥",
      page: {
        hero: null,
        heroAlt: "",
        text: [
          "The fastest way to reach me is email. I answer within a day or two.",
          "Open to freelance frontend work and small collaborations."
        ],
        tags: [{ label: "STATUS", values: ["Open to work"] }],
        links: [
          { label: "EMAIL", url: "mailto:mira@example.com", kind: "mail" },
          { label: "GITHUB", url: "https://github.com/example", kind: "repo" },
          { label: "TELEGRAM", url: "https://t.me/example", kind: "social" }
        ]
      }
    }

  ]
};

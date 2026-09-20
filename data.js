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
    close: "CLOSE"
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
      base: "./assets/sprites/",
      center:    "look-center.png",
      right:     "look-right.png",
      downRight: "look-down-right.png",
      down:      "look-down.png",
      downLeft:  "look-down-left.png",
      left:      "look-left.png",
      upLeft:    "look-up-left.png",
      up:        "look-up.png",
      upRight:   "look-up-right.png",
      deadZone: 60,        // px: ближе к центру спрайта — взгляд прямо
      hysteresis: 8        // градусы запаса, чтобы не мигало на стыке секторов
    },
    plate: "MIRA",                           // плашка под рамкой
    alt: "Pixel-art character: a girl with long dark hair, glasses and a black hoodie",
    idleBubble: "hi! pick a stat to begin ♥"
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
        text: [
          "I'm a frontend developer who ended up here through pixel art.",
          "I like interfaces that feel like objects you can pick up: buttons that click, edges you can see, nothing that slides around for no reason.",
          "Currently building small tools and stubbornly hand-writing CSS."
        ],
        tags: [
          { label: "BASED IN", values: ["Almaty"] },
          { label: "STACK", values: ["HTML", "CSS", "JavaScript"] },
          { label: "ALSO", values: ["Aseprite", "Figma"] }
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

/* ============================================================================
   data.js — ЕДИНСТВЕННЫЙ ФАЙЛ, КОТОРЫЙ НУЖНО РЕДАКТИРОВАТЬ.
   Разметку и стили трогать не надо.

   Полная схема полей — в README.md.
   Быстрая шпаргалка:
     section.mode = "list"  -> сетка карточек, у каждой свой экран (уровень 2)
     section.mode = "page"  -> контент показывается сразу, без второго уровня
     любой путь к картинке можно поставить null — нарисуется плейсхолдер
     id попадает в адрес страницы:  #projects/hyperloop
   ============================================================================ */

const SITE_DATA = {

  /* ---------------------------------------------------------------- META -- */
  meta: {
    name: "HI, I'M MIRA",                    // текст в шапке окна
    shortName: "Mira",                       // для <title> вкладки
    appIcon: null,                           // "./assets/icons/app.png" (16x16)
    description: "Mira Askar — portfolio. Programming and hardware."
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
    level: 19,
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
      // Пять слотов ниже спрятаны из панели (visible: false), но не
      // удалены: записи, спрайты и голос остаются в данных, чтобы их можно
      // было вернуть позже простой сменой флага. render.js отфильтровывает
      // всё с visible === false ДО разбивки на primary/slots — они никогда
      // не попадают в DOM, а не просто скрыты стилями.
      { id: "think", label: "THINK", icon: "think",
        kind: "slot", type: "oneshot", sprites: "think", sfx: "think",
        visible: false,
        // Ниже и медленнее обычного — своя интонация
        voice: { note: 300, speed: 46 },
        line: "LET ME THINK ABOUT IT\u2026",
        feedback: "THINK \u00B7 WORKING ON IT",
        overlays: ["dots", "bulb"] },
      { id: "energy", label: "ENERGY", icon: "can",
        kind: "slot", type: "oneshot", sprites: "drinkEnergydrink", sfx: "can",
        visible: false,
        line: "ONE MORE AND I CAN SHIP THIS",
        feedback: "ENERGY \u00B7 +10 ENERGY",
        overlays: ["energy"] },
      { id: "debug", label: "DEBUG", icon: "bug",
        kind: "slot", type: "oneshot", sprites: "debug", sfx: "bug",
        visible: false,
        line: "FOUND YOU, LITTLE BUG",
        feedback: "DEBUG \u00B7 ONE LESS BUG",
        overlays: ["bug"] },
      { id: "photo", label: "TAKE PHOTO", icon: "camera",
        kind: "slot", type: "oneshot", sprites: "takePhoto", sfx: "shutter",
        visible: false,
        line: "SAY CHEESE!",
        feedback: "TAKE PHOTO \u00B7 SMILE",
        overlays: ["flash"] },
      { id: "sayhi", label: "SAY HI", icon: "wave",
        kind: "slot", type: "oneshot", sprites: "sayHi", sfx: "wave",
        visible: false,
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
        feedback: "MUTE \u00B7 SOUND OFF", feedbackOff: "MUTE \u00B7 SOUND ON" },
      // href \u2014 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0439 PDF (\u0441\u043C. cv.pdf \u0432 \u043A\u043E\u0440\u043D\u0435 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u044F), \u043D\u0435 \u0437\u0430\u0433\u043B\u0443\u0448\u043A\u0430.
      // newTab: \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0432 \u043D\u043E\u0432\u043E\u0439 \u0432\u043A\u043B\u0430\u0434\u043A\u0435, \u043A\u0430\u043A \u0432\u043D\u0435\u0448\u043D\u044E\u044E \u0441\u0441\u044B\u043B\u043A\u0443, \u0445\u043E\u0442\u044F \u043F\u0443\u0442\u044C
      // \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u2014 \u0438\u043D\u0430\u0447\u0435 \u043A\u043B\u0438\u043A \u0443\u0432\u0451\u043B \u0431\u044B \u0441 SPA \u043D\u0430 \u0441\u0442\u0430\u0442\u0438\u0447\u043D\u044B\u0439 PDF \u0432 \u044D\u0442\u043E\u0439 \u0436\u0435 \u0432\u043A\u043B\u0430\u0434\u043A\u0435.
      { id: "cv", label: "DOWNLOAD CV", icon: "document",
        kind: "slot", type: "link", href: "./cv.pdf", newTab: true,
        line: "HERE'S MY CV!",
        feedback: "DOWNLOAD CV \u00B7 OPENED AS PDF" }
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
    copyright: "Designed and Built by Mira Askar 2026",
    // GitHub icon removed on purpose (separate from Contacts, see #6 of the
    // brief) \u2014 this row is the "bottom-right GitHub block/widget" it refers to.
    links: [
      { label: "Email",    url: "mailto:askamirra@gmail.com",                          icon: "envelope" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/mira-askar-59764b365",     icon: "badge" },
      { label: "CV",       url: "./cv.pdf",                                            icon: "document" }
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
        // Единственный абзац — вводное предложение, поэтому он же крупный.
        // Теги/чипы убраны из данных, а не просто скрыты CSS — так в
        // render.js не остаётся пустой обёртки под них.
        text: [
          "Hi, I'm Mira. Programming and hardware have always been at the heart of my interests. I enjoy gaming, drawing, volleyball and playing the piano. I love creating things."
        ],
        tags: [],
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
          id: "healware",
          title: "HEALWARE",
          subtitle: "Aug – Sep 2026 · Java Backend Developer",
          thumb: "./assets/cards/work-healware.png",
          thumbAlt: "Healware logo",
          detail: {
            hero: "./assets/cards/work-healware.png",
            heroAlt: "Healware logo",
            text: [
              "Developed Java/Spring RESTful API workflows and endpoint contracts to ingest medication selections and patient allergy histories from hospital systems via structured JSON payloads.",
              "Designed response DTOs and API schemas to return allergy-risk assessments, contributing factors and safer medication alternatives to downstream clinical systems.",
              "Defined input-validation rules, exception-handling flows, HTTP status codes and structured error responses to support reliable exchange of sensitive clinical data."
            ],
            tags: [
              { label: "ROLE", values: ["Java Backend Developer"] },
              { label: "LOCATION", values: ["London, United Kingdom (Remote)"], tone: "plain" }
            ],
            links: []
          }
        },
        {
          id: "trans-asia-construction",
          title: "TRANS ASIA CONSTRUCTION LLP",
          subtitle: "Jul – Aug 2026 · Java Backend Developer",
          thumb: "./assets/cards/work-trans-asia-construction.png",
          thumbAlt: "Trans Asia Construction LLP logo",
          detail: {
            hero: "./assets/cards/work-trans-asia-construction.png",
            heroAlt: "Trans Asia Construction LLP logo",
            text: [
              "Developed a Java/Spring employee-record backend using Hibernate ORM and PostgreSQL, containerised with Docker, to centralise staff profiles and employment data.",
              "Developed a Java/Spring backend for managing employee records, using Hibernate ORM and PostgreSQL, with Docker for containerised deployment.",
              "Implemented server-side validation, database queries and update workflows to improve data consistency and reduce manual file-based record management."
            ],
            tags: [
              { label: "ROLE", values: ["Java Backend Developer"] },
              { label: "LOCATION", values: ["Kyzylorda, Kazakhstan"], tone: "plain" }
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
          id: "hyperloop",
          title: "HYPERLOOP UNIVERSITY PROJECT",
          subtitle: "Sep 2025 – Present · Electronics Hardware Engineer",
          thumb: "./assets/cards/project-hyperloop.png",
          thumbAlt: "Hyperloop University Project",
          detail: {
            hero: "./assets/cards/project-hyperloop.png",
            heroAlt: "Hyperloop University Project",
            text: [
              "Simulated and validated circuit behaviour in LTspice before schematic capture and PCB layout, preparing the design for physical prototyping.",
              "Designed a custom battery-temperature monitoring PCB in KiCad, including the schematic and board layout.",
              "Incorporated CAN and UART interfaces for communication between the temperature-monitoring system and the Battery Management System."
            ],
            tags: [
              { label: "ROLE", values: ["Electronics Hardware Engineer"] }
            ],
            links: []
          }
        },
        {
          id: "poker-simulator",
          title: "POKER DECISION SIMULATOR",
          subtitle: "Java",
          thumb: "./assets/cards/project-poker-simulator.png",
          thumbAlt: "Poker Decision Simulator",
          detail: {
            hero: "./assets/cards/project-poker-simulator.png",
            heroAlt: "Poker Decision Simulator",
            text: [
              "Developed a Texas Hold'em simulator with complete betting rounds, hand evaluation and AI-controlled opponents.",
              "Implemented Monte Carlo simulation to estimate hand equity and support decisions under incomplete information.",
              "Built an explainable fold/call/raise engine using pot odds, expected value, object-oriented design and JUnit tests."
            ],
            tags: [
              { label: "TECHNOLOGY", values: ["Java"] }
            ],
            links: []
          }
        },
        {
          id: "delivery-robot",
          title: "DELIVERY ROBOT & NAVIGATION PLATFORM",
          subtitle: "In Progress",
          thumb: "./assets/cards/project-delivery-robot.png",
          thumbAlt: "Delivery Robot and Navigation Platform",
          detail: {
            hero: "./assets/cards/project-delivery-robot.png",
            heroAlt: "Delivery Robot and Navigation Platform",
            text: [
              "Developing an ESP32-based robot with GPS positioning, motor control, obstacle detection and wireless telemetry.",
              "Building a Spring Boot REST API for robot control, route planning, delivery management and live status monitoring.",
              "Designing a PostgreSQL data model for robots, deliveries, GPS waypoints, telemetry and route history, with ESP32-backend integration."
            ],
            tags: [
              { label: "TECHNOLOGIES", values: ["Java", "Spring Boot", "PostgreSQL", "ESP32", "GPS"] },
              { label: "STATUS", values: ["In Progress"], tone: "alt" }
            ],
            links: []
          }
        },
        {
          id: "portfolio-website",
          title: "INTERACTIVE PIXEL-ART PORTFOLIO WEBSITE",
          subtitle: "Frontend Development",
          thumb: null,
          thumbAlt: "Interactive Pixel-Art Portfolio Website",
          detail: {
            hero: null,
            heroAlt: "",
            text: [
              "Designed and developed a responsive pixel-art portfolio with a retro desktop UI, custom sprite animations and cross-browser compatibility for Safari and Firefox."
            ],
            tags: [
              { label: "CATEGORY", values: ["Frontend Development"], tone: "plain" }
            ],
            links: []
          }
        }
      ]
    },

    {
      id: "extra",
      label: "EXTRA",                          // кнопка навигации — не менять
      heading: "ACHIEVEMENTS",                  // а вот видимый заголовок — новый
      icon: null,
      mode: "cards",                            // см. render.cards(): все карточки
                                                 // сразу, без перехода на деталь
      pose: null,
      bubble: "Here is what else I have",
      items: [
        {
          id: "bpho",
          title: "British Physics Olympiad (BPhO) — Gold",
          description: "Achieved a Gold award in the British Physics Olympiad, demonstrating strong analytical reasoning, mathematical problem-solving and the ability to apply physics concepts to challenging unfamiliar problems."
        },
        {
          id: "gold-crest",
          title: "Gold CREST Award — QinetiQ Project",
          description: "Earned a Gold CREST Award for designing and building a prototype liquid-sensing system for potential use in military applications. The project involved research, electronic system design, prototyping, testing and evaluation."
        },
        {
          id: "warwick-scholarship",
          title: "University of Warwick Global Excellence Scholarship",
          description: "Awarded the University of Warwick Global Excellence Scholarship in recognition of academic achievement, leadership experience, personal initiative and the potential to contribute positively to the university community."
        },
        {
          id: "malvern-college",
          title: "Malvern College Honorary Scholarship",
          description: "Received an Honorary Scholarship from Malvern College in recognition of strong academic performance, intellectual curiosity and active contribution to the wider school community."
        },
        {
          id: "enactus-sponsorship",
          title: "Corporate Sponsorship — Enactus National Expo Kazakhstan",
          description: "Secured approximately £1,000 in sponsorship from KT Lab Cloud and Chevron for the Enactus National Expo Kazakhstan, demonstrating effective pitching, stakeholder communication and corporate relationship-building."
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
        // Видимый текст ссылки — сам адрес (так просили), а не общая
        // подпись вроде "EMAIL"/"LINKEDIN".
        links: [
          { label: "askamirra@gmail.com", url: "mailto:askamirra@gmail.com", kind: "mail" },
          { label: "www.linkedin.com/in/mira-askar-59764b365",
            url: "https://www.linkedin.com/in/mira-askar-59764b365", kind: "social" }
        ]
      }
    }

  ]
};

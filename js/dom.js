/* ============================================================================
   dom.js — минимальные хелперы.

   Модулей нет намеренно: сайт должен открываться двойным кликом по index.html,
   а через file:// браузер блокирует import по CORS. Поэтому — классические
   скрипты и один общий неймспейс window.MIRA.

   innerHTML не используется НИГДЕ: весь контент приходит из data.js и
   вставляется текстовыми узлами, так что вставить разметку через данные нельзя.
   ============================================================================ */
window.MIRA = window.MIRA || {};

(function (M) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  function append(node, children) {
    if (children == null) return;
    if (!Array.isArray(children)) children = [children];
    for (var i = 0; i < children.length; i++) {
      var c = children[i];
      if (c == null || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }

  function applyProps(node, opts) {
    for (var k in opts) {
      if (!Object.prototype.hasOwnProperty.call(opts, k)) continue;
      var v = opts[k];
      if (v == null || v === false) continue;
      if (k === "class") node.setAttribute("class", v);
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") { for (var d in v) node.dataset[d] = v[d]; }
      else if (k === "style") { for (var s in v) node.style.setProperty(s, v[s]); }
      else if (k.indexOf("on") === 0 && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        node.setAttribute(k, v === true ? "" : String(v));
      }
    }
  }

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    if (opts) applyProps(node, opts);
    append(node, children);
    return node;
  }

  function svg(tag, opts, children) {
    var node = document.createElementNS(SVG_NS, tag);
    if (opts) {
      for (var k in opts) {
        if (!Object.prototype.hasOwnProperty.call(opts, k)) continue;
        if (opts[k] != null) node.setAttribute(k, String(opts[k]));
      }
    }
    append(node, children);
    return node;
  }

  /* Рисует пиксель-арт из списка прямоугольников [colorKey, x, y, w, h]
     на сетке size x size. Ключи цветов резолвятся через CSS-переменные. */
  var PIXEL_COLORS = {
    i: "var(--ink)",
    f: "var(--face)",
    a: "var(--accent)",
    g: "var(--gold)",
    p: "var(--display)",
    t: "var(--tile)",
    m: "var(--mint)",
    w: "#FFFFFF"
  };

  function pixelArt(rects, size, title) {
    var kids = [];
    if (title) kids.push(svg("title", null, title));
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      kids.push(svg("rect", {
        x: r[1], y: r[2], width: r[3], height: r[4],
        fill: PIXEL_COLORS[r[0]] || PIXEL_COLORS.i
      }));
    }
    return svg("svg", {
      viewBox: "0 0 " + size + " " + size,
      "shape-rendering": "crispEdges",
      focusable: "false",
      "aria-hidden": title ? null : "true",
      role: title ? "img" : null
    }, kids);
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); }

  var rmQuery = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false, addEventListener: function () {} };

  function reducedMotion() { return rmQuery.matches; }

  M.dom = {
    el: el, svg: svg, pixelArt: pixelArt,
    qs: qs, qsa: qsa, clear: clear, on: on, append: append,
    reducedMotion: reducedMotion, rmQuery: rmQuery
  };
})(window.MIRA);

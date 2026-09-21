#!/usr/bin/env python3
"""Прогон selftest.html в WebKit, Firefox и Chromium на двух вьюпортах.

Зачем: сайт обещает работать в четырёх браузерах, а руками это не проверить.
Playwright даёт настоящие движки — в том числе WebKit, то есть Safari.

Node для этого не нужен: берём Playwright для Python в изолированное venv,
глобальный toolchain не трогается.

    python3 -m venv .venv
    .venv/bin/pip install playwright
    .venv/bin/playwright install webkit firefox chromium   # ~1 ГБ в кеш
    .venv/bin/python tools/xbrowser.py

Выход: код 1, если хоть одна проверка где-то упала.
"""
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = "file://" + os.path.join(ROOT, "selftest.html")
INDEX_PAGE = "file://" + os.path.join(ROOT, "index.html")
ENGINES = ["chromium", "firefox", "webkit"]
VIEWPORTS = [("desktop", 1600, 1100), ("laptop", 1280, 800), ("mobile", 390, 844)]


def check_hover_no_jitter(browser, width, height):
    """Настоящий :hover нельзя взвести синтетическим mousemove из
    selftest.html (псевдокласс требует реального указателя), поэтому эта
    проверка — не JS-assert из общего набора, а отдельный прогон в
    Playwright с настоящим browser.mouse.move(). Ловит именно тот баг,
    который был: .display:hover .char трясла спрайт transform'ом, пока
    курсор просто лежит внутри рамки — независимо от направления взгляда,
    которое считает gaze.js."""
    ctx = browser.new_context(viewport={"width": width, "height": height})
    page = ctx.new_page()
    page.goto(INDEX_PAGE)
    page.wait_for_timeout(400)
    box = page.eval_on_selector(
        ".display",
        "el => { const r = el.getBoundingClientRect();"
        "        return {x: r.x + r.width / 2, y: r.y + r.height / 2}; }")
    page.mouse.move(box["x"], box["y"])
    page.wait_for_timeout(100)
    lefts = []
    for _ in range(12):
        lefts.append(page.eval_on_selector(
            ".char", "el => el.getBoundingClientRect().left"))
        page.wait_for_timeout(40)
    ctx.close()
    delta = max(lefts) - min(lefts)
    return delta == 0, delta


def run_one(browser, label, width, height):
    ctx = browser.new_context(viewport={"width": width, "height": height},
                              device_scale_factor=1)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(PAGE)
    try:
        # Набор сам пишет «ИТОГ:» в #RESULTS, когда закончил
        page.wait_for_function(
            "() => { const n = document.getElementById('RESULTS');"
            "        return n && /ИТОГ:/.test(n.textContent); }",
            timeout=180000)
        text = page.eval_on_selector("#RESULTS", "n => n.textContent")
    except Exception as exc:
        node = page.query_selector("#RESULTS")
        text = ("ТАЙМАУТ: набор не досчитал\n" + str(exc)[:200] + "\n"
                + (node.text_content() or "")[-800:] if node else "")
    ctx.close()

    total = next((l for l in text.split("\n") if l.startswith("ИТОГ")), "ИТОГ не найден")
    fails = [l for l in text.split("\n") if l.startswith("FAIL")]
    return total, fails, errors


def check_markup_is_current():
    """selftest.html — это index.html плюс впрыснутый блок проверок.
    Если разметку правили только в index.html, набор тихо гоняется по
    устаревшей копии и часть проверок теряет смысл. Один раз это уже
    случилось, поэтому сверяем перед прогоном."""
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    tst = open(os.path.join(ROOT, "selftest.html"), encoding="utf-8").read()
    cut = tst.find('<pre id="RESULTS"')
    if cut < 0:
        return "в selftest.html нет блока проверок"
    head_idx = idx[:idx.rfind("</body>")].rstrip()
    head_tst = tst[:cut].rstrip()
    if head_idx != head_tst:
        return ("разметка selftest.html отстала от index.html — "
                "пересоберите набор из актуального index.html")
    return None


def main():
    stale = check_markup_is_current()
    if stale:
        print("ОСТАНОВКА:", stale)
        return 1
    bad = 0
    with sync_playwright() as pw:
        for engine in ENGINES:
            try:
                browser = getattr(pw, engine).launch()
            except Exception as exc:
                print(f"{engine}: НЕ ЗАПУСТИЛСЯ — {exc}")
                bad += 1
                continue
            for label, w, h in VIEWPORTS:
                total, fails, errors = run_one(browser, label, w, h)
                mark = "OK " if not fails and "ПРОВАЛЕНО" not in total else "FAIL"
                print(f"[{mark}] {engine:9} {label:8} {total}")
                for line in fails:
                    print("        ", line)
                    bad += 1
                for err in errors[:3]:
                    print("         JS-ОШИБКА:", err[:150])
                    bad += 1

                hover_ok, delta = check_hover_no_jitter(browser, w, h)
                hmark = "OK  " if hover_ok else "FAIL"
                print(f"[{hmark}] {engine:9} {label:8} "
                      f"hover: .char не дёргается (delta={delta}px)")
                if not hover_ok:
                    bad += 1
            browser.close()

    print()
    print("всё зелёное" if not bad else f"проблем: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

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
ENGINES = ["chromium", "firefox", "webkit"]
VIEWPORTS = [("desktop", 1600, 1100), ("mobile", 390, 844)]


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


def main():
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
            browser.close()

    print()
    print("всё зелёное" if not bad else f"проблем: {bad}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

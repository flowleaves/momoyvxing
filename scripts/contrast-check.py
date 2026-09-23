"""默默与幸 —— 文字对比度检查（WCAG 2.1 AA）。

色值从 `app/globals.css` 直接解析，不在本文件里硬编码 —— 否则改了 CSS
却忘了同步脚本，就会得到「假绿」（脚本用旧值算，报全部通过）。

叠加检查 Tailwind 固定色（red 系列）的告警与危险操作配色。

用法：python scripts/contrast-check.py
退出码 1 = 有组合跌破 4.5:1。
"""

import re
import sys
from pathlib import Path

CSS_PATH = Path(__file__).resolve().parent.parent / "app" / "globals.css"

# Tailwind 4 默认色板（不随皮肤变）
TW = {
    "red-50": "#fef2f2",
    "red-100": "#fee2e2",
    "red-600": "#dc2626",
    "red-700": "#b91c1c",
    "red-800": "#991b1b",
}

# (场景说明, 前景变量名, 背景变量名) —— 变量名不带 `--`
PAIRS = [
    ("正文 ink / 页面 bg", "ink", "bg"),
    ("正文 ink / 卡片 card", "ink", "card"),
    ("次要 ink-soft / 卡片", "ink-soft", "card"),
    ("次要 ink-soft / 页面 bg", "ink-soft", "bg"),
    ("链接 brand-deep / 卡片", "brand-deep", "card"),
    ("链接 brand-deep / 页面 bg", "brand-deep", "bg"),
    ("按钮字 ink / brand 底", "ink", "brand"),
    ("按钮字 ink / brand-soft 底", "ink", "brand-soft"),
    ("报错字 red-600 / 卡片", "red-600", "card"),
    ("报错块 red-700 / red-50", "red-700", "red-50"),
    ("危险按钮 red-800 / red-100", "red-800", "red-100"),
]


def srgb(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(hexs):
    h = hexs.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


def load_themes(css_path=CSS_PATH):
    """解析 globals.css，返回 {皮肤名: {变量名: #hex}}。"""
    css = css_path.read_text(encoding="utf-8")
    themes = {}
    block_re = re.compile(
        r"""(:root(?:\[data-theme=["']?([\w-]+)["']?\])?)\s*\{([^}]*)\}""", re.S
    )
    var_re = re.compile(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b")
    for _sel, theme, body in block_re.findall(css):
        theme = theme or "default"
        found = dict(var_re.findall(body))
        if found:
            themes.setdefault(theme, {}).update(found)
    return themes


def resolve(key, theme):
    return theme.get(key) or TW[key]


if __name__ == "__main__":
    if not CSS_PATH.exists():
        print(f"找不到 {CSS_PATH}", file=sys.stderr)
        raise SystemExit(2)

    themes = load_themes()
    print(f"色值来源：{CSS_PATH.relative_to(CSS_PATH.parent.parent)}")
    print(f"{'皮肤':<12}{'场景':<28}{'比值':>7}  {'AA 4.5':>7}")
    print("-" * 60)

    fails = []
    total = 0
    for tname, theme in themes.items():
        for label, fgk, bgk in PAIRS:
            try:
                r = ratio(resolve(fgk, theme), resolve(bgk, theme))
            except KeyError as err:
                print(f"{tname:<12}{label:<28}  缺变量 {err}", file=sys.stderr)
                raise SystemExit(2)
            total += 1
            if r < 4.5:
                fails.append((tname, label, round(r, 2)))
            print(f"{tname:<12}{label:<28}{r:>7.2f}  {'PASS' if r >= 4.5 else 'FAIL':>7}")
        print()

    print("=" * 60)
    if fails:
        print(f"{len(fails)}/{total} 项低于 4.5:1：")
        for f in fails:
            print("  -", f)
        raise SystemExit(1)
    print(f"全部 {total} 项组合 >= 4.5:1")

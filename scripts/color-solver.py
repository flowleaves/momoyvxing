"""配色求解器 —— 找出满足 WCAG AA(4.5:1) 且最接近原色的色值。

改 globals.css 的色值前先跑这个，别靠肉眼估。

两个方向：
  link  保持色相 H，**压暗**明度 L（深色文字要够深）
  brand 保持色相 H，**提亮**明度 L（浅色按钮底要够亮，才能托住深色字）

用法：python scripts/color-solver.py
"""


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


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c))) for c in rgb)


def rgb_to_hsl(rgb):
    r, g, b = [c / 255 for c in rgb]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d) % 6
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s, l


def hsl_to_rgb(h, s, l):
    h = h % 360 / 360.0

    def f(p, q, t):
        t = t % 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    if s == 0:
        r = g = b = l
    else:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r, g, b = f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)
    return [c * 255 for c in (r, g, b)]


TARGET = 4.6  # 留 0.1 余量，避免舍入后掉到 4.49


def solve(orig, fg, direction, target=TARGET):
    """求解与原色同色相、满足 ratio(fg, candidate) >= target 的最近色值。

    direction: 'darken' 压暗（求深色文字色）/ 'lighten' 提亮（求浅色底色）。
    """
    h, s, l = rgb_to_hsl(hex_to_rgb(orig))
    for s_try in [s, s * 0.95, s * 0.9, s * 0.85, s * 0.8]:
        steps = [l - i * 0.005 for i in range(1, 200)]
        if direction == "lighten":
            steps = [l + i * 0.005 for i in range(1, 120)]
        for l_try in steps:
            if not (0.0 <= l_try <= 1.0):
                continue
            hexv = rgb_to_hex(hsl_to_rgb(h, s_try, l_try))
            if ratio(fg, hexv) >= target:
                return hexv, h, s, s_try, l, l_try
    return None, h, s, s, l, l


# ---------------------------------------------------------------- 求解任务

# 1) 链接色 brand-deep：深色文字，要压暗到对页面 bg 与卡片都达标
LINK_CASES = {
    "strawberry": ("#c73e6a", "#5c3a45"),
    "matcha": ("#537b4f", "#3e4a3a"),
    "starry": ("#795fc1", "#3e3556"),
    "lemon": ("#8d6f23", "#5a4a22"),
}

# 2) 按钮底色 brand：浅色底，要提亮到能托住 ink 深色字
BRAND_CASES = {
    "strawberry": ("#f4a0b8", "#5c3a45"),
    "matcha": ("#8fbf8a", "#3e4a3a"),
    "starry": ("#a48be0", "#3e3556"),
    "lemon": ("#f2c75c", "#5a4a22"),
}

if __name__ == "__main__":
    print("=== 链接色 brand-deep（压暗，需对白底卡片 ≥ 4.6）===")
    for name, (orig, _ink) in LINK_CASES.items():
        got, h, s, s2, l, l2 = solve(orig, "#ffffff", "darken")
        print(
            f"{name:<12} {orig} (对白 {ratio(orig,'#ffffff'):.2f}) -> {got}   "
            f"对白 {ratio(got,'#ffffff'):.2f}"
        )

    print()
    print("=== 按钮底 brand（提亮，需托住 ink 深字 ≥ 4.6）===")
    for name, (orig, ink) in BRAND_CASES.items():
        got, h, s, s2, l, l2 = solve(orig, ink, "lighten")
        print(
            f"{name:<12} {orig} (ink 对比 {ratio(ink, orig):.2f}) -> {got}   "
            f"ink 对比 {ratio(ink, got):.2f}   "
            f"L {l:.2f}->{l2:.2f} S {s:.2f}->{s2:.2f}"
        )

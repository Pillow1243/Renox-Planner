#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سازنده تصویر Open Graph برای Renox Planner  →  public/og-image.png
=================================================================
تصویر ۱۲۸۰×۶۴۰ (نسبت ۲:۱ استاندارد Open Graph) با پالت و فونت خودِ برنامه.

نکات فنی مهم:
 • متن فارسی با PIL + RaQM و `direction="rtl", language="fa"` شکل‌بندی می‌شود.
 • فونت وزیرمتن از بسته‌های subset شده‌ی fontsource است؛ برای پوشش کامل فارسی+لاتین،
   سه زیرمجموعه (arabic + latin + latin-ext) در یک فونت ادغام می‌شود.
 • همه عناصر نیمه‌شفاف روی «لایه جدا» کشیده و با alpha_composite ترکیب می‌شوند؛
   کشیدن رنگ شفاف مستقیماً روی تصویر RGBA باعث جایگزینی آلفا و آرتیفکت می‌شود.
 • رابط کاربری ماکت داخل کارت، روی لایه مخصوص خودش با ماسک گوشه‌گرد کشیده می‌شود
   تا هیچ عنصری از کارت بیرون نزند (Clipping).

اجرا:  python3 scripts/generate-og.py
پیش‌نیاز:  pip install pillow brotli fonttools
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ───────────────────────────── تنظیمات و پالت ──────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
W, H = 1280, 640
S = 2  # ضریب Supersampling برای لبه‌های صاف

CREAM = (250, 247, 242)
BEIGE = (238, 230, 217)
GREEN = (87, 136, 106)
TEAL = (79, 138, 150)
CLAY = (190, 120, 87)
SAND = (173, 146, 104)
SLATE = (108, 127, 168)
INK = (46, 39, 33)
INK_SOFT = (122, 106, 92)
CARD = (255, 255, 255)
BORDER = (233, 225, 213)
TRACK = (235, 227, 216)

FONT_DIR = Path(os.environ.get("RENOX_FONT_DIR", "/tmp/fonts"))
FONT_SRC_DIR = ROOT / "node_modules/@fontsource-variable/vazirmatn/files"
SUBSETS = ("arabic", "latin", "latin-ext")
WEIGHTS = (400, 500, 600, 700, 800, 900)


def ensure_fonts() -> None:
    """ساخت فونت‌های ایستای کامل (فارسی + لاتین) با ادغام زیرمجموعه‌های وزیرمتن"""
    if all((FONT_DIR / f"Vazirmatn-Full-{w}.ttf").exists() for w in WEIGHTS):
        return
    try:
        from fontTools.merge import Merger
        from fontTools.ttLib import TTFont
        from fontTools.varLib import instancer
    except ImportError:
        sys.exit("❌ نیاز به fontTools و brotli:  pip install fonttools brotli")

    FONT_DIR.mkdir(parents=True, exist_ok=True)
    for weight in WEIGHTS:
        tmp_paths = []
        for subset in SUBSETS:
            src = FONT_SRC_DIR / f"vazirmatn-{subset}-wght-normal.woff2"
            font = TTFont(str(src))
            font.flavor = None
            instancer.instantiateVariableFont(font, {"wght": weight}, inplace=True)
            tmp = FONT_DIR / f"_part_{subset}_{weight}.ttf"
            font.save(str(tmp))
            tmp_paths.append(str(tmp))
        merged = Merger().merge(tmp_paths)
        merged.save(str(FONT_DIR / f"Vazirmatn-Full-{weight}.ttf"))
        for tmp in tmp_paths:
            os.remove(tmp)
    print("✅ فونت‌های ادغام‌شده ساخته شد (فارسی + لاتین)")


def font(weight: int, size: int) -> ImageFont.FreeTypeFont:
    """فونت با وزن مشخص؛ اندازه بر حسب پیکسل نهایی (مقیاس درون‌تابعی اعمال می‌شود)"""
    return ImageFont.truetype(str(FONT_DIR / f"Vazirmatn-Full-{weight}.ttf"), size * S)


# ─────────────────────────────── توابع کمکی ───────────────────────────────
def layer() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    """لایه شفاف تازه برای ترکیب ایمن عناصر نیمه‌شفاف"""
    lay = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
    return lay, ImageDraw.Draw(lay)


def blend(base: Image.Image, lay: Image.Image) -> None:
    base.alpha_composite(lay)


def rt(draw: ImageDraw.ImageDraw, xy, text: str, fnt: ImageFont.FreeTypeFont, fill, anchor="ra", **kw) -> None:
    """متن راست‌به‌چپ فارسی"""
    draw.text(xy, text, font=fnt, fill=fill, anchor=anchor, direction="rtl", language="fa", **kw)


def lt(draw: ImageDraw.ImageDraw, xy, text: str, fnt: ImageFont.FreeTypeFont, fill, anchor="ra", **kw) -> None:
    """متن چپ‌به‌راست (آدرس، نام لاتین)"""
    draw.text(xy, text, font=fnt, fill=fill, anchor=anchor, direction="ltr", **kw)


def width_of(text: str, fnt: ImageFont.FreeTypeFont, rtl=True) -> float:
    return font_measure(text, fnt, rtl)


_measurer = ImageDraw.Draw(Image.new("RGB", (8, 8)))


def font_measure(text: str, fnt: ImageFont.FreeTypeFont, rtl: bool = True) -> float:
    return _measurer.textlength(text, font=fnt, direction="rtl" if rtl else "ltr", language="fa" if rtl else None)


def gradient(size, c1, c2, angle="diagonal") -> Image.Image:
    grad = Image.new("RGB", (64, 64))
    px = grad.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126 if angle == "diagonal" else x / 63
            px[x, y] = tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return grad.resize(size, Image.BICUBIC)


def glow(base: Image.Image, center, radius: int, color, alpha: int) -> None:
    lay, d = layer()
    cx, cy = center
    d.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color + (alpha,))
    blend(base, lay.filter(ImageFilter.GaussianBlur(radius * 0.5)))


def soft_shadow(base: Image.Image, box, radius: int, offset=(0, 10), alpha=36, blur=24) -> None:
    """سایه نرم زیر کارت‌ها (حس shadow-soft برنامه)"""
    lay, d = layer()
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + offset[0], y0 + offset[1], x1 + offset[0], y1 + offset[1]), radius=radius, fill=(84, 68, 52, alpha))
    blend(base, lay.filter(ImageFilter.GaussianBlur(blur)))


def card_surface(base: Image.Image, box, radius: int, fill=CARD, alpha=255, outline=None) -> None:
    lay, d = layer()
    d.rounded_rectangle(box, radius=radius, fill=fill + (alpha,), outline=(outline + (255,)) if outline else None, width=S)
    blend(base, lay)


def chip(draw: ImageDraw.ImageDraw, right_top, label: str, fnt, color, pad=(20, 11)) -> int:
    """برچسب گرد با متن فارسی؛ مختصات گوشه راست‌بالا. عرض کل را برمی‌گرداند."""
    rx, ry = right_top
    tw = font_measure(label, fnt)
    asc, desc = fnt.getmetrics()
    h = asc + desc + pad[1] * 2 - 8
    w = int(tw + pad[0] * 2)
    draw.rounded_rectangle((rx - w, ry, rx, ry + h), radius=h // 2, fill=color + (34,), outline=color + (90,), width=S)
    rt(draw, (rx - pad[0], ry + pad[1] - 4), label, fnt, color)
    return w


def heatmap(draw: ImageDraw.ImageDraw, box, cols=11, rows=2, cell=17, gap=6) -> None:
    """شبکه هیتمپ با پنج سطح رنگ، راست‌به‌چپ از گوشه راست‌بالای box"""
    x1, y1 = box
    palette = [(233, 226, 215), (197, 218, 202), (150, 190, 160), (110, 160, 124), GREEN]
    levels = [0, 2, 4, 1, 3, 2, 0, 4, 3, 1, 2, 0, 3, 2, 4, 1, 0, 2, 3, 4, 1, 2]
    idx = 0
    for row in range(rows):
        for col in range(cols):
            lv = levels[idx % len(levels)]
            idx += 1
            x = x1 - cell - col * (cell + gap)
            y = y1 + row * (cell + gap)
            draw.rounded_rectangle((x, y, x + cell, y + cell), radius=5, fill=palette[lv] + (255,))


def sparkline(draw: ImageDraw.ImageDraw, x0: int, y0: int, x1: int, y1: int, color, points=(0.5, 0.85, 0.62, 1.0, 0.74)) -> None:
    """خط روند کوچک (اسپارک‌لاین) از چپ به راست"""
    n = len(points)
    step = (x1 - x0) / (n - 1)
    coords = [(x0 + i * step, y1 - (y1 - y0) * p) for i, p in enumerate(points)]
    draw.line(coords, fill=color + (255,), width=3 * S, joint="curve")
    for x, y in coords:
        draw.ellipse((x - 4 * S, y - 4 * S, x + 4 * S, y + 4 * S), fill=color + (255,))


# ═══════════════════════════════ ساخت تصویر ═══════════════════════════════
def build() -> Image.Image:
    ensure_fonts()

    base = gradient((W * S, H * S), CREAM, BEIGE).convert("RGBA")

    # هاله‌های رنگی پس‌زمینه
    glow(base, (int(W * S * 0.08), int(H * S * 0.06)), 300 * S, TEAL, 26)
    glow(base, (int(W * S * 0.96), int(H * S * 0.98)), 340 * S, CLAY, 26)
    glow(base, (int(W * S * 0.62), 0), 240 * S, GREEN, 14)

    # بافت نقطه‌ای محو
    dots, dd = layer()
    step = 36 * S
    for y in range(0, H * S, step):
        for x in range(0, W * S, step):
            dd.ellipse((x, y, x + 3 * S, y + 3 * S), fill=(122, 106, 92, 22))
    blend(base, dots)

    # ═════════════ ماکت برنامه (سمت چپ) — روی لایه مستقل و بریده‌شده ═════════════
    panel = (46 * S, 84 * S, 704 * S, 570 * S)
    panel_w, panel_h = panel[2] - panel[0], panel[3] - panel[1]
    radius = 30 * S

    soft_shadow(base, panel, radius=radius, offset=(0, 12 * S), alpha=38, blur=26 * S)

    ui, u = layer()  # لایه رابط کاربری (مختصات محلی نسبت به گوشه کارت)
    u.rounded_rectangle((0, 0, panel_w, panel_h), radius=radius, fill=(255, 255, 255, 246))

    # نوار بالای پنجره
    u.rounded_rectangle((0, 0, panel_w, 48 * S), radius=radius, fill=(251, 248, 243, 255))
    u.rectangle((0, 30 * S, panel_w, 48 * S), fill=(251, 248, 243, 255))
    for i, c in enumerate([(226, 124, 96), (232, 190, 120), (140, 186, 142)]):
        u.ellipse(((22 + i * 22) * S, 18 * S, (32 + i * 22) * S, 28 * S), fill=c + (255,))
    rt(u, (panel_w - 22 * S, 14 * S), "داشبورد Renox", font(600, 14), INK_SOFT)
    lt(u, (panel_w / 2, 14 * S), "Renox Planner", font(500, 12), (176, 164, 150), anchor="ma")

    # ── کارت آماری راست: تسک امروز + اسپارک‌لاین سبز
    c1 = (panel_w - 322 * S, 66 * S, panel_w - 20 * S, 168 * S)
    u.rounded_rectangle(c1, radius=20 * S, fill=(255, 255, 255, 255), outline=BORDER + (255,), width=S)
    rt(u, (c1[2] - 20 * S, c1[1] + 18 * S), "۱۲", font(800, 34), INK)
    rt(u, (c1[2] - 20 * S, c1[1] + 64 * S), "تسک امروز", font(500, 14), INK_SOFT)
    sparkline(u, c1[0] + 22 * S, c1[1] + 34 * S, c1[0] + 176 * S, c1[3] - 20 * S, GREEN)

    # ── کارت آماری چپ: زنجیره عادت + اسپارک‌لاین کاشی
    c2 = (20 * S, 66 * S, 20 * S + 302 * S, 168 * S)
    u.rounded_rectangle(c2, radius=20 * S, fill=(255, 255, 255, 255), outline=BORDER + (255,), width=S)
    rt(u, (c2[2] - 20 * S, c2[1] + 18 * S), "۸ روز", font(800, 34), INK)
    rt(u, (c2[2] - 20 * S, c2[1] + 64 * S), "زنجیره عادت", font(500, 14), INK_SOFT)
    sparkline(u, c2[0] + 22 * S, c2[1] + 36 * S, c2[0] + 160 * S, c2[3] - 20 * S, CLAY, points=(0.45, 0.7, 0.55, 1.0, 0.8))

    # ── کارت نمودار میله‌ای (تمرکز هفته)
    c3 = (20 * S, 178 * S, 320 * S, 402 * S)
    u.rounded_rectangle(c3, radius=20 * S, fill=(255, 255, 255, 255), outline=BORDER + (255,), width=S)
    rt(u, (c3[2] - 20 * S, c3[1] + 18 * S), "تمرکز هفته گذشته", font(600, 15), INK)
    heights = [0.42, 0.66, 0.52, 0.88, 0.6, 0.34, 0.98]
    bar_w, gap = 22 * S, 13 * S
    max_h = 150 * S
    base_y = c3[3] - 46 * S
    last_x = c3[2] - 22 * S - bar_w
    for i, hv in enumerate(heights):
        x = last_x - i * (bar_w + gap)
        hgt = max_h * hv
        color = TEAL if i == 0 else GREEN
        alpha = 255 if i == 0 else int(96 + hv * 120)
        u.rounded_rectangle((x, base_y - hgt, x + bar_w, base_y), radius=bar_w // 2, fill=color + (alpha,))
        u.text(
            (x + bar_w / 2, base_y + 10 * S),
            ["ش", "ی", "د", "س", "چ", "پ", "ج"][i],
            font=font(500, 11),
            fill=INK_SOFT,
            anchor="ma",
            direction="rtl",
            language="fa",
        )
    u.line((c3[0] + 20 * S, base_y + 1, c3[2] - 20 * S, base_y + 1), fill=TRACK + (255,), width=2 * S)

    # ── کارت عادت‌ها + هیتمپ
    c4 = (338 * S, 178 * S, panel_w - 20 * S, 402 * S)
    u.rounded_rectangle(c4, radius=20 * S, fill=(255, 255, 255, 255), outline=BORDER + (255,), width=S)
    rt(u, (c4[2] - 20 * S, c4[1] + 18 * S), "عادت‌های امروز", font(600, 15), INK)

    rows = [("ورزش صبحگاهی", 1.0, GREEN), ("مطالعه ۳۰ دقیقه", 0.7, CLAY), ("نوشیدن آب", 0.9, TEAL)]
    for idx, (label, ratio, color) in enumerate(rows):
        ry = c4[1] + (54 + idx * 46) * S
        # دایره تیک در سمت چپ سطر
        cxr, cyr, rr = c4[0] + 32 * S, ry + 9 * S, 13 * S
        u.ellipse((cxr - rr, cyr - rr, cxr + rr, cyr + rr), outline=color + (255,), width=3 * S)
        if ratio >= 1:
            u.line(
                (
                    cxr - rr * 0.45,
                    cyr + rr * 0.05,
                    cxr - rr * 0.1,
                    cyr + rr * 0.45,
                    cxr + rr * 0.5,
                    cyr - rr * 0.4,
                ),
                fill=color + (255,),
                width=3 * S,
                joint="curve",
            )
        # عنوان راست‌چین + نوار پیشرفت زیر آن
        rt(u, (c4[2] - 20 * S, ry - 4 * S), label, font(500, 14), INK)
        bar_l, bar_r = c4[0] + 56 * S, c4[2] - 20 * S
        u.rounded_rectangle((bar_l, ry + 22 * S, bar_r, ry + 32 * S), radius=5 * S, fill=TRACK + (255,))
        u.rounded_rectangle((bar_r - (bar_r - bar_l) * ratio, ry + 22 * S, bar_r, ry + 32 * S), radius=5 * S, fill=color + (255,))

    # هیتمپ تک‌ردیفه (۱۱ روز آخر) در پایین کارت عادت
    hm_cols, hm_cell, hm_gap = 11, 15 * S, 4 * S
    hm_right = c4[2] - 20 * S
    hm_y = c4[3] - 30 * S
    heatmap(u, (hm_right, hm_y), cols=hm_cols, rows=1, cell=hm_cell, gap=hm_gap)
    hm_left = hm_right - hm_cols * (hm_cell + hm_gap)
    rt(u, (hm_left - 10 * S, hm_y - 2 * S), "هیتمپ ماه", font(500, 12), INK_SOFT)

    # ── نوار بودجه ماه (پایین کارت)
    fb = (20 * S, panel_h - 100 * S, panel_w - 20 * S, panel_h - 28 * S)
    u.rounded_rectangle(fb, radius=18 * S, fill=(247, 243, 236, 255))
    rt(u, (fb[2] - 20 * S, fb[1] + 12 * S), "بودجه ماه", font(600, 14), INK)
    rt(u, (fb[2] - 20 * S, fb[1] + 38 * S), "۶۴٪ مصرف‌شده", font(500, 13), CLAY)
    bar_l, bar_r = fb[0] + 24 * S, fb[2] - 196 * S
    u.rounded_rectangle((bar_l, fb[1] + 30 * S, bar_r, fb[1] + 48 * S), radius=9 * S, fill=TRACK + (255,))
    u.rounded_rectangle((bar_r - (bar_r - bar_l) * 0.64, fb[1] + 30 * S, bar_r, fb[1] + 48 * S), radius=9 * S, fill=CLAY + (255,))

    # بریدن (clip) لایه UI به شکل گوشه‌گرد کارت تا هیچ عنصری بیرون نزند
    ui_crop = ui.crop((0, 0, panel_w, panel_h))
    mask = Image.new("L", ui_crop.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, ui_crop.size[0] - 1, ui_crop.size[1] - 1), radius=radius, fill=255)
    ui_crop.putalpha(Image.composite(ui_crop.getchannel("A"), Image.new("L", ui_crop.size, 0), mask))
    base.alpha_composite(ui_crop, (panel[0], panel[1]))

    # ═════════════ ستون متن (سمت راست) ═════════════
    txt, t = layer()
    right = (W - 64) * S

    # لوگو — کاشی گرادینتی با گوشه‌های گرد
    logo = 64 * S
    lb = (right - logo, 58 * S, right, 58 * S + logo)
    tile = gradient((logo, logo), GREEN, TEAL).convert("RGBA")
    lm = Image.new("L", (logo, logo), 0)
    ImageDraw.Draw(lm).rounded_rectangle((0, 0, logo - 1, logo - 1), radius=int(logo * 0.3), fill=255)
    tile.putalpha(lm)
    base.alpha_composite(tile, (lb[0], lb[1]))

    txt, t = layer()
    t.text(((lb[0] + lb[2]) / 2, (lb[1] + lb[3]) / 2), "R", font=font(900, 34), fill=(250, 247, 242), anchor="mm")
    lt(t, (lb[0] - 18 * S, lb[1] + 16 * S), "Renox Planner", font(800, 33), INK)

    # عنوان اصلی — عرض ستون متن بررسی و در صورت نیاز کوچک می‌شود
    head = "پلنر جامع زندگی"
    head_size = 58
    while head_size > 40 and width_of(head, font(800, head_size)) > (right - 704 * S):
        head_size -= 2
    rt(t, (right, 156 * S), head, font(800, head_size), INK)
    rt(t, (right, 232 * S), "مدیریت تسک، عادت، هدف و مالی در یک مکان", font(700, 25), GREEN)
    rt(t, (right, 274 * S), "تقویم شمسی • پومودورو • ژورنال • سلامت • گزارش PDF و Excel", font(500, 19), INK_SOFT)

    # برچسب‌های ویژگی — راست‌به‌چپ با شکستن خودکار سطر
    chips = [("تسک و کانبان", GREEN), ("عادت و زنجیره", CLAY), ("تقویم شمسی", TEAL), ("مالی و بودجه", SLATE), ("اهداف OKR", SAND), ("PWA", SLATE)]
    col_left = 716 * S            # ابتدای ستون متن (پس از ماکت)
    cx, cy = right, 316 * S
    for label, color in chips:
        need = int(font_measure(label, font(600, 16)) + 40 * S)
        if cx - need < col_left:
            cx, cy = right, cy + 52 * S
        used = chip(t, (cx, cy), label, font(600, 16), color)
        cx -= used + 9 * S

    # نشان پایین: دامنه + پایداری
    t.rounded_rectangle((right - 336 * S, 500 * S, right, 542 * S), radius=21 * S, fill=(255, 255, 255, 200), outline=BORDER + (255,), width=S)
    lt(t, (right - 22 * S, 511 * S), "pillow1243.github.io/Renox-Planner", font(500, 15), INK_SOFT)
    rt(t, (right - 356 * S, 511 * S), "فارسی • راست‌به‌چپ • آفلاین‌پذیر", font(600, 15), GREEN)

    blend(base, txt)

    return base.resize((W, H), Image.LANCZOS).convert("RGB")


def main() -> None:
    out = ROOT / "public/og-image.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image = build()
    image.save(out, "PNG", optimize=True)
    print(f"✅ og-image.png ساخته شد → {out}")
    print(f"   اندازه: {image.size[0]}×{image.size[1]} | حجم: {out.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()

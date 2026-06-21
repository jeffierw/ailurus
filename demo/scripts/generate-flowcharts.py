#!/usr/bin/env python3
"""Generate 3 Ailurus hackathon flowcharts with logo branding."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
LOGO = ROOT / "ailurus-web/public/logo.png"
OUT = ROOT / "demo/flowcharts"

# Brand palette
BG = "#0f0f0f"
PANEL = "#1a1a1a"
ORANGE = "#f97316"
ORANGE_SOFT = "#fb923c"
CREAM = "#faf9f7"
MUTED = "#a3a3a3"
RED = "#ef4444"
GREEN = "#22c55e"
BLUE = "#38bdf8"
PURPLE = "#a78bfa"
BORDER = "#333333"

W, H = 1920, 1080


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill: str,
    outline: str | None = None,
    width: int = 2,
) -> None:
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_header(img: Image.Image, draw: ImageDraw.ImageDraw, title: str, subtitle: str) -> int:
    logo = Image.open(LOGO).convert("RGBA")
    logo_h = 72
    ratio = logo_h / logo.height
    logo = logo.resize((int(logo.width * ratio), logo_h), Image.Resampling.LANCZOS)
    img.paste(logo, (60, 36), logo)

    title_font = load_font(42, bold=True)
    sub_font = load_font(24)
    draw.text((60, 130), title, fill=CREAM, font=title_font)
    draw.text((60, 182), subtitle, fill=MUTED, font=sub_font)
    draw.line((60, 230, W - 60, 230), fill=BORDER, width=2)
    return 250


def draw_box(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    h: int,
    title: str,
    body: str,
    fill: str,
    title_color: str = CREAM,
) -> tuple[int, int, int, int]:
    rounded_rect(draw, (x, y, x + w, y + h), 18, fill=PANEL, outline=fill, width=3)
    title_font = load_font(28, bold=True)
    body_font = load_font(22)
    draw.text((x + 24, y + 18), title, fill=fill if title_color == CREAM else title_color, font=title_font)
    lines = body.split("\n")
    ty = y + 58
    for line in lines:
        draw.text((x + 24, ty), line, fill=CREAM, font=body_font)
        ty += 30
    return (x + w // 2, y + h, x + w // 2, y + h)


def arrow_down(draw: ImageDraw.ImageDraw, x: int, y1: int, y2: int, color: str = ORANGE) -> None:
    draw.line((x, y1, x, y2 - 12), fill=color, width=4)
    draw.polygon([(x, y2), (x - 10, y2 - 18), (x + 10, y2 - 18)], fill=color)


def arrow_right(draw: ImageDraw.ImageDraw, x1: int, y: int, x2: int, color: str = ORANGE) -> None:
    draw.line((x1, y, x2 - 12, y), fill=color, width=4)
    draw.polygon([(x2, y), (x2 - 18, y - 10), (x2 - 18, y + 10)], fill=color)


def badge(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, fill: str) -> None:
    font = load_font(20, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    rounded_rect(draw, (x, y, x + tw + 28, y + th + 16), 12, fill=fill)
    draw.text((x + 14, y + 8), text, fill=BG, font=font)


def chart1_problem() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    top = draw_header(
        img,
        draw,
        "1 · The Problem — Why Creators Need Ailurus",
        "Centralized platforms vs Web3 friction · Testnet pain points today",
    )

    # Left column: Creators
    badge(draw, 80, top + 10, "CREATORS", RED)
    draw_box(
        draw,
        80,
        top + 50,
        520,
        150,
        "20%+ platform cuts",
        "OnlyFans / Patreon take large fees.\nCreators lose payout control.",
        RED,
    )
    arrow_down(draw, 340, top + 200, top + 230, RED)
    draw_box(
        draw,
        80,
        top + 230,
        520,
        150,
        "Platform owns your files",
        "Centralized storage.\nAccount ban = content gone overnight.",
        RED,
    )
    arrow_down(draw, 340, top + 380, top + 410, RED)
    draw_box(
        draw,
        80,
        top + 410,
        520,
        150,
        "Cross-border payout pain",
        "Fiat rails are slow and limited.\nGlobal fans are hard to monetize.",
        RED,
    )

    # Center: Web3 barrier
    badge(draw, 700, top + 10, "FANS TODAY", ORANGE_SOFT)
    draw_box(
        draw,
        660,
        top + 50,
        600,
        180,
        "Web3 is not mainstream-ready",
        "Seed phrases · gas popups · multiple tokens\nFans bounce before subscribing",
        ORANGE,
    )
    arrow_down(draw, 960, top + 230, top + 280, ORANGE)
    rounded_rect(draw, (700, top + 280, 1220, top + 360), 20, fill="#2a1810", outline=ORANGE, width=3)
    draw.text(
        (740, top + 305),
        "Result: creators need ownership + fans need Web2 UX",
        fill=ORANGE_SOFT,
        font=load_font(26, bold=True),
    )

    # Right: fan pain
    badge(draw, 1320, top + 10, "FANS", BLUE)
    draw_box(
        draw,
        1320,
        top + 50,
        520,
        150,
        "Wallet setup friction",
        "Install wallet · buy gas · sign every tx\nNot Instagram-simple",
        BLUE,
    )
    arrow_down(draw, 1580, top + 200, top + 230, BLUE)
    draw_box(
        draw,
        1320,
        top + 230,
        520,
        150,
        "No trust in paywalls",
        "Opaque platform rules.\nNo on-chain proof of subscription.",
        BLUE,
    )
    arrow_down(draw, 1580, top + 380, top + 410, BLUE)
    draw_box(
        draw,
        1320,
        top + 410,
        520,
        150,
        "Global payment gaps",
        "Cards fail across borders.\nUSDC on Sui is the fix.",
        BLUE,
    )

    # Bottom summary
    rounded_rect(draw, (80, H - 170, W - 80, H - 60), 24, fill="#172554", outline=BLUE, width=3)
    draw.text(
        (120, H - 145),
        "Ailurus Testnet MVP targets: Google login · USDC subscriptions · Walrus storage · Seal paywalls · zero gas",
        fill=CREAM,
        font=load_font(28, bold=True),
    )
    draw.text(
        (120, H - 100),
        "Same proven subscription model as Patreon — different foundation: on-chain settlement + decentralized media",
        fill=MUTED,
        font=load_font(22),
    )

    img.save(OUT / "1-problem.png", optimize=True)


def chart2_solution() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    top = draw_header(
        img,
        draw,
        "2 · The Solution — Ailurus End-to-End Flow (Sui Testnet)",
        "Web2 experience on top · full Sui stack underneath · live at ailurus.wal.app",
    )

    y = top + 20
    col_w = 360
    gap = 28
    xs = [80, 80 + col_w + gap, 80 + 2 * (col_w + gap), 80 + 3 * (col_w + gap)]

    steps = [
        ("① Fan / Creator", "Google login\n(Enoki zkLogin)", GREEN, "No wallet · no seed phrase"),
        ("② Fund", "USDC balance\n(testnet faucet)", ORANGE, "Fans see dollars only"),
        ("③ Creator uploads", "Seal encrypt → Walrus\n(Cetus USDC→WAL)", PURPLE, "Blob stored on Walrus"),
        ("④ Set price", "Move contract\nregister creator + price", BLUE, "On-chain profile"),
    ]
    for i, (title, body, color, note) in enumerate(steps):
        draw_box(draw, xs[i], y, col_w, 170, title, body, color)
        draw.text((xs[i] + 24, y + 145), note, fill=MUTED, font=load_font(18))
        if i < len(steps) - 1:
            arrow_right(draw, xs[i] + col_w, y + 85, xs[i + 1], color)

    y2 = y + 220
    arrow_down(draw, W // 2, y + 170, y2, ORANGE)

    steps2 = [
        ("⑤ Fan browses Feed", "Explore creators\non Move registry", GREEN),
        ("⑥ Subscribe", "Pay USDC/month\nMove records subscription", ORANGE),
        ("⑦ Seal unlocks", "Decrypt media\nfor active subscribers", PURPLE),
        ("⑧ Creator earns", "USDC to creator address\nEnoki sponsors all gas", BLUE),
    ]
    xs2 = xs
    for i, (title, body, color) in enumerate(steps2):
        draw_box(draw, xs2[i], y2, col_w, 150, title, body, color)
        if i < len(steps2) - 1:
            arrow_right(draw, xs2[i] + col_w, y2 + 75, xs2[i + 1], color)

    # Stack layer
    y3 = y2 + 190
    rounded_rect(draw, (80, y3, W - 80, y3 + 200), 24, fill=PANEL, outline=BORDER, width=2)
    draw.text((120, y3 + 20), "Under the hood — Sui Testnet stack", fill=ORANGE_SOFT, font=load_font(30, bold=True))

    layers = [
        ("React UI", "Feed · Upload · Subscribe"),
        ("Enoki + Worker", "zkLogin · sponsored gas"),
        ("Move platform.move", "Profile · Post · Subscription"),
        ("Walrus + Seal", "Encrypted blobs · paywall policy"),
    ]
    lx = 120
    for name, desc in layers:
        rounded_rect(draw, (lx, y3 + 70, lx + 400, y3 + 150), 16, fill="#262626", outline=ORANGE, width=2)
        draw.text((lx + 20, y3 + 82), name, fill=ORANGE_SOFT, font=load_font(22, bold=True))
        draw.text((lx + 20, y3 + 112), desc, fill=CREAM, font=load_font(20))
        lx += 430

    # Aha moment
    rounded_rect(draw, (80, H - 120, W - 80, H - 40), 20, fill="#14532d", outline=GREEN, width=3)
    draw.text(
        (120, H - 95),
        "Aha moment: Google login → pay USDC → instantly unlock encrypted photo album on Walrus",
        fill=CREAM,
        font=load_font(26, bold=True),
    )

    img.save(OUT / "2-solution-flow.png", optimize=True)


def chart3_mainnet() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    top = draw_header(
        img,
        draw,
        "3 · Summary & Mainnet Roadmap",
        "Testnet MVP proven today → production mainnet path July 2026",
    )

    # Left: what we proved
    badge(draw, 80, top + 10, "TESTNET TODAY ✓", GREEN)
    items_left = [
        "Live Walrus Site: ailurus.wal.app",
        "Move contracts on Sui Testnet",
        "Enoki Google login + sponsored gas",
        "USDC subscribe / unlock loop works",
        "Walrus upload + Seal decrypt pipeline",
    ]
    ly = top + 55
    for item in items_left:
        rounded_rect(draw, (80, ly, 860, ly + 56), 14, fill=PANEL, outline=GREEN, width=2)
        draw.text((110, ly + 14), "✓  " + item, fill=CREAM, font=load_font(24))
        ly += 68

    # Right: mainnet path
    badge(draw, 980, top + 10, "MAINNET JULY 2026 →", ORANGE)
    phases = [
        ("Phase 2 · Deploy", "Publish Move package on Sui Mainnet\nConfigure Enoki production keys\nSwitch USDC / Walrus / Seal endpoints"),
        ("Phase 2 · Onboard", "Creator compliance prompts\nMainnet USDC settlement\nWalrus mainnet blob storage"),
        ("Phase 3 · Scale", "Apple / Twitch OAuth\nCreator analytics dashboard\nRecommendation feed + Enoki Connect"),
    ]
    py = top + 55
    for title, body in phases:
        draw_box(draw, 980, py, 860, 130, title, body, ORANGE)
        py += 150

    # Timeline
    ty = top + 430
    draw.text((80, ty), "Migration path (same product, stronger rails)", fill=CREAM, font=load_font(30, bold=True))
    timeline_y = ty + 60
    draw.line((120, timeline_y + 40, W - 120, timeline_y + 40), fill=BORDER, width=6)

    milestones = [
        (180, "Hackathon MVP", "Testnet · Walrus Track", GREEN),
        (640, "Mainnet deploy", "Move + Enoki prod", ORANGE),
        (1100, "Creator growth", "Multi-OAuth · analytics", BLUE),
        (1560, "Global scale", "Portable on-chain home", PURPLE),
    ]
    for x, title, sub, color in milestones:
        draw.ellipse((x - 14, timeline_y + 26, x + 14, timeline_y + 54), fill=color, outline=CREAM, width=2)
        draw.text((x - 80, timeline_y + 70), title, fill=color, font=load_font(22, bold=True))
        draw.text((x - 90, timeline_y + 100), sub, fill=MUTED, font=load_font(18))

    # Value summary boxes
    sy = timeline_y + 170
    values = [
        ("For creators", "Own audience · USDC revenue · uncensorable Walrus media"),
        ("For fans", "Google login · one-click subscribe · zero gas"),
        ("For Sui ecosystem", "Walrus Track showcase: identity + storage + privacy + settlement"),
    ]
    vx = 80
    for title, body in values:
        draw_box(draw, vx, sy, 560, 120, title, body, ORANGE_SOFT)
        vx += 590

    rounded_rect(draw, (80, H - 110, W - 80, H - 40), 20, fill="#431407", outline=ORANGE, width=3)
    draw.text(
        (120, H - 85),
        "Ailurus = Web2-grade creator subscriptions on the full Sui stack · Repo public · Demo live · Mainnet next",
        fill=CREAM,
        font=load_font(26, bold=True),
    )

    img.save(OUT / "3-summary-mainnet.png", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    chart1_problem()
    chart2_solution()
    chart3_mainnet()
    print(f"Saved 3 flowcharts to {OUT}")


if __name__ == "__main__":
    main()

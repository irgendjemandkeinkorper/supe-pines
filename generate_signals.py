#!/usr/bin/env python3
import json
import os
import math
import hashlib
from pathlib import Path
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parent
MANIFEST_PATH = REPO / "manifest.json"

# Noir Palettes
COLOR_INK_BG = (13, 20, 32, 255)       # #0d1420
COLOR_INK_BLACK = (5, 7, 10, 255)      # #05070a
COLOR_INK_CYAN = (127, 217, 230, 255)  # #7fd9e6
COLOR_INK_CREAM = (241, 236, 223, 255) # #f1ecdf
COLOR_INK_RED = (200, 40, 63, 255)     # #c8283f

EXPRESSIONIST_PALETTES = [
    # 1. Gold/Amber (Fury)
    ((242, 169, 31, 255), (212, 67, 43, 255)),
    # 2. Deep Violet/Blue (Guilt)
    ((90, 75, 176, 255), (26, 36, 56, 255)),
    # 3. Teal/Cyan (Dread)
    ((31, 122, 130, 255), (127, 217, 230, 255)),
    # 4. Crimson/Plum (Consequence)
    ((200, 40, 63, 255), (61, 58, 48, 255)),
]

def get_palette_for_id(signal_id):
    h = hashlib.md5(signal_id.encode('utf-8')).hexdigest()
    idx = int(h, 16) % len(EXPRESSIONIST_PALETTES)
    return EXPRESSIONIST_PALETTES[idx]

def draw_halftone_dots(draw, width, height, color):
    spacing = 16
    for x in range(0, width, spacing):
        for y in range(0, height, spacing):
            # slightly offset alternate rows for hexagonal layout
            offset = (spacing // 2) if (y // spacing) % 2 == 1 else 0
            cx = x + offset
            cy = y
            draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=color)

def draw_gradient_bg(image, color1, color2):
    draw = ImageDraw.Draw(image)
    w, h = image.size
    for y in range(h):
        ratio = y / h
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

def draw_glow_circle(image, cx, cy, radius, color, layers=5):
    # Create overlay for glow to ensure correct alpha composition
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    r, g, b, a = color
    for i in range(layers, 0, -1):
        layer_r = int(radius * (i / layers))
        alpha = int(a * (1 - (i / layers)) * 0.3)
        draw.ellipse([cx - layer_r, cy - layer_r, cx + layer_r, cy + layer_r], fill=(r, g, b, alpha))
    return Image.alpha_composite(image, overlay)

# Helper drawing functions for specific shapes
def draw_phone(draw, cx, cy, w, h, border_color, fill_color):
    draw.rounded_rectangle([cx - w//2, cy - h//2, cx + w//2, cy + h//2], radius=12, fill=fill_color, outline=border_color, width=4)
    # screen
    draw.rounded_rectangle([cx - w//2 + 6, cy - h//2 + 12, cx + w//2 - 6, cy + h//2 - 12], radius=6, fill=(0,0,0,100), outline=border_color, width=2)
    # home button/notch
    draw.ellipse([cx - 4, cy + h//2 - 8, cx + 4, cy + h//2 - 4], fill=border_color)

def draw_key(draw, cx, cy, color):
    # Head
    draw.ellipse([cx - 24, cy - 40, cx + 24, cy - 8], outline=color, width=4)
    draw.ellipse([cx - 8, cy - 30, cx + 8, cy - 14], outline=color, width=3)
    # Shaft
    draw.line([(cx, cy - 8), (cx, cy + 48)], fill=color, width=6)
    # Teeth
    draw.line([(cx, cy + 16), (cx + 16, cy + 16)], fill=color, width=4)
    draw.line([(cx, cy + 28), (cx + 12, cy + 28)], fill=color, width=4)
    draw.line([(cx, cy + 40), (cx + 20, cy + 40)], fill=color, width=4)

def draw_cat(draw, cx, cy, color):
    # Head
    draw.ellipse([cx - 20, cy - 10, cx + 20, cy + 26], fill=color)
    # Body
    draw.ellipse([cx - 28, cy + 16, cx + 28, cy + 86], fill=color)
    # Tail
    draw.arc([cx + 10, cy + 60, cx + 50, cy + 100], start=0, end=180, fill=color, width=4)
    # Left Chipped Ear
    draw.polygon([(cx - 18, cy + 2), (cx - 26, cy - 18), (cx - 8, cy - 4)], fill=color)
    # Right Ear
    draw.polygon([(cx + 6, cy - 4), (cx + 18, cy - 18), (cx + 16, cy + 2)], fill=color)

def draw_siren(draw, cx, cy, color1, color2):
    # Sirens/Lightbeams
    # Base
    draw.rectangle([cx - 30, cy + 10, cx + 30, cy + 30], fill=color1, outline=color2, width=3)
    # Dome
    draw.chord([cx - 24, cy - 14, cx + 24, cy + 10], start=180, end=360, fill=color2, outline=color1, width=3)

def draw_umbrella(draw, cx, cy, color):
    # Handle
    draw.line([(cx, cy - 30), (cx, cy + 40)], fill=color, width=4)
    draw.arc([cx - 12, cy + 34, cx, cy + 46], start=0, end=180, fill=color, width=4)
    # Bowl (Inside out)
    draw.chord([cx - 50, cy - 50, cx + 50, cy + 10], start=180, end=360, fill=None, outline=color, width=4)
    # Rib points
    draw.line([(cx - 50, cy - 20), (cx, cy - 30)], fill=color, width=2)
    draw.line([(cx + 50, cy - 20), (cx, cy - 30)], fill=color, width=2)

def draw_manhole(draw, cx, cy, color, accent):
    draw.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], outline=color, width=5)
    # Inner lines
    draw.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=color, width=2)
    for angle in range(0, 360, 45):
        rad = math.radians(angle)
        draw.line([(cx + 10 * math.cos(rad), cy + 10 * math.sin(rad)),
                   (cx + 40 * math.cos(rad), cy + 40 * math.sin(rad))], fill=color, width=2)

def draw_stopwatch(draw, cx, cy, color, hand_color):
    draw.ellipse([cx - 44, cy - 34, cx + 44, cy + 54], outline=color, width=5)
    # Button
    draw.rectangle([cx - 8, cy - 48, cx + 8, cy - 34], fill=color)
    # Ring
    draw.arc([cx - 16, cy - 58, cx + 16, cy - 34], start=0, end=360, fill=color, width=3)
    # Dial markings
    for angle in range(0, 360, 30):
        rad = math.radians(angle)
        draw.line([(cx + 32 * math.cos(rad), cy + 10 + 32 * math.sin(rad)),
                   (cx + 38 * math.cos(rad), cy + 10 + 38 * math.sin(rad))], fill=color, width=2)
    # Hand
    draw.line([(cx, cy + 10), (cx + 26 * math.cos(math.radians(-60)), cy + 10 + 26 * math.sin(math.radians(-60)))], fill=hand_color, width=3)

def draw_traffic_camera(draw, cx, cy, color):
    # Pole
    draw.line([(cx - 30, cy + 50), (cx, cy), (cx + 40, cy - 30)], fill=color, width=6)
    # Box tilted
    draw.rectangle([cx + 20, cy - 44, cx + 56, cy - 16], fill=None, outline=color, width=4)
    # Lens
    draw.ellipse([cx + 44, cy - 36, cx + 52, cy - 24], fill=color)

def generate_image(signal_id, style, save_path):
    # Set up image
    width, height = 512, 512
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    if style == "ink":
        # Ink style background
        draw = ImageDraw.Draw(image)
        draw.rectangle([(0,0), (width, height)], fill=COLOR_INK_BG)
        draw_halftone_dots(draw, width, height, (127, 217, 230, 24)) # very faint halftone cyan

        # Draw central object based on signal ID
        image = draw_signal_content(image, signal_id, style, width, height)

        # Add rough black vignette/border
        draw = ImageDraw.Draw(image)
        draw_rough_border(draw, width, height, COLOR_INK_BLACK)

    else:
        # Expressionist style background
        c1, c2 = get_palette_for_id(signal_id)
        draw_gradient_bg(image, c1, c2)

        # Draw abstract background blobs
        for i in range(3):
            size = 120 + i * 40
            cx = width // 2 + (i - 1) * 50
            cy = height // 2 + (i - 1) * 30
            # overlay semi-transparent shape
            overlay = Image.new("RGBA", (width, height), (0,0,0,0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.ellipse([cx - size, cy - size, cx + size, cy + size], fill=(255, 255, 255, 12))
            image = Image.alpha_composite(image, overlay)

        # Draw content
        image = draw_signal_content(image, signal_id, style, width, height)

    # Convert image to RGB mode to guarantee 100% opacity (no transparency leaks)
    image = image.convert("RGB")

    # Save Image
    save_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(save_path, "PNG")

def draw_rough_border(draw, width, height, color):
    # Draws simple rough border lines inside the canvas edges
    border = 6
    draw.rectangle([(border, border), (width - border, height - border)], outline=color, width=4)

def draw_signal_content(image, signal_id, style, w, h):
    cx, cy = w // 2, h // 2

    # Colors depending on style
    if style == "ink":
        primary = COLOR_INK_CREAM
        secondary = COLOR_INK_CYAN
        accent = COLOR_INK_RED
    else:
        primary = (255, 255, 255, 220)
        secondary = (242, 169, 31, 220)
        accent = (200, 40, 63, 220)

    # We will create a fresh draw object for non-composited drawing
    draw = ImageDraw.Draw(image)

    if signal_id == "a-dead-scanner-channel":
        # Scanner outline
        draw.rounded_rectangle([cx - 40, cy - 80, cx + 40, cy + 80], radius=8, outline=primary, width=4)
        # Antenna
        draw.line([(cx - 24, cy - 80), (cx - 24, cy - 120)], fill=primary, width=4)
        # Screen with wave
        draw.rectangle([cx - 28, cy - 60, cx + 28, cy], fill=None, outline=primary, width=2)
        # Zigzag wave flat in middle
        draw.line([(cx - 24, cy - 30), (cx - 16, cy - 45), (cx - 10, cy - 30), (cx + 10, cy - 30), (cx + 16, cy - 15), (cx + 24, cy - 30)], fill=secondary, width=3)
        # Red warning light
        image = draw_glow_circle(image, cx + 20, cy + 50, 24, accent, layers=4)
        draw = ImageDraw.Draw(image)
        draw.ellipse([cx + 16, cy + 46, cx + 24, cy + 54], fill=accent)

    elif signal_id == "a-torn-flyer":
        # Pole lines
        draw.line([(cx - 80, 0), (cx - 80, h)], fill=primary, width=12)
        # Torn paper polygon
        pts = [(cx - 60, cy - 90), (cx + 40, cy - 90), (cx + 5, cy - 40), (cx + 30, cy + 10), (cx - 10, cy + 50), (cx + 25, cy + 100), (cx - 60, cy + 100)]
        draw.polygon(pts, fill=None if style=='ink' else (255,255,255,40), outline=primary, width=4)
        # face scribble lines on flyer
        draw.arc([cx - 45, cy - 60, cx - 15, cy - 30], start=0, end=180, fill=secondary, width=3)
        draw.line([(cx - 50, cy + 20), (cx - 20, cy + 20)], fill=secondary, width=3)
        draw.line([(cx - 50, cy + 40), (cx - 10, cy + 40)], fill=secondary, width=3)

    elif signal_id == "a-phone-at-one-percent":
        draw_phone(draw, cx, cy, 100, 180, primary, (0,0,0,100))
        # 1% Battery icon inside phone screen
        bx, by = cx - 20, cy - 40
        draw.rectangle([bx, by, bx + 40, by + 20], outline=secondary, width=2)
        draw.rectangle([bx + 40, by + 5, bx + 43, by + 15], fill=secondary)
        draw.rectangle([bx + 2, by + 2, bx + 8, by + 18], fill=accent) # tiny red slice
        # Rain ripples below
        for r in range(40, 120, 30):
            draw.ellipse([cx - r, cy + 100 - r//3, cx + r, cy + 100 + r//3], outline=secondary, width=2)

    elif signal_id == "the-same-stray-cat":
        # Distance red siren glow background
        image = draw_glow_circle(image, cx - 120, cy - 100, 150, accent, layers=5)
        draw = ImageDraw.Draw(image)
        draw_cat(draw, cx, cy, primary)
        # Glowing eyes
        draw.ellipse([cx - 12, cy + 6, cx - 8, cy + 10], fill=secondary)
        draw.ellipse([cx + 4, cy + 6, cx + 8, cy + 10], fill=secondary)

    elif signal_id == "sirens-getting-closer":
        # Draw red and blue sweeping rays
        overlay = Image.new("RGBA", (w, h), (0,0,0,0))
        ol_draw = ImageDraw.Draw(overlay)
        # Red beam
        ol_draw.polygon([(0, 0), (cx + 50, cy - 50), (0, h)], fill=(accent[0], accent[1], accent[2], 80))
        # Blue beam
        ol_draw.polygon([(w, 0), (cx - 50, cy + 50), (w, h)], fill=(secondary[0], secondary[1], secondary[2], 80))
        image = Image.alpha_composite(image, overlay)

        # Recreate draw
        draw = ImageDraw.Draw(image)
        # Drawing siren device in center
        draw_siren(draw, cx, cy, primary, secondary)

    elif signal_id == "a-streetlight-that-wont-stay-lit":
        # broken light beams (dashed glow)
        image = draw_glow_circle(image, cx, cy - 100, 100, secondary, layers=3)
        draw = ImageDraw.Draw(image)
        # Pole
        draw.line([(cx - 50, h), (cx - 50, cy - 100), (cx, cy - 100)], fill=primary, width=8)
        # Light lamp head
        draw.ellipse([cx - 15, cy - 110, cx + 15, cy - 90], fill=primary)
        for i in range(12):
            angle = i * 30
            rad = math.radians(angle)
            if i % 3 != 0: # make some gaps
                draw.line([(cx + 25 * math.cos(rad), cy - 100 + 25 * math.sin(rad)),
                           (cx + 80 * math.cos(rad), cy - 100 + 80 * math.sin(rad))], fill=secondary, width=3)

    elif signal_id == "a-traffic-camera-facing-the-wrong-way":
        draw_traffic_camera(draw, cx, cy, primary)
        # Scratches at connection joint
        draw.line([(cx - 5, cy + 5), (cx + 15, cy - 15)], fill=secondary, width=2)
        draw.line([(cx - 15, cy), (cx, cy - 15)], fill=secondary, width=2)

    elif signal_id == "an-umbrella-inside-out":
        draw_umbrella(draw, cx, cy, primary)
        # Raindrops hitting it
        for i in range(5):
            rx = cx - 80 + i * 40
            ry = cy - 100 + (i % 2) * 30
            draw.line([(rx, ry), (rx - 5, ry + 15)], fill=secondary, width=2)

    elif signal_id == "a-key-that-fits-nothing-you-own":
        draw_key(draw, cx, cy, primary)
        # Red thread wrapping around head
        draw.arc([cx - 30, cy - 46, cx + 30, cy - 2], start=45, end=270, fill=accent, width=3)
        draw.line([(cx + 20, cy - 10), (cx + 80, cy + 40)], fill=accent, width=3)

    elif signal_id == "yesterdays-front-page":
        # Folded newspaper
        draw.polygon([(cx - 60, cy - 40), (cx + 40, cy - 60), (cx + 80, cy + 20), (cx - 20, cy + 40)], fill=None if style=='ink' else (255,255,255,30), outline=primary, width=4)
        draw.polygon([(cx - 60, cy - 40), (cx - 20, cy + 40), (cx - 45, cy + 80), (cx - 85, cy)], fill=None if style=='ink' else (255,255,255,15), outline=primary, width=3)
        # Text rows as simple lines
        draw.line([(cx - 10, cy - 20), (cx + 50, cy - 32)], fill=secondary, width=3)
        draw.line([(cx - 10, cy - 10), (cx + 55, cy - 22)], fill=secondary, width=3)
        draw.line([(cx - 10, cy), (cx + 60, cy - 12)], fill=secondary, width=3)
        # Photo box
        draw.rectangle([cx + 10, cy + 10, cx + 50, cy + 30], outline=accent, width=2)

    elif signal_id == "a-bandage-already-bled-through":
        # Wrist/arm band
        draw.rectangle([cx - 100, cy - 25, cx + 100, cy + 25], fill=None if style=='ink' else (255,255,255,30), outline=primary, width=4)
        # Gauze strip wraps
        draw.line([(cx - 30, cy - 25), (cx - 20, cy + 25)], fill=primary, width=3)
        draw.line([(cx + 30, cy - 25), (cx + 20, cy + 25)], fill=primary, width=3)
        # Blood spot blooming in center
        image = draw_glow_circle(image, cx, cy, 38, accent, layers=5)
        draw = ImageDraw.Draw(image)
        draw.ellipse([cx - 16, cy - 12, cx + 16, cy + 12], fill=accent)

    elif signal_id == "a-manhole-cover-slightly-askew":
        # Shifted crescent opening
        draw.ellipse([cx - 46, cy - 46, cx + 46, cy + 46], outline=secondary, width=3)
        draw_manhole(draw, cx, cy, primary, secondary)
        # Steam lines rising
        draw.arc([cx - 20, cy - 100, cx + 20, cy - 40], start=45, end=135, fill=secondary, width=3)
        draw.arc([cx - 40, cy - 120, cx, cy - 60], start=45, end=135, fill=secondary, width=2)
        draw.arc([cx, cy - 120, cx + 40, cy - 60], start=45, end=135, fill=secondary, width=2)

    elif signal_id == "a-stopwatch-still-running":
        draw_stopwatch(draw, cx, cy, primary, accent)

    elif signal_id == "a-costume-piece-not-yours":
        # Fire escape bar
        draw.line([(0, cy - 60), (w, cy + 60)], fill=primary, width=8)
        # Glove hanging
        draw.rectangle([cx - 24, cy - 20, cx + 24, cy + 50], fill=None if style=='ink' else (0,0,0,80), outline=secondary, width=4)
        # Fingers
        draw.line([(cx - 18, cy + 50), (cx - 18, cy + 70)], fill=secondary, width=3)
        draw.line([(cx - 6, cy + 50), (cx - 6, cy + 74)], fill=secondary, width=3)
        draw.line([(cx + 6, cy + 50), (cx + 6, cy + 70)], fill=secondary, width=3)

    elif signal_id == "the-el-running-late":
        # Rail tracks in perspective
        draw.line([(cx - 150, h), (cx - 20, cy - 60)], fill=primary, width=6)
        draw.line([(cx + 150, h), (cx + 20, cy - 60)], fill=primary, width=6)
        # Horizontals (ties)
        for i in range(6):
            ratio = i / 5
            ty = int(cy - 60 + ratio * (h - (cy - 60)))
            tw = int(40 + ratio * 260)
            draw.line([(cx - tw//2, ty), (cx + tw//2, ty)], fill=primary, width=3)
        # Glowing signal light at the side
        image = draw_glow_circle(image, cx + 60, cy - 40, 30, accent, layers=4)
        draw = ImageDraw.Draw(image)
        draw.ellipse([cx + 54, cy - 46, cx + 66, cy - 34], fill=accent)

    elif signal_id == "a-flock-of-pigeons-all-at-once":
        # Draw multiple V shapes
        pigeons = [
            (cx - 80, cy - 90, 24),
            (cx - 20, cy - 50, 32),
            (cx + 60, cy - 80, 20),
            (cx - 100, cy + 20, 18),
            (cx + 100, cy + 10, 26),
            (cx + 10, cy + 60, 28)
        ]
        for px, py, sz in pigeons:
            draw.line([(px - sz//2, py - sz//4), (px, py), (px + sz//2, py - sz//4)], fill=primary, width=3)

    elif signal_id == "a-chalk-mark-under-fresh-paint":
        # Bold chalk cross/symbol
        draw.line([(cx - 50, cy - 50), (cx + 50, cy + 50)], fill=primary, width=8)
        draw.line([(cx + 50, cy - 50), (cx - 50, cy + 50)], fill=primary, width=8)
        draw.ellipse([cx - 40, cy - 40, cx + 40, cy + 40], outline=primary, width=4)
        # Overlay semi-transparent paint strokes
        overlay = Image.new("RGBA", (w, h), (0,0,0,0))
        ol_draw = ImageDraw.Draw(overlay)
        ol_draw.rectangle([cx - 80, cy - 30, cx + 80, cy + 30], fill=(100, 110, 120, 200))
        image = Image.alpha_composite(image, overlay)

    elif signal_id == "a-bus-transfer-for-a-dead-route":
        # Rectangular transfer ticket
        draw.rectangle([cx - 40, cy - 90, cx + 40, cy + 90], fill=None if style=='ink' else (255,255,255,30), outline=primary, width=4)
        # Grid lines
        for y in range(cy - 60, cy + 80, 20):
            draw.line([(cx - 40, y), (cx + 40, y)], fill=secondary, width=2)
        # Punch holes
        draw.ellipse([cx - 20, cy - 80, cx - 10, cy - 70], fill=COLOR_INK_BG if style=='ink' else (0,0,0,255))
        draw.ellipse([cx + 10, cy + 40, cx + 20, cy + 50], fill=COLOR_INK_BG if style=='ink' else (0,0,0,255))

    elif signal_id == "police-tape-cut-clean":
        # Ribbon crossing screen with jagged cut in center
        draw.polygon([(0, cy - 40), (cx - 40, cy - 30), (cx - 40, cy + 10), (0, cy)], fill=secondary, outline=primary, width=2)
        draw.polygon([(w, cy - 20), (cx + 40, cy - 30), (cx + 40, cy + 10), (w, cy + 20)], fill=secondary, outline=primary, width=2)
        # Unreadable text stripes on tape
        draw.line([(20, cy - 22), (cx - 60, cy - 15)], fill=primary, width=4)
        draw.line([(cx + 60, cy - 15), (w - 20, cy - 5)], fill=primary, width=4)

    elif signal_id == "a-voicemail-with-no-voice":
        # Tape reel circles connected by a line at the bottom
        draw.ellipse([cx - 45, cy - 25, cx - 5, cy + 15], outline=primary, width=4)
        draw.ellipse([cx + 5, cy - 25, cx + 45, cy + 15], outline=primary, width=4)
        draw.line([(cx - 25, cy + 15), (cx + 25, cy + 15)], fill=primary, width=4)
        # Waveform below
        draw.line([(cx - 70, cy + 45), (cx - 40, cy + 45), (cx - 30, cy + 30), (cx - 10, cy + 60), (cx + 10, cy + 30), (cx + 30, cy + 60), (cx + 40, cy + 45), (cx + 70, cy + 45)], fill=secondary, width=3)

    elif signal_id == "one-wet-footprint":
        # Shoe sole print
        # Heel
        draw.ellipse([cx - 16, cy + 30, cx + 16, cy + 70], fill=primary)
        # Sole front
        draw.ellipse([cx - 22, cy - 60, cx + 22, cy + 20], fill=primary)
        # Horizontal grip grooves
        for y in range(cy - 40, cy + 10, 15):
            draw.line([(cx - 18, y), (cx + 18, y)], fill=COLOR_INK_BG if style=='ink' else (0,0,0,255), width=3)

    elif signal_id == "a-matchbook-from-a-closed-club":
        # Opened flat matchbook
        draw.rectangle([cx - 30, cy - 70, cx + 30, cy + 70], fill=None if style=='ink' else (255,255,255,20), outline=primary, width=4)
        draw.line([(cx - 30, cy + 40), (cx + 30, cy + 40)], fill=primary, width=3)
        # Row of matches inside
        for x in range(cx - 20, cx + 21, 10):
            if x != cx: # one match missing
                draw.line([(x, cy + 40), (x, cy - 10)], fill=secondary, width=3)
                draw.ellipse([x - 3, cy - 14, x + 3, cy - 8], fill=accent)

    elif signal_id == "a-prescription-bottle-wrong-name":
        # Translucent orange rectangle for bottle
        draw.rectangle([cx - 35, cy - 60, cx + 35, cy + 70], fill=None if style=='ink' else (242, 169, 31, 80), outline=primary, width=4)
        # White cap
        draw.rectangle([cx - 40, cy - 80, cx + 40, cy - 60], fill=primary)
        # White label
        draw.rectangle([cx - 25, cy - 30, cx + 25, cy + 40], fill=primary)
        # Scribbles on label
        draw.line([(cx - 15, cy - 15), (cx + 15, cy - 15)], fill=COLOR_INK_BG if style=='ink' else (0,0,0,255), width=3)
        draw.line([(cx - 15, cy), (cx + 5, cy)], fill=COLOR_INK_BG if style=='ink' else (0,0,0,255), width=3)
        draw.line([(cx - 15, cy + 15), (cx + 10, cy + 15)], fill=COLOR_INK_BG if style=='ink' else (0,0,0,255), width=3)

    elif signal_id == "an-elevator-between-floors":
        # Horizontal line splitting the elevator door
        draw.line([(0, cy), (w, cy)], fill=primary, width=4)
        # Vertical gap in center
        draw.line([(cx, 0), (cx, h)], fill=primary, width=4)
        # Red warning floor indicators (arrow or numbers)
        draw.polygon([(cx - 15, cy - 60), (cx, cy - 80), (cx + 15, cy - 60)], fill=accent)
        draw.polygon([(cx - 15, cy + 60), (cx, cy + 40), (cx + 15, cy + 60)], fill=accent)

    elif signal_id == "a-broken-zip-tie":
        # Hexagonal or rounded snapped loop
        draw.arc([cx - 60, cy - 60, cx + 60, cy + 60], start=45, end=315, fill=primary, width=6)
        # Snapped ends hanging loose
        draw.line([(cx + 42, cy + 42), (cx + 70, cy + 60)], fill=primary, width=6)
        draw.line([(cx + 42, cy - 42), (cx + 60, cy - 70)], fill=primary, width=6)

    elif signal_id == "fresh-concrete-still-warm":
        # Large concrete rectangle in center
        draw.rectangle([cx - 80, cy - 80, cx + 80, cy + 80], fill=None if style=='ink' else (255,255,255,40), outline=primary, width=4)
        # Stylized handprint outline
        # palm
        draw.ellipse([cx - 15, cy, cx + 15, cy + 30], outline=secondary, width=3)
        # fingers
        draw.line([(cx - 12, cy), (cx - 16, cy - 36)], fill=secondary, width=3)
        draw.line([(cx - 3, cy), (cx - 4, cy - 44)], fill=secondary, width=3)
        draw.line([(cx + 6, cy), (cx + 8, cy - 38)], fill=secondary, width=3)
        draw.line([(cx + 14, cy), (cx + 20, cy - 28)], fill=secondary, width=3)
        # thumb
        draw.line([(cx - 12, cy + 15), (cx - 34, cy + 5)], fill=secondary, width=3)

    elif signal_id == "a-payphone-ringing-once":
        # Classic telephone receiver dangling
        draw.ellipse([cx - 24, cy - 60, cx + 24, cy - 36], fill=primary)
        draw.ellipse([cx - 24, cy + 36, cx + 24, cy + 60], fill=primary)
        draw.arc([cx - 40, cy - 48, cx + 8, cy + 48], start=90, end=270, fill=primary, width=10)
        # Ringing shockwaves (vibration)
        draw.arc([cx - 60, cy - 70, cx - 40, cy - 30], start=120, end=240, fill=secondary, width=3)
        draw.arc([cx - 60, cy + 30, cx - 40, cy + 70], start=120, end=240, fill=secondary, width=3)
        draw.arc([cx + 20, cy - 70, cx + 40, cy - 30], start=300, end=60, fill=secondary, width=3)
        draw.arc([cx + 20, cy + 30, cx + 40, cy + 70], start=300, end=60, fill=secondary, width=3)

    elif signal_id == "a-grocery-receipt-at-3-17-am":
        # receipt paper banner curling
        draw.polygon([(cx - 35, cy - 100), (cx + 35, cy - 100), (cx + 35, cy + 100), (cx - 35, cy + 100)], fill=None if style=='ink' else (255,255,255,40), outline=primary, width=4)
        # item rows as lines
        for y in range(cy - 70, cy + 40, 16):
            draw.line([(cx - 25, y), (cx + 5, y)], fill=secondary, width=2)
            draw.line([(cx + 15, y), (cx + 25, y)], fill=secondary, width=2)
        # Red handwritten timestamp scribble
        draw.line([(cx - 20, cy + 60), (cx - 5, cy + 60)], fill=accent, width=3)
        draw.line([(cx - 15, cy + 50), (cx - 15, cy + 70)], fill=accent, width=3)
        draw.line([(cx - 5, cy + 55), (cx + 5, cy + 55)], fill=accent, width=3)

    elif signal_id == "blue-thread-on-a-fire-escape":
        # Fire escape metal structure
        draw.line([(cx - 80, cy - 80), (cx + 80, cy - 80)], fill=primary, width=4)
        draw.line([(cx - 80, cy + 40), (cx + 80, cy + 40)], fill=primary, width=4)
        draw.line([(cx - 60, cy - 80), (cx - 60, cy + 120)], fill=primary, width=4)
        draw.line([(cx + 60, cy - 80), (cx + 60, cy + 120)], fill=primary, width=4)
        # Blue thread line pulled taut diagonally
        draw.line([(cx - 60, cy - 30), (cx + 60, cy + 10)], fill=secondary, width=4)

    elif signal_id == "an-apartment-light-blinking-in-code":
        # Brick wall pattern
        for y in range(cy - 90, cy + 100, 30):
            draw.line([(cx - 100, y), (cx + 100, y)], fill=primary, width=2)
        # Window
        draw.rectangle([cx - 30, cy - 50, cx + 30, cy + 30], fill=secondary if style=='expressionist' else None, outline=secondary, width=4)
        # Window panes cross
        draw.line([(cx, cy - 50), (cx, cy + 30)], fill=secondary, width=2)
        draw.line([(cx - 30, cy - 10), (cx + 30, cy - 10)], fill=secondary, width=2)
        # glowing window background if ink
        if style == 'ink':
            image = draw_glow_circle(image, cx, cy - 10, 60, secondary, layers=4)

    elif signal_id == "two-identical-license-plates":
        # Two rectangles stacked
        draw.rectangle([cx - 60, cy - 55, cx + 60, cy - 15], fill=None if style=='ink' else (255,255,255,30), outline=primary, width=4)
        draw.rectangle([cx - 60, cy + 5, cx + 60, cy + 45], fill=None if style=='ink' else (255,255,255,30), outline=primary, width=4)
        # Characters as abstract lines inside plates
        draw.line([(cx - 40, cy - 35), (cx + 40, cy - 35)], fill=secondary, width=4)
        draw.line([(cx - 40, cy + 25), (cx + 40, cy + 25)], fill=secondary, width=4)

    elif signal_id == "a-childs-drawing-of-the-block":
        # Child's simple house drawing outline
        # House base
        draw.rectangle([cx - 40, cy - 10, cx + 40, cy + 70], fill=None if style=='ink' else (255,255,255,20), outline=primary, width=4)
        # Triangular roof
        draw.polygon([(cx - 50, cy - 10), (cx, cy - 55), (cx + 50, cy - 10)], outline=primary, width=4)
        # Door
        draw.rectangle([cx - 10, cy + 30, cx + 10, cy + 70], outline=primary, width=3)
        # Glowing window in house
        draw.rectangle([cx - 24, cy + 10, cx - 8, cy + 26], fill=secondary, outline=primary, width=2)
        # Crayon sun in corner
        draw.ellipse([cx + 50, cy - 80, cx + 80, cy - 50], outline=secondary, width=3)
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            draw.line([(cx + 65 + 18 * math.cos(rad), cy - 65 + 18 * math.sin(rad)),
                       (cx + 65 + 28 * math.cos(rad), cy - 65 + 28 * math.sin(rad))], fill=secondary, width=2)

    return image

def main():
    if not MANIFEST_PATH.exists():
        print(f"Error: manifest.json not found at {MANIFEST_PATH}")
        return 1

    with MANIFEST_PATH.open(encoding="utf-8") as f:
        records = json.load(f)

    signals = [r for r in records if r.get("category") == "signals"]
    print(f"Found {len(signals)} Signals in manifest.")

    generated_count = 0
    for s in signals:
        signal_id = s["id"]
        style = s["style"]
        save_path = REPO / s["savePath"]

        print(f"Generating: {signal_id} ({style}) -> {s['savePath']}")
        generate_image(signal_id, style, save_path)
        generated_count += 1

    print(f"Successfully generated {generated_count} signal images!")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())

#!/usr/bin/env python3
"""Programmatic generator for Supe Pines Threat card art using PIL."""

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageColor

# Colors from Design Bible & styling guide
NEAR_BLACK = (8, 12, 20, 255)      # Primary cool dark (#080c14)
DARK_TEAL = (11, 22, 32, 255)       # Alternative secondary dark (#0b1620)
DIRTY_CREAM = (238, 222, 181, 255)  # Paper background/spot color (#eedeb5)
OXBLOOD_RED = (138, 28, 20, 255)    # Danger/consequence spot color (#8a1c14)
STREETLAMP_AMBER = (242, 169, 31, 255)  # Record spot color (#f2a91f)
ELECTRIC_CYAN = (0, 168, 204, 255)  # Information spot color (#00a8cc)
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

WIDTH, HEIGHT = 1086, 1448

def make_gradient(color1, color2, vertical=True):
    base = Image.new("RGBA", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(base)
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1) if vertical else 1.0
        # Interpolate color
        r = int(color1[0] + (color2[0] - color1[0]) * t)
        g = int(color1[1] + (color2[1] - color1[1]) * t)
        b = int(color1[2] + (color2[2] - color1[2]) * t)
        a = int(color1[3] + (color2[3] - color1[3]) * t) if len(color1) > 3 else 255
        if vertical:
            draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, a))
        else:
            # Horizontal line-by-line is done by interpolating x instead
            pass
    if not vertical:
        for x in range(WIDTH):
            t = x / (WIDTH - 1)
            r = int(color1[0] + (color2[0] - color1[0]) * t)
            g = int(color1[1] + (color2[1] - color1[1]) * t)
            b = int(color1[2] + (color2[2] - color1[2]) * t)
            a = int(color1[3] + (color2[3] - color1[3]) * t) if len(color1) > 3 else 255
            draw.line([(x, 0), (x, HEIGHT)], fill=(r, g, b, a))
    return base

def draw_halftone_dots(img, color, spacing=30, dot_size=6, bbox=None):
    draw = ImageDraw.Draw(img)
    x0, y0 = 0, 0
    x1, y1 = WIDTH, HEIGHT
    if bbox:
        x0, y0, x1, y1 = bbox
    for x in range(x0 + spacing // 2, x1, spacing):
        for y in range(y0 + spacing // 2, y1, spacing):
            # Shift every other row for off-register look
            offset = (spacing // 3) if (y // spacing) % 2 == 0 else 0
            cx, cy = x + offset, y
            if x0 <= cx <= x1 and y0 <= cy <= y1:
                draw.ellipse([(cx - dot_size, cy - dot_size), (cx + dot_size, cy + dot_size)], fill=color)

def draw_radial_glow(img, cx, cy, max_r, color, steps=10, max_alpha=128):
    # Draw soft glowing concentric circles
    overlay = Image.new("RGBA", img.size, TRANSPARENT)
    draw = ImageDraw.Draw(overlay)
    for i in range(steps):
        r = max_r * (steps - i) / steps
        alpha = int(max_alpha * (i + 1) / steps)
        glow_color = (color[0], color[1], color[2], alpha)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=glow_color)
    img.alpha_composite(overlay)

def draw_sunburst(img, cx, cy, r, color, num_rays=16, width=4):
    import math
    draw = ImageDraw.Draw(img)
    for i in range(num_rays):
        angle = 2 * math.pi * i / num_rays
        dx = int(r * math.cos(angle))
        dy = int(r * math.sin(angle))
        draw.line([(cx, cy), (cx + dx, cy + dy)], fill=color, width=width)

def draw_shadow_polygon(img, points, color):
    draw = ImageDraw.Draw(img)
    draw.polygon(points, fill=color)

def draw_ink_noise(img):
    # Add a subtle ink/paper grain overlay
    import random
    grain = Image.new("RGBA", img.size, TRANSPARENT)
    gdraw = ImageDraw.Draw(grain)
    for _ in range(3000):
        x = random.randint(0, WIDTH - 1)
        y = random.randint(0, HEIGHT - 1)
        sz = random.randint(1, 2)
        alpha = random.randint(15, 40)
        color = (0, 0, 0, alpha) if random.random() > 0.4 else (238, 222, 181, alpha)
        gdraw.rectangle([x, y, x + sz, y + sz], fill=color)
    img.alpha_composite(grain)

# Generator functions for each Case and style

def gen_toll_ink():
    # Shuttered amusement pier
    img = make_gradient(DARK_TEAL, NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Brick wall patterns
    for y in range(100, HEIGHT - 200, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(30, 40, 50, 255), width=2)
        offset = 40 if (y // 80) % 2 == 0 else 0
        for x in range(offset, WIDTH, 100):
            draw.line([(x, y), (x, y + 80)], fill=(30, 40, 50, 255), width=2)

    # Hanging animal mascot heads silhouettes (bear, rabbit, fox)
    # Bear head
    draw.ellipse([(WIDTH//2 - 200, 300), (WIDTH//2 - 50, 450)], fill=NEAR_BLACK)
    draw.ellipse([(WIDTH//2 - 210, 280), (WIDTH//2 - 170, 320)], fill=NEAR_BLACK) # ear
    draw.ellipse([(WIDTH//2 - 80, 280), (WIDTH//2 - 40, 320)], fill=NEAR_BLACK) # ear
    draw.line([(WIDTH//2 - 125, 0), (WIDTH//2 - 125, 300)], fill=(60, 70, 80, 255), width=3) # rope

    # Rabbit head
    draw.ellipse([(WIDTH//2 + 50, 350), (WIDTH//2 + 200, 500)], fill=NEAR_BLACK)
    draw.polygon([(WIDTH//2 + 70, 360), (WIDTH//2 + 90, 200), (WIDTH//2 + 110, 360)], fill=NEAR_BLACK) # ear
    draw.polygon([(WIDTH//2 + 140, 360), (WIDTH//2 + 160, 200), (WIDTH//2 + 180, 360)], fill=NEAR_BLACK) # ear
    draw.line([(WIDTH//2 + 125, 0), (WIDTH//2 + 125, 350)], fill=(60, 70, 80, 255), width=3) # rope

    # Fox head
    draw.polygon([(WIDTH//2 - 80, 550), (WIDTH//2, 450), (WIDTH//2 + 80, 550), (WIDTH//2, 600)], fill=NEAR_BLACK)
    draw.polygon([(WIDTH//2 - 60, 480), (WIDTH//2 - 90, 400), (WIDTH//2 - 30, 470)], fill=NEAR_BLACK) # ear
    draw.polygon([(WIDTH//2 + 60, 480), (WIDTH//2 + 90, 400), (WIDTH//2 + 30, 470)], fill=NEAR_BLACK) # ear
    draw.line([(WIDTH//2, 0), (WIDTH//2, 450)], fill=(60, 70, 80, 255), width=3) # rope

    # Amber light beam shining diagonally
    beam = Image.new("RGBA", (WIDTH, HEIGHT), TRANSPARENT)
    bdraw = ImageDraw.Draw(beam)
    bdraw.polygon([(0, 0), (400, 0), (WIDTH, HEIGHT - 300), (WIDTH, HEIGHT)], fill=(242, 169, 31, 35))
    img.alpha_composite(beam)

    # Long dark shadow of racketeer on wall/floor
    draw.polygon([(WIDTH//2, HEIGHT), (WIDTH, HEIGHT), (WIDTH, HEIGHT - 400), (WIDTH - 150, HEIGHT - 550)], fill=(5, 8, 12, 180))

    # Stack of white envelopes with an oxblood-red wax seal
    envelope_box = [150, HEIGHT - 250, 450, HEIGHT - 150]
    draw.rectangle(envelope_box, fill=DIRTY_CREAM, outline=NEAR_BLACK, width=4)
    # Stack lines
    for offset in range(10, 50, 10):
        draw.rectangle([150 + offset, HEIGHT - 250 - offset, 450 + offset, HEIGHT - 150 - offset], fill=DIRTY_CREAM, outline=NEAR_BLACK, width=4)
    # Draw oxblood seal on the top envelope
    seal_cx, seal_cy = 150 + 190, HEIGHT - 250 - 10
    draw.ellipse([(seal_cx - 15, seal_cy - 15), (seal_cx + 15, seal_cy + 15)], fill=OXBLOOD_RED)

    # Halftone texture on shadows
    draw_halftone_dots(img, (242, 169, 31, 20), spacing=35, dot_size=3)
    draw_ink_noise(img)
    return img

def gen_toll_expressionist():
    img = make_gradient((17, 26, 43, 255), (242, 169, 31, 255))
    draw = ImageDraw.Draw(img)

    # Big overlapping carnival wheel/Ferris wheel lines (abstract gears)
    wheel_center_x, wheel_center_y = WIDTH // 2, HEIGHT // 3
    for r in range(200, 700, 150):
        draw.ellipse([(wheel_center_x - r, wheel_center_y - r), (wheel_center_x + r, wheel_center_y + r)], outline=(255, 230, 150, 40), width=6)
    draw_sunburst(img, wheel_center_x, wheel_center_y, 800, (255, 230, 150, 20), num_rays=12, width=3)

    # Giant dark geometric shadow representing the racketeer
    draw.polygon([(0, HEIGHT), (WIDTH, HEIGHT), (WIDTH - 200, HEIGHT - 600), (WIDTH//2, HEIGHT - 800), (200, HEIGHT - 500)], fill=(8, 12, 20, 220))

    # Glowing envelope pattern (stylized geometric gold rectangles)
    env_overlay = Image.new("RGBA", (WIDTH, HEIGHT), TRANSPARENT)
    edraw = ImageDraw.Draw(env_overlay)
    for i in range(5):
        cy = HEIGHT - 300 - i * 40
        cx = WIDTH // 2 + i * 20
        # Draw glowing gold box
        edraw.rectangle([cx - 100, cy - 60, cx + 100, cy + 60], fill=(255, 215, 0, 80), outline=WHITE, width=3)
        # Red center dot (consequence)
        edraw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=OXBLOOD_RED)
    img.alpha_composite(env_overlay)

    draw_radial_glow(img, WIDTH // 2, HEIGHT - 300, 250, STREETLAMP_AMBER, steps=10, max_alpha=100)
    return img

def gen_casting_ink():
    # Copycat vigilantes with camera flashes
    img = make_gradient(ELECTRIC_CYAN, NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Background halftone
    draw_halftone_dots(img, (0, 168, 204, 40), spacing=40, dot_size=4)

    # Hanging makeshift gear outlines in background
    # Cape
    draw.polygon([(100, 100), (250, 100), (300, 500), (50, 450)], fill=(138, 28, 20, 60), outline=(138, 28, 20, 120))
    # Shield
    draw.ellipse([(800, 200), (950, 350)], fill=(0, 0, 0, 0), outline=(238, 222, 181, 100), width=6)
    draw.polygon([(875, 220), (840, 320), (930, 260), (820, 260), (910, 320)], fill=(238, 222, 181, 50))

    # Camera lenses (white circles with flash rays)
    flashes = [
        (200, 300, 80), (850, 400, 100), (300, 750, 60), (750, 800, 90),
        (150, 1000, 70), (900, 1100, 80)
    ]
    for (cx, cy, r) in flashes:
        draw_radial_glow(img, cx, cy, r * 2, WHITE, steps=6, max_alpha=120)
        draw_sunburst(img, cx, cy, r * 3, WHITE, num_rays=8, width=2)
        draw.ellipse([(cx - r//3, cy - r//3), (cx + r//3, cy + r//3)], fill=WHITE)

    # Sharp silhouette of copycat hero in center
    # Body
    draw.polygon([(WIDTH//2 - 200, HEIGHT), (WIDTH//2 + 200, HEIGHT), (WIDTH//2 + 100, HEIGHT - 500), (WIDTH//2 - 100, HEIGHT - 500)], fill=NEAR_BLACK)
    # Head & Mask
    draw.ellipse([(WIDTH//2 - 90, HEIGHT - 680), (WIDTH//2 + 90, HEIGHT - 500)], fill=NEAR_BLACK)
    # Spiky horns/ears
    draw.polygon([(WIDTH//2 - 90, HEIGHT - 640), (WIDTH//2 - 110, HEIGHT - 740), (WIDTH//2 - 40, HEIGHT - 660)], fill=NEAR_BLACK)
    draw.polygon([(WIDTH//2 + 90, HEIGHT - 640), (WIDTH//2 + 110, HEIGHT - 740), (WIDTH//2 + 40, HEIGHT - 660)], fill=NEAR_BLACK)

    # Blinding white flash burst over the face
    face_cx, face_cy = WIDTH // 2, HEIGHT - 590
    draw_radial_glow(img, face_cx, face_cy, 220, WHITE, steps=10, max_alpha=255)
    draw_sunburst(img, face_cx, face_cy, 350, ELECTRIC_CYAN, num_rays=24, width=4)
    draw_sunburst(img, face_cx, face_cy, 450, WHITE, num_rays=12, width=2)
    draw.ellipse([(face_cx - 40, face_cy - 40), (face_cx + 40, face_cy + 40)], fill=WHITE)

    draw_ink_noise(img)
    return img

def gen_casting_expressionist():
    img = make_gradient(OXBLOOD_RED, ELECTRIC_CYAN)
    draw = ImageDraw.Draw(img)

    # Multiple floating shard triangles and stars (shattered copycat gears)
    import random
    random.seed(42)
    for _ in range(20):
        pts = [
            (random.randint(100, WIDTH - 100), random.randint(100, HEIGHT - 100)),
            (random.randint(100, WIDTH - 100), random.randint(100, HEIGHT - 100)),
            (random.randint(100, WIDTH - 100), random.randint(100, HEIGHT - 100))
        ]
        # Only keep triangles that are not too large
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        if max(xs) - min(xs) < 300 and max(ys) - min(ys) < 300:
            fill_color = random.choice([
                (255, 255, 255, 60),
                (242, 169, 31, 80),
                (0, 168, 204, 80),
                (8, 12, 20, 100)
            ])
            draw.polygon(pts, fill=fill_color, outline=WHITE if random.random() > 0.5 else None)

    # Sharp central shadow shape representing standing figure
    draw.polygon([(WIDTH//2 - 150, HEIGHT), (WIDTH//2 + 150, HEIGHT), (WIDTH//2 + 80, HEIGHT - 600), (WIDTH//2 - 80, HEIGHT - 600)], fill=(8, 12, 20, 240))
    draw.ellipse([(WIDTH//2 - 70, HEIGHT - 720), (WIDTH//2 + 70, HEIGHT - 580)], fill=(8, 12, 20, 240))

    # Blinding explosion of light (white burst)
    burst_cx, burst_cy = WIDTH // 2, HEIGHT - 650
    draw_radial_glow(img, burst_cx, burst_cy, 400, WHITE, steps=15, max_alpha=240)
    draw_sunburst(img, burst_cx, burst_cy, 550, WHITE, num_rays=16, width=4)
    draw_sunburst(img, burst_cx, burst_cy, 700, (242, 169, 31, 200), num_rays=8, width=2)

    return img

def gen_renovation_ink():
    # Councilwoman, blueprint lines, building dissolving into blank paper
    img = make_gradient((15, 30, 50, 255), (8, 12, 20, 255))
    draw = ImageDraw.Draw(img)

    # Blueprint grid and layout lines
    for x in range(0, WIDTH, 80):
        draw.line([(x, 0), (x, HEIGHT)], fill=(0, 168, 204, 70), width=1)
    for y in range(0, HEIGHT, 80):
        draw.line([(0, y), (WIDTH, y)], fill=(0, 168, 204, 70), width=1)
    # Some blueprint circles/diagonals
    draw.ellipse([(WIDTH//2 - 300, HEIGHT//2 - 300), (WIDTH//2 + 300, HEIGHT//2 + 300)], outline=(0, 168, 204, 100), width=2)
    draw.line([(0, 0), (WIDTH, HEIGHT)], fill=(0, 168, 204, 50), width=2)
    draw.line([(WIDTH, 0), (0, HEIGHT)], fill=(0, 168, 204, 50), width=2)

    # Dark silhouette of buildings on the left side
    draw.rectangle([0, HEIGHT - 500, 250, HEIGHT], fill=NEAR_BLACK)
    draw.rectangle([150, HEIGHT - 700, 350, HEIGHT], fill=NEAR_BLACK)
    draw.rectangle([300, HEIGHT - 400, 480, HEIGHT], fill=NEAR_BLACK)

    # Female silhouette wearing a hardhat
    # Body
    draw.polygon([(WIDTH//2 - 100, HEIGHT), (WIDTH//2 + 250, HEIGHT), (WIDTH//2 + 150, HEIGHT - 450), (WIDTH//2 - 50, HEIGHT - 450)], fill=NEAR_BLACK)
    # Head & visor hardhat
    draw.ellipse([(WIDTH//2, HEIGHT - 600), (WIDTH//2 + 140, HEIGHT - 460)], fill=NEAR_BLACK)
    draw.polygon([(WIDTH//2 - 10, HEIGHT - 560), (WIDTH//2 + 160, HEIGHT - 610), (WIDTH//2 + 130, HEIGHT - 510)], fill=NEAR_BLACK) # hardhat brim
    # Glowing visor in cyan
    draw.polygon([(WIDTH//2 + 40, HEIGHT - 550), (WIDTH//2 + 110, HEIGHT - 565), (WIDTH//2 + 90, HEIGHT - 520)], fill=ELECTRIC_CYAN)

    # Right side of canvas dissolving into clean paper (white polygon with jagged edge)
    paper_pts = [
        (WIDTH - 400, HEIGHT), (WIDTH, HEIGHT), (WIDTH, 0), (WIDTH - 250, 0),
        (WIDTH - 300, 300), (WIDTH - 200, 600), (WIDTH - 380, 900), (WIDTH - 280, 1200)
    ]
    draw.polygon(paper_pts, fill=DIRTY_CREAM)
    # Draw dark jagged border to look like torn paper
    border_pts = [
        (WIDTH - 250, 0), (WIDTH - 300, 300), (WIDTH - 200, 600), (WIDTH - 380, 900), (WIDTH - 280, 1200), (WIDTH - 400, HEIGHT)
    ]
    draw.line(border_pts, fill=NEAR_BLACK, width=4)

    draw_ink_noise(img)
    return img

def gen_renovation_expressionist():
    # Mist, blueprints, female profile visor
    img = make_gradient((8, 12, 20, 255), (238, 222, 181, 255))
    draw = ImageDraw.Draw(img)

    # Layered demolition dust (semi-translucent ovals)
    dust = Image.new("RGBA", (WIDTH, HEIGHT), TRANSPARENT)
    ddraw = ImageDraw.Draw(dust)
    ddraw.ellipse([-200, 300, 600, 900], fill=(120, 120, 120, 80))
    ddraw.ellipse([400, 500, 1200, 1300], fill=(242, 169, 31, 60))
    ddraw.ellipse([100, 700, 900, 1400], fill=(138, 28, 20, 50))
    img.alpha_composite(dust)

    # Golden abstract architectural blueprint plans (concentric circles, nested squares)
    for side in range(100, 500, 100):
        draw.rectangle([WIDTH//2 - side, HEIGHT//2 - side, WIDTH//2 + side, HEIGHT//2 + side], outline=(242, 169, 31, 100), width=3)
    draw.ellipse([WIDTH//2 - 250, HEIGHT//2 - 250, WIDTH//2 + 250, HEIGHT//2 + 250], outline=(0, 168, 204, 120), width=4)

    # Central female silhouette
    draw.polygon([(300, HEIGHT), (700, HEIGHT), (600, HEIGHT - 500), (400, HEIGHT - 500)], fill=(8, 12, 20, 240))
    draw.ellipse([(420, HEIGHT - 680), (580, HEIGHT - 520)], fill=(8, 12, 20, 240))

    # Visor: sharp glowing gold crescent
    draw.polygon([(500, HEIGHT - 630), (580, HEIGHT - 610), (540, HEIGHT - 570)], fill=(255, 215, 0, 255))
    draw_radial_glow(img, 540, HEIGHT - 600, 100, STREETLAMP_AMBER, steps=5, max_alpha=150)

    return img

def gen_lastcall_ink():
    # Booth, gloved hands, ledger with red cross marks, cracked mirror
    img = make_gradient((10, 10, 15, 255), NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Background halftone
    draw_halftone_dots(img, (138, 28, 20, 25), spacing=35, dot_size=3)

    # Upper Cracked Mirror (circle in upper section)
    mirror_cx, mirror_cy, mirror_r = WIDTH // 2 + 100, 350, 220
    draw.ellipse([(mirror_cx - mirror_r, mirror_cy - mirror_r), (mirror_cx + mirror_r, mirror_cy + mirror_r)], fill=(30, 45, 60, 255), outline=DIRTY_CREAM, width=6)

    # Silhouette of captive bartender in mirror (oxblood red)
    draw.ellipse([(mirror_cx - 40, mirror_cy - 80), (mirror_cx + 40, mirror_cy)], fill=OXBLOOD_RED)
    draw.polygon([(mirror_cx - 60, mirror_cy), (mirror_cx + 60, mirror_cy), (mirror_cx + 80, mirror_cy + 150), (mirror_cx - 60, mirror_cy + 150)], fill=OXBLOOD_RED)

    # Black crack lines on the mirror
    import math
    for i in range(8):
        angle = i * math.pi / 4 + 0.2
        ex = int(mirror_cx + mirror_r * math.cos(angle))
        ey = int(mirror_cy + mirror_r * math.sin(angle))
        draw.line([(mirror_cx, mirror_cy), (ex, ey)], fill=NEAR_BLACK, width=4)
    # Extra jagged shards
    draw.line([(mirror_cx - 100, mirror_cy - 50), (mirror_cx - 50, mirror_cy + 120)], fill=NEAR_BLACK, width=3)
    draw.line([(mirror_cx + 120, mirror_cy - 80), (mirror_cx + 50, mirror_cy + 60)], fill=NEAR_BLACK, width=3)

    # Foreground table and booth backrest
    draw.rectangle([0, HEIGHT - 550, WIDTH, HEIGHT], fill=NEAR_BLACK)

    # Dirty-cream ledger book lying on table
    ledger_pts = [
        (WIDTH//2 - 250, HEIGHT - 350), (WIDTH//2 + 200, HEIGHT - 350),
        (WIDTH//2 + 250, HEIGHT - 100), (WIDTH//2 - 300, HEIGHT - 100)
    ]
    draw.polygon(ledger_pts, fill=DIRTY_CREAM, outline=(0, 0, 0, 255), width=5)
    # Center fold
    draw.line([(WIDTH//2 - 25, HEIGHT - 350), (WIDTH//2 - 25, HEIGHT - 100)], fill=NEAR_BLACK, width=3)
    # Grid/ruled lines on ledger
    for y in range(HEIGHT - 320, HEIGHT - 120, 30):
        draw.line([(WIDTH//2 - 240, y), (WIDTH//2 - 50, y - 5)], fill=(120, 130, 140, 255), width=2)
        draw.line([(WIDTH//2, y - 5), (WIDTH//2 + 210, y - 10)], fill=(120, 130, 140, 255), width=2)
    # Red cross marks (crossed-out favors)
    draw.line([(WIDTH//2 - 200, HEIGHT - 290), (WIDTH//2 - 150, HEIGHT - 250)], fill=OXBLOOD_RED, width=4)
    draw.line([(WIDTH//2 - 150, HEIGHT - 290), (WIDTH//2 - 200, HEIGHT - 250)], fill=OXBLOOD_RED, width=4)
    draw.line([(WIDTH//2 + 80, HEIGHT - 230), (WIDTH//2 + 130, HEIGHT - 190)], fill=OXBLOOD_RED, width=4)
    draw.line([(WIDTH//2 + 130, HEIGHT - 230), (WIDTH//2 + 80, HEIGHT - 190)], fill=OXBLOOD_RED, width=4)

    # Gloved black hands resting on ledger
    draw.ellipse([(WIDTH//2 - 380, HEIGHT - 280), (WIDTH//2 - 220, HEIGHT - 180)], fill=NEAR_BLACK) # left hand
    draw.ellipse([(WIDTH//2 + 180, HEIGHT - 250), (WIDTH//2 + 320, HEIGHT - 150)], fill=NEAR_BLACK) # right hand

    draw_ink_noise(img)
    return img

def gen_lastcall_expressionist():
    img = make_gradient((74, 14, 14, 255), (15, 45, 45, 255))
    draw = ImageDraw.Draw(img)

    # Abstract mirror shards of cyan and gold
    for pts in [
        [(WIDTH//2, 100), (WIDTH//2 - 250, 400), (WIDTH//2 + 100, 350)],
        [(WIDTH//2 + 100, 350), (WIDTH//2 + 300, 200), (WIDTH//2 + 250, 500)],
        [(WIDTH//2 - 250, 400), (WIDTH//2, 600), (WIDTH//2 + 100, 350)]
    ]:
        draw.polygon(pts, fill=(0, 168, 204, 90), outline=WHITE, width=2)

    # Floating gold/amber scales of justice or outline of a ledger
    scale_y = HEIGHT - 400
    draw.line([(WIDTH//2 - 150, scale_y), (WIDTH//2 + 150, scale_y)], fill=STREETLAMP_AMBER, width=6) # beam
    draw.line([(WIDTH//2, scale_y - 100), (WIDTH//2, scale_y + 150)], fill=STREETLAMP_AMBER, width=8) # pillar
    draw.line([(WIDTH//2 - 150, scale_y), (WIDTH//2 - 200, scale_y + 100)], fill=STREETLAMP_AMBER, width=3)
    draw.line([(WIDTH//2 + 150, scale_y), (WIDTH//2 + 100, scale_y + 100)], fill=STREETLAMP_AMBER, width=3)
    draw.polygon([(WIDTH//2 - 230, scale_y + 100), (WIDTH//2 - 170, scale_y + 100), (WIDTH//2 - 200, scale_y + 140)], fill=OXBLOOD_RED)
    draw.polygon([(WIDTH//2 + 70, scale_y + 100), (WIDTH//2 + 130, scale_y + 100), (WIDTH//2 + 100, scale_y + 140)], fill=OXBLOOD_RED)

    # Dark silhouette figure looming in foreground
    draw.polygon([(0, HEIGHT), (WIDTH, HEIGHT), (WIDTH - 150, HEIGHT - 300), (150, HEIGHT - 300)], fill=(8, 12, 20, 230))

    # Glowing spots
    draw_radial_glow(img, WIDTH//2, scale_y, 180, STREETLAMP_AMBER, steps=6, max_alpha=120)

    return img

def gen_afterhours_ink():
    # Clinic's locked doors, ambulance beacons, medicine crates
    img = make_gradient((15, 25, 40, 255), NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Triage door sliding security grilles (vertical stripes)
    for x in range(100, WIDTH - 100, 80):
        draw.line([(x, 50), (x, HEIGHT - 200)], fill=(40, 50, 65, 255), width=8)
        # Receding diagonal grid inside
        for y in range(50, HEIGHT - 200, 160):
            draw.line([(x, y), (x + 80, y + 80)], fill=(40, 50, 65, 255), width=3)
            draw.line([(x + 80, y), (x, y + 80)], fill=(40, 50, 65, 255), width=3)

    # Red/blue overlapping police strobe light at top-center
    strobe_cx, strobe_cy = WIDTH // 2, 250
    draw_radial_glow(img, strobe_cx - 150, strobe_cy, 350, OXBLOOD_RED, steps=10, max_alpha=150)
    draw_radial_glow(img, strobe_cx + 150, strobe_cy, 350, ELECTRIC_CYAN, steps=10, max_alpha=150)
    draw.ellipse([(strobe_cx - 30, strobe_cy - 30), (strobe_cx + 30, strobe_cy + 30)], fill=WHITE)

    # Stacked crates/boxes silhouettes in the foreground
    draw.rectangle([100, HEIGHT - 450, 400, HEIGHT], fill=NEAR_BLACK)
    # Medical cross markings on crates
    draw.line([(220, HEIGHT - 280), (280, HEIGHT - 280)], fill=DIRTY_CREAM, width=12)
    draw.line([(250, HEIGHT - 310), (250, HEIGHT - 250)], fill=DIRTY_CREAM, width=12)

    draw.rectangle([350, HEIGHT - 350, 650, HEIGHT], fill=NEAR_BLACK)
    draw.rectangle([250, HEIGHT - 200, 500, HEIGHT], fill=NEAR_BLACK)

    # Standing supervisor silhouette beyond the gate (partly hidden)
    draw.ellipse([(WIDTH//2 + 100, 380), (WIDTH//2 + 220, 500)], fill=(12, 18, 30, 230))
    draw.polygon([(WIDTH//2 + 50, 500), (WIDTH//2 + 270, 500), (WIDTH//2 + 220, 800), (WIDTH//2 + 100, 800)], fill=(12, 18, 30, 230))

    draw_ink_noise(img)
    return img

def gen_afterhours_expressionist():
    img = make_gradient(ELECTRIC_CYAN, OXBLOOD_RED)
    draw = ImageDraw.Draw(img)

    # Abstract vertical columns representing triage doors (bright cyan & deep red bars)
    for x in range(50, WIDTH, 120):
        # alternate color
        col = (255, 255, 255, 40) if (x // 120) % 2 == 0 else (138, 28, 20, 80)
        draw.rectangle([x, 0, x + 80, HEIGHT], fill=col)

    # Floating semi-translucent red and blue pill shapes or clinical crosses
    import math
    for i in range(12):
        cx = 150 + (i * 180) % 800
        cy = 200 + (i * 110) % 1000
        # draw a 3D-like floaty pill
        r = 35
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=(255, 255, 255, 90), outline=WHITE, width=2)
        draw.line([(cx, cy - r), (cx, cy + r)], fill=ELECTRIC_CYAN if i%2==0 else OXBLOOD_RED, width=3)

    # Abstract standing figure silhouette with glowing clipboard/folder
    draw.polygon([(WIDTH//2 - 120, HEIGHT), (WIDTH//2 + 120, HEIGHT), (WIDTH//2 + 70, HEIGHT - 550), (WIDTH//2 - 70, HEIGHT - 550)], fill=(8, 12, 20, 240))
    draw.ellipse([(WIDTH//2 - 60, HEIGHT - 650), (WIDTH//2 + 60, HEIGHT - 530)], fill=(8, 12, 20, 240))

    # Glowing clipboard in electric gold
    draw.rectangle([WIDTH//2 - 40, HEIGHT - 450, WIDTH//2 + 40, HEIGHT - 350], fill=STREETLAMP_AMBER, outline=WHITE, width=3)
    draw_radial_glow(img, WIDTH//2, HEIGHT - 400, 150, STREETLAMP_AMBER, steps=6, max_alpha=120)

    return img

def gen_deadair_ink():
    # Radio microphone, hand holding cassette, blank label, city lights
    img = make_gradient((15, 20, 30, 255), NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Background city bokeh (warm amber and electric blue circles)
    bokeh_centers = [
        (200, 200, 70), (800, 250, 90), (150, 450, 60), (900, 500, 80),
        (350, 150, 50), (700, 100, 60), (300, 600, 75)
    ]
    for (cx, cy, r) in bokeh_centers:
        color = STREETLAMP_AMBER if cy % 200 < 100 else ELECTRIC_CYAN
        draw_radial_glow(img, cx, cy, r * 2, color, steps=6, max_alpha=70)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=(color[0], color[1], color[2], 30))

    # Grid overlay on the background to simulate studio glass pane
    draw.line([(0, 400), (WIDTH, 450)], fill=(255, 255, 255, 20), width=5)
    draw.line([(150, 0), (250, HEIGHT)], fill=(255, 255, 255, 15), width=3)

    # Classic studio microphone silhouette in the left-center
    mic_cx, mic_cy = 300, HEIGHT - 400
    # Base/stand
    draw.line([(mic_cx, mic_cy), (mic_cx, HEIGHT)], fill=NEAR_BLACK, width=25)
    # Head holder bracket (U-shape)
    draw.arc([(mic_cx - 100, mic_cy - 120), (mic_cx + 100, mic_cy + 80)], start=0, end=180, fill=NEAR_BLACK, width=15)
    # Microphone head
    draw.rectangle([mic_cx - 50, mic_cy - 180, mic_cx + 50, mic_cy], fill=NEAR_BLACK, width=0)
    draw.ellipse([(mic_cx - 50, mic_cy - 230), (mic_cx + 50, mic_cy - 130)], fill=NEAR_BLACK)
    # Metal grille cross-lines
    for gr_y in range(mic_cy - 170, mic_cy - 20, 25):
         draw.line([(mic_cx - 45, gr_y), (mic_cx + 45, gr_y)], fill=(80, 90, 110, 255), width=2)

    # Hand holding cassette in bottom right
    # Arm
    draw.polygon([(WIDTH - 250, HEIGHT), (WIDTH, HEIGHT - 200), (WIDTH, HEIGHT)], fill=NEAR_BLACK)
    # Hand
    draw.ellipse([(WIDTH - 300, HEIGHT - 280), (WIDTH - 150, HEIGHT - 130)], fill=NEAR_BLACK)
    # Cassette Tape (rectangle)
    cass_pts = [
        (WIDTH - 380, HEIGHT - 330), (WIDTH - 180, HEIGHT - 330),
        (WIDTH - 180, HEIGHT - 210), (WIDTH - 380, HEIGHT - 210)
    ]
    draw.polygon(cass_pts, fill=(20, 28, 40, 255), outline=NEAR_BLACK, width=6)
    # Blank Label (dirty-cream rectangle in cassette)
    lbl_pts = [
        (WIDTH - 350, HEIGHT - 300), (WIDTH - 210, HEIGHT - 300),
        (WIDTH - 210, HEIGHT - 240), (WIDTH - 350, HEIGHT - 240)
    ]
    draw.polygon(lbl_pts, fill=DIRTY_CREAM)
    # Two tape reels circles in label
    draw.ellipse([(WIDTH - 315, HEIGHT - 280), (WIDTH - 295, HEIGHT - 260)], fill=NEAR_BLACK)
    draw.ellipse([(WIDTH - 265, HEIGHT - 280), (WIDTH - 245, HEIGHT - 260)], fill=NEAR_BLACK)

    draw_ink_noise(img)
    return img

def gen_deadair_expressionist():
    img = make_gradient((15, 20, 42, 255), (242, 169, 31, 255))
    draw = ImageDraw.Draw(img)

    # Soundwave graphics (vertical bars of cyan and amber)
    wave_y = HEIGHT // 2 + 100
    for i in range(25):
        wx = 100 + i * 40
        import math
        amplitude = int(300 * math.sin(i * 0.4) * math.cos(i * 0.2))
        amplitude = abs(amplitude) + 20
        col = ELECTRIC_CYAN if i % 2 == 0 else (255, 255, 255, 180)
        draw.rectangle([wx - 10, wave_y - amplitude, wx + 10, wave_y + amplitude], fill=col)

    # High-contrast soundwave outlines
    draw.line([(50, wave_y), (WIDTH - 50, wave_y)], fill=WHITE, width=4)

    # Highly stylized glowing golden microphone shape floating in space
    mic_cx, mic_cy = WIDTH // 2, HEIGHT // 3
    draw_radial_glow(img, mic_cx, mic_cy, 220, STREETLAMP_AMBER, steps=8, max_alpha=160)
    # Draw mic head profile
    draw.ellipse([(mic_cx - 80, mic_cy - 120), (mic_cx + 80, mic_cy + 40)], fill=STREETLAMP_AMBER, outline=WHITE, width=3)
    draw.line([(mic_cx - 80, mic_cy - 40), (mic_cx + 80, mic_cy - 40)], fill=WHITE, width=4)
    draw.line([(mic_cx, mic_cy + 40), (mic_cx, mic_cy + 180)], fill=STREETLAMP_AMBER, width=8) # stand

    # Stylized cassette shape floating
    draw.rectangle([WIDTH - 300, 150, WIDTH - 100, 270], fill=(8, 12, 20, 200), outline=WHITE, width=3)
    draw.rectangle([WIDTH - 270, 180, WIDTH - 130, 240], fill=DIRTY_CREAM)

    return img

def gen_lastroute_ink():
    # Bus windows reflecting routes, gloved hand holding metal key ring
    img = make_gradient((10, 18, 25, 255), NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Bus window rounded rectangles in rows
    for y in [100, 350, 600]:
        for x in [80, 420, 760]:
            # Draw bus window pane
            draw.rectangle([x, y, x + 250, y + 200], fill=(20, 32, 45, 255), outline=(50, 65, 80, 255), width=5)
            # Route map lines inside windows (faded dots and vectors)
            draw.line([(x + 20, y + 100), (x + 100, y + 40), (x + 230, y + 150)], fill=STREETLAMP_AMBER, width=3)
            draw.ellipse([(x + 100 - 8, y + 40 - 8), (x + 100 + 8, y + 40 + 8)], fill=OXBLOOD_RED)
            draw.ellipse([(x + 230 - 8, y + 150 - 8), (x + 230 + 8, y + 150 + 8)], fill=ELECTRIC_CYAN)

    # Huge central gloved black hand holding a massive ring of transit keys
    hand_cx, hand_cy = WIDTH // 2 + 50, HEIGHT - 300
    # Arm
    draw.polygon([(hand_cx - 100, HEIGHT), (hand_cx + 100, HEIGHT), (hand_cx + 40, hand_cy + 150), (hand_cx - 40, hand_cy + 150)], fill=NEAR_BLACK)
    # Gloved Fist
    draw.ellipse([(hand_cx - 90, hand_cy - 90), (hand_cx + 90, hand_cy + 90)], fill=NEAR_BLACK)

    # Steel ring (concentric circles) in silver-grey
    ring_cx, ring_cy, ring_r = hand_cx - 40, hand_cy - 10, 120
    draw.ellipse([(ring_cx - ring_r, ring_cy - ring_r), (ring_cx + ring_r, ring_cy + ring_r)], fill=None, outline=(150, 160, 175, 255), width=16)

    # Several keys hanging off the ring
    import math
    for i, angle_deg in enumerate([45, 120, 220, 310]):
        angle = math.radians(angle_deg)
        kx = int(ring_cx + ring_r * math.cos(angle))
        ky = int(ring_cy + ring_r * math.sin(angle))
        # Draw key stem
        k_len = 100
        k_ex = int(kx + k_len * math.cos(angle))
        k_ey = int(ky + k_len * math.sin(angle))
        draw.line([(kx, ky), (k_ex, k_ey)], fill=(120, 130, 145, 255), width=10)
        # Key head loop
        draw.ellipse([(kx - 20, ky - 20), (kx + 20, ky + 20)], outline=(120, 130, 145, 255), width=6)
        # Key teeth
        t_angle = angle + math.pi/2
        tx1 = int(k_ex - 20 * math.cos(angle) + 20 * math.cos(t_angle))
        ty1 = int(k_ey - 20 * math.sin(angle) + 20 * math.sin(t_angle))
        tx2 = int(k_ex + 20 * math.cos(t_angle))
        ty2 = int(k_ey + 20 * math.sin(t_angle))
        draw.line([(k_ex - 20, k_ey), (tx1, ty1)], fill=(120, 130, 145, 255), width=8)
        draw.line([(k_ex, k_ey), (tx2, ty2)], fill=(120, 130, 145, 255), width=8)

    draw_ink_noise(img)
    return img

def gen_lastroute_expressionist():
    img = make_gradient((10, 20, 35, 255), (242, 169, 31, 255))
    draw = ImageDraw.Draw(img)

    # Maze of colorful overlapping transit route lines (curves & loops)
    for pts in [
        [(50, 200), (300, 100), (600, 500), (900, 400)],
        [(100, 800), (400, 600), (700, 900), (1000, 700)],
        [(200, 1100), (500, 800), (800, 1200), (950, 1000)]
    ]:
        draw.line(pts, fill=ELECTRIC_CYAN, width=4)
        for pt in pts:
            draw_radial_glow(img, pt[0], pt[1], 50, ELECTRIC_CYAN, steps=4, max_alpha=100)
    for pts in [
        [(50, 500), (400, 300), (500, 900), (1000, 800)],
        [(100, 100), (500, 600), (800, 200), (1000, 500)]
    ]:
        draw.line(pts, fill=OXBLOOD_RED, width=4)
        for pt in pts:
            draw_radial_glow(img, pt[0], pt[1], 50, OXBLOOD_RED, steps=4, max_alpha=100)

    # Giant glowing golden keyhole/key at center
    key_cx, key_cy = WIDTH // 2, HEIGHT // 2
    draw_radial_glow(img, key_cx, key_cy, 250, STREETLAMP_AMBER, steps=10, max_alpha=180)

    # Draw large abstract keyhole shape in NEAR_BLACK
    draw.ellipse([(key_cx - 60, key_cy - 120), (key_cx + 60, key_cy)], fill=NEAR_BLACK)
    draw.polygon([(key_cx - 30, key_cy), (key_cx + 30, key_cy), (key_cx + 60, key_cy + 150), (key_cx - 60, key_cy + 150)], fill=NEAR_BLACK)

    # Outer white glow highlight
    draw.ellipse([(key_cx - 60, key_cy - 120), (key_cx + 60, key_cy)], outline=WHITE, width=3)
    draw.line([(key_cx - 30, key_cy), (key_cx - 60, key_cy + 150)], fill=WHITE, width=3)
    draw.line([(key_cx + 30, key_cy), (key_cx + 60, key_cy + 150)], fill=WHITE, width=3)

    return img

def gen_openhouse_ink():
    # Hallway perspective, security supervisor silhouette, camera red dots
    img = make_gradient(DIRTY_CREAM, NEAR_BLACK)
    draw = ImageDraw.Draw(img)

    # Hallway receding perspective lines
    vp_x, vp_y = WIDTH // 2, HEIGHT // 3 + 50
    # Corner lines
    draw.line([(0, 0), (vp_x, vp_y)], fill=(50, 60, 75, 255), width=4)
    draw.line([(WIDTH, 0), (vp_x, vp_y)], fill=(50, 60, 75, 255), width=4)
    draw.line([(0, HEIGHT), (vp_x, vp_y)], fill=(50, 60, 75, 255), width=4)
    draw.line([(WIDTH, HEIGHT), (vp_x, vp_y)], fill=(50, 60, 75, 255), width=4)

    # Door frames on hallway walls
    for scale in [0.2, 0.4, 0.6, 0.8]:
        dx = int(vp_x * (1.0 - scale))
        dy = int(vp_y * (1.0 - scale))
        draw.line([(dx, dy), (dx, HEIGHT - int((HEIGHT - vp_y) * (1.0 - scale)))], fill=(50, 60, 75, 255), width=3)
        rx = WIDTH - dx
        draw.line([(rx, dy), (rx, HEIGHT - int((HEIGHT - vp_y) * (1.0 - scale)))], fill=(50, 60, 75, 255), width=3)

    # Security cameras in top-left and top-right corners with glowing red lenses
    for cx, cy, is_left in [(150, 120, True), (WIDTH - 150, 120, False)]:
        # Camera body
        rot = 30 if is_left else -30
        draw.polygon([
            (cx - 40, cy - 20), (cx + 40, cy - 20),
            (cx + 30, cy + 30), (cx - 30, cy + 30)
        ], fill=NEAR_BLACK)
        draw.rectangle([cx - 15, cy + 30, cx + 15, cy + 45], fill=NEAR_BLACK)
        # Red blinking lens
        lens_x = cx + 15 if is_left else cx - 15
        draw.ellipse([(lens_x - 10, cy + 20), (lens_x + 10, cy + 40)], fill=OXBLOOD_RED)
        draw_radial_glow(img, lens_x, cy + 30, 30, OXBLOOD_RED, steps=3, max_alpha=180)

    # Supervisor silhouette holding clipboard in foreground
    # Shoulder/Body
    draw.polygon([(WIDTH//2 - 250, HEIGHT), (WIDTH//2 + 100, HEIGHT), (WIDTH//2 - 50, HEIGHT - 450), (WIDTH//2 - 200, HEIGHT - 450)], fill=NEAR_BLACK)
    # Head
    draw.ellipse([(WIDTH//2 - 170, HEIGHT - 580), (WIDTH//2 - 70, HEIGHT - 460)], fill=NEAR_BLACK)
    # Clipboard being held up
    clip_pts = [
        (WIDTH//2, HEIGHT - 380), (WIDTH//2 + 180, HEIGHT - 340),
        (WIDTH//2 + 140, HEIGHT - 100), (WIDTH//2 - 40, HEIGHT - 140)
    ]
    draw.polygon(clip_pts, fill=DIRTY_CREAM, outline=NEAR_BLACK, width=5)
    # Clip at top of clipboard
    draw.polygon([(WIDTH//2 + 70, HEIGHT - 380), (WIDTH//2 + 110, HEIGHT - 370), (WIDTH//2 + 90, HEIGHT - 340)], fill=(80, 85, 95, 255))
    # Ruled lines/signatures on clipboard sheet
    for line_offset in range(40, 240, 25):
        ly_start_x = WIDTH//2 + line_offset * 0.2
        ly_start_y = HEIGHT - 340 + line_offset
        draw.line([(ly_start_x, ly_start_y), (ly_start_x + 110, ly_start_y - 20)], fill=(80, 90, 100, 255), width=2)

    draw_ink_noise(img)
    return img

def gen_openhouse_expressionist():
    img = make_gradient((11, 22, 32, 255), (8, 12, 20, 255))
    draw = ImageDraw.Draw(img)

    # Gym floor perspective grid (checkerboard)
    vp_x, vp_y = WIDTH // 2, HEIGHT // 3
    for x in range(-500, WIDTH + 500, 150):
        draw.line([(x, HEIGHT), (vp_x, vp_y)], fill=(0, 168, 204, 60), width=2)
    for scale in [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]:
        dy = vp_y + int((HEIGHT - vp_y) * (scale ** 2))
        draw.line([(0, dy), (WIDTH, dy)], fill=(0, 168, 204, 60), width=2)

    # Multiple glowing cyan and crimson concentric circles representing camera lenses watching
    cameras = [
        (250, 200, 80, OXBLOOD_RED),
        (WIDTH - 250, 200, 80, ELECTRIC_CYAN),
        (400, 150, 60, ELECTRIC_CYAN),
        (WIDTH - 400, 150, 60, OXBLOOD_RED),
        (WIDTH//2, 100, 90, OXBLOOD_RED)
    ]
    for cx, cy, r, col in cameras:
        draw_radial_glow(img, cx, cy, r * 2.5, col, steps=8, max_alpha=120)
        draw.ellipse([(cx - r, cy - r), (cx + r, cy + r)], fill=col, outline=WHITE, width=2)
        draw.ellipse([(cx - r//3, cy - r//3), (cx + r//3, cy + r//3)], fill=WHITE)

    # Ominous abstract dark figure holding a glowing white tablet
    draw.polygon([(WIDTH//2 - 150, HEIGHT), (WIDTH//2 + 150, HEIGHT), (WIDTH//2 + 80, HEIGHT - 500), (WIDTH//2 - 80, HEIGHT - 500)], fill=(8, 12, 20, 240))
    draw.ellipse([(WIDTH//2 - 70, HEIGHT - 620), (WIDTH//2 + 70, HEIGHT - 480)], fill=(8, 12, 20, 240))

    # Glowing white document
    doc_pts = [
        (WIDTH//2 - 50, HEIGHT - 380), (WIDTH//2 + 50, HEIGHT - 380),
        (WIDTH//2 + 50, HEIGHT - 240), (WIDTH//2 - 50, HEIGHT - 240)
    ]
    draw.polygon(doc_pts, fill=WHITE, outline=WHITE, width=4)
    draw_radial_glow(img, WIDTH//2, HEIGHT - 310, 120, WHITE, steps=5, max_alpha=150)

    return img

GEN_MAP = {
    ("toll", "ink"): gen_toll_ink,
    ("toll", "expressionist"): gen_toll_expressionist,
    ("casting", "ink"): gen_casting_ink,
    ("casting", "expressionist"): gen_casting_expressionist,
    ("renovation", "ink"): gen_renovation_ink,
    ("renovation", "expressionist"): gen_renovation_expressionist,
    ("lastcall", "ink"): gen_lastcall_ink,
    ("lastcall", "expressionist"): gen_lastcall_expressionist,
    ("afterhours", "ink"): gen_afterhours_ink,
    ("afterhours", "expressionist"): gen_afterhours_expressionist,
    ("deadair", "ink"): gen_deadair_ink,
    ("deadair", "expressionist"): gen_deadair_expressionist,
    ("lastroute", "ink"): gen_lastroute_ink,
    ("lastroute", "expressionist"): gen_lastroute_expressionist,
    ("openhouse", "ink"): gen_openhouse_ink,
    ("openhouse", "expressionist"): gen_openhouse_expressionist,
}

def main():
    print("Generating Threat art pack...")
    for (slug, style), gen_fn in GEN_MAP.items():
        dir_path = Path("art/images") / style / "threats"
        dir_path.mkdir(parents=True, exist_ok=True)
        out_path = dir_path / f"{slug}.png"

        print(f"Generating: {out_path}...")
        img = gen_fn()
        img.save(out_path, "PNG")
        print(f"Saved: {out_path}")

    print("All Threat art pack images generated successfully!")

if __name__ == "__main__":
    main()

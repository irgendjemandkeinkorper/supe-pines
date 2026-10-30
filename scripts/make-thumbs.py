#!/usr/bin/env python3
"""Write small WebP thumbnails of every image under art/images to art/thumbs.

The Gallery grid shows up to 30 portraits at once. Full-size PNGs (~2.7 MB,
1254px) decode to ~6 MB each, which crashes WebKit on low-memory devices and
CI (#91). Tiles load the thumbnail; the detail view loads the full image.

Usage: python3 scripts/make-thumbs.py [--force]   (needs Pillow)
"""
import sys
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / 'art' / 'images'
DST = REPO / 'art' / 'thumbs'
MAX_EDGE = 480
EXTS = {'.png', '.jpg', '.jpeg', '.webp'}

force = '--force' in sys.argv
written = 0
for src in sorted(p for p in SRC.rglob('*') if p.suffix.lower() in EXTS):
    dst = (DST / src.relative_to(SRC)).with_suffix('.webp')
    if not force and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=80, method=6)
    written += 1
print(f'Thumbnails: {written} written, {DST.relative_to(REPO)}')

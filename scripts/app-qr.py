"""Makes the QR code that opens Sleep Moore on the App Store.

Writes public/img/app-qr.svg for the site (Get the app section) and, with
--png <path>, a large PNG for print or sharing. The app icon sits in the middle;
error correction H leaves room for it. Run: python scripts/app-qr.py [--png out.png]
"""
import argparse, base64, io
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw

URL = 'https://apps.apple.com/app/id6837736590'
INK, PAPER = '#0b0e15', '#f3eadb'
ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / 'public' / 'apple-touch-icon.png'
QUIET = 2  # modules of margin; the card around it adds more


def matrix():
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=QUIET)
    qr.add_data(URL)
    qr.make(fit=True)
    return qr.get_matrix()


def logo_box(n):
    """Centre square for the icon: about 22% of the code, odd module count."""
    size = round(n * 0.22) | 1
    start = (n - size) // 2
    return start, size


def svg(m):
    n = len(m)
    start, size = logo_box(n)
    path = []
    for y, row in enumerate(m):
        for x, on in enumerate(row):
            inside = start - 1 <= x < start + size + 1 and start - 1 <= y < start + size + 1
            if on and not inside:
                path.append(f'M{x} {y}h1v1h-1z')
    icon = Image.open(ICON).convert('RGB').resize((96, 96), Image.LANCZOS)
    buf = io.BytesIO()
    icon.save(buf, 'PNG', optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    pad = 0.35
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" shape-rendering="crispEdges">'
        f'<rect width="{n}" height="{n}" fill="{PAPER}"/>'
        f'<path fill="{INK}" d="{"".join(path)}"/>'
        f'<clipPath id="r"><rect x="{start + pad}" y="{start + pad}" width="{size - 2 * pad}" height="{size - 2 * pad}" rx="{size * 0.22}"/></clipPath>'
        f'<image href="data:image/png;base64,{b64}" x="{start + pad}" y="{start + pad}" width="{size - 2 * pad}" height="{size - 2 * pad}" clip-path="url(#r)"/>'
        '</svg>'
    )


def png(m, out, px=1600):
    n = len(m)
    cell = px // n
    img = Image.new('RGB', (n * cell, n * cell), PAPER)
    d = ImageDraw.Draw(img)
    start, size = logo_box(n)
    for y, row in enumerate(m):
        for x, on in enumerate(row):
            inside = start - 1 <= x < start + size + 1 and start - 1 <= y < start + size + 1
            if on and not inside:
                d.rectangle([x * cell, y * cell, (x + 1) * cell - 1, (y + 1) * cell - 1], fill=INK)
    side = int((size - 0.7) * cell)
    icon = Image.open(ICON).convert('RGB').resize((side, side), Image.LANCZOS)
    mask = Image.new('L', (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, side - 1, side - 1], radius=int(side * 0.22), fill=255)
    off = int((start + 0.35) * cell)
    img.paste(icon, (off, off), mask)
    img.save(out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--png', help='also write a large PNG here')
    a = ap.parse_args()
    m = matrix()
    (ROOT / 'public' / 'img' / 'app-qr.svg').write_text(svg(m), encoding='utf-8')
    if a.png:
        png(m, a.png)
    print(f'{len(m)} modules, {URL}')

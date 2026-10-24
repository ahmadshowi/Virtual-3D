"""
Generator aset prosedural untuk Virtual Museum.

Membuat:
  - Tekstur lantai beton, lantai kayu, dan plester dinding (color/normal/roughness),
    semuanya tileable (bisa diulang tanpa sambungan terlihat).
  - Karya seni placeholder orisinal (abstrak) + versi thumbnail untuk dinding.

Semua hasil adalah buatan sendiri (bebas dipakai), jadi tidak ada masalah lisensi.
Jalankan ulang hanya bila ingin membuat ulang aset:
    pip install numpy pillow
    python tools/generate_assets.py
"""
import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
TEX = os.path.join(ROOT, "textures")
PHOTOS = os.path.join(ROOT, "photos")
THUMBS = os.path.join(PHOTOS, "thumbs")
for d in (TEX, PHOTOS, THUMBS):
    os.makedirs(d, exist_ok=True)

rng = np.random.default_rng(7)


# ---------------------------------------------------------------- utilities
def periodic_noise(h, w, beta=2.0, aniso=(1.0, 1.0), seed=None):
    """Noise 1/f^beta via FFT -> otomatis tileable. Hasil dinormalisasi 0..1."""
    r = np.random.default_rng(seed)
    fy = np.fft.fftfreq(h)[:, None] * aniso[0]
    fx = np.fft.rfftfreq(w)[None, :] * aniso[1]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = (r.normal(size=f.shape) + 1j * r.normal(size=f.shape)) / f ** (beta / 2)
    spec[0, 0] = 0
    n = np.fft.irfft2(spec, s=(h, w))
    n -= n.min()
    n /= n.max()
    return n


def normal_from_height(hgt, strength=2.0):
    dx = (np.roll(hgt, -1, axis=1) - np.roll(hgt, 1, axis=1)) * strength
    dy = (np.roll(hgt, -1, axis=0) - np.roll(hgt, 1, axis=0)) * strength
    nz = np.ones_like(hgt)
    l = np.sqrt(dx * dx + dy * dy + nz * nz)
    # Konvensi OpenGL (Y+ ke atas) seperti yang dipakai three.js
    n = np.stack([-dx / l, dy / l, nz / l], axis=-1)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def save_rgb(arr, name, q=85):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(os.path.join(TEX, name), quality=q, optimize=True)


def save_gray(arr01, name, q=85):
    Image.fromarray((np.clip(arr01, 0, 1) * 255).astype(np.uint8), "L").convert("RGB").save(
        os.path.join(TEX, name), quality=q, optimize=True)


# ---------------------------------------------------------------- textures
def concrete(size=1024):
    big = periodic_noise(size, size, 2.6, seed=1)
    mid = periodic_noise(size, size, 1.8, seed=2)
    fine = periodic_noise(size, size, 0.6, seed=3)
    # agregat kecil (bintik terrazzo halus)
    spots = (periodic_noise(size, size, 0.2, seed=4) > 0.82).astype(float)
    spots = np.array(Image.fromarray((spots * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))) / 255
    v = 0.5 * big + 0.3 * mid + 0.2 * fine
    base = np.array([182, 178, 171], float)
    col = base[None, None, :] * (0.86 + 0.22 * v[..., None]) - spots[..., None] * 18
    save_rgb(col, "concrete_color.jpg")
    save_gray(0.42 + 0.30 * mid - 0.1 * big, "concrete_rough.jpg")
    Image.fromarray(normal_from_height(0.6 * fine + 0.4 * mid, 1.2)).save(os.path.join(TEX, "concrete_normal.jpg"), quality=88)


def wood(size=1024, planks=8):
    """Tile 1024px = 1.6 m. Papan memanjang di sumbu X."""
    h = w = size
    pw = h // planks
    col = np.zeros((h, w, 3))
    hgt = np.zeros((h, w))
    rough = np.zeros((h, w))
    grain = periodic_noise(h, w, 2.2, aniso=(1.0, 14.0), seed=11)
    grain2 = periodic_noise(h, w, 1.2, aniso=(1.0, 8.0), seed=12)
    blotch = periodic_noise(h, w, 2.8, seed=13)
    xs = np.arange(w)[None, :]
    for p in range(planks):
        y0, y1 = p * pw, (p + 1) * pw
        n_seg = 2
        offset = int(rng.integers(0, w))
        seg = w // n_seg
        for s in range(n_seg):
            tint = rng.uniform(-0.05, 0.05)
            hue = np.array([0.70, 0.58, 0.45]) + rng.uniform(-0.012, 0.012, 3)
            a = (offset + s * seg) % w
            mask = ((xs - a) % w) < seg
            g = grain[y0:y1] * 0.6 + grain2[y0:y1] * 0.4
            rings = 0.5 + 0.5 * np.sin((g * 24 + rng.uniform(0, 6)))
            lum = 0.84 + tint + 0.08 * rings + 0.08 * (blotch[y0:y1] - 0.5)
            block = lum[..., None] * hue[None, None, :] * 255
            m = np.repeat(mask, y1 - y0, axis=0)
            col[y0:y1][m] = block[m]
            rough[y0:y1][m] = (0.50 + 0.12 * rings - 0.06 * tint)[m]
            hgt[y0:y1][m] = (0.5 + 0.15 * g)[m]
            # sambungan ujung papan
            jx = a % w
            for dx in range(-1, 2):
                col[y0:y1, (jx + dx) % w] *= 0.55
                hgt[y0:y1, (jx + dx) % w] = 0.2
        # celah antar papan
        col[y0:y0 + 2] *= 0.55
        hgt[y0:y0 + 2] = 0.2
    save_rgb(col, "wood_color.jpg")
    save_gray(rough, "wood_rough.jpg")
    Image.fromarray(normal_from_height(hgt, 3.0)).save(os.path.join(TEX, "wood_normal.jpg"), quality=88)


def plaster(size=512):
    n1 = periodic_noise(size, size, 2.4, seed=21)
    n2 = periodic_noise(size, size, 0.8, seed=22)
    base = np.array([236, 232, 224], float)
    col = base[None, None, :] * (0.95 + 0.06 * n1[..., None] + 0.02 * n2[..., None])
    save_rgb(col, "plaster_color.jpg")
    Image.fromarray(normal_from_height(0.7 * n2 + 0.3 * n1, 0.8)).save(os.path.join(TEX, "plaster_normal.jpg"), quality=88)


# ---------------------------------------------------------------- artworks
def lerp(a, b, t):
    return a + (b - a) * t


def grain_overlay(img, amount=6):
    a = np.array(img).astype(float)
    a += rng.normal(0, amount, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def art_color_field(W, H, colors):
    a = np.zeros((H, W, 3))
    a[:] = colors[0]
    img = Image.fromarray(a.astype(np.uint8))
    layer = Image.new("RGB", (W, H), tuple(colors[0]))
    d = ImageDraw.Draw(layer)
    m = int(W * 0.08)
    d.rectangle([m, m, W - m, int(H * 0.52)], fill=tuple(colors[1]))
    d.rectangle([m, int(H * 0.58), W - m, H - m], fill=tuple(colors[2]))
    layer = layer.filter(ImageFilter.GaussianBlur(W * 0.012))
    img = Image.blend(img, layer, 1.0)
    tex = periodic_noise(H, W, 1.6, seed=int(rng.integers(1e6)))
    a = np.array(img).astype(float) * (0.9 + 0.18 * tex[..., None])
    return grain_overlay(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), 4)


def art_landscape(W, H, sky_top, sky_bot, mountain_cols, sun=True):
    y = np.linspace(0, 1, H)[:, None, None]
    a = lerp(np.array(sky_top, float), np.array(sky_bot, float), y ** 0.9) * np.ones((1, W, 1))
    img = Image.fromarray(a.astype(np.uint8))
    d = ImageDraw.Draw(img)
    if sun:
        cx, cy, r = W * rng.uniform(0.3, 0.7), H * rng.uniform(0.3, 0.42), W * 0.07
        glow = Image.new("L", (W, H), 0)
        ImageDraw.Draw(glow).ellipse([cx - r * 3, cy - r * 3, cx + r * 3, cy + r * 3], fill=120)
        glow = glow.filter(ImageFilter.GaussianBlur(r * 1.5))
        img = Image.composite(Image.new("RGB", (W, H), (255, 236, 200)), img, glow)
        d = ImageDraw.Draw(img)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 244, 222))
    n = len(mountain_cols)
    for i, c in enumerate(mountain_cols):
        base = H * (0.45 + 0.13 * i)
        prof = periodic_noise(1, W, 2.4, seed=int(rng.integers(1e6)))[0]
        ys = base - (prof - 0.5) * H * (0.30 - 0.04 * i)
        poly = [(0, H)] + [(x, ys[x]) for x in range(0, W, 4)] + [(W, ys[-1]), (W, H)]
        layer = Image.new("RGB", (W, H), tuple(c))
        mask = Image.new("L", (W, H), 0)
        ImageDraw.Draw(mask).polygon(poly, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(1.2 + (n - i) * 0.8))
        img = Image.composite(layer, img, mask)
    return grain_overlay(img, 5)


def art_bauhaus(W, H, bg, palette):
    img = Image.new("RGB", (W, H), tuple(bg))
    d = ImageDraw.Draw(img)
    for _ in range(9):
        c = tuple(palette[int(rng.integers(len(palette)))])
        kind = rng.integers(3)
        x, y = rng.uniform(0.1, 0.9) * W, rng.uniform(0.1, 0.9) * H
        s = rng.uniform(0.08, 0.3) * W
        if kind == 0:
            d.ellipse([x - s, y - s, x + s, y + s], fill=c)
        elif kind == 1:
            d.rectangle([x - s, y - s * 0.4, x + s, y + s * 0.4], fill=c)
        else:
            d.polygon([(x, y - s), (x + s, y + s * 0.8), (x - s, y + s * 0.8)], fill=c)
    for _ in range(3):
        x = rng.uniform(0.1, 0.9) * W
        d.line([(x, 0), (x + rng.uniform(-0.3, 0.3) * W, H)], fill=(30, 30, 30), width=max(3, W // 180))
    return grain_overlay(img, 5)


def art_flow(W, H, bg, cols, lines=1400):
    img = Image.new("RGB", (W, H), tuple(bg))
    d = ImageDraw.Draw(img)
    field = periodic_noise(128, 128, 2.6, seed=int(rng.integers(1e6))) * math.pi * 4
    for i in range(lines):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        c = tuple(cols[i % len(cols)])
        pts = [(x, y)]
        for _ in range(60):
            ang = field[int(y / H * 127) % 128, int(x / W * 127) % 128]
            x += math.cos(ang) * 4
            y += math.sin(ang) * 4
            if not (0 <= x < W and 0 <= y < H):
                break
            pts.append((x, y))
        if len(pts) > 2:
            d.line(pts, fill=c, width=2)
    return grain_overlay(img, 4)


def art_rings(W, H, bg, cols):
    y, x = np.mgrid[0:H, 0:W]
    cx, cy = W * rng.uniform(0.35, 0.65), H * rng.uniform(0.35, 0.65)
    r = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / W
    warp = periodic_noise(H, W, 2.6, seed=int(rng.integers(1e6)))
    t = (np.sin((r + warp * 0.08) * 70) * 0.5 + 0.5)
    idx = ((r * 6 + warp) % len(cols)).astype(int)
    pal = np.array(cols, float)
    a = lerp(np.array(bg, float), pal[idx], (t ** 3)[..., None] * np.clip(1.2 - r * 1.5, 0, 1)[..., None])
    return grain_overlay(Image.fromarray(a.astype(np.uint8)), 4)


def art_sea(W, H, sky, sea):
    y = np.linspace(0, 1, H)[:, None]
    hor = 0.55
    a = np.zeros((H, W, 3))
    skyt = np.clip(y / hor, 0, 1)
    a[:] = lerp(np.array(sky[0], float), np.array(sky[1], float), skyt[..., None])
    n = periodic_noise(H, W, 2.0, aniso=(1.0, 10.0), seed=int(rng.integers(1e6)))
    seat = np.clip((y - hor) / (1 - hor), 0, 1)
    seacol = lerp(np.array(sea[0], float), np.array(sea[1], float), seat[..., None])
    seacol = seacol * (0.85 + 0.3 * n[..., None])
    mask = (y > hor)[..., None] * np.ones((1, W, 1))
    a = np.where(mask > 0, seacol, a)
    clouds = periodic_noise(H, W, 2.4, aniso=(1.0, 3.0), seed=int(rng.integers(1e6)))
    cm = np.clip((clouds - 0.55) * 3, 0, 1) * (y < hor * 0.9)
    a = lerp(a, np.array([250, 246, 240], float), cm[..., None] * 0.7)
    return grain_overlay(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)), 5)


def art_night(W, H, moon=(0.72, 0.24), seed=5):
    y = np.linspace(0, 1, H)[:, None, None]
    a = lerp(np.array([8, 12, 32], float), np.array([40, 52, 92], float), y) * np.ones((1, W, 1))
    img = Image.fromarray(a.astype(np.uint8))
    d = ImageDraw.Draw(img)
    for _ in range(900):
        x, yy = rng.uniform(0, W), rng.uniform(0, H * 0.75)
        s = rng.choice([0.6, 1, 1, 1.6, 2.4])
        b = int(rng.uniform(150, 255))
        d.ellipse([x - s, yy - s, x + s, yy + s], fill=(b, b, min(255, b + 15)))
    cx, cy, r = W * moon[0], H * moon[1], W * 0.06
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(246, 240, 214))
    d.ellipse([cx - r * 0.7, cy - r * 1.05, cx + r * 1.3, cy + r * 0.95], fill=(20, 26, 52))
    prof = periodic_noise(1, W, 2.2, seed=seed)[0]
    ys = H * 0.78 - (prof - 0.5) * H * 0.2
    d.polygon([(0, H)] + [(x, ys[x]) for x in range(0, W, 4)] + [(W, H)], fill=(6, 8, 16))
    return grain_overlay(img, 4)


ARTS = [
    ("01-senja-di-lembah", 1600, 1100, lambda W, H: art_landscape(W, H, (52, 70, 120), (246, 170, 120), [(120, 84, 110), (84, 60, 92), (52, 40, 70), (28, 24, 44)])),
    ("02-medan-warna-merah", 1100, 1500, lambda W, H: art_color_field(W, H, [(120, 30, 28), (196, 70, 40), (70, 18, 22)])),
    ("03-komposisi-bauhaus", 1300, 1300, lambda W, H: art_bauhaus(W, H, (236, 226, 204), [(200, 50, 40), (30, 70, 150), (240, 180, 40), (30, 30, 30)])),
    ("04-arus-angin", 1600, 1000, lambda W, H: art_flow(W, H, (240, 236, 228), [(30, 60, 100), (60, 110, 150), (190, 120, 70)])),
    ("05-gema-lingkaran", 1300, 1300, lambda W, H: art_rings(W, H, (20, 24, 30), [(230, 180, 90), (200, 90, 70), (90, 150, 170)])),
    ("06-cakrawala-laut", 1600, 1000, lambda W, H: art_sea(W, H, [(120, 160, 200), (236, 220, 204)], [(70, 110, 140), (20, 50, 70)])),
    ("07-malam-pegunungan", 1600, 1100, lambda W, H: art_night(W, H)),
    ("08-medan-warna-biru", 1100, 1500, lambda W, H: art_color_field(W, H, [(26, 40, 70), (60, 100, 150), (200, 170, 120)])),
    ("09-kabut-pagi", 1600, 1050, lambda W, H: art_landscape(W, H, (200, 214, 222), (236, 232, 222), [(170, 184, 190), (130, 148, 156), (90, 108, 116), (54, 66, 72)], sun=False)),
    ("10-ritme-geometri", 1100, 1450, lambda W, H: art_bauhaus(W, H, (24, 26, 30), [(230, 200, 120), (220, 90, 60), (110, 160, 180), (236, 230, 220)])),
    ("11-aliran-hijau", 1500, 1050, lambda W, H: art_flow(W, H, (18, 30, 26), [(120, 180, 140), (200, 220, 170), (60, 120, 100)])),
    ("12-orbit-emas", 1250, 1250, lambda W, H: art_rings(W, H, (236, 230, 216), [(170, 120, 40), (120, 60, 40), (40, 60, 80)])),
    ("13-pantai-senja", 1600, 1000, lambda W, H: art_sea(W, H, [(90, 70, 120), (246, 170, 130)], [(120, 80, 100), (30, 30, 60)])),
    ("14-gurun-jingga", 1600, 1100, lambda W, H: art_landscape(W, H, (238, 150, 90), (250, 220, 170), [(210, 120, 70), (170, 84, 52), (120, 56, 40)])),
    ("15-medan-warna-hijau", 1100, 1500, lambda W, H: art_color_field(W, H, [(30, 60, 50), (110, 140, 90), (210, 190, 130)])),
    ("16-konstelasi", 1300, 1000, lambda W, H: art_night(W, H, (0.24, 0.2), 99)),
]


def make_arts():
    for name, W, H, fn in ARTS:
        img = fn(W, H)
        img.save(os.path.join(PHOTOS, f"{name}.jpg"), quality=86, optimize=True, progressive=True)
        t = img.copy()
        t.thumbnail((768, 768), Image.LANCZOS)
        t.save(os.path.join(THUMBS, f"{name}.jpg"), quality=82, optimize=True)
        print("art", name, img.size)


if __name__ == "__main__":
    import sys
    only = sys.argv[1:]  # contoh: python tools/generate_assets.py wood
    if not only or "concrete" in only:
        concrete()
    if not only or "wood" in only:
        wood()
    if not only or "plaster" in only:
        plaster()
    if not only or "arts" in only:
        make_arts()
    print("selesai")

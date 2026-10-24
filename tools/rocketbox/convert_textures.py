"""
Konversi tekstur avatar Microsoft Rocketbox (TGA 2048 px) menjadi tekstur web ringan.

    python tools/rocketbox/convert_textures.py <folder Textures avatar> <folder output> [ukuran]

Hasil (default 1024 px):
  body_color.jpg, head_color.jpg       warna (sRGB)
  body_normal.jpg, head_normal.jpg     normal map
  body_rough.jpg, head_rough.jpg       roughness (kanal G) — diturunkan dari specular map
  opacity.png                          rambut/bulu mata (RGBA, untuk alpha mask)
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
os.makedirs(out, exist_ok=True)


def find(suffix):
    hits = glob.glob(os.path.join(src, f"*_{suffix}.tga"))
    if not hits:
        raise SystemExit(f"Tidak ditemukan *_{suffix}.tga di {src}")
    return hits[0]


def load(path, mode):
    im = Image.open(path)
    im = im.convert(mode)
    return im.resize((size, size), Image.LANCZOS)


for part in ("body", "head"):
    load(find(f"{part}_color"), "RGB").save(os.path.join(out, f"{part}_color.jpg"), quality=88, optimize=True)
    load(find(f"{part}_normal"), "RGB").save(os.path.join(out, f"{part}_normal.jpg"), quality=92, optimize=True)
    spec = np.asarray(load(find(f"{part}_specular"), "L"), dtype=np.float32) / 255.0
    # Specular tinggi → permukaan lebih mengkilap (roughness rendah)
    rough = np.clip(0.92 - spec * 0.55, 0.35, 0.95)
    g = (rough * 255).astype(np.uint8)
    rgb = np.stack([np.full_like(g, 255), g, np.zeros_like(g)], axis=-1)  # R=AO(1), G=rough, B=metal(0)
    Image.fromarray(rgb, "RGB").save(os.path.join(out, f"{part}_rough.jpg"), quality=90)

# Rambut/bulu mata: isi warna area transparan dengan warna tepi terdekat (edge padding),
# supaya mipmap tidak memunculkan garis abu-abu di ujung helai rambut.
op = Image.open(find("opacity_color")).convert("RGBA").resize((size, size), Image.LANCZOS)
arr = np.asarray(op, dtype=np.float32)
rgb, a = arr[..., :3], arr[..., 3:] / 255.0
filled = rgb * (a > 0.5)
known = (a > 0.5).astype(np.float32)
for _ in range(24):
    k = known.copy()
    acc = np.zeros_like(filled)
    cnt = np.zeros_like(k)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        acc += np.roll(filled * k, (dy, dx), axis=(0, 1))
        cnt += np.roll(k, (dy, dx), axis=(0, 1))
    grow = (k == 0) & (cnt > 0)
    filled = np.where(grow, acc / np.maximum(cnt, 1), filled)
    known = np.where(grow, 1.0, known)
mean = rgb[(a[..., 0] > 0.5)].mean(axis=0) if (a > 0.5).any() else np.zeros(3)
filled = np.where(known > 0, filled, mean)
padded = np.concatenate([filled, a * 255.0], axis=-1).clip(0, 255).astype(np.uint8)
Image.fromarray(padded, "RGBA").save(os.path.join(out, "opacity.png"), optimize=True)

for f in sorted(os.listdir(out)):
    print(f"{f:20s} {os.path.getsize(os.path.join(out, f)) // 1024:5d} KB")

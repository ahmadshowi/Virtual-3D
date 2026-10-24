import * as THREE from 'three'

/**
 * BoxGeometry dengan UV berskala dunia: 1 unit UV = `tile` meter.
 * Dengan begitu SATU tekstur (repeat 1) bisa dipakai di semua dinding
 * berukuran berbeda tanpa tampak melar — hemat memori & material.
 */
export function worldUVBox(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  // Urutan sisi BoxGeometry: +x, -x, +y, -y, +z, -z (masing-masing 4 vertex)
  const faceDims = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let f = 0; f < 6; f++) {
    const [su, sv] = faceDims[f]
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i
      uv.setXY(idx, (uv.getX(idx) * su) / tile, (uv.getY(idx) * sv) / tile)
    }
  }
  uv.needsUpdate = true
  return g
}

/** Plane horizontal (lantai/plafon) dengan UV berskala dunia */
export function worldUVPlane(w, d, tile = 2) {
  const g = new THREE.PlaneGeometry(w, d)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile)
  uv.needsUpdate = true
  return g
}

/** Tekstur gradien radial (dibuat di canvas, tanpa file) — untuk bayangan & cahaya palsu */
export function radialTexture({ size = 128, inner = 'rgba(0,0,0,0.55)', outer = 'rgba(0,0,0,0)', stretchY = 1 } = {}) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.scale(1, stretchY)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(-size / 2, -size / 2 / stretchY, size, size / stretchY)
  ctx.restore()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Tekstur "sapuan cahaya" lampu sorot di dinding: elips terang di sekitar foto
 * yang memudar ke bawah — meniru cahaya spotlight tanpa biaya lampu real-time.
 */
export function wallWashTexture() {
  const W = 256
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1)) * 2 - 1
      const v = (y / (H - 1)) * 2 - 1 // -1 atas, +1 bawah
      // Elips dengan pusat sedikit di atas, sisi atas lebih tajam (cone dari plafon)
      const vy = v < -0.1 ? (v + 0.1) * 1.6 : (v + 0.1) * 0.85
      const r = Math.sqrt(u * u * 1.0 + vy * vy)
      let a = Math.max(0, 1 - r)
      a = a * a * (3 - 2 * a) // smoothstep
      const i = (y * W + x) * 4
      img.data[i] = 255
      img.data[i + 1] = 222
      img.data[i + 2] = 178
      img.data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

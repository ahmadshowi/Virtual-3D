import { walls, benches, plinths, planters, WALL_HEIGHT } from '../data/museumLayout.js'

/**
 * Collision ringan tanpa physics engine:
 *  - Semua penghalang adalah kotak sejajar sumbu (AABB).
 *  - Karakter = lingkaran di bidang XZ (kapsul vertikal).
 *  - Kamera = raycast terhadap AABB yang sama.
 * Untuk museum yang terdiri dari dinding lurus, ini cepat dan stabil.
 */

function boxFromCenter(x, z, w, d, h, y0 = 0) {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: y0, maxY: y0 + h }
}

export function buildColliders() {
  const list = []
  for (const w of walls) list.push({ ...boxFromCenter(w.x, w.z, w.w, w.d, w.height ?? WALL_HEIGHT), kind: 'wall' })
  for (const b of benches) {
    const along = Math.abs(Math.sin(b.rotY)) > 0.5
    const L = b.length + 0.05
    const D = 0.6
    list.push({ ...boxFromCenter(b.x, b.z, along ? D : L, along ? L : D, 0.48), kind: 'furniture' })
  }
  for (const p of plinths) list.push({ ...boxFromCenter(p.x, p.z, p.size + 0.04, p.size + 0.04, p.height + 0.8), kind: 'furniture' })
  for (const p of planters) list.push({ ...boxFromCenter(p.x, p.z, 0.75, 0.75, 1.6), kind: 'furniture' })
  return list
}

export const colliders = buildColliders()

/**
 * Dorong lingkaran (x,z,r) keluar dari semua AABB.
 * Mengembalikan posisi terkoreksi (memodifikasi objek `pos`).
 */
export function resolveCircle(pos, r) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX))
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ))
      let dx = pos.x - cx
      let dz = pos.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= r * r) continue
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        const push = r - d
        pos.x += (dx / d) * push
        pos.z += (dz / d) * push
      } else {
        // Pusat berada di dalam kotak: keluarkan lewat sisi terdekat
        const left = pos.x - c.minX
        const right = c.maxX - pos.x
        const top = pos.z - c.minZ
        const bottom = c.maxZ - pos.z
        const m = Math.min(left, right, top, bottom)
        if (m === left) pos.x = c.minX - r
        else if (m === right) pos.x = c.maxX + r
        else if (m === top) pos.z = c.minZ - r
        else pos.z = c.maxZ + r
      }
      moved = true
    }
    if (!moved) break
  }
  return pos
}

/**
 * Raycast dari `o` searah `dir` (ternormalisasi) hingga `maxDist`.
 * Mengembalikan jarak tumbukan terdekat (atau maxDist). `pad` memperbesar kotak
 * sedikit agar kamera tidak menempel di permukaan.
 */
export function raycastColliders(o, dir, maxDist, pad = 0.18) {
  let best = maxDist
  for (const c of colliders) {
    if (c.kind !== 'wall') continue
    const t = rayAABB(o, dir, c, pad)
    if (t !== null && t < best) best = t
  }
  return best
}

function rayAABB(o, d, c, pad) {
  let tmin = 0
  let tmax = Infinity
  const axes = [
    ['x', c.minX - pad, c.maxX + pad],
    ['y', c.minY - pad, c.maxY + pad],
    ['z', c.minZ - pad, c.maxZ + pad],
  ]
  for (const [a, lo, hi] of axes) {
    const oa = o[a]
    const da = d[a]
    if (Math.abs(da) < 1e-8) {
      if (oa < lo || oa > hi) return null
    } else {
      let t1 = (lo - oa) / da
      let t2 = (hi - oa) / da
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return null
    }
  }
  return tmin
}

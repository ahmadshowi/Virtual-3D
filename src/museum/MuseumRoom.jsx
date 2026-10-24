import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { walls, floors, HALL, WALL_HEIGHT } from '../data/museumLayout'
import { worldUVBox, worldUVPlane } from '../lib/geometry'
import { useMuseumMaterials } from './useMuseumMaterials'

/**
 * Arsitektur museum: lantai, dinding, plafon, list lantai (skirting),
 * panel cahaya plafon. Geometri yang serupa digabung (merge) agar
 * jumlah draw call tetap kecil.
 */
export default function MuseumRoom() {
  const m = useMuseumMaterials()

  const geo = useMemo(() => {
    // ---- Dinding: satu geometri gabungan untuk semua dinding
    const wallParts = walls.map((w) => {
      const h = w.height ?? WALL_HEIGHT
      const g = worldUVBox(w.w, h, w.d, 2.5)
      g.translate(w.x, h / 2, w.z)
      return g
    })
    const wallsGeo = mergeGeometries(wallParts)
    wallParts.forEach((g) => g.dispose())

    // ---- Skirting (list lantai) di kedua sisi panjang setiap dinding + ujung dinding bebas
    const sk = []
    const H = 0.1
    const D = 0.018
    for (const w of walls) {
      const alongX = w.w > w.d
      const len = (alongX ? w.w : w.d) + 0.002
      const half = (alongX ? w.d : w.w) / 2 + D / 2
      for (const s of [-1, 1]) {
        const g = alongX ? new THREE.BoxGeometry(len, H, D) : new THREE.BoxGeometry(D, H, len)
        g.translate(w.x + (alongX ? 0 : s * half), H / 2, w.z + (alongX ? s * half : 0))
        sk.push(g)
      }
    }
    const skirtingGeo = mergeGeometries(sk)
    sk.forEach((g) => g.dispose())

    // ---- Lantai per zona
    const floorGeos = floors.map((f) => {
      const w = f.maxX - f.minX
      const d = f.maxZ - f.minZ
      const g = worldUVPlane(w, d, f.material === 'wood' ? 1.6 : 3)
      g.rotateX(-Math.PI / 2)
      // Papan kayu memanjang searah sumbu Z (arah ruangan)
      if (f.material === 'wood') {
        const uv = g.attributes.uv
        for (let i = 0; i < uv.count; i++) {
          const u = uv.getX(i)
          uv.setXY(i, uv.getY(i), u)
        }
      }
      g.translate((f.minX + f.maxX) / 2, 0, (f.minZ + f.maxZ) / 2)
      return { ...f, geometry: g }
    })

    // ---- Ambang pintu (strip logam di antara lantai beton & kayu)
    const thresholds = mergeGeometries(
      [-6, 6].map((x) => {
        const g = new THREE.BoxGeometry(0.34, 0.006, 4)
        g.translate(x, 0.003, 0)
        return g
      }),
    )

    // ---- Plafon
    const cw = HALL.maxX - HALL.minX
    const cd = HALL.maxZ - HALL.minZ
    const ceilingGeo = worldUVPlane(cw, cd, 3)
    ceilingGeo.rotateX(Math.PI / 2)
    ceilingGeo.translate(0, WALL_HEIGHT, 0)

    // ---- Panel cahaya plafon: skylight di aula + strip linear di galeri
    const panels = []
    const skylight = new THREE.BoxGeometry(5.0, 0.04, 14)
    skylight.translate(0, WALL_HEIGHT - 0.02, 0)
    panels.push(skylight)
    for (const x of [-12, 12]) {
      for (const dz of [-7.5, 7.5]) {
        const strip = new THREE.BoxGeometry(0.16, 0.04, 6)
        strip.translate(x, WALL_HEIGHT - 0.02, dz)
        panels.push(strip)
      }
    }
    const panelsGeo = mergeGeometries(panels)
    panels.forEach((g) => g.dispose())

    // Bingkai/lis panel skylight
    const trims = []
    const trimSpec = [
      [5.3, 0.12, 0.15, 0, -7.075],
      [5.3, 0.12, 0.15, 0, 7.075],
      [0.15, 0.12, 14.3, -2.575, 0],
      [0.15, 0.12, 14.3, 2.575, 0],
    ]
    for (const [w, h, d, x, z] of trimSpec) {
      const g = new THREE.BoxGeometry(w, h, d)
      g.translate(x, WALL_HEIGHT - h / 2, z)
      trims.push(g)
    }
    const trimGeo = mergeGeometries(trims)
    trims.forEach((g) => g.dispose())

    return { wallsGeo, skirtingGeo, floorGeos, thresholds, ceilingGeo, panelsGeo, trimGeo }
  }, [])

  useEffect(
    () => () => {
      geo.wallsGeo.dispose()
      geo.skirtingGeo.dispose()
      geo.floorGeos.forEach((f) => f.geometry.dispose())
      geo.thresholds.dispose()
      geo.ceilingGeo.dispose()
      geo.panelsGeo.dispose()
      geo.trimGeo.dispose()
    },
    [geo],
  )

  return (
    <group>
      {geo.floorGeos.map((f) => (
        <mesh key={f.id} geometry={f.geometry} material={m[f.material]} receiveShadow />
      ))}
      <mesh geometry={geo.thresholds} material={m.metalDark} />
      <mesh geometry={geo.wallsGeo} material={m.plaster} receiveShadow />
      <mesh geometry={geo.skirtingGeo} material={m.skirting} />
      <mesh geometry={geo.ceilingGeo} material={m.ceiling} />
      <mesh geometry={geo.panelsGeo} material={m.lightPanel} />
      <mesh geometry={geo.trimGeo} material={m.ceiling} />
    </group>
  )
}

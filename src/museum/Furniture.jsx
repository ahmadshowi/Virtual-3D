import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { benches, plinths, planters } from '../data/museumLayout'
import { radialTexture } from '../lib/geometry'

/**
 * Furnitur & dekorasi: bangku galeri, alas patung + patung abstrak, pot tanaman.
 * Material dibuat sekali dan dipakai ulang; tiap jenis objek berbagi geometri.
 * Di bawah setiap objek ada "bayangan kontak" statis (tekstur gradien) —
 * jauh lebih murah daripada bayangan real-time.
 */
export default function Furniture() {
  const mats = useMemo(
    () => ({
      leather: new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.55 }),
      steel: new THREE.MeshStandardMaterial({ color: '#1e1e1e', roughness: 0.32, metalness: 0.85 }),
      plinth: new THREE.MeshStandardMaterial({ color: '#efebe4', roughness: 0.8 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#b07a45', roughness: 0.28, metalness: 1 }),
      marble: new THREE.MeshPhysicalMaterial({ color: '#f2efe9', roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      brushed: new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.35, metalness: 1 }),
      pot: new THREE.MeshStandardMaterial({ color: '#4a4641', roughness: 0.85 }),
      foliage: new THREE.MeshStandardMaterial({ color: '#3d5a34', roughness: 0.95 }),
      shadow: new THREE.MeshBasicMaterial({
        map: radialTexture({ inner: 'rgba(0,0,0,0.6)', outer: 'rgba(0,0,0,0)' }),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    }),
    [],
  )

  const geos = useMemo(() => {
    // Bangku: dudukan empuk + dua kaki rangka baja
    const cushion = new RoundedBoxGeometry(1, 0.12, 0.55, 3, 0.04) // diskalakan per panjang
    const leg = mergeGeometries([
      new THREE.BoxGeometry(0.04, 0.4, 0.5).translate(0, 0.2, 0),
      new THREE.BoxGeometry(0.06, 0.03, 0.5).translate(0, 0.39, 0),
    ])
    const plinth = new RoundedBoxGeometry(1, 1, 1, 2, 0.015)
    const knot = new THREE.TorusKnotGeometry(0.2, 0.065, 160, 24, 2, 3)
    const ring = new THREE.TorusGeometry(0.28, 0.05, 32, 96)
    const sphere = new THREE.SphereGeometry(1, 48, 32)
    const pot = new THREE.CylinderGeometry(0.3, 0.24, 0.7, 40, 1)
    const foliage = makeFoliage()
    const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
    return { cushion, leg, plinth, knot, ring, sphere, pot, foliage, plane }
  }, [])

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose())
      Object.values(mats).forEach((m) => {
        m.map?.dispose()
        m.dispose()
      })
    },
    [geos, mats],
  )

  return (
    <group>
      {benches.map((b) => (
        <group key={b.id} position={[b.x, 0, b.z]} rotation-y={b.rotY}>
          <mesh geometry={geos.cushion} material={mats.leather} position-y={0.47} scale-x={b.length} castShadow receiveShadow />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={geos.leg} material={mats.steel} position-x={s * (b.length / 2 - 0.18)} castShadow />
          ))}
          <mesh geometry={geos.plane} material={mats.shadow} position-y={0.004} scale={[b.length + 0.9, 1, 1.2]} />
        </group>
      ))}

      {plinths.map((p) => (
        <group key={p.id} position={[p.x, 0, p.z]}>
          <mesh geometry={geos.plinth} material={mats.plinth} position-y={p.height / 2} scale={[p.size, p.height, p.size]} castShadow receiveShadow />
          <mesh geometry={geos.plane} material={mats.shadow} position-y={0.004} scale={p.size + 0.7} />
          <Sculpture kind={p.sculpture} y={p.height} geos={geos} mats={mats} />
        </group>
      ))}

      {planters.map((p) => (
        <group key={p.id} position={[p.x, 0, p.z]}>
          <mesh geometry={geos.pot} material={mats.pot} position-y={0.35} castShadow receiveShadow />
          <mesh geometry={geos.foliage} material={mats.foliage} position-y={1.08} castShadow />
          <mesh geometry={geos.plane} material={mats.shadow} position-y={0.004} scale={1.1} />
        </group>
      ))}
    </group>
  )
}

function Sculpture({ kind, y, geos, mats }) {
  if (kind === 'knot')
    return <mesh geometry={geos.knot} material={mats.bronze} position-y={y + 0.33} rotation={[0.3, 0.6, 0]} castShadow />
  if (kind === 'ring')
    return (
      <group position-y={y + 0.36}>
        <mesh geometry={geos.ring} material={mats.brushed} rotation-y={0.5} castShadow />
        <mesh geometry={geos.ring} material={mats.brushed} rotation={[Math.PI / 2, 0.6, 0]} scale={0.72} castShadow />
      </group>
    )
  // 'stack' — batu bertumpuk bergaya marmer
  return (
    <group position-y={y}>
      <mesh geometry={geos.sphere} material={mats.marble} position-y={0.1} scale={[0.24, 0.1, 0.2]} castShadow />
      <mesh geometry={geos.sphere} material={mats.marble} position={[0.02, 0.27, 0]} scale={[0.17, 0.08, 0.15]} rotation-z={0.15} castShadow />
      <mesh geometry={geos.sphere} material={mats.marble} position={[-0.01, 0.4, 0.01]} scale={[0.11, 0.06, 0.1]} rotation-z={-0.2} castShadow />
      <mesh geometry={geos.sphere} material={mats.marble} position={[0, 0.5, 0]} scale={[0.065, 0.045, 0.06]} castShadow />
    </group>
  )
}

/** Semak topiari: bola dengan permukaan bergelombang (displacement noise sederhana) */
function makeFoliage() {
  const ico = new THREE.IcosahedronGeometry(0.42, 5)
  ico.deleteAttribute('normal')
  ico.deleteAttribute('uv')
  const g = mergeVertices(ico) // agar normal halus (bukan faceted)
  ico.dispose()
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n =
      Math.sin(v.x * 23.1 + v.y * 7.3) * 0.5 +
      Math.sin(v.y * 19.7 + v.z * 13.1) * 0.5 +
      Math.sin(v.z * 29.3 + v.x * 11.9) * 0.5
    v.multiplyScalar(1 + n * 0.035)
    v.y *= 1.12
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

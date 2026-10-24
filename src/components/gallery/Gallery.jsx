import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { photos } from '../../data/photos'
import { wallTexts, WALL_HEIGHT } from '../../data/museumLayout'
import PhotoFrame from './PhotoFrame'
import { getGalleryShared, FONT_DISPLAY, FONT_BODY } from './galleryShared'

/**
 * Seluruh galeri: bingkai foto (dari data/photos.js), armatur lampu sorot di plafon
 * (instanced: 1 draw call untuk semua), dan panel teks dinding.
 */
export default function Gallery() {
  return (
    <group>
      {photos.map((p) => (
        <PhotoFrame key={p.id} photo={p} />
      ))}
      <CeilingFixtures />
      {wallTexts.map((t) => (
        <WallText key={t.id} item={t} />
      ))}
    </group>
  )
}

/** Armatur lampu track di plafon, diarahkan ke setiap foto */
function CeilingFixtures() {
  const housing = useRef()
  const lens = useRef()
  const track = useRef()

  const { geos, mats } = useMemo(
    () => ({
      geos: {
        housing: new THREE.CylinderGeometry(0.055, 0.065, 0.2, 20).rotateX(Math.PI / 2),
        lens: new THREE.CircleGeometry(0.05, 20),
        track: new THREE.BoxGeometry(1.4, 0.035, 0.04),
      },
      mats: {
        housing: new THREE.MeshStandardMaterial({ color: '#161616', roughness: 0.4, metalness: 0.6 }),
        lens: new THREE.MeshBasicMaterial({ color: '#fff3df', toneMapped: false }),
      },
    }),
    [],
  )

  useEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3(1, 1, 1)
    const obj = new THREE.Object3D()
    photos.forEach((p, i) => {
      const n = new THREE.Vector3(Math.sin(p.rotationY), 0, Math.cos(p.rotationY))
      const center = new THREE.Vector3(...p.position)
      const pos = center.clone().addScaledVector(n, 1.5)
      pos.y = WALL_HEIGHT - 0.4
      // Rumah lampu menghadap foto (sumbu -Z lokal mengarah ke target)
      obj.position.copy(pos)
      obj.lookAt(center)
      obj.updateMatrix()
      housing.current.setMatrixAt(i, obj.matrix)
      // Lensa di ujung depan rumah lampu
      const fwd = center.clone().sub(pos).normalize()
      const lensObj = new THREE.Object3D()
      lensObj.position.copy(pos).addScaledVector(fwd, 0.101)
      lensObj.lookAt(pos.clone().addScaledVector(fwd, 2))
      lensObj.updateMatrix()
      lens.current.setMatrixAt(i, lensObj.matrix)
      // Rel lampu menempel di plafon, sejajar dinding
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotationY)
      m.compose(new THREE.Vector3(pos.x, WALL_HEIGHT - 0.03, pos.z), q, s)
      track.current.setMatrixAt(i, m)
    })
    ;[housing, lens, track].forEach((r) => {
      r.current.instanceMatrix.needsUpdate = true
      r.current.computeBoundingSphere()
    })
  }, [])

  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose())
      Object.values(mats).forEach((m) => m.dispose())
    },
    [geos, mats],
  )

  return (
    <group>
      <instancedMesh ref={housing} args={[geos.housing, mats.housing, photos.length]} />
      <instancedMesh ref={lens} args={[geos.lens, mats.lens, photos.length]} />
      <instancedMesh ref={track} args={[geos.track, mats.housing, photos.length]} />
      {/* Batang penggantung kecil dari rel ke rumah lampu */}
      {photos.map((p) => {
        const n = [Math.sin(p.rotationY), Math.cos(p.rotationY)]
        return (
          <mesh
            key={p.id}
            position={[p.position[0] + n[0] * 1.5, WALL_HEIGHT - 0.2, p.position[2] + n[1] * 1.5]}
            material={mats.housing}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.32, 6]} />
          </mesh>
        )
      })}
    </group>
  )
}

function WallText({ item }) {
  const shared = getGalleryShared()
  if (item.variant === 'title') {
    return (
      <group position={item.position} rotation-y={item.rotY}>
        <Text font={FONT_DISPLAY} fontSize={0.62} letterSpacing={0.02} color="#2a2622" anchorX="center" anchorY="middle" position-z={0.01}>
          {item.title}
        </Text>
        <Text font={FONT_BODY} fontSize={0.12} letterSpacing={0.06} color="#6d665d" anchorX="center" anchorY="middle" position={[0, -0.6, 0.01]}>
          {item.body}
        </Text>
      </group>
    )
  }
  return (
    <group position={item.position} rotation-y={item.rotY}>
      <mesh geometry={shared.unitPlane} material={shared.label} scale={[1.3, 1.0, 1]} position-z={0.006} />
      <Text font={FONT_DISPLAY} fontSize={0.085} color="#1f1c19" anchorX="left" anchorY="top" position={[-0.55, 0.4, 0.012]}>
        {item.title}
      </Text>
      <Text
        font={FONT_BODY}
        fontSize={0.034}
        lineHeight={1.5}
        maxWidth={1.1}
        color="#4f4942"
        anchorX="left"
        anchorY="top"
        position={[-0.55, 0.24, 0.012]}
      >
        {item.body}
      </Text>
    </group>
  )
}

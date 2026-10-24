import { Suspense, memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text, useTexture } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useStore } from '../../store'
import { getGalleryShared, FONT_DISPLAY, FONT_BODY } from './galleryShared'

const FRAME_DEPTH = 0.05
const FRAME_BORDER = 0.055

/**
 * Satu karya di dinding: bingkai (4 batang digabung jadi 1 geometri),
 * passe-partout, foto bertekstur, sapuan cahaya lampu sorot palsu, dan label.
 * Pivot grup = titik tengah foto tepat di permukaan dinding, +Z lokal = keluar dinding.
 */
function PhotoFrame({ photo }) {
  const shared = getGalleryShared()
  const [w, h] = photo.size
  const matPad = Math.min(w, h) * 0.09
  const ow = w + matPad * 2 // lebar dalam bingkai
  const oh = h + matPad * 2

  const frameGeo = useMemo(() => {
    const b = FRAME_BORDER
    const D = FRAME_DEPTH
    const parts = [
      new THREE.BoxGeometry(ow + 2 * b, b, D).translate(0, oh / 2 + b / 2, D / 2),
      new THREE.BoxGeometry(ow + 2 * b, b, D).translate(0, -oh / 2 - b / 2, D / 2),
      new THREE.BoxGeometry(b, oh, D).translate(-ow / 2 - b / 2, 0, D / 2),
      new THREE.BoxGeometry(b, oh, D).translate(ow / 2 + b / 2, 0, D / 2),
      // papan belakang tipis
      new THREE.BoxGeometry(ow, oh, 0.008).translate(0, 0, 0.004),
    ]
    const g = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    return g
  }, [ow, oh])
  useEffect(() => () => frameGeo.dispose(), [frameGeo])

  const outerW = ow + 2 * FRAME_BORDER
  const outerH = oh + 2 * FRAME_BORDER
  const labelX = outerW / 2 + 0.32

  return (
    <group position={photo.position} rotation-y={photo.rotationY}>
      {/* Sapuan cahaya di dinding */}
      <mesh
        geometry={shared.unitPlane}
        material={shared.wash}
        position={[0, 0.28, 0.004]}
        scale={[outerW * 1.9 + 0.6, outerH * 1.6 + 1.0, 1]}
      />
      <mesh geometry={frameGeo} material={shared.frameMats[photo.frame] ?? shared.frameMats.dark} />
      {/* Passe-partout sedikit menjorok ke dalam bingkai */}
      <mesh geometry={shared.unitPlane} material={shared.matBoard} position-z={0.02} scale={[ow, oh, 1]} />
      <Suspense fallback={<mesh geometry={shared.unitPlane} material={shared.placeholder} position-z={0.025} scale={[w, h, 1]} />}>
        <PhotoImage photo={photo} />
      </Suspense>

      {/* Label karya di samping kanan */}
      <group position={[labelX, -0.32, 0.006]}>
        <mesh geometry={shared.unitPlane} material={shared.label} scale={[0.34, 0.2, 1]} />
        <Text
          font={FONT_DISPLAY}
          fontSize={0.03}
          color="#1f1c19"
          maxWidth={0.29}
          lineHeight={1.05}
          anchorX="left"
          anchorY="top"
          position={[-0.145, 0.075, 0.002]}
        >
          {photo.title}
        </Text>
        <Text
          font={FONT_BODY}
          fontSize={0.0125}
          color="#6b655d"
          anchorX="left"
          anchorY="bottom"
          position={[-0.145, -0.078, 0.002]}
        >
          {Object.values(photo.info ?? {}).slice(0, 2).filter((v) => v && v !== '—').join(' · ') || ' '}
        </Text>
      </group>
    </group>
  )
}

/** Foto bertekstur — dimuat terpisah (lazy) dengan Suspense per bingkai */
function PhotoImage({ photo }) {
  const tex = useTexture(photo.thumb || photo.src)
  const highlighted = useStore((s) => s.nearbyPhotoId === photo.id)
  const [w, h] = photo.size

  const material = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.needsUpdate = true
    return new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.55,
      // Sedikit emissive dari gambar itu sendiri agar warna tetap hidup di ruangan redup
      emissiveMap: tex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.1,
    })
  }, [tex])
  useEffect(() => () => material.dispose(), [material])

  // Transisi halus saat karakter mendekat
  const target = highlighted ? 0.26 : 0.1
  const ref = useRef()
  useFrame((_, dt) => {
    const m = ref.current?.material
    if (m && Math.abs(m.emissiveIntensity - target) > 0.002) {
      m.emissiveIntensity += (target - m.emissiveIntensity) * Math.min(1, dt * 6)
    }
  })

  return <mesh ref={ref} geometry={getGalleryShared().unitPlane} material={material} position-z={0.025} scale={[w, h, 1]} />
}

export default memo(PhotoFrame)

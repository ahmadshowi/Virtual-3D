import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { useAnimations, useGLTF } from '@react-three/drei'

import { characters } from '../../data/exhibition'

// Decoder Draco disalin ke public/draco → tidak ada request ke internet
const DRACO_PATH = '/draco/'

// Kedua karakter dimuat di awal agar ganti karakter di tiket terasa instan
Object.values(characters).forEach((c) => useGLTF.preload(c.url, DRACO_PATH))

/**
 * Model karakter ber-rig + animasi (Idle / Walk / Run).
 * Mengekspos `play(name, timeScale)` ke parent; parent yang memutuskan
 * animasi mana yang aktif berdasarkan kecepatan.
 */
const Character = forwardRef(function Character({ url }, ref) {
  const group = useRef()
  const { scene, animations } = useGLTF(url, DRACO_PATH)
  const { actions } = useAnimations(animations, group)
  const current = useRef(null)

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = false
        // Bounding box skinned mesh tidak ikut animasi → hindari karakter "hilang" di tepi layar
        o.frustumCulled = false
        if (o.material) {
          o.material.envMapIntensity = 0.8
          // Rambut (alpha mask): alpha-to-coverage membuat tepi helai lebih halus dengan MSAA
          if (o.material.alphaTest > 0) o.material.alphaToCoverage = true
        }
      }
    })
  }, [scene])

  useEffect(() => {
    const idle = actions.Idle
    idle?.reset().play()
    current.current = 'Idle'
  }, [actions])

  useImperativeHandle(
    ref,
    () => ({
      play(name, timeScale = 1) {
        const next = actions[name]
        if (!next) return
        next.timeScale = timeScale
        if (current.current === name) return
        const prev = actions[current.current]
        next.reset().setEffectiveWeight(1).fadeIn(0.25).play()
        if (prev) {
          // Sinkronkan fase langkah walk <-> run supaya transisi tidak tersandung
          if ((name === 'Run' && current.current === 'Walk') || (name === 'Walk' && current.current === 'Run')) {
            const ratio = next.getClip().duration / prev.getClip().duration
            next.time = prev.time * ratio
          }
          prev.fadeOut(0.25)
        }
        current.current = name
      },
    }),
    [actions],
  )

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  )
})

export default Character

/** Bayangan blob murah di bawah kaki (dipakai saat bayangan real-time mati) */
export function makeBlobTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.5)')
  g.addColorStop(0.5, 'rgba(0,0,0,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

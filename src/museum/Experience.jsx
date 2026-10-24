import { Suspense } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { useStore } from '../store'
import { getQuality } from '../lib/quality'
import Lighting from './Lighting'
import MuseumRoom from './MuseumRoom'
import Furniture from './Furniture'
import Player from '../components/character/Player'
import Gallery from '../components/gallery/Gallery'

/**
 * Root scene 3D.
 * Pemuatan bertahap:
 *   1. "Inti" (arsitektur, tekstur, karakter) → di-gate oleh loading screen
 *   2. Galeri (font + thumbnail foto) → dimuat setelah inti siap, per bingkai
 */
export default function Experience() {
  const qualityName = useStore((s) => s.settings.quality)
  const coreReady = useStore((s) => s.coreReady)
  const modalOpen = useStore((s) => !!s.openPhotoId)
  const q = getQuality(qualityName)

  return (
    <Canvas
      className="museum-canvas"
      shadows
      dpr={q.dpr}
      // Saat modal foto terbuka, scene diam → render hanya bila perlu (hemat GPU/baterai)
      frameloop={modalOpen ? 'demand' : 'always'}
      camera={{ fov: 55, near: 0.1, far: 80, position: [0, 2.6, 6] }}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
      }}
    >
      <color attach="background" args={['#14120f']} />
      <Suspense fallback={null}>
        <Lighting />
        <MuseumRoom />
        <Furniture />
        <Player />
      </Suspense>
      {coreReady && (
        <Suspense fallback={null}>
          <Gallery />
        </Suspense>
      )}
    </Canvas>
  )
}

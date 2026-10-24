import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { roomLights, WALL_HEIGHT } from '../data/museumLayout'
import { photos } from '../data/photos'
import { playerState } from '../lib/playerState'
import { useStore } from '../store'
import { getQuality } from '../lib/quality'

/**
 * Pencahayaan museum (anggaran lampu dijaga ketat):
 *  1. Environment map (RoomEnvironment, dibuat lokal tanpa file HDR) → cahaya pantul & refleksi
 *  2. Hemisphere light → cahaya pengisi lembut
 *  3. 3 point light hangat (1 per ruangan), tanpa bayangan
 *  4. 1 directional light yang mengikuti karakter → satu-satunya sumber bayangan real-time
 *  5. Kolam lampu sorot (0–4 tergantung kualitas) yang otomatis dipindah ke foto terdekat
 */
export default function Lighting() {
  const quality = getQuality(useStore((s) => s.settings.quality))
  return (
    <>
      <EnvironmentMap />
      <hemisphereLight args={['#fff4e6', '#8a7a68', 0.55]} />
      {roomLights.map((l, i) => (
        <pointLight key={i} position={[l.x, WALL_HEIGHT - 0.7, l.z]} color="#ffdcb4" intensity={l.intensity} decay={2} />
      ))}
      <KeyLight castShadow={quality.shadows} mapSize={quality.shadowMapSize} />
      {quality.spotlights > 0 && <SpotlightPool count={quality.spotlights} key={quality.spotlights} />}
    </>
  )
}

function EnvironmentMap() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envScene = new RoomEnvironment()
    const rt = pmrem.fromScene(envScene, 0.04)
    scene.environment = rt.texture
    scene.environmentIntensity = 0.38
    envScene.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose()
        o.material.dispose()
      }
    })
    pmrem.dispose()
    return () => {
      scene.environment = null
      rt.dispose()
    }
  }, [gl, scene])
  return null
}

function KeyLight({ castShadow, mapSize }) {
  const light = useRef()
  const target = useMemo(() => new THREE.Object3D(), [])
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    scene.add(target)
    return () => scene.remove(target)
  }, [scene, target])

  useFrame(() => {
    const p = playerState.position
    // Snap ke grid shadow-map agar bayangan tidak "berkilau" saat bergerak
    const snap = 0.05
    const x = Math.round(p.x / snap) * snap
    const z = Math.round(p.z / snap) * snap
    light.current.position.set(x + 2.5, 9, z + 3.5)
    target.position.set(x, 0, z)
  })

  return (
    <directionalLight
      ref={light}
      color="#fff1e0"
      intensity={0.7}
      target={target}
      castShadow={castShadow}
      shadow-mapSize={[mapSize, mapSize]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
      shadow-camera-left={-4}
      shadow-camera-right={4}
      shadow-camera-top={4}
      shadow-camera-bottom={-4}
      shadow-camera-near={1}
      shadow-camera-far={20}
    />
  )
}

/**
 * Lampu sorot real-time dengan jumlah tetap (jumlah lampu tetap = shader tidak
 * dikompilasi ulang). Setiap lampu "ditugaskan" ke salah satu foto terdekat
 * dan memudar halus saat berpindah.
 */
const SPOT_INTENSITY = 34
function SpotlightPool({ count }) {
  const scene = useThree((s) => s.scene)
  const slots = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const light = new THREE.SpotLight('#ffe6c4', 0, 0, 0.36, 0.75, 2)
        light.target = new THREE.Object3D()
        return { light, photoIndex: -1, wanted: -1, level: 0 }
      }),
    [count],
  )

  // Data posisi lampu per foto (dihitung sekali)
  const anchors = useMemo(
    () =>
      photos.map((p) => {
        const n = new THREE.Vector3(Math.sin(p.rotationY), 0, Math.cos(p.rotationY))
        const center = new THREE.Vector3(...p.position)
        const lightPos = center.clone().addScaledVector(n, 1.5)
        lightPos.y = WALL_HEIGHT - 0.4
        // Lampu lebih lebar untuk foto besar
        const angle = Math.min(0.62, 0.3 + Math.max(...p.size) * 0.06)
        return { center, lightPos, angle }
      }),
    [],
  )

  useEffect(() => {
    slots.forEach((s) => {
      scene.add(s.light)
      scene.add(s.light.target)
    })
    return () =>
      slots.forEach((s) => {
        scene.remove(s.light)
        scene.remove(s.light.target)
        s.light.dispose()
      })
  }, [scene, slots])

  const timer = useRef(0)
  useFrame((_, dt) => {
    timer.current -= dt
    if (timer.current <= 0) {
      timer.current = 0.35
      // Pilih N foto terdekat
      const p = playerState.position
      const ranked = anchors
        .map((a, i) => ({ i, d: (a.center.x - p.x) ** 2 + (a.center.z - p.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, count)
        .map((r) => r.i)
      const taken = new Set(slots.map((s) => s.photoIndex).filter((i) => ranked.includes(i)))
      const free = ranked.filter((i) => !taken.has(i))
      for (const s of slots) {
        if (ranked.includes(s.photoIndex)) s.wanted = s.photoIndex
        else s.wanted = free.shift() ?? -1
      }
    }
    for (const s of slots) {
      if (s.wanted !== s.photoIndex) {
        // Pudar keluar, lalu pindah
        s.level = Math.max(0, s.level - dt * 3)
        if (s.level === 0) {
          s.photoIndex = s.wanted
          if (s.photoIndex >= 0) {
            const a = anchors[s.photoIndex]
            s.light.position.copy(a.lightPos)
            s.light.target.position.copy(a.center)
            s.light.angle = a.angle
            s.light.target.updateMatrixWorld()
          }
        }
      } else if (s.photoIndex >= 0) {
        s.level = Math.min(1, s.level + dt * 2)
      }
      s.light.intensity = SPOT_INTENSITY * s.level
    }
  })

  return null
}

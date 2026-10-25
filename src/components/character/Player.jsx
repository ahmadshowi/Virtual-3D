import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import Character, { makeBlobTexture } from './Character'
import { keys, stick, consumeMouse } from '../../lib/input'
import { resolveCircle, raycastColliders } from '../../lib/collision'
import { playerState } from '../../lib/playerState'
import { photos } from '../../data/photos'
import { spawn, WALL_HEIGHT } from '../../data/museumLayout'
import { store, canControl, useStore } from '../../store'
import { getQuality } from '../../lib/quality'
import { exhibition, characterUrlFor } from '../../data/exhibition'
import ReadySignal from '../../museum/ReadySignal'

// ---- Parameter gerak (meter, detik)
const WALK_SPEED = 1.7
const RUN_SPEED = 4.2
const ACCEL = 10 // seberapa cepat mencapai kecepatan target
const TURN_SPEED = 10 // kecepatan karakter berputar ke arah gerak
const RADIUS = 0.34 // radius kapsul collision

// ---- Parameter kamera
const HEAD_HEIGHT = 1.55
const SHOULDER = 0.32 // offset ke kanan (over-the-shoulder)
const DIST_MIN = 1.4
const DIST_MAX = 5.0
const PITCH_MIN = -0.35
const PITCH_MAX = 1.05
const MOUSE_SPEED = 0.0024
const FOV_LANDSCAPE = 55
const FOV_PORTRAIT = 72 // layar HP tegak: perlebar pandangan agar ruangan tidak terasa sempit

// ---- Interaksi
const INTERACT_DIST = 2.8

const _v = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _origin = new THREE.Vector3()
const _desired = new THREE.Vector3()
const _look = new THREE.Vector3()
const _cine = new THREE.Vector3()

function resetToSpawn(s) {
  s.pos.set(spawn.x, 0, spawn.z)
  s.vel.set(0, 0, 0)
  s.facing = s.yaw = spawn.yaw
  s.pitch = 0.28
}

/**
 * Pemain: gerak WASD relatif kamera, collision, animasi, kamera orang ketiga,
 * dan deteksi foto terdekat. Seluruhnya berjalan di useFrame
 * (tanpa setState per frame).
 */
export default function Player() {
  const root = useRef()
  const model = useRef()
  const animRef = useRef()
  const blob = useRef()
  const camera = useThree((s) => s.camera)
  const portrait = useThree((s) => s.size.height > s.size.width)
  const quality = getQuality(useStore((s) => s.settings.quality))
  const characterUrl = characterUrlFor(useStore((s) => s.settings.person))

  const blobTex = useMemo(() => makeBlobTexture(), [])
  useEffect(() => () => blobTex.dispose(), [blobTex])

  // State internal (tidak memicu render)
  const st = useRef({
    pos: new THREE.Vector3(spawn.x, 0, spawn.z),
    vel: new THREE.Vector3(),
    facing: spawn.yaw,
    yaw: spawn.yaw, // arah kamera
    pitch: 0.28,
    dist: 3.4,
    distCurrent: 3.4,
    proximityTimer: 0,
    roomTimer: 0,
    blend: 0, // 0 = kamera sinematik (menu), 1 = kamera mengikuti
    cineFrom: new THREE.Vector3(),
    cineLook: new THREE.Vector3(),
    wasPlaying: false,
    t: 0,
  })

  // Data foto untuk deteksi jarak
  const anchors = useMemo(
    () =>
      photos.map((p) => ({
        id: p.id,
        // Foto besar bisa dinikmati dari lebih jauh
        reach: INTERACT_DIST + Math.max(0, Math.max(...p.size) - 1.6) * 0.6,
        x: p.position[0],
        z: p.position[2],
        nx: Math.sin(p.rotationY),
        nz: Math.cos(p.rotationY),
      })),
    [],
  )

  useEffect(() => {
    camera.fov = portrait ? FOV_PORTRAIT : FOV_LANDSCAPE
    camera.updateProjectionMatrix()
  }, [camera, portrait])

  // Hook debug (hanya mode dev): window.__player.set(x, z, yaw)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__player = {
      set(x, z, yaw) {
        st.current.pos.set(x, 0, z)
        if (yaw !== undefined) st.current.yaw = st.current.facing = yaw
      },
      get: () => ({ x: st.current.pos.x, z: st.current.pos.z, yaw: st.current.yaw, blend: st.current.blend }),
    }
    return () => delete window.__player
  }, [])

  // Kamera kembali ke mode sinematik saat kembali ke menu
  useEffect(
    () =>
      store.subscribe(() => {
        const { phase } = store.get()
        if (phase === 'menu' && st.current.blend !== 0) {
          // Kembali ke menu = kembali ke pintu masuk
          st.current.blend = 0
          resetToSpawn(st.current)
        }
      }),
    [],
  )

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20) // cegah lompatan besar saat tab lag
    const s = st.current
    s.t += dt
    const { phase } = store.get()
    const playing = phase === 'playing'
    const control = canControl()
    const settings = store.get().settings

    // ------------------------------------------------ kamera: input mouse
    const m = consumeMouse()
    if (control) {
      const sens = MOUSE_SPEED * settings.sensitivity
      s.yaw -= m.dx * sens
      s.pitch += m.dy * sens * (settings.invertY ? -1 : 1)
      s.pitch = THREE.MathUtils.clamp(s.pitch, PITCH_MIN, PITCH_MAX)
      s.dist = THREE.MathUtils.clamp(s.dist + m.wheel * 0.35, DIST_MIN, DIST_MAX)
    }

    // Arah kamera di bidang XZ
    const fx = -Math.sin(s.yaw)
    const fz = -Math.cos(s.yaw)
    const rx = Math.cos(s.yaw)
    const rz = -Math.sin(s.yaw)

    // ------------------------------------------------ gerak karakter
    let ix = 0
    let iz = 0
    // Joystick didorong sampai tepi = berlari
    const stickLen = Math.hypot(stick.x, stick.y)
    if (control) {
      const f = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0) + stick.y
      const r = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x
      ix = fx * f + rx * r
      iz = fz * f + rz * r
      const len = Math.hypot(ix, iz)
      if (len > 0.05) {
        ix /= len
        iz /= len
      } else {
        ix = iz = 0
      }
    }
    const moving = ix !== 0 || iz !== 0
    const running = moving && (keys.run || stickLen > 0.92)
    const targetSpeed = moving ? (running ? RUN_SPEED : WALK_SPEED) : 0
    const k = 1 - Math.exp(-ACCEL * dt)
    s.vel.x += (ix * targetSpeed - s.vel.x) * k
    s.vel.z += (iz * targetSpeed - s.vel.z) * k
    const speed = Math.hypot(s.vel.x, s.vel.z)

    // Integrasi dengan sub-step agar tidak menembus dinding tipis saat berlari
    const steps = Math.ceil((speed * dt) / 0.1) || 1
    for (let i = 0; i < steps; i++) {
      s.pos.x += (s.vel.x * dt) / steps
      s.pos.z += (s.vel.z * dt) / steps
      resolveCircle(s.pos, RADIUS)
    }

    // Rotasi karakter halus menuju arah gerak (model menghadap -Z pada rotasi 0)
    if (speed > 0.15) {
      const targetFacing = Math.atan2(-s.vel.x, -s.vel.z)
      let diff = targetFacing - s.facing
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      s.facing += diff * (1 - Math.exp(-TURN_SPEED * dt))
    }

    root.current.position.copy(s.pos)
    model.current.rotation.y = s.facing
    if (blob.current) blob.current.position.set(s.pos.x, 0.006, s.pos.z)

    // Animasi berdasarkan kecepatan aktual
    const anim = animRef.current
    if (anim) {
      if (speed < 0.2) anim.play('Idle', 1)
      else if (speed < (WALK_SPEED + RUN_SPEED) / 2) anim.play('Walk', THREE.MathUtils.clamp(speed / WALK_SPEED, 0.5, 1.4))
      else anim.play('Run', THREE.MathUtils.clamp(speed / RUN_SPEED, 0.7, 1.2))
    }

    playerState.position.copy(s.pos)
    playerState.speed = speed
    playerState.viewDir.set(fx, 0, fz)

    // ------------------------------------------------ kamera orang ketiga
    _origin.set(s.pos.x, HEAD_HEIGHT, s.pos.z)
    const cp = Math.cos(s.pitch)
    _desired.set(
      _origin.x - fx * s.dist * cp + rx * SHOULDER,
      _origin.y + Math.sin(s.pitch) * s.dist,
      _origin.z - fz * s.dist * cp + rz * SHOULDER,
    )
    // Collision kamera: raycast dari kepala ke posisi kamera yang diinginkan
    _dir.subVectors(_desired, _origin)
    const want = _dir.length()
    _dir.divideScalar(want)
    let allowed = raycastColliders(_origin, _dir, want)
    // Plafon & lantai
    if (_dir.y > 1e-4) allowed = Math.min(allowed, (WALL_HEIGHT - 0.25 - _origin.y) / _dir.y)
    if (_dir.y < -1e-4) allowed = Math.min(allowed, (0.25 - _origin.y) / _dir.y)
    allowed = Math.max(0.3, allowed)
    // Mendekat seketika (hindari tembus dinding), menjauh perlahan (halus)
    if (allowed < s.distCurrent) s.distCurrent = allowed
    else s.distCurrent += (allowed - s.distCurrent) * (1 - Math.exp(-4 * dt))
    _v.copy(_origin).addScaledVector(_dir, s.distCurrent)
    _look.set(s.pos.x + rx * SHOULDER * 0.6, HEAD_HEIGHT - 0.05, s.pos.z + rz * SHOULDER * 0.6)

    // Sembunyikan karakter bila kamera terlalu dekat (mis. terjepit di sudut)
    model.current.visible = s.distCurrent > 0.55

    if (!playing) {
      // Kamera menu: membingkai karakter dari depan (tiket ada di sisi kiri layar),
      // dengan gerakan "handheld" yang sangat pelan
      const drift = Math.sin(s.t * 0.21) * 0.12
      // (kamera menghadap +Z, jadi sisi kanan layar = arah -X)
      _cine.set(s.pos.x + 0.45 + drift, 1.45 + Math.sin(s.t * 0.17) * 0.04, s.pos.z - 4.4)
      camera.position.copy(_cine)
      s.cineLook.set(s.pos.x + 1.7, 1.2, s.pos.z)
      camera.lookAt(s.cineLook)
      s.cineFrom.copy(_cine)
      s.blend = 0
    } else {
      // Transisi halus dari kamera menu hanya bila jalurnya tidak menembus dinding
      if (s.blend === 0 && (Math.abs(s.pos.x) > 5.5 || s.cineFrom.distanceTo(_v) > 14)) s.blend = 1
      if (s.blend < 1) {
        s.blend = Math.min(1, s.blend + dt / 1.4)
        const e = s.blend * s.blend * (3 - 2 * s.blend)
        camera.position.lerpVectors(s.cineFrom, _v, e)
        _desired.lerpVectors(s.cineLook, _look, e)
        camera.lookAt(_desired)
      } else {
        camera.position.copy(_v)
        camera.lookAt(_look)
      }
    }

    // ------------------------------------------------ deteksi foto terdekat
    s.proximityTimer -= dt
    if (s.proximityTimer <= 0) {
      s.proximityTimer = 0.12
      let best = null
      let bestD = Infinity
      if (playing) {
        for (const a of anchors) {
          const dx = s.pos.x - a.x
          const dz = s.pos.z - a.z
          const d = Math.hypot(dx, dz)
          if (d > a.reach || d > bestD) continue
          // Harus berdiri di depan foto…
          const front = (dx * a.nx + dz * a.nz) / (d || 1)
          if (front < 0.35) continue
          // …dan kamera kurang lebih menghadap foto
          const facing = -(fx * a.nx + fz * a.nz)
          if (facing < 0.1) continue
          best = a.id
          bestD = d
        }
      }
      if (store.get().nearbyPhotoId !== best) store.set({ nearbyPhotoId: best })
    }

    // Nama ruangan untuk HUD
    s.roomTimer -= dt
    if (s.roomTimer <= 0) {
      s.roomTimer = 0.4
      const R = exhibition.rooms
      const room = s.pos.x < -6 ? R.west : s.pos.x > 6 ? R.east : R.hall
      if (store.get().room !== room) store.set({ room })
    }
  })

  return (
    <>
      <group ref={root}>
        <group ref={model}>
          <Suspense fallback={null}>
            <Character key={characterUrl} url={characterUrl} ref={animRef} />
            <ReadySignal />
          </Suspense>
        </group>
      </group>
      {!quality.shadows && (
        <mesh ref={blob} rotation-x={-Math.PI / 2} renderOrder={1}>
          <planeGeometry args={[1.1, 1.1]} />
          <meshBasicMaterial map={blobTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </>
  )
}

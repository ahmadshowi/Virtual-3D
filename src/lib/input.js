/**
 * Status input global berbasis objek (bukan state React) agar bisa dibaca
 * tiap frame di dalam useFrame tanpa memicu render ulang.
 */
export const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  run: false,
}

const KEYMAP = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
}

/** Akumulasi gerakan mouse sejak frame terakhir (dikonsumsi oleh kamera) */
export const mouse = { dx: 0, dy: 0, wheel: 0 }

/** Joystick virtual (layar sentuh): x = kanan, y = maju, panjang vektor 0..1 */
export const stick = { x: 0, y: 0 }

/** True bila perangkat utamanya layar sentuh (HP / tablet) */
export const isTouchDevice =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

/** Geser jari di layar → putar kamera (sama seperti gerakan mouse) */
export function addLook(dx, dy) {
  mouse.dx += dx
  mouse.dy += dy
}

/** Pinch di layar → jarak kamera (sama seperti scroll) */
export function addZoom(amount) {
  mouse.wheel += amount
}

let installed = false
export function installInput() {
  if (installed) return
  installed = true

  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code]
    if (k) {
      keys[k] = true
      if (e.code.startsWith('Arrow')) e.preventDefault()
    }
  })
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code]
    if (k) keys[k] = false
  })
  // Lepas semua tombol jika jendela kehilangan fokus (mencegah karakter "jalan sendiri")
  const releaseAll = () => resetKeys()
  window.addEventListener('blur', releaseAll)
  document.addEventListener('visibilitychange', releaseAll)

  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement) {
      // Batasi lonjakan besar (bug umum di beberapa browser saat lock baru aktif)
      const clamp = (v) => Math.max(-120, Math.min(120, v))
      mouse.dx += clamp(e.movementX)
      mouse.dy += clamp(e.movementY)
    }
  })
  window.addEventListener(
    'wheel',
    (e) => {
      mouse.wheel += Math.sign(e.deltaY)
    },
    { passive: true },
  )
}

export function resetKeys() {
  for (const k in keys) keys[k] = false
  stick.x = 0
  stick.y = 0
}

export function consumeMouse() {
  const out = { dx: mouse.dx, dy: mouse.dy, wheel: mouse.wheel }
  mouse.dx = 0
  mouse.dy = 0
  mouse.wheel = 0
  return out
}

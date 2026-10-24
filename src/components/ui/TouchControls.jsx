import { useEffect, useRef, useState } from 'react'
import { store } from '../../store'
import { stick, addLook, addZoom } from '../../lib/input'

const STICK_RADIUS = 48 // jarak maksimum knob dari pusat (px)
const LOOK_SPEED = 1.6 // geser jari terasa lebih lambat dari mouse → diperbesar
const PINCH_SPEED = 0.012

function hideHelp() {
  if (!store.get().helpHidden) store.set({ helpHidden: true })
}

/**
 * Kontrol layar sentuh:
 *   - joystick di kiri bawah untuk berjalan (didorong sampai tepi = berlari)
 *   - geser satu jari di layar untuk memutar kamera
 *   - cubit (pinch) dua jari untuk mengatur jarak kamera
 */
export default function TouchControls({ stageRef }) {
  const knob = useRef(null)
  const active = useRef(null) // { id, cx, cy }
  const [running, setRunning] = useState(false)

  // ------------------------------------------------ joystick
  const moveStick = (e) => {
    const a = active.current
    if (!a || e.pointerId !== a.id) return
    let dx = e.clientX - a.cx
    let dy = e.clientY - a.cy
    const len = Math.hypot(dx, dy)
    if (len > STICK_RADIUS) {
      dx *= STICK_RADIUS / len
      dy *= STICK_RADIUS / len
    }
    stick.x = dx / STICK_RADIUS
    stick.y = -dy / STICK_RADIUS
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`
    setRunning(Math.hypot(stick.x, stick.y) > 0.92)
  }

  const onStickDown = (e) => {
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    active.current = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
    e.currentTarget.setPointerCapture(e.pointerId)
    hideHelp()
    moveStick(e)
  }

  const onStickUp = (e) => {
    if (!active.current || e.pointerId !== active.current.id) return
    active.current = null
    stick.x = 0
    stick.y = 0
    knob.current.style.transform = ''
    setRunning(false)
  }

  // Lepas joystick bila komponen hilang (mis. modal foto terbuka)
  useEffect(
    () => () => {
      stick.x = 0
      stick.y = 0
    },
    [],
  )

  // ------------------------------------------------ geser & pinch di layar 3D
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const pts = new Map()
    let pinchDist = 0

    const spread = () => {
      const [a, b] = [...pts.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const onDown = (e) => {
      if (e.pointerType !== 'touch') return
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) pinchDist = spread()
      hideHelp()
    }
    const onMove = (e) => {
      const p = pts.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (pts.size === 1) {
        addLook(dx * LOOK_SPEED, dy * LOOK_SPEED)
      } else if (pts.size === 2) {
        const d = spread()
        addZoom((pinchDist - d) * PINCH_SPEED)
        pinchDist = d
      }
    }
    const onUp = (e) => {
      pts.delete(e.pointerId)
      if (pts.size === 2) pinchDist = spread()
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [stageRef])

  return (
    <div
      className={`joystick ${running ? 'is-running' : ''}`}
      onPointerDown={onStickDown}
      onPointerMove={moveStick}
      onPointerUp={onStickUp}
      onPointerCancel={onStickUp}
      aria-hidden="true"
    >
      <span ref={knob} className="joystick__knob" />
    </div>
  )
}

import { useEffect, useRef } from 'react'

/** Penghitung FPS ringan — memperbarui DOM langsung, tanpa render ulang React */
export default function FpsCounter() {
  const el = useRef(null)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf
    const loop = (t) => {
      frames++
      if (t - last >= 500) {
        if (el.current) el.current.textContent = `${Math.round((frames * 1000) / (t - last))} FPS`
        frames = 0
        last = t
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={el} className="fps tabular">– FPS</div>
}

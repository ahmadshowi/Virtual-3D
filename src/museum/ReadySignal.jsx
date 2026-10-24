import { useEffect } from 'react'
import { store } from '../store'

/**
 * Dirender di dalam Suspense yang sama dengan karakter. Efeknya baru berjalan setelah
 * semua aset inti (ruangan + karakter) selesai dimuat → loading screen boleh ditutup.
 */
export default function ReadySignal() {
  useEffect(() => {
    // Beri 1 frame agar shader sempat dikompilasi sebelum loading screen hilang
    const id = requestAnimationFrame(() => {
      const s = store.get()
      store.set({ coreReady: true, phase: s.phase === 'loading' ? 'menu' : s.phase })
    })
    return () => cancelAnimationFrame(id)
  }, [])
  return null
}

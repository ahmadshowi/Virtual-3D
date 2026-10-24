import { useEffect } from 'react'
import { store } from '../store'
import { resetKeys, consumeMouse } from '../lib/input'
import { playUiClick } from '../lib/audio'

/** Meminta pointer lock dengan aman (beberapa browser mengembalikan Promise yang bisa ditolak) */
export function lockPointer(el) {
  // Layar sentuh tidak memakai pointer lock — kamera digerakkan dengan geser jari
  if (!el || store.get().touch || document.pointerLockElement === el) return
  try {
    const r = el.requestPointerLock?.()
    if (r && typeof r.catch === 'function') r.catch(() => {})
  } catch {
    /* diabaikan: pengguna cukup klik lagi */
  }
}

export function unlockPointer() {
  if (document.pointerLockElement) document.exitPointerLock()
}

export function openPhoto(id) {
  resetKeys()
  unlockPointer()
  playUiClick()
  store.set({ openPhotoId: id })
}

export function closePhoto(relockEl) {
  consumeMouse() // buang input mouse/scroll yang terkumpul selama modal terbuka
  store.set({ openPhotoId: null })
  if (relockEl) lockPointer(relockEl)
}

/**
 * Pintasan keyboard tingkat aplikasi:
 *   E   – buka foto terdekat / tutup modal
 *   Esc – tutup modal / tutup pengaturan
 *   H   – tampilkan/sembunyikan panduan kontrol
 */
export function useGameControls(stageRef) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return
      const s = store.get()
      if (s.phase !== 'playing') return

      if (e.code === 'KeyE') {
        if (s.openPhotoId) closePhoto(stageRef.current)
        else if (s.nearbyPhotoId && !s.settingsOpen) openPhoto(s.nearbyPhotoId)
      } else if (e.code === 'Escape') {
        if (s.openPhotoId) closePhoto()
        else if (s.settingsOpen) store.set({ settingsOpen: false })
      } else if (e.code === 'KeyH' && !s.openPhotoId) {
        store.set({ helpHidden: !s.helpHidden })
      }
    }
    const onLockChange = () => {
      store.set({ pointerLocked: document.pointerLockElement === stageRef.current })
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerlockchange', onLockChange)
    }
  }, [stageRef])
}

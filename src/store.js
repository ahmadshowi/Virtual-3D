import { useSyncExternalStore } from 'react'
import { isTouchDevice } from './lib/input'

/**
 * Store global minimalis (tanpa library tambahan).
 * Komponen hanya re-render bila bagian state yang dipilihnya berubah,
 * sehingga loop 3D (useFrame) tidak memicu render ulang React.
 */
function createStore(initial) {
  let state = initial
  const listeners = new Set()
  const get = () => state
  const set = (partial) => {
    const next = typeof partial === 'function' ? partial(state) : partial
    let changed = false
    for (const k in next) if (!Object.is(state[k], next[k])) changed = true
    if (!changed) return
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }
  const subscribe = (l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }
  return { get, set, subscribe }
}

const SETTINGS_KEY = 'virtual-museum-settings-v1'
const defaultSettings = {
  quality: isTouchDevice ? 'low' : 'medium', // 'low' | 'medium' | 'high' — HP mulai dari 'low'
  sound: true,
  sensitivity: 1, // 0.4 .. 2
  invertY: false,
  showFps: false,
  person: 'a', // id orang di data/exhibition.js → menentukan karakter
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    /* localStorage tidak tersedia — pakai default */
  }
  return { ...defaultSettings }
}

export const store = createStore({
  /** 'loading' → 'menu' → 'playing' */
  phase: 'loading',
  coreReady: false,
  room: 'Aula Utama',
  nearbyPhotoId: null,
  openPhotoId: null,
  pointerLocked: false,
  settingsOpen: false,
  helpHidden: false,
  /** Kontrol layar sentuh aktif (joystick + geser untuk melihat) */
  touch: isTouchDevice,
  settings: loadSettings(),
})

export function useStore(selector) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()))
}

export function updateSettings(patch) {
  const settings = { ...store.get().settings, ...patch }
  store.set({ settings })
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* abaikan */
  }
}

/** True bila pemain boleh bergerak (tidak ada modal / menu terbuka) */
export function canControl() {
  const s = store.get()
  return s.phase === 'playing' && !s.openPhotoId && !s.settingsOpen
}

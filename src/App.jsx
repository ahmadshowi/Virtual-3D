import { useEffect, useRef } from 'react'
import Experience from './museum/Experience'
import LoadingScreen from './components/ui/LoadingScreen'
import TicketIntro from './components/ui/TicketIntro'
import HUD from './components/ui/HUD'
import PhotoModal from './components/ui/PhotoModal'
import SettingsPanel from './components/ui/SettingsPanel'
import FpsCounter from './components/ui/FpsCounter'
import { store, useStore, canControl } from './store'
import { installInput } from './lib/input'
import { setAudioEnabled } from './lib/audio'
import { preloadMusic, setMusicEnabled } from './lib/music'
import { useGameControls, lockPointer } from './hooks/useGameControls'

installInput()

export default function App() {
  const stageRef = useRef(null)
  const phase = useStore((s) => s.phase)
  const sound = useStore((s) => s.settings.sound)
  const music = useStore((s) => s.settings.music)
  const showFps = useStore((s) => s.settings.showFps)

  useGameControls(stageRef)
  useEffect(() => setAudioEnabled(sound), [sound])
  useEffect(() => setMusicEnabled(sound && music), [sound, music])

  // Siapkan player musik saat tiket tampil, supaya bisa langsung berbunyi saat tiket disobek
  useEffect(() => {
    if (phase === 'menu') preloadMusic()
  }, [phase])

  // Laptop layar sentuh: ikuti input yang terakhir dipakai (jari atau mouse)
  useEffect(() => {
    const onPointer = (e) => {
      if (e.pointerType === 'touch') store.set({ touch: true })
      else if (e.pointerType === 'mouse') store.set({ touch: false })
    }
    window.addEventListener('pointerdown', onPointer, true)
    return () => window.removeEventListener('pointerdown', onPointer, true)
  }, [])

  // Klik di area 3D → kunci kursor untuk kontrol kamera
  const onStagePointerDown = (e) => {
    if (e.pointerType !== 'touch' && canControl()) lockPointer(stageRef.current)
  }

  return (
    <div className="app">
      <div ref={stageRef} className="stage" onPointerDown={onStagePointerDown}>
        <Experience />
      </div>

      {phase === 'loading' && <LoadingScreen />}
      {phase === 'menu' && <TicketIntro stageRef={stageRef} />}
      {phase === 'playing' && <HUD stageRef={stageRef} />}
      <PhotoModal stageRef={stageRef} />
      <SettingsPanel />
      {showFps && <FpsCounter />}
    </div>
  )
}

// Untuk debugging di console browser: window.__museum.get()
if (import.meta.env.DEV) window.__museum = store

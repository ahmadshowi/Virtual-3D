import { photos } from '../../data/photos'
import { store, useStore, updateSettings } from '../../store'
import { unlockPointer, openPhoto } from '../../hooks/useGameControls'
import ControlsList from './ControlsList'
import TouchControls from './TouchControls'
import { IconSound, IconMute, IconSettings, IconExit, IconEye } from './icons'

const byId = Object.fromEntries(photos.map((p) => [p.id, p]))

export default function HUD({ stageRef }) {
  const room = useStore((s) => s.room)
  const nearby = useStore((s) => s.nearbyPhotoId)
  const modalOpen = useStore((s) => !!s.openPhotoId)
  const locked = useStore((s) => s.pointerLocked)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const helpHidden = useStore((s) => s.helpHidden)
  const sound = useStore((s) => s.settings.sound)
  const touch = useStore((s) => s.touch)

  const nearbyPhoto = nearby ? byId[nearby] : null
  const overlayOpen = modalOpen || settingsOpen

  return (
    <div className={`hud ${overlayOpen ? 'hud--dimmed' : ''} ${touch ? 'hud--touch' : ''}`}>
      <div className="hud__room">
        <span className="hud__room-name">{room}</span>
      </div>

      <div className="hud__actions">
        <button
          className="icon-btn"
          onClick={() => updateSettings({ sound: !sound })}
          aria-label={sound ? 'Matikan suara' : 'Nyalakan suara'}
          title={sound ? 'Matikan suara' : 'Nyalakan suara'}
        >
          {sound ? <IconSound /> : <IconMute />}
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            unlockPointer()
            store.set({ settingsOpen: true })
          }}
          aria-label="Pengaturan"
          title="Pengaturan"
        >
          <IconSettings />
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            unlockPointer()
            store.set({ phase: 'menu', settingsOpen: false, openPhotoId: null, nearbyPhotoId: null })
          }}
          aria-label="Keluar ke pintu masuk"
          title="Keluar ke pintu masuk"
        >
          <IconExit />
        </button>
      </div>

      {touch && <TouchControls stageRef={stageRef} />}

      {touch && !helpHidden && !overlayOpen && (
        <div className="hud__touch-hint">Joystick untuk jalan · geser layar untuk melihat</div>
      )}

      {!touch && !helpHidden && (
        <div className="hud__help">
          <ControlsList compact />
          <span className="hud__help-hint">
            <kbd>H</kbd> sembunyikan
          </span>
        </div>
      )}

      {!touch && !locked && !overlayOpen && <div className="hud__lock-hint">Klik layar untuk mengendalikan kamera dengan mouse</div>}

      {nearbyPhoto && !overlayOpen && (
        <button className="prompt" onClick={() => openPhoto(nearbyPhoto.id)}>
          <kbd>{touch ? <IconEye /> : 'E'}</kbd>
          <span className="prompt__text">
            <span className="prompt__action">Lihat foto</span>
            <span className="prompt__title">{nearbyPhoto.title}</span>
          </span>
        </button>
      )}
    </div>
  )
}

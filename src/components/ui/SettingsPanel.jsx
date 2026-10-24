import { store, useStore, updateSettings } from '../../store'
import { QUALITY } from '../../lib/quality'
import { exhibition } from '../../data/exhibition'
import { IconClose } from './icons'

export default function SettingsPanel() {
  const open = useStore((s) => s.settingsOpen)
  const settings = useStore((s) => s.settings)
  if (!open) return null

  const close = () => store.set({ settingsOpen: false })

  return (
    <div className="modal modal--settings" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="settings">
        <div className="settings__head">
          <h2 id="settings-title">Pengaturan</h2>
          <button className="icon-btn" onClick={close} aria-label="Tutup pengaturan">
            <IconClose />
          </button>
        </div>

        <div className="settings__row settings__row--stack">
          <span className="label">Kualitas grafis</span>
          <div className="segmented" role="radiogroup" aria-label="Kualitas grafis">
            {Object.entries(QUALITY).map(([key, q]) => (
              <button
                key={key}
                role="radio"
                aria-checked={settings.quality === key}
                className={settings.quality === key ? 'is-active' : ''}
                onClick={() => updateSettings({ quality: key })}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="settings__note">
            {settings.quality === 'low' && 'Resolusi render dikurangi, tanpa lampu sorot real-time. Untuk laptop dengan GPU terintegrasi.'}
            {settings.quality === 'medium' && 'Seimbang: 2 lampu sorot real-time di foto terdekat, bayangan sederhana.'}
            {settings.quality === 'high' && '4 lampu sorot real-time dan bayangan karakter real-time. Butuh GPU lebih kuat.'}
          </p>
        </div>

        <div className="settings__row settings__row--stack">
          <span className="label">Karakter</span>
          <div className="segmented" role="radiogroup" aria-label="Karakter">
            {exhibition.people.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={settings.person === p.id}
                className={settings.person === p.id ? 'is-active' : ''}
                onClick={() => updateSettings({ person: p.id })}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <label className="settings__row">
          <span>Suara</span>
          <input type="checkbox" className="switch" checked={settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </label>

        <label className="settings__row settings__row--stack">
          <span className="settings__split">
            <span>Sensitivitas kamera</span>
            <span className="tabular">{settings.sensitivity.toFixed(1)}×</span>
          </span>
          <input
            type="range"
            min="0.4"
            max="2"
            step="0.1"
            value={settings.sensitivity}
            onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
          />
        </label>

        <label className="settings__row">
          <span>Balik sumbu Y kamera</span>
          <input type="checkbox" className="switch" checked={settings.invertY} onChange={(e) => updateSettings({ invertY: e.target.checked })} />
        </label>

        <label className="settings__row">
          <span>Tampilkan FPS</span>
          <input type="checkbox" className="switch" checked={settings.showFps} onChange={(e) => updateSettings({ showFps: e.target.checked })} />
        </label>
      </div>
    </div>
  )
}

const CONTROLS = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Berjalan' },
  { keys: ['Shift'], label: 'Berlari' },
  { keys: ['Mouse'], label: 'Arah pandang' },
  { keys: ['Scroll'], label: 'Jarak kamera' },
  { keys: ['E'], label: 'Lihat foto' },
  { keys: ['Esc'], label: 'Lepas kursor / tutup' },
]

export default function ControlsList({ compact = false }) {
  return (
    <ul className={`controls ${compact ? 'controls--compact' : ''}`}>
      {CONTROLS.map((c) => (
        <li key={c.label}>
          <span className="controls__keys">
            {c.keys.map((k) => (
              <kbd key={k}>{k}</kbd>
            ))}
          </span>
          <span className="controls__label">{c.label}</span>
        </li>
      ))}
    </ul>
  )
}

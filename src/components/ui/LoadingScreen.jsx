import { useProgress } from '@react-three/drei'
import { exhibition } from '../../data/exhibition'

export default function LoadingScreen() {
  const { progress } = useProgress()
  const pct = Math.round(progress)
  const names = exhibition.people.map((p) => p.name).join(' & ')

  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading__inner">
        <p className="loading__title">{names}</p>
        <div className="progress" aria-label={`Memuat ${pct}%`}>
          <div className="progress__bar" style={{ transform: `scaleX(${Math.max(0.02, progress / 100)})` }} />
        </div>
        <p className="loading__meta">
          <span>menyiapkan ruangan</span>
          <span className="tabular mono">{pct}%</span>
        </p>
      </div>
    </div>
  )
}

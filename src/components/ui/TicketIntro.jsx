import { useMemo, useRef, useState } from 'react'
import { store, useStore, updateSettings } from '../../store'
import { QUALITY } from '../../lib/quality'
import { initAudio, playUiClick } from '../../lib/audio'
import { playMusic } from '../../lib/music'
import { lockPointer } from '../../hooks/useGameControls'
import { photos } from '../../data/photos'
import { exhibition, characters } from '../../data/exhibition'

const VISITS_KEY = 'virtual-museum-visits'

function readVisits() {
  try {
    return parseInt(localStorage.getItem(VISITS_KEY) || '0', 10) || 0
  } catch {
    return 0
  }
}
function saveVisits(n) {
  try {
    localStorage.setItem(VISITS_KEY, String(n))
  } catch {
    /* abaikan */
  }
}

const pad = (n, len = 2) => String(n).padStart(len, '0')
const fmtDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`

/** Barcode dekoratif yang konsisten untuk nomor tiket tertentu */
function barcodeFor(seed) {
  let x = seed * 9301 + 49297
  const bars = []
  for (let i = 0; i < 34; i++) {
    x = (x * 9301 + 49297) % 233280
    bars.push(1 + Math.floor((x / 233280) * 3))
  }
  return bars
}

/**
 * Pintu masuk: sebuah tiket. Pilih siapa yang masuk, lalu sobek bagian kanannya.
 */
export default function TicketIntro({ stageRef }) {
  const quality = useStore((s) => s.settings.quality)
  const person = useStore((s) => s.settings.person)
  const [torn, setTorn] = useState(false)
  const visit = useMemo(() => readVisits() + 1, [])
  const ticketNo = pad(visit + 120, 6)
  const bars = useMemo(() => barcodeFor(visit + 120), [visit])
  const today = useMemo(() => fmtDate(new Date()), [])
  const since = useMemo(() => fmtDate(new Date(exhibition.since)), [])
  const rooms = Object.keys(exhibition.rooms).length
  const tearing = useRef(false)

  const tear = () => {
    if (tearing.current) return
    tearing.current = true
    initAudio()
    playUiClick()
    playMusic()
    saveVisits(visit)
    // Kunci kursor SEKARANG selagi masih dalam gestur klik (aturan browser)
    lockPointer(stageRef.current)
    setTorn(true)
    setTimeout(() => store.set({ phase: 'playing', settingsOpen: false }), 750)
  }

  return (
    <div className={`entry ${torn ? 'is-torn' : ''}`}>
      <div className="ticket">
        <div className="ticket__main-wrap">
          <section className="ticket__main">
            <header className="ticket__top mono">
              <span>Tiket masuk</span>
              <span>No. {ticketNo}</span>
            </header>

            <h1 className="ticket__title">{exhibition.title}</h1>
            <p className="ticket__sub">{exhibition.subtitle}</p>

            <dl className="ticket__fields">
              <div>
                <dt className="mono">Berdua sejak</dt>
                <dd>{since}</dd>
              </div>
              <div>
                <dt className="mono">Dikunjungi</dt>
                <dd>{today}</dd>
              </div>
              <div>
                <dt className="mono">Isi</dt>
                <dd>
                  {photos.length} foto, {rooms} ruang
                </dd>
              </div>
            </dl>

            <fieldset className="ticket__who">
              <legend className="mono">Masuk sebagai</legend>
              {exhibition.people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={person === p.id}
                  className={`who ${person === p.id ? 'is-picked' : ''}`}
                  onClick={() => updateSettings({ person: p.id })}
                >
                  <span className="who__box" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 13.5c2.2 1.4 3.6 3 4.6 5.2C11 12.8 14.9 8 20.5 4.5" />
                    </svg>
                  </span>
                  <span className="who__name">{p.name}</span>
                  <span className="who__kind mono">{characters[p.character].label}</span>
                </button>
              ))}
            </fieldset>

            <p className="ticket__fine">
              Simpan tiket ini. Karya boleh dilihat dari dekat, tapi jangan disentuh. Kualitas gambar:{' '}
              {Object.entries(QUALITY).map(([key, q], i) => (
                <span key={key}>
                  {i > 0 && ' / '}
                  <button type="button" className={`fine-opt ${quality === key ? 'is-on' : ''}`} onClick={() => updateSettings({ quality: key })}>
                    {q.label.toLowerCase()}
                  </button>
                </span>
              ))}
            </p>
          </section>
        </div>

        <div className="ticket__stub-wrap">
          <button type="button" className="ticket__stub" onClick={tear} autoFocus aria-label="Sobek tiket dan masuk">
            <span className="stub__admit mono">
              Berlaku
              <br />1 orang
            </span>
            <span className="stub__barcode" aria-hidden="true">
              {bars.map((w, i) => (
                <i key={i} style={{ width: w }} />
              ))}
            </span>
            <span className="stub__no mono">{ticketNo}</span>
            <span className="stub__tear mono">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="6" cy="7" r="3" />
                <circle cx="6" cy="17" r="3" />
                <path d="M8.5 8.5 20 18M8.5 15.5 20 6" />
              </svg>
              sobek di sini
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { photos } from '../../data/photos'
import { useStore } from '../../store'
import { closePhoto } from '../../hooks/useGameControls'
import { IconClose } from './icons'

const byId = Object.fromEntries(photos.map((p) => [p.id, p]))

/**
 * Modal foto resolusi penuh. File `src` besar baru diunduh di sini (lazy),
 * sementara thumbnail (sudah ada di cache) tampil lebih dulu sebagai pratinjau.
 */
export default function PhotoModal({ stageRef }) {
  const id = useStore((s) => s.openPhotoId)
  const photo = id ? byId[id] : null
  const touch = useStore((s) => s.touch)
  const [loaded, setLoaded] = useState(false)
  const closeBtn = useRef(null)

  useEffect(() => {
    setLoaded(false)
    if (photo) closeBtn.current?.focus({ preventScroll: true })
  }, [photo])

  if (!photo) return null

  const info = photo.info ? Object.entries(photo.info) : []
  // Dua nilai pertama (mis. tanggal & tempat) tampil sebagai satu baris di atas judul
  const meta = info.slice(0, 2).map(([, v]) => v).filter((v) => v && v !== '—').join(' · ')
  const extra = info.slice(2)

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="photo-title" onMouseDown={(e) => e.target === e.currentTarget && closePhoto()}>
      <div className="modal__card">
        <figure className="modal__figure">
          {photo.thumb && !loaded && <img className="modal__img modal__img--preview" src={photo.thumb} alt="" aria-hidden="true" />}
          <img
            className={`modal__img ${loaded ? 'is-loaded' : ''}`}
            src={photo.src}
            alt={photo.title}
            onLoad={() => setLoaded(true)}
            decoding="async"
          />
          {!loaded && <span className="modal__spinner" aria-label="Memuat foto" />}
        </figure>

        <div className="modal__body">
          {meta && <p className="modal__meta mono">{meta}</p>}
          <h2 id="photo-title" className="modal__title">
            {photo.title}
          </h2>
          <p className="modal__desc">{photo.description}</p>
          {extra.length > 0 && (
            <dl className="modal__info">
              {extra.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="modal__footer">
            <button ref={closeBtn} className="btn btn--ghost" onClick={() => closePhoto(stageRef.current)}>
              Kembali menjelajah
            </button>
            {!touch && (
              <span className="modal__hint">
                <kbd>Esc</kbd> atau <kbd>E</kbd> untuk menutup
              </span>
            )}
          </div>
        </div>

        <button className="modal__close icon-btn" onClick={() => closePhoto()} aria-label="Tutup">
          <IconClose />
        </button>
      </div>
    </div>
  )
}

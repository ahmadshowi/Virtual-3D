/**
 * Musik latar dari YouTube lewat IFrame Player API resmi (player disembunyikan).
 * Lagu tidak diunduh/disimpan — hanya diputar dari YouTube, jadi butuh internet.
 * Player disiapkan lebih awal (preloadMusic) agar playMusic() bisa dipanggil
 * langsung di dalam gestur klik — wajib di iOS/Safari supaya boleh berbunyi.
 */
import { exhibition } from '../data/exhibition'

let player = null
let ready = false
let wantPlay = false
let enabled = true
let apiPromise = null

function loadApi() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => reject(new Error('YouTube API gagal dimuat (offline?)'))
    document.head.appendChild(s)
  })
  return apiPromise
}

function sync() {
  if (!ready) return
  if (wantPlay && enabled) player.playVideo()
  else player.pauseVideo()
}

export function preloadMusic() {
  const id = exhibition.music?.youtubeId
  if (!id || player) return
  const host = document.createElement('div')
  host.className = 'music-player'
  host.setAttribute('aria-hidden', 'true')
  const target = document.createElement('div')
  host.appendChild(target)
  document.body.appendChild(host)

  player = { playVideo() {}, pauseVideo() {} } // placeholder sampai API siap
  loadApi()
    .then((YT) => {
      player = new YT.Player(target, {
        width: 200,
        height: 200,
        videoId: id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: 1,
          playlist: id, // loop di IFrame API butuh playlist berisi video yang sama
          start: exhibition.music.start ?? 0,
          playsinline: 1,
          disablekb: 1,
        },
        events: {
          onReady: () => {
            ready = true
            player.setVolume(Math.round((exhibition.music.volume ?? 0.4) * 100))
            sync()
          },
        },
      })
    })
    .catch((e) => console.warn('[musik]', e.message))
}

/** Panggil di dalam handler klik/ketuk */
export function playMusic() {
  preloadMusic()
  wantPlay = true
  sync()
}

export function stopMusic() {
  wantPlay = false
  sync()
}

export function setMusicEnabled(on) {
  enabled = on
  sync()
}

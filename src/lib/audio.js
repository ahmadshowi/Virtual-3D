/**
 * Audio prosedural dengan Web Audio API — tanpa file suara sama sekali.
 *  - Ambience: "room tone" lembut (noise coklat yang difilter)
 * AudioContext hanya dibuat setelah interaksi pengguna (aturan autoplay browser).
 */
let ctx = null
let master = null
let ambienceGain = null
let enabled = true

function makeNoise(c, seconds = 2, brown = false) {
  const len = c.sampleRate * seconds
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (brown) {
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    } else data[i] = w
  }
  return buf
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume()
    return
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = enabled ? 1 : 0
  master.connect(ctx.destination)

  // Ambience ruangan
  const src = ctx.createBufferSource()
  src.buffer = makeNoise(ctx, 4, true)
  src.loop = true
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 380
  ambienceGain = ctx.createGain()
  ambienceGain.gain.value = 0.05
  src.connect(lp).connect(ambienceGain).connect(master)
  src.start()
}

export function setAudioEnabled(on) {
  enabled = on
  if (master && ctx) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.1)
}

export function playUiClick() {
  if (!ctx || !enabled || ctx.state !== 'running') return
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(880, t)
  o.frequency.exponentialRampToValueAtTime(660, t + 0.08)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.16)
}

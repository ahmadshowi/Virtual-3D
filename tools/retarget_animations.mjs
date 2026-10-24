/**
 * Retarget animasi Idle/Walk/Run dari Soldier.glb ke karakter Mixamo lain
 * (rig "mixamorig"), lalu menyimpannya sebagai GLB baru yang siap dipakai.
 *
 * Kenapa perlu: walau nama tulangnya sama (rig Mixamo), orientasi tulang pinggul & bahu
 * antar karakter berbeda. Animasi dipindahkan di RUANG DUNIA dengan T-pose kedua karakter
 * sebagai acuan:  G_target(t) = G_src(t) · G_src(Tpose)⁻¹ · G_target(Tpose)
 *
 * Pemakaian (sekali saja, hasilnya sudah ada di public/models):
 *   npm i -D @gltf-transform/core
 *   node tools/retarget_animations.mjs tools/animations/Soldier.glb sumber/KarakterMixamo.glb public/models/Karakter.glb
 */
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'

const [srcPath, tgtPath, outPath] = process.argv.slice(2)
if (!outPath) {
  console.log('Pemakaian: node tools/retarget_animations.mjs <sumber-animasi.glb> <karakter.glb> <output.glb>')
  process.exit(1)
}
const CLIPS = ['Idle', 'Walk', 'Run']
const FPS = 30

const io = new NodeIO()
const src = await io.read(srcPath)
const tgt = await io.read(tgtPath)

function rig(doc) {
  const nodes = doc.getRoot().listNodes()
  const byName = Object.fromEntries(nodes.map((n) => [n.getName(), n]))
  const parent = new Map()
  nodes.forEach((n) => n.listChildren().forEach((c) => parent.set(c, n)))
  // Urutan topologis (induk sebelum anak), dimulai dari node 'Character'
  const order = []
  const walk = (n) => {
    order.push(n)
    n.listChildren().forEach(walk)
  }
  walk(byName.Character)
  return { byName, parent, order }
}
const S = rig(src)
const T = rig(tgt)

// Putar root target 180° (Y) bila karakter menghadap +Z, agar seragam menghadap -Z seperti Soldier
const facesPlusZ = (() => {
  const g = globals(T, sampler(tgt, null), null)
  const toe = g.pos.get('mixamorig:LeftToe_End')
  const foot = g.pos.get('mixamorig:LeftFoot')
  return toe && foot && toe.z > foot.z
})()
if (facesPlusZ) {
  const c = T.byName.Character
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).multiply(new THREE.Quaternion(...c.getRotation()))
  c.setRotation(q.toArray())
  console.log('Root target diputar 180° agar menghadap -Z')
}

/** Membuat fungsi sampling pose (TRS lokal per tulang) dari sebuah klip; clip=null → pose rest */
function sampler(doc, clipName) {
  const anim = clipName ? doc.getRoot().listAnimations().find((a) => a.getName() === clipName) : null
  const tracks = new Map()
  if (anim) {
    for (const ch of anim.listChannels()) {
      const s = ch.getSampler()
      tracks.set(ch.getTargetNode().getName() + '.' + ch.getTargetPath(), {
        times: s.getInput().getArray(),
        values: s.getOutput().getArray(),
        size: ch.getTargetPath() === 'rotation' ? 4 : 3,
      })
    }
  }
  return (node, path, t) => {
    const tr = tracks.get(node.getName() + '.' + path)
    if (!tr) return path === 'rotation' ? node.getRotation() : path === 'translation' ? node.getTranslation() : node.getScale()
    const { times, values, size } = tr
    let i = 0
    while (i < times.length - 2 && times[i + 1] < t) i++
    const t0 = times[i]
    const t1 = times[Math.min(i + 1, times.length - 1)]
    const a = t1 > t0 ? THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1) : 0
    const v0 = Array.from(values.slice(i * size, i * size + size))
    const j = Math.min(i + 1, times.length - 1)
    const v1 = Array.from(values.slice(j * size, j * size + size))
    if (size === 4) return new THREE.Quaternion(...v0).slerp(new THREE.Quaternion(...v1), a).toArray()
    return v0.map((x, k) => x + (v1[k] - x) * a)
  }
}

/** Rotasi & posisi global setiap node untuk pose tertentu */
function globals(R, sample, t) {
  const rot = new Map()
  const pos = new Map()
  const mat = new Map()
  for (const n of R.order) {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...sample(n, 'translation', t)),
      new THREE.Quaternion(...sample(n, 'rotation', t)),
      new THREE.Vector3(...sample(n, 'scale', t)),
    )
    const p = R.parent.get(n)
    const m = p && mat.has(p) ? mat.get(p).clone().multiply(local) : rootMatrix(R, n).multiply(local)
    mat.set(n, m)
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    m.decompose(v, q, new THREE.Vector3())
    rot.set(n.getName(), q)
    pos.set(n.getName(), v)
  }
  return { rot, pos }
}
function rootMatrix(R, n) {
  // matriks dunia dari induk-induk di atas 'Character' (umumnya identitas)
  const m = new THREE.Matrix4()
  let p = R.parent.get(n)
  const chain = []
  while (p) {
    chain.unshift(p)
    p = R.parent.get(p)
  }
  for (const x of chain)
    m.multiply(new THREE.Matrix4().compose(new THREE.Vector3(...x.getTranslation()), new THREE.Quaternion(...x.getRotation()), new THREE.Vector3(...x.getScale())))
  return m
}

const srcT = globals(S, sampler(src, 'TPose'), 0)
const tgtT = globals(T, sampler(tgt, 'TPose'), 0)
const hipRatio = tgtT.pos.get('mixamorig:Hips').y / srcT.pos.get('mixamorig:Hips').y
const bones = T.order.filter((n) => n.getName().startsWith('mixamorig:'))

// Hapus animasi lama di target
tgt.getRoot().listAnimations().forEach((a) => a.dispose())
const buffer = tgt.getRoot().listBuffers()[0]

for (const clip of CLIPS) {
  const anim = src.getRoot().listAnimations().find((a) => a.getName() === clip)
  const duration = Math.max(...anim.listSamplers().map((s) => s.getInput().getMax([])[0]))
  const frames = Math.round(duration * FPS) + 1
  const times = new Float32Array(frames)
  const rotOut = new Map(bones.map((b) => [b.getName(), new Float32Array(frames * 4)]))
  const hipPos = new Float32Array(frames * 3)
  const sample = sampler(src, clip)

  for (let f = 0; f < frames; f++) {
    const t = Math.min(duration, f / FPS)
    times[f] = t
    const sg = globals(S, sample, t)
    const tg = new Map() // global rotasi target yang sudah dihitung
    for (const b of bones) {
      const name = b.getName()
      const delta = sg.rot.get(name).clone().multiply(srcT.rot.get(name).clone().invert())
      const G = delta.multiply(tgtT.rot.get(name))
      tg.set(name, G)
      const parent = T.parent.get(b)
      const parentG = tg.get(parent.getName()) ?? tgtT.rot.get(parent.getName())
      const local = parentG.clone().invert().multiply(G).normalize()
      // Jaga kontinuitas tanda quaternion antar frame (hindari putaran 360°)
      const arr = rotOut.get(name)
      if (f > 0) {
        const prev = new THREE.Quaternion(arr[(f - 1) * 4], arr[(f - 1) * 4 + 1], arr[(f - 1) * 4 + 2], arr[(f - 1) * 4 + 3])
        if (prev.dot(local) < 0) local.set(-local.x, -local.y, -local.z, -local.w)
      }
      arr.set(local.toArray(), f * 4)
    }
    // Posisi pinggul: perpindahan relatif T-pose, diskalakan sesuai tinggi pinggul
    const d = sg.pos.get('mixamorig:Hips').clone().sub(srcT.pos.get('mixamorig:Hips')).multiplyScalar(hipRatio)
    const world = tgtT.pos.get('mixamorig:Hips').clone().add(d)
    const hips = T.byName['mixamorig:Hips']
    const parentM = globalsMatrixOf(T, T.parent.get(hips))
    const local = world.applyMatrix4(parentM.invert())
    hipPos.set(local.toArray(), f * 3)
  }

  const a = tgt.createAnimation(clip)
  const input = tgt.createAccessor().setType('SCALAR').setArray(times).setBuffer(buffer)
  for (const b of bones) {
    const out = tgt.createAccessor().setType('VEC4').setArray(rotOut.get(b.getName())).setBuffer(buffer)
    const s = tgt.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR')
    a.addSampler(s).addChannel(tgt.createAnimationChannel().setTargetNode(b).setTargetPath('rotation').setSampler(s))
  }
  const hipOut = tgt.createAccessor().setType('VEC3').setArray(hipPos).setBuffer(buffer)
  const hs = tgt.createAnimationSampler().setInput(input).setOutput(hipOut).setInterpolation('LINEAR')
  a.addSampler(hs).addChannel(tgt.createAnimationChannel().setTargetNode(T.byName['mixamorig:Hips']).setTargetPath('translation').setSampler(hs))
  console.log(`${clip}: ${frames} frame, ${duration.toFixed(2)} s`)
}

function globalsMatrixOf(R, node) {
  // matriks dunia node pada pose rest (induk pinggul = 'Character')
  const chain = []
  let c = node
  while (c) {
    chain.unshift(c)
    c = R.parent.get(c)
  }
  const m = new THREE.Matrix4()
  for (const x of chain)
    m.multiply(new THREE.Matrix4().compose(new THREE.Vector3(...x.getTranslation()), new THREE.Quaternion(...x.getRotation()), new THREE.Vector3(...x.getScale())))
  return m
}

// Bersihkan accessor yatim (data animasi lama)
tgt.getRoot().listAccessors().forEach((acc) => {
  if (acc.listParents().length <= 1) acc.dispose()
})
await io.write(outPath, tgt)
console.log('Tersimpan:', outPath)

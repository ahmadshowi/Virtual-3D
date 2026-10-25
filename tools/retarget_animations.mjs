/**
 * Retarget animasi Idle/Walk/Run dari Soldier.glb ke karakter ber-rig gaya Mixamo
 * (rig "mixamorig:*" atau tanpa prefix seperti Ready Player Me), lalu menyimpannya
 * sebagai GLB baru yang siap dipakai.
 *
 * Kenapa perlu: walau nama tulangnya sama, orientasi tulang antar karakter berbeda.
 * Animasi dipindahkan di RUANG DUNIA dengan pose-T kedua karakter sebagai acuan:
 *   G_target(t) = G_src(t) · G_src(Tpose)⁻¹ · G_target(Tpose)
 * Bila target tidak punya klip 'TPose' (mis. bind pose-A), pose-T target dibuat otomatis:
 * setiap tulang diputar (swing) agar arahnya sama dengan arah tulang yang sama di pose-T sumber.
 *
 * Pemakaian:
 *   node tools/retarget_animations.mjs tools/animations/Soldier.glb sumber/Karakter.glb public/models/Karakter.glb
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import * as THREE from 'three'

const [srcPath, tgtPath, outPath] = process.argv.slice(2)
if (!outPath) {
  console.log('Pemakaian: node tools/retarget_animations.mjs <sumber-animasi.glb> <karakter.glb> <output.glb>')
  process.exit(1)
}
const CLIPS = ['Idle', 'Walk', 'Run']
const FPS = 30
const SRC_PREFIX = 'mixamorig:'
// Idle Soldier adalah kuda-kuda tentara (lutut menekuk, kaki maju-mundur). Untuk pengunjung
// museum, pinggul/tulang belakang/kaki didekatkan ke pose rest agar terlihat berdiri santai.
const IDLE_CALM = 0.6
const CALM_BONES = /(^|:)(Hips|Spine\d?|(Left|Right)(UpLeg|Leg|Foot|ToeBase))$/
// Tinggi sendi pinggul saat duduk (dudukan bangku di Furniture.jsx ±0.53 m)
const SEAT_HIP = 0.6

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const src = await io.read(srcPath)
const tgt = await io.read(tgtPath)

// Ekspor ulang Sketchfab menambah akhiran angka di nama tulang (Hips_66) — kembalikan ke nama aslinya
for (const j of tgt.getRoot().listSkins().flatMap((s) => s.listJoints())) {
  const m = j.getName().match(/^(.+)_\d+$/)
  if (m) j.setName(m[1])
}

function rig(doc) {
  const nodes = doc.getRoot().listNodes()
  const byName = Object.fromEntries(nodes.map((n) => [n.getName(), n]))
  const parent = new Map()
  nodes.forEach((n) => n.listChildren().forEach((c) => parent.set(c, n)))
  // Root = node teratas scene yang memuat tulang pinggul
  const hips = nodes.find((n) => /(^|:)Hips$/.test(n.getName()))
  let root = hips
  while (parent.get(root)) root = parent.get(root)
  const prefix = hips.getName().slice(0, -'Hips'.length)
  // Tulang = joint skin (prefix saja tidak cukup untuk rig tanpa prefix seperti Ready Player Me)
  const joints = new Set(doc.getRoot().listSkins().flatMap((s) => s.listJoints()))
  const isBone = (n) => joints.has(n) || (joints.size === 0 && n.getName().startsWith(prefix))
  const order = []
  const walk = (n) => {
    order.push(n)
    n.listChildren().forEach(walk)
  }
  walk(root)
  return { byName, parent, order, root, prefix, isBone }
}
const S = rig(src)
const T = rig(tgt)
const P = T.prefix // prefix tulang target ('mixamorig:' atau '')
const srcName = (tgtName) => SRC_PREFIX + tgtName.slice(P.length)
const hasTPose = tgt.getRoot().listAnimations().some((a) => a.getName() === 'TPose')

// Putar root target 180° (Y) bila karakter menghadap +Z, agar seragam menghadap -Z seperti Soldier
const facesPlusZ = (() => {
  const g = globals(T, sampler(tgt, null), null)
  const toe = g.pos.get(P + 'LeftToe_End')
  const foot = g.pos.get(P + 'LeftFoot')
  return toe && foot && toe.z > foot.z
})()
if (facesPlusZ) {
  const c = T.root
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
    const m = p && mat.has(p) ? mat.get(p).clone().multiply(local) : local
    mat.set(n, m)
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    m.decompose(v, q, new THREE.Vector3())
    rot.set(n.getName(), q)
    pos.set(n.getName(), v)
  }
  return { rot, pos }
}

/** Anak "utama" sebuah tulang untuk menentukan arah tulang (jari tengah untuk tangan, dst.) */
function mainChild(R, node) {
  const kids = node.listChildren().filter((c) => R.isBone(c) && !/Eye$/.test(c.getName()))
  if (!kids.length) return null
  const prefer = ['Spine', 'Neck', 'Head', 'HandMiddle1', 'Leg', 'Foot', 'ToeBase']
  return kids.find((k) => prefer.some((p) => k.getName().endsWith(p) && !k.getName().endsWith('UpLeg'))) ?? kids[0]
}

const srcT = globals(S, sampler(src, 'TPose'), 0)
const tgtT = hasTPose ? globals(T, sampler(tgt, 'TPose'), 0) : syntheticTPose()

/** Pose-T buatan: G_T(bone) = swing(arah_rest → arah_srcT) · G_rest(bone) */
function syntheticTPose() {
  const rest = globals(T, sampler(tgt, null), null)
  const rot = new Map(rest.rot)
  for (const n of T.order) {
    const name = n.getName()
    if (!T.isBone(n) || /Hips$/.test(name)) continue
    const child = mainChild(T, n)
    const sNode = S.byName[srcName(name)]
    const sChild = child && S.byName[srcName(child.getName())]
    let swing
    if (child && sNode && sChild) {
      const dRest = rest.pos.get(child.getName()).clone().sub(rest.pos.get(name)).normalize()
      const dSrc = srcT.pos.get(sChild.getName()).clone().sub(srcT.pos.get(sNode.getName())).normalize()
      swing = new THREE.Quaternion().setFromUnitVectors(dRest, dSrc)
    } else {
      // Ujung rantai: ikuti swing induknya
      const p = T.parent.get(n).getName()
      swing = rot.get(p).clone().multiply(rest.rot.get(p).clone().invert())
    }
    rot.set(name, swing.multiply(rest.rot.get(name)).normalize())
  }
  console.log('Target tanpa klip TPose → pose-T dibuat dari arah tulang')
  return { rot, pos: rest.pos }
}

const hipRatio = tgtT.pos.get(P + 'Hips').y / srcT.pos.get(SRC_PREFIX + 'Hips').y
const bones = T.order.filter((n) => T.isBone(n) && S.byName[srcName(n.getName())])

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
      const sn = srcName(name)
      const delta = sg.rot.get(sn).clone().multiply(srcT.rot.get(sn).clone().invert())
      let G = delta.multiply(tgtT.rot.get(name))
      const parent = T.parent.get(b)
      const parentG = tg.get(parent.getName()) ?? tgtT.rot.get(parent.getName())
      const local = parentG.clone().invert().multiply(G).normalize()
      if (clip === 'Idle' && CALM_BONES.test(name)) {
        local.slerp(new THREE.Quaternion(...b.getRotation()), IDLE_CALM)
        G = parentG.clone().multiply(local) // anak-anaknya mengikuti pose yang sudah ditenangkan
      }
      tg.set(name, G)
      // Jaga kontinuitas tanda quaternion antar frame (hindari putaran 360°)
      const arr = rotOut.get(name)
      if (f > 0) {
        const prev = new THREE.Quaternion(arr[(f - 1) * 4], arr[(f - 1) * 4 + 1], arr[(f - 1) * 4 + 2], arr[(f - 1) * 4 + 3])
        if (prev.dot(local) < 0) local.set(-local.x, -local.y, -local.z, -local.w)
      }
      arr.set(local.toArray(), f * 4)
    }
    // Posisi pinggul: perpindahan relatif pose-T, diskalakan sesuai tinggi pinggul
    const d = sg.pos.get(SRC_PREFIX + 'Hips').clone().sub(srcT.pos.get(SRC_PREFIX + 'Hips')).multiplyScalar(hipRatio)
    if (clip === 'Idle') d.multiplyScalar(1 - IDLE_CALM) // pinggul tidak turun sedalam kuda-kuda
    const world = tgtT.pos.get(P + 'Hips').clone().add(d)
    const hips = T.byName[P + 'Hips']
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
  a.addSampler(hs).addChannel(tgt.createAnimationChannel().setTargetNode(T.byName[P + 'Hips']).setTargetPath('translation').setSampler(hs))
  console.log(`${clip}: ${frames} frame, ${duration.toFixed(2)} s`)
}

// ---- Klip 'Sit': pose duduk statis, dibuat dari arah tulang (Soldier tidak punya animasi duduk).
// Karakter menghadap -Z, kiri = -X. Pinggul diletakkan setinggi SEAT_HIP (dudukan bangku ±0.53 m),
// lalu sudut paha/betis dihitung agar telapak kaki tetap menapak lantai.
{
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z).normalize()
  const pos = (n) => tgtT.pos.get(P + n)
  /** Arah tulang di pose-T sumber (= arah tulang target di pose-T-nya) */
  const dirOf = (name) => {
    const c = mainChild(T, T.byName[name])
    const a = S.byName[srcName(name)]
    const b = c && S.byName[srcName(c.getName())]
    return a && b ? srcT.pos.get(b.getName()).clone().sub(srcT.pos.get(a.getName())).normalize() : null
  }
  const want = {
    [P + 'Spine']: v3(0, 1, 0.06),
    [P + 'Spine1']: v3(0, 1, 0.04),
    [P + 'Spine2']: v3(0, 1, 0),
    [P + 'Neck']: v3(0, 1, -0.08),
    [P + 'Head']: v3(0, 1, -0.05),
  }
  for (const [S_, sx] of [['Left', -1], ['Right', 1]]) {
    const upLegY = SEAT_HIP + pos(S_ + 'UpLeg').y - pos('Hips').y
    const L1 = pos(S_ + 'UpLeg').distanceTo(pos(S_ + 'Leg'))
    const L2 = pos(S_ + 'Leg').distanceTo(pos(S_ + 'Foot'))
    const drop = upLegY - pos(S_ + 'Foot').y
    let dU = v3(sx * 0.04, -0.12, -1)
    let dL
    const need = drop - L1 * -dU.y
    if (need <= L2) {
      const c = need / L2
      dL = new THREE.Vector3(0, -c, -Math.sqrt(1 - c * c)) // betis condong ke depan
    } else {
      const s = Math.min(0.8, (drop - L2) / L1)
      dU = new THREE.Vector3(sx * 0.04, -s, -Math.sqrt(1 - s * s)).normalize() // paha menurun
      dL = new THREE.Vector3(0, -1, 0)
    }
    Object.assign(want, {
      [P + S_ + 'UpLeg']: dU,
      [P + S_ + 'Leg']: dL,
      [P + S_ + 'Arm']: v3(sx * 0.15, -1, -0.3),
      [P + S_ + 'ForeArm']: v3(sx * 0.05, -0.45, -1),
      [P + S_ + 'Hand']: v3(sx * 0.02, -0.7, -1),
    })
  }

  const G = new Map()
  const rotOut = new Map()
  for (const n of T.order) {
    const name = n.getName()
    if (!T.isBone(n)) continue
    const parent = T.parent.get(n)
    const parentG = G.get(parent.getName()) ?? tgtT.rot.get(parent.getName())
    let g
    const d = want[name] && dirOf(name)
    if (d) g = new THREE.Quaternion().setFromUnitVectors(d, want[name]).multiply(tgtT.rot.get(name))
    else if (/(Hips|Foot|ToeBase)$/.test(name)) g = tgtT.rot.get(name).clone() // tegak / telapak rata
    else g = parentG.clone().multiply(tgtT.rot.get(parent.getName()).clone().invert().multiply(tgtT.rot.get(name))) // ikut induk
    G.set(name, g)
    rotOut.set(name, parentG.clone().invert().multiply(g).normalize())
  }

  const a = tgt.createAnimation('Sit')
  const input = tgt.createAccessor().setType('SCALAR').setArray(new Float32Array([0, 1])).setBuffer(buffer)
  for (const b of bones) {
    const q = rotOut.get(b.getName()).toArray()
    const out = tgt.createAccessor().setType('VEC4').setArray(new Float32Array([...q, ...q])).setBuffer(buffer)
    const s = tgt.createAnimationSampler().setInput(input).setOutput(out).setInterpolation('LINEAR')
    a.addSampler(s).addChannel(tgt.createAnimationChannel().setTargetNode(b).setTargetPath('rotation').setSampler(s))
  }
  const hips = T.byName[P + 'Hips']
  const world = new THREE.Vector3(pos('Hips').x, SEAT_HIP, pos('Hips').z)
  const local = world.applyMatrix4(globalsMatrixOf(T, T.parent.get(hips)).invert()).toArray()
  const hipOut = tgt.createAccessor().setType('VEC3').setArray(new Float32Array([...local, ...local])).setBuffer(buffer)
  const hs = tgt.createAnimationSampler().setInput(input).setOutput(hipOut).setInterpolation('LINEAR')
  a.addSampler(hs).addChannel(tgt.createAnimationChannel().setTargetNode(hips).setTargetPath('translation').setSampler(hs))
  console.log('Sit: pose duduk statis')
}

function globalsMatrixOf(R, node) {
  // matriks dunia node pada pose rest
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

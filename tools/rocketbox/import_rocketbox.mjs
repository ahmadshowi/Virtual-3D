/**
 * Import avatar Microsoft Rocketbox → GLB siap pakai untuk museum.
 *
 *   node tools/rocketbox/import_rocketbox.mjs <avatar.glb> <folder-tekstur> <sumber-animasi.glb> <output.glb>
 *
 *   avatar.glb         hasil konversi FBX Rocketbox (FBX2glTF, tanpa tekstur)
 *   folder-tekstur     hasil tools/rocketbox/convert_textures.py
 *   sumber-animasi.glb karakter Mixamo yang punya klip Idle/Walk/Run/TPose (Soldier.glb)
 *
 * Yang dilakukan:
 *   1. Memasang tekstur warna, normal, roughness, dan rambut (alpha mask) ke material.
 *   2. Memutar root 180° agar karakter menghadap -Z (konvensi proyek ini).
 *   3. Retarget animasi dari rig Mixamo ("mixamorig:*") ke rig 3ds Max Biped ("Bip01 *"):
 *      - pose rest Rocketbox (pose-A) diselaraskan ke pose-T sumber per tulang (arah tulang),
 *      - rotasi dipindahkan di ruang dunia:  G_t(t) = G_s(t) · G_s(ref)⁻¹ · G_t(ref)
 *      - perpindahan pinggul diskalakan sesuai tinggi pinggul.
 */
import { NodeIO } from '@gltf-transform/core'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'

const [avatarPath, texDir, srcPath, outPath] = process.argv.slice(2)
if (!outPath) {
  console.log('Pemakaian: node tools/rocketbox/import_rocketbox.mjs <avatar.glb> <folder-tekstur> <sumber-animasi.glb> <output.glb>')
  process.exit(1)
}
const CLIPS = ['Idle', 'Walk', 'Run']
// Idle Soldier adalah kuda-kuda tentara (lutut menekuk). Untuk pengunjung museum,
// tulang badan & kaki ditarik sebagian ke posisi berdiri tegak (pose rest).
const IDLE_CALM = 0.6
const CALM_BONES = /^Bip01 (Pelvis|Spine\d?|[LR] (Thigh|Calf|Foot|Toe0))$/
const FPS = 30
const io = new NodeIO()
const tgt = await io.read(avatarPath)
const src = await io.read(srcPath)

// ------------------------------------------------------------------ peta tulang
const MAP = {
  Hips: 'Pelvis',
  Spine: 'Spine',
  Spine1: 'Spine1',
  Spine2: 'Spine2',
  Neck: 'Neck',
  Head: 'Head',
}
for (const [m, b] of [
  ['Left', 'L'],
  ['Right', 'R'],
]) {
  Object.assign(MAP, {
    [`${m}Shoulder`]: `${b} Clavicle`,
    [`${m}Arm`]: `${b} UpperArm`,
    [`${m}ForeArm`]: `${b} Forearm`,
    [`${m}Hand`]: `${b} Hand`,
    [`${m}UpLeg`]: `${b} Thigh`,
    [`${m}Leg`]: `${b} Calf`,
    [`${m}Foot`]: `${b} Foot`,
    [`${m}ToeBase`]: `${b} Toe0`,
  })
  const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
  fingers.forEach((f, i) => {
    MAP[`${m}Hand${f}1`] = `${b} Finger${i}`
    MAP[`${m}Hand${f}2`] = `${b} Finger${i}1`
    MAP[`${m}Hand${f}3`] = `${b} Finger${i}2`
  })
}
const S_PREFIX = 'mixamorig:'
const T_PREFIX = 'Bip01 '
// target → sumber
const T2S = Object.fromEntries(Object.entries(MAP).map(([s, t]) => [T_PREFIX + t, S_PREFIX + s]))

// Tulang yang diselaraskan arahnya (tulang → anak yang menjadi arah bidik)
const AIM = {}
for (const b of ['L', 'R']) {
  Object.assign(AIM, {
    [`${b} Clavicle`]: `${b} UpperArm`,
    [`${b} UpperArm`]: `${b} Forearm`,
    [`${b} Forearm`]: `${b} Hand`,
    [`${b} Hand`]: `${b} Finger2`,
    [`${b} Thigh`]: `${b} Calf`,
    [`${b} Calf`]: `${b} Foot`,
    [`${b} Foot`]: `${b} Toe0`,
  })
  for (let i = 0; i < 5; i++) {
    AIM[`${b} Finger${i}`] = `${b} Finger${i}1`
    AIM[`${b} Finger${i}1`] = `${b} Finger${i}2`
  }
}

// ------------------------------------------------------------------ util rig
function rig(doc, rootName) {
  const nodes = doc.getRoot().listNodes()
  const byName = Object.fromEntries(nodes.map((n) => [n.getName(), n]))
  const parent = new Map()
  nodes.forEach((n) => n.listChildren().forEach((c) => parent.set(c, n)))
  const order = []
  const walk = (n) => {
    order.push(n)
    n.listChildren().forEach(walk)
  }
  walk(byName[rootName])
  return { byName, parent, order }
}
const trsMatrix = (t, r, s) => new THREE.Matrix4().compose(new THREE.Vector3(...t), new THREE.Quaternion(...r), new THREE.Vector3(...s))
function worldOf(R, node) {
  const chain = []
  for (let c = node; c; c = R.parent.get(c)) chain.unshift(c)
  const m = new THREE.Matrix4()
  for (const x of chain) m.multiply(trsMatrix(x.getTranslation(), x.getRotation(), x.getScale()))
  return m
}

function sampler(doc, clipName) {
  const anim = doc.getRoot().listAnimations().find((a) => a.getName() === clipName)
  if (!anim) throw new Error(`Klip "${clipName}" tidak ada di ${srcPath}`)
  const tracks = new Map()
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler()
    tracks.set(ch.getTargetNode().getName() + '.' + ch.getTargetPath(), {
      times: s.getInput().getArray(),
      values: s.getOutput().getArray(),
      size: ch.getTargetPath() === 'rotation' ? 4 : 3,
    })
  }
  return (node, p, t) => {
    const tr = tracks.get(node.getName() + '.' + p)
    if (!tr) return p === 'rotation' ? node.getRotation() : p === 'translation' ? node.getTranslation() : node.getScale()
    const { times, values, size } = tr
    let i = 0
    while (i < times.length - 2 && times[i + 1] < t) i++
    const j = Math.min(i + 1, times.length - 1)
    const a = times[j] > times[i] ? THREE.MathUtils.clamp((t - times[i]) / (times[j] - times[i]), 0, 1) : 0
    const v0 = Array.from(values.slice(i * size, i * size + size))
    const v1 = Array.from(values.slice(j * size, j * size + size))
    if (size === 4) return new THREE.Quaternion(...v0).slerp(new THREE.Quaternion(...v1), a).toArray()
    return v0.map((x, k) => x + (v1[k] - x) * a)
  }
}

/** Global rotasi & posisi semua node sumber pada waktu t */
function sourcePose(S, sample, t) {
  const rot = new Map()
  const pos = new Map()
  const mat = new Map()
  for (const n of S.order) {
    const local = trsMatrix(sample(n, 'translation', t), sample(n, 'rotation', t), sample(n, 'scale', t))
    const p = S.parent.get(n)
    const m = (p && mat.has(p) ? mat.get(p).clone() : p ? worldOf(S, p) : new THREE.Matrix4()).multiply(local)
    mat.set(n, m)
    const q = new THREE.Quaternion()
    const v = new THREE.Vector3()
    m.decompose(v, q, new THREE.Vector3())
    rot.set(n.getName(), q)
    pos.set(n.getName(), v)
  }
  return { rot, pos }
}

// ------------------------------------------------------------------ 1. tekstur & material
function addTexture(file, mime) {
  const f = path.join(texDir, file)
  return tgt.createTexture(path.basename(file)).setImage(new Uint8Array(fs.readFileSync(f))).setMimeType(mime).setURI(path.basename(file))
}
tgt.getRoot().listTextures().forEach((t) => t.dispose()) // placeholder 1x1 dari FBX2glTF
for (const mat of tgt.getRoot().listMaterials()) {
  const n = mat.getName().toLowerCase()
  const part = n.includes('head') ? 'head' : n.includes('body') ? 'body' : n.includes('opacity') ? 'opacity' : null
  mat.setMetallicFactor(0).setRoughnessFactor(1).setBaseColorFactor([1, 1, 1, 1])
  if (part === 'opacity') {
    mat.setBaseColorTexture(addTexture('opacity.png', 'image/png')).setAlphaMode('MASK').setAlphaCutoff(0.35).setDoubleSided(true).setRoughnessFactor(0.75)
  } else if (part) {
    mat.setBaseColorTexture(addTexture(`${part}_color.jpg`, 'image/jpeg'))
    mat.setNormalTexture(addTexture(`${part}_normal.jpg`, 'image/jpeg'))
    mat.setMetallicRoughnessTexture(addTexture(`${part}_rough.jpg`, 'image/jpeg'))
  }
}

// ------------------------------------------------------------------ 2. arah hadap
const T = rig(tgt, tgt.getRoot().listScenes()[0].listChildren()[0].getName())
const S = rig(src, 'Character')
{
  const toe = new THREE.Vector3().setFromMatrixPosition(worldOf(T, T.byName['Bip01 L Toe0']))
  const foot = new THREE.Vector3().setFromMatrixPosition(worldOf(T, T.byName['Bip01 L Foot']))
  if (toe.z > foot.z) {
    const root = T.order[0]
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).multiply(new THREE.Quaternion(...root.getRotation()))
    root.setRotation(q.toArray())
    console.log('Root diputar 180° → menghadap -Z')
  }
}

// ------------------------------------------------------------------ 3. pose referensi
const srcRef = sourcePose(S, sampler(src, 'TPose'), 0)

// Pose referensi target: rest, dengan tulang anggota badan diarahkan sama seperti T-pose sumber
const tRefRot = new Map()
const tRefMat = new Map()
for (const n of T.order) {
  const name = n.getName()
  const p = T.parent.get(n)
  const parentMat = p ? tRefMat.get(p.getName()) : new THREE.Matrix4()
  const m = parentMat.clone().multiply(trsMatrix(n.getTranslation(), n.getRotation(), n.getScale()))
  const pos = new THREE.Vector3()
  const rot = new THREE.Quaternion()
  m.decompose(pos, rot, new THREE.Vector3())
  const short = name.startsWith(T_PREFIX) ? name.slice(T_PREFIX.length) : null
  const aim = short && AIM[short] ? T.byName[T_PREFIX + AIM[short]] : null
  if (aim && T2S[name] && T2S[T_PREFIX + AIM[short]]) {
    const dirT = new THREE.Vector3(...aim.getTranslation()).applyQuaternion(rot).normalize()
    const sName = T2S[name]
    const sAim = T2S[T_PREFIX + AIM[short]]
    const dirS = srcRef.pos.get(sAim).clone().sub(srcRef.pos.get(sName)).normalize()
    rot.premultiply(new THREE.Quaternion().setFromUnitVectors(dirT, dirS))
    m.compose(pos, rot, new THREE.Vector3(1, 1, 1))
  }
  tRefRot.set(name, rot)
  tRefMat.set(name, m)
}

const pelvisT = tRefMat.get('Bip01 Pelvis')
const hipRatio = new THREE.Vector3().setFromMatrixPosition(pelvisT).y / srcRef.pos.get('mixamorig:Hips').y
console.log('Rasio tinggi pinggul:', hipRatio.toFixed(3))

// ------------------------------------------------------------------ 4. bake animasi
tgt.getRoot().listAnimations().forEach((a) => a.dispose())
const buffer = tgt.getRoot().listBuffers()[0]
const mapped = T.order.filter((n) => T2S[n.getName()] && S.byName[T2S[n.getName()]])
const bip = T.byName['Bip01']
const bipParentWorldInv = worldOf(T, T.parent.get(bip)).invert()
const bipRefPos = new THREE.Vector3().setFromMatrixPosition(tRefMat.get('Bip01'))

for (const clip of CLIPS) {
  const anim = src.getRoot().listAnimations().find((a) => a.getName() === clip)
  const duration = Math.max(...anim.listSamplers().map((s) => s.getInput().getMax([])[0]))
  const frames = Math.round(duration * FPS) + 1
  const times = new Float32Array(frames)
  const out = new Map(mapped.map((b) => [b.getName(), new Float32Array(frames * 4)]))
  const bipPos = new Float32Array(frames * 3)
  const sample = sampler(src, clip)

  for (let f = 0; f < frames; f++) {
    const t = Math.min(duration, f / FPS)
    times[f] = t
    const sp = sourcePose(S, sample, t)
    const G = new Map() // global rotasi target pada frame ini
    for (const n of T.order) {
      const name = n.getName()
      const p = T.parent.get(n)
      const parentG = p ? G.get(p.getName()) : new THREE.Quaternion()
      const sName = T2S[name]
      let g
      if (sName && sp.rot.has(sName)) {
        const delta = sp.rot.get(sName).clone().multiply(srcRef.rot.get(sName).clone().invert())
        g = delta.multiply(tRefRot.get(name))
        let local = parentG.clone().invert().multiply(g).normalize()
        if (clip === 'Idle' && CALM_BONES.test(name)) {
          local = local.slerp(new THREE.Quaternion(...n.getRotation()), IDLE_CALM)
          g = parentG.clone().multiply(local) // anak-anaknya mengikuti pose yang sudah ditenangkan
        }
        const arr = out.get(name)
        if (f > 0) {
          const prev = new THREE.Quaternion().fromArray(arr, (f - 1) * 4)
          if (prev.dot(local) < 0) local.set(-local.x, -local.y, -local.z, -local.w)
        }
        local.toArray(arr, f * 4)
      } else {
        g = parentG.clone().multiply(new THREE.Quaternion(...n.getRotation()))
      }
      G.set(name, g)
    }
    const d = sp.pos.get('mixamorig:Hips').clone().sub(srcRef.pos.get('mixamorig:Hips')).multiplyScalar(hipRatio)
    if (clip === 'Idle') d.multiplyScalar(1 - IDLE_CALM) // pinggul tidak turun sedalam kuda-kuda
    bipRefPos.clone().add(d).applyMatrix4(bipParentWorldInv).toArray(bipPos, f * 3)
  }

  const a = tgt.createAnimation(clip)
  const input = tgt.createAccessor().setType('SCALAR').setArray(times).setBuffer(buffer)
  for (const b of mapped) {
    const acc = tgt.createAccessor().setType('VEC4').setArray(out.get(b.getName())).setBuffer(buffer)
    const s = tgt.createAnimationSampler().setInput(input).setOutput(acc).setInterpolation('LINEAR')
    a.addSampler(s).addChannel(tgt.createAnimationChannel().setTargetNode(b).setTargetPath('rotation').setSampler(s))
  }
  const pacc = tgt.createAccessor().setType('VEC3').setArray(bipPos).setBuffer(buffer)
  const ps = tgt.createAnimationSampler().setInput(input).setOutput(pacc).setInterpolation('LINEAR')
  a.addSampler(ps).addChannel(tgt.createAnimationChannel().setTargetNode(bip).setTargetPath('translation').setSampler(ps))
  console.log(`${clip}: ${frames} frame, ${mapped.length} tulang`)
}

await io.write(outPath, tgt)
console.log('Tersimpan:', outPath, `(${(fs.statSync(outPath).size / 1e6).toFixed(2)} MB)`)

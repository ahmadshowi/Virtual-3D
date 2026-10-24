/**
 * Konversi FBX → GLB memakai FBX2glTF (biner Windows/Mac/Linux disertakan paket npm `fbx2gltf`).
 *
 *   node tools/rocketbox/fbx_to_glb.mjs <input.fbx> <output.glb>
 */
import convert from 'fbx2gltf'
import path from 'node:path'

const [input, output] = process.argv.slice(2)
if (!output) {
  console.log('Pemakaian: node tools/rocketbox/fbx_to_glb.mjs <input.fbx> <output.glb>')
  process.exit(1)
}
const dest = await convert(path.resolve(input), path.resolve(output), ['--binary'])
console.log('Tersimpan:', dest)

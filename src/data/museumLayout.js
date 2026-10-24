/**
 * Denah museum (satuan: meter, sumbu Y ke atas).
 *
 *   z = -12  ┌───────────────┬───────────────┬───────────────┐
 *            │  GALERI BARAT │   AULA UTAMA  │  GALERI TIMUR │
 *            │               │               │               │
 *            │      ║        ⌐   (lorong)    ⌐        ║      │
 *            │      ║                                 ║      │
 *            │      ║        ⌙               ⌙        ║      │
 *            │               │     spawn     │               │
 *   z = +12  └───────────────┴───────────────┴───────────────┘
 *         x = -18          x = -6          x = 6           x = 18
 *
 * Dinding didefinisikan sebagai kotak (pusat x,z + lebar w di sumbu X + dalam d di sumbu Z).
 * Kotak yang sama dipakai untuk render DAN collision, sehingga keduanya selalu cocok.
 */

import { exhibition } from './exhibition.js'

export const WALL_HEIGHT = 4.6
export const WALL_T = 0.3
export const HALL = { minX: -18, maxX: 18, minZ: -12, maxZ: 12 }

const T = WALL_T
export const walls = [
  // Dinding luar
  { id: 'north', x: 0, z: -12, w: 36 + T, d: T },
  { id: 'south', x: 0, z: 12, w: 36 + T, d: T },
  { id: 'west', x: -18, z: 0, w: T, d: 24 },
  { id: 'east', x: 18, z: 0, w: T, d: 24 },
  // Sekat dengan pintu selebar 4 m (z -2..2)
  { id: 'part-w-n', x: -6, z: -7, w: T, d: 10 },
  { id: 'part-w-s', x: -6, z: 7, w: T, d: 10 },
  { id: 'part-e-n', x: 6, z: -7, w: T, d: 10 },
  { id: 'part-e-s', x: 6, z: 7, w: T, d: 10 },
  // Dinding pamer berdiri bebas di tengah galeri samping
  { id: 'free-w', x: -12, z: 0, w: 0.4, d: 6, height: 3.4 },
  { id: 'free-e', x: 12, z: 0, w: 0.4, d: 6, height: 3.4 },
]

/** Zona lantai: material berbeda per ruangan */
export const floors = [
  { id: 'hall', material: 'concrete', minX: -6, maxX: 6, minZ: -12, maxZ: 12 },
  { id: 'west', material: 'wood', minX: -18, maxX: -6, minZ: -12, maxZ: 12 },
  { id: 'east', material: 'wood', minX: 6, maxX: 18, minZ: -12, maxZ: 12 },
]

/** Bangku (collider kotak) */
export const benches = [
  { id: 'bench-hall-1', x: 0, z: -3.2, rotY: 0, length: 2.6 },
  { id: 'bench-hall-2', x: 0, z: 3.4, rotY: 0, length: 2.6 },
  { id: 'bench-west', x: -8.9, z: 0, rotY: Math.PI / 2, length: 2.2 },
  { id: 'bench-east', x: 8.9, z: 0, rotY: Math.PI / 2, length: 2.2 },
]

/** Alas patung */
export const plinths = [
  { id: 'plinth-1', x: -3.4, z: -8.2, size: 0.7, height: 1.0, sculpture: 'knot' },
  { id: 'plinth-2', x: 3.4, z: -8.2, size: 0.7, height: 1.0, sculpture: 'stack' },
  { id: 'plinth-3', x: -3.4, z: 8.6, size: 0.6, height: 0.9, sculpture: 'ring' },
]

/** Tanaman pot di sudut (collider lingkaran disederhanakan jadi kotak) */
export const planters = [
  { id: 'plant-1', x: -16.9, z: -10.9 },
  { id: 'plant-2', x: 16.9, z: -10.9 },
  { id: 'plant-3', x: 5.2, z: 11.0 },
  { id: 'plant-4', x: -5.2, z: 11.0 },
]

/**
 * Lampu titik non-bayangan, satu per ruangan (cahaya pengisi hangat).
 * Jumlah lampu sengaja dibatasi: setiap lampu menambah biaya per piksel.
 */
export const roomLights = [
  { x: 0, z: 0, intensity: 30 },
  { x: -12, z: 0, intensity: 24 },
  { x: 12, z: 0, intensity: 24 },
]

/** Panel teks di dinding — isinya diambil dari data/exhibition.js */
const since = new Date(exhibition.since).getFullYear()
export const wallTexts = [
  {
    id: 'title',
    position: [0, 2.7, 11.84],
    rotY: Math.PI,
    title: exhibition.title,
    body: `${exhibition.people.map((p) => p.name).join(' & ')} · sejak ${since}`,
    variant: 'title',
  },
  {
    id: 'about',
    position: [5.84, 1.85, 7],
    rotY: -Math.PI / 2,
    title: exhibition.about.title,
    body: exhibition.about.body,
    variant: 'panel',
  },
]

/** Titik mulai. yaw 0 = menghadap utara (-Z) */
export const spawn = { x: 0, z: 7.6, yaw: 0 }

import * as THREE from 'three'
import { wallWashTexture } from '../../lib/geometry'
import fontUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff?url'
import bodyFontUrl from '@fontsource/inter/files/inter-latin-400-normal.woff?url'

/** Font lokal untuk teks 3D (troika-three-text tidak mendukung woff2) */
export const FONT_DISPLAY = fontUrl
export const FONT_BODY = bodyFontUrl

let shared = null
/**
 * Material & geometri yang dipakai bersama oleh SEMUA bingkai foto.
 * Dibuat malas (lazy) sekali saja.
 */
export function getGalleryShared() {
  if (shared) return shared
  shared = {
    frameMats: {
      dark: new THREE.MeshStandardMaterial({ color: '#1c1a18', roughness: 0.42, metalness: 0.15 }),
      oak: new THREE.MeshStandardMaterial({ color: '#9a7650', roughness: 0.55 }),
      white: new THREE.MeshStandardMaterial({ color: '#efebe5', roughness: 0.6 }),
    },
    matBoard: new THREE.MeshStandardMaterial({ color: '#f6f3ee', roughness: 0.95 }),
    placeholder: new THREE.MeshStandardMaterial({ color: '#8d8880', roughness: 0.9 }),
    wash: new THREE.MeshBasicMaterial({
      map: wallWashTexture(),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
    label: new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.8 }),
    unitPlane: new THREE.PlaneGeometry(1, 1),
  }
  return shared
}

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { useStore } from '../store'
import { getQuality } from '../lib/quality'

const TEXTURES = {
  concreteMap: '/textures/concrete_color.jpg',
  concreteNormal: '/textures/concrete_normal.jpg',
  concreteRough: '/textures/concrete_rough.jpg',
  woodMap: '/textures/wood_color.jpg',
  woodNormal: '/textures/wood_normal.jpg',
  woodRough: '/textures/wood_rough.jpg',
  plasterMap: '/textures/plaster_color.jpg',
  plasterNormal: '/textures/plaster_normal.jpg',
}

useTexture.preload(Object.values(TEXTURES))

/**
 * Semua material arsitektur dibuat SEKALI dan dipakai ulang oleh semua
 * dinding/lantai (lebih sedikit shader program & upload tekstur).
 */
export function useMuseumMaterials() {
  const tex = useTexture(TEXTURES)
  const quality = useStore((s) => s.settings.quality)
  const anisotropy = getQuality(quality).anisotropy

  const materials = useMemo(() => {
    for (const [k, t] of Object.entries(tex)) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.colorSpace = k.endsWith('Map') ? THREE.SRGBColorSpace : THREE.NoColorSpace
      t.needsUpdate = true
    }
    return {
      concrete: new THREE.MeshStandardMaterial({
        map: tex.concreteMap,
        normalMap: tex.concreteNormal,
        roughnessMap: tex.concreteRough,
        roughness: 0.9,
        normalScale: new THREE.Vector2(0.35, 0.35),
        envMapIntensity: 0.9,
      }),
      wood: new THREE.MeshStandardMaterial({
        map: tex.woodMap,
        normalMap: tex.woodNormal,
        roughnessMap: tex.woodRough,
        roughness: 1.0,
        normalScale: new THREE.Vector2(0.5, 0.5),
        color: new THREE.Color('#e2d8cc'),
      }),
      plaster: new THREE.MeshStandardMaterial({
        map: tex.plasterMap,
        normalMap: tex.plasterNormal,
        normalScale: new THREE.Vector2(0.25, 0.25),
        roughness: 0.92,
        color: new THREE.Color('#f4efe7'),
      }),
      ceiling: new THREE.MeshStandardMaterial({
        map: tex.plasterMap,
        roughness: 1,
        color: new THREE.Color('#ece7df'),
      }),
      skirting: new THREE.MeshStandardMaterial({ color: '#3a3733', roughness: 0.6 }),
      metalDark: new THREE.MeshStandardMaterial({ color: '#1d1c1b', roughness: 0.38, metalness: 0.7 }),
      lightPanel: new THREE.MeshStandardMaterial({
        color: '#fff6e8',
        emissive: new THREE.Color('#fff1dc'),
        emissiveIntensity: 0.85,
        roughness: 1,
      }),
    }
  }, [tex])

  useEffect(() => {
    for (const t of Object.values(tex)) {
      t.anisotropy = anisotropy
      t.needsUpdate = true
    }
  }, [tex, anisotropy])

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])

  return materials
}

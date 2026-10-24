/**
 * Preset kualitas grafis. Ganti preset melalui panel Pengaturan di dalam website.
 *  - dpr        : resolusi render relatif terhadap layar (biaya terbesar di GPU terintegrasi)
 *  - shadows    : bayangan real-time dari satu lampu yang mengikuti karakter
 *  - spotlights : jumlah lampu sorot real-time yang "dipinjamkan" ke foto terdekat
 *  - anisotropy : ketajaman tekstur lantai pada sudut miring
 */
export const QUALITY = {
  low: { label: 'Rendah', dpr: [0.75, 1], shadows: false, spotlights: 0, anisotropy: 1, shadowMapSize: 512 },
  medium: { label: 'Sedang', dpr: [1, 1.25], shadows: false, spotlights: 2, anisotropy: 4, shadowMapSize: 1024 },
  high: { label: 'Tinggi', dpr: [1, 2], shadows: true, spotlights: 4, anisotropy: 8, shadowMapSize: 1024 },
}

export function getQuality(name) {
  return QUALITY[name] ?? QUALITY.medium
}

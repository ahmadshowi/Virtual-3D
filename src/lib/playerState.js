import * as THREE from 'three'

/**
 * Status pemain yang dibagikan antar sistem 3D (lampu sorot, galeri, audio)
 * tanpa melalui React — dibaca/ditulis setiap frame.
 */
export const playerState = {
  position: new THREE.Vector3(),
  speed: 0,
  /** arah pandang kamera di bidang XZ (ternormalisasi) */
  viewDir: new THREE.Vector3(0, 0, -1),
}

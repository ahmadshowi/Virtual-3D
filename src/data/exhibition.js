/**
 * IDENTITAS PAMERAN
 * =================
 * Ganti nama, tanggal, dan teks di sini. Semua tampilan (tiket masuk, dinding judul,
 * nama ruangan, pilihan karakter) membaca dari file ini.
 */
export const exhibition = {
  /** Nama pameran — tampil besar di tiket dan di dinding pintu masuk */
  title: 'Ruang Kita',

  /** Dua orang di balik pameran. `character` menentukan model 3D yang dipakai. */
  people: [
    { id: 'a', name: 'Showi', character: 'male' },
    { id: 'b', name: 'Fasya', character: 'female' },
  ],

  /** Tanggal jadian (YYYY-MM-DD) — dicetak di tiket */
  since: '2017-10-01',

  /** Kalimat pendek di bawah judul tiket */
  subtitle: 'pameran kecil tentang dua orang dan hal-hal yang mereka kumpulkan',

  /** Nama tiap ruangan (tampil di pojok kiri atas saat menjelajah) */
  rooms: {
    west: 'Awal Cerita',
    hall: 'Ruang Tengah',
    east: 'Sampai Hari Ini',
  },

  /** Panel teks di dinding aula */
  about: {
    title: 'Tentang ruangan ini',
    body:
      'Isinya foto-foto yang selama ini cuma ada di galeri HP. ' +
      'Jalan pelan-pelan, tidak ada urutan yang benar. ' +
      'Ganti teks ini di src/data/exhibition.js.',
  },
}

/**
 * Model karakter yang tersedia — avatar Microsoft Rocketbox (lisensi MIT).
 * Animasi Idle/Walk/Run sudah tertanam di file GLB (lihat tools/rocketbox/).
 */
export const characters = {
  male: { url: '/models/Showi.glb', label: 'cowok' },
  female: { url: '/models/Fasya.glb', label: 'cewek' },
}

export function personById(id) {
  return exhibition.people.find((p) => p.id === id) ?? exhibition.people[0]
}

export function characterUrlFor(personId) {
  return characters[personById(personId).character].url
}

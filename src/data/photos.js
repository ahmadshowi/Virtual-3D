/**
 * DATA FOTO GALERI
 * =================
 * Tambah / ubah foto cukup di file ini — komponen 3D membacanya otomatis.
 *
 * Field per foto:
 *   id          string unik
 *   title       judul karya
 *   description deskripsi panjang (tampil di modal)
 *   src         path foto resolusi penuh (dimuat HANYA saat modal dibuka)
 *   thumb       (opsional) versi kecil untuk tekstur di dinding; jika kosong pakai `src`
 *   position    [x, y, z] titik tengah foto, tepat di permukaan dinding (meter)
 *   rotationY   arah hadap foto (radian):  0 = menghadap +Z, Math.PI = -Z,
 *               Math.PI/2 = +X, -Math.PI/2 = -X   (lihat konstanta FACING di bawah)
 *   size        [lebar, tinggi] area gambar dalam meter (bingkai ditambahkan di luar)
 *   frame       (opsional) 'dark' | 'oak' | 'white'
 *   info        (opsional) objek bebas, mis. { Tanggal, Tempat } — tampil di label & modal
 *
 * Batas permukaan dinding (bagian dalam):
 *   Dinding barat x = -17.85 (FACING.EAST)   Dinding timur x = 17.85 (FACING.WEST)
 *   Dinding utara z = -11.85 (FACING.SOUTH)  Dinding selatan z = 11.85 (FACING.NORTH)
 *   Sekat barat  x = -5.85 (sisi aula, FACING.EAST) / -6.15 (sisi galeri, FACING.WEST)
 *   Sekat timur  x =  5.85 (sisi aula, FACING.WEST) /  6.15 (sisi galeri, FACING.EAST)
 *   Dinding bebas barat x = -12.2 / -11.8, timur x = 11.8 / 12.2 (z antara -3..3)
 */

export const FACING = {
  SOUTH: 0, //            menghadap +Z
  NORTH: Math.PI, //      menghadap -Z
  EAST: Math.PI / 2, //   menghadap +X
  WEST: -Math.PI / 2, //  menghadap -X
}

const Y = 1.7 // tinggi pusat foto (sedikit di atas mata)
const p = (file) => ({ src: `/photos/${file}`, thumb: `/photos/thumbs/${file}` })

export const photos = [
  // ─────────────────────────────── GALERI BARAT ("Awal Cerita")
  {
    id: 'senja-di-lembah',
    title: 'Nongkrong Malem',
    description: 'selfie random pas lagi jajan malem. yang satu senyum lebar, yang satu mukanya kayak lagi ngantuk wkwk',
    ...p('01-senja-di-lembah.jpg'),
    position: [-17.85, Y, -6.5],
    rotationY: FACING.EAST,
    size: [1.2, 1.6],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: '—' },
  },
  {
    id: 'medan-warna-merah',
    title: 'Nonton Dulu',
    description: 'lampu udah mati, iklan udah abis, tapi tetep foto dulu dong. filmnya apa? lupa jujur',
    ...p('02-medan-warna-merah.jpg'),
    position: [-17.85, Y + 0.1, 0],
    rotationY: FACING.EAST,
    size: [1.2, 1.6],
    frame: 'oak',
    info: { Tanggal: '—', Tempat: 'Bioskop' },
  },
  {
    id: 'komposisi-bauhaus',
    title: 'Pose Andalan',
    description: 'kedip + manyun + jari pistol. udah pose wajib tiap foto, gak bisa diganggu gugat',
    ...p('03-komposisi-bauhaus.jpg'),
    position: [-17.85, Y, 6.5],
    rotationY: FACING.EAST,
    size: [1.2, 1.6],
    frame: 'white',
    info: { Tanggal: '—', Tempat: '—' },
  },
  {
    id: 'arus-angin',
    title: 'Capek Tapi Seru',
    description: 'baru setengah jalan udah ngos-ngosan. foto dulu biar keliatan kuat',
    ...p('04-arus-angin.jpg'),
    position: [-12.2, Y, 0],
    rotationY: FACING.WEST,
    size: [1.2, 1.6],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: 'Jalur pendakian' },
  },
  {
    id: 'gema-lingkaran',
    title: 'Healing Dikit',
    description: 'kacamata item, pohon tinggi, udara dingin. vibes-nya udah kayak cover album',
    ...p('05-gema-lingkaran.jpg'),
    position: [-11.8, Y, 0],
    rotationY: FACING.EAST,
    size: [1.2, 1.6],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: 'Hutan pinus' },
  },
  {
    id: 'cakrawala-laut',
    title: 'Sunset Era',
    description: 'nungguin matahari tenggelam sambil ngeliatin bocil lari-larian. definisi tenang',
    ...p('06-cakrawala-laut.jpg'),
    position: [-12, Y, -11.85],
    rotationY: FACING.SOUTH,
    size: [1.2, 1.6],
    frame: 'oak',
    info: { Tanggal: '—', Tempat: 'Pantai' },
  },

  // ─────────────────────────────── AULA ("Ruang Tengah")
  {
    id: 'gurun-jingga',
    title: 'Kita',
    description: 'kondangan tapi berasa prewed. batik sama baju merahnya gak janjian, sumpah',
    ...p('14-gurun-jingga.jpg'),
    position: [0, 2.05, -11.85],
    rotationY: FACING.SOUTH,
    size: [1.8, 2.4],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: 'Kondangan' },
  },
  {
    id: 'pantai-senja',
    title: 'Malem Festival',
    description: 'rame, berisik, kaki pegel, tapi seneng banget. gelangnya masih disimpen sampe sekarang',
    ...p('13-pantai-senja.jpg'),
    position: [-5.85, Y, -7],
    rotationY: FACING.EAST,
    size: [1.2, 1.6],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: 'Festival musik' },
  },
  {
    id: 'medan-warna-hijau',
    title: 'Nunggu Makanan',
    description: 'makanan belum dateng, sumpitnya udah jadi anting. gabut level dewa',
    ...p('15-medan-warna-hijau.jpg'),
    position: [-5.85, Y + 0.1, 7],
    rotationY: FACING.EAST,
    size: [1.2, 1.6],
    frame: 'oak',
    info: { Tanggal: '—', Tempat: 'Restoran' },
  },
  {
    id: 'konstelasi',
    title: 'Mampir Tahilalats',
    description: 'mirror selfie wajib kalo mampir sini. rotinya enak, fotonya lebih enak',
    ...p('16-konstelasi.jpg'),
    position: [5.85, Y, -7],
    rotationY: FACING.WEST,
    size: [1.2, 1.6],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: 'Braga, Bandung' },
  },

  // ─────────────────────────────── GALERI TIMUR ("Sampai Hari Ini")
  {
    id: 'malam-pegunungan',
    title: 'Naik Bianglala',
    description: 'pas di atas baru sadar ternyata takut ketinggian. telat bestie',
    ...p('07-malam-pegunungan.jpg'),
    position: [17.85, Y, -6.5],
    rotationY: FACING.WEST,
    size: [1.2, 1.6],
    frame: 'dark',
    info: { Tanggal: '—', Tempat: '—' },
  },
  {
    id: 'medan-warna-biru',
    title: 'Photoshoot Dadakan',
    description: 'tangga doang sih, tapi kalo outfit-nya udah oke ya sayang gak difoto',
    ...p('08-medan-warna-biru.jpg'),
    position: [17.85, Y + 0.1, 0],
    rotationY: FACING.WEST,
    size: [1.2, 1.6],
    frame: 'oak',
    info: { Tanggal: '—', Tempat: '—' },
  },
  {
    id: 'kabut-pagi',
    title: 'OOTD Check',
    description: '"mundur lagi, mundur lagi, sepatunya belom keliatan." fotografernya sabar banget',
    ...p('09-kabut-pagi.jpg'),
    position: [17.85, Y, 6.5],
    rotationY: FACING.WEST,
    size: [1.2, 1.6],
    frame: 'white',
    info: { Tanggal: '—', Tempat: '—' },
  },
  {
    id: 'orbit-emas',
    title: 'Akhirnya Wisuda',
    description: 'toga, buket, foto di parkiran. yang penting lulus, lokasi mah bebas',
    ...p('12-orbit-emas.jpg'),
    position: [12, Y, -11.85],
    rotationY: FACING.SOUTH,
    size: [1.2, 1.6],
    frame: 'oak',
    info: { Tanggal: '—', Tempat: '—' },
  },
]

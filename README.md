# Ruang Kita — Museum Virtual 3D untuk Berdua

Museum virtual 3D berisi foto-foto sebuah pasangan. Pengunjung masuk lewat tiket, memilih masuk sebagai salah satu dari dua orang (karakter cowok atau cewek), lalu berjalan menjelajahi ruangan dari sudut pandang orang ketiga. Berjalan **sepenuhnya lokal** — tanpa backend, database, API berbayar, atau CDN. Semua aset (model, tekstur, foto, font, decoder) ada di dalam folder proyek.

**Teknologi:** React 19 · Vite 8 · Three.js · React Three Fiber · @react-three/drei · CSS biasa.

---

## 1. Instalasi & Menjalankan

Prasyarat: **Node.js 20.19+ atau 22+** (cek dengan `node -v`). Unduh dari https://nodejs.org (versi LTS).

```bash
cd virtual-museum
npm install        # sekali saja, butuh internet untuk mengunduh paket
npm run dev        # buka http://localhost:5173
```

Setelah `npm install`, proyek tidak butuh internet lagi.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan dengan hot reload |
| `npm run build` | Build produksi ke folder `dist/` |
| `npm run preview` | Menjalankan hasil build (`dist/`) secara lokal di http://localhost:4173 |

> Gunakan Chrome atau Edge terbaru untuk hasil terbaik. Jika laptop memakai mode hemat daya, pastikan browser boleh memakai GPU (Pengaturan Windows → Display → Graphics).

---

## 2. Mengatur Nama, Tanggal & Tema

Semua identitas pameran ada di **`src/data/exhibition.js`**:

| Field | Tampil di |
|---|---|
| `title` | Tiket, dinding pintu masuk, judul tab browser |
| `people[].name` | Pilihan "Masuk sebagai" di tiket, layar loading, dinding pintu masuk |
| `people[].character` | `'male'` atau `'female'` — model 3D untuk orang tersebut |
| `since` | "Berdua sejak" di tiket & tahun di dinding (format `YYYY-MM-DD`) |
| `subtitle` | Kalimat miring di bawah judul tiket |
| `rooms` | Nama ruangan di pojok kiri atas saat menjelajah |
| `about` | Panel teks di dinding aula |
| `music` | Musik latar dari YouTube (`youtubeId`, `title`, `artist`, `volume`, `start`). Hapus field ini untuk mematikan musik |

Nomor tiket bertambah setiap kali tiket disobek (disimpan di browser).

**Musik latar** mulai diputar saat tiket disobek dan berulang terus. Lagu diputar lewat YouTube IFrame Player resmi (tidak diunduh), jadi **satu-satunya fitur yang butuh internet** — kalau offline, museum tetap jalan tanpa musik. Untuk ganti lagu, salin ID dari link YouTube (`watch?v=XXXXXXXXXXX`) ke `music.youtubeId`; pastikan video mengizinkan embed (beberapa video resmi label musik memblokirnya). Musik bisa dimatikan lewat ⚙ Pengaturan → *Musik latar*, dan ikut mati saat tombol suara dimatikan.

---

## 3. Kontrol

| Tombol | Aksi |
|---|---|
| **W A S D** / panah | Berjalan (relatif terhadap arah kamera) |
| **Shift** | Berlari |
| **Mouse** | Mengatur arah pandang (klik layar dulu untuk mengunci kursor) |
| **Scroll** | Mendekat/menjauhkan kamera |
| **E** | Melihat foto saat berdiri di dekatnya (tekan lagi untuk menutup) |
| **Esc** | Melepas kursor / menutup modal / menutup pengaturan |
| **H** | Menampilkan/menyembunyikan panduan kontrol |

Lompat (Space) sengaja tidak dibuat karena tidak dibutuhkan di museum dengan lantai rata.

**Di HP / tablet** (layar sentuh terdeteksi otomatis):

| Gestur | Aksi |
|---|---|
| **Joystick** kiri bawah | Berjalan — dorong sampai tepi untuk berlari |
| **Geser satu jari** di layar | Mengatur arah pandang |
| **Cubit (pinch)** dua jari | Mendekat/menjauhkan kamera |
| **Ketuk tombol "Lihat foto"** | Membuka foto terdekat |

Di HP kualitas grafis default-nya **Rendah** (bisa dinaikkan di Pengaturan).

---

## 4. Struktur Proyek

```
virtual-museum/
├── public/                       ← aset statis (disajikan apa adanya)
│   ├── models/Showi.glb          ← karakter cowok (Ready Player Me, animasi Idle/Walk/Run tertanam)
│   ├── models/Fasya.glb          ← karakter cewek (Ready Player Me)
│   ├── textures/                 ← tekstur lantai & dinding (color/normal/roughness)
│   ├── photos/                   ← foto resolusi penuh (dimuat saat modal dibuka)
│   │   └── thumbs/               ← versi kecil untuk tekstur di dinding
│   └── draco/                    ← decoder Draco lokal (untuk GLB terkompresi)
├── src/
│   ├── data/
│   │   ├── exhibition.js         ← ★ NAMA PASANGAN, TANGGAL, JUDUL — edit di sini
│   │   ├── photos.js             ← ★ DATA FOTO — edit di sini
│   │   └── museumLayout.js       ← denah: dinding, lantai, bangku, lampu, titik mulai
│   ├── museum/                   ← rendering ruangan
│   │   ├── Experience.jsx        ← <Canvas>, urutan pemuatan bertahap
│   │   ├── MuseumRoom.jsx        ← lantai, dinding, plafon, skylight
│   │   ├── Lighting.jsx          ← environment map, lampu, kolam lampu sorot
│   │   ├── Furniture.jsx         ← bangku, alas patung, patung, tanaman
│   │   └── useMuseumMaterials.js ← material bersama
│   ├── components/
│   │   ├── character/            ← Character.jsx (model+animasi), Player.jsx (gerak, kamera, interaksi)
│   │   ├── gallery/              ← Gallery.jsx, PhotoFrame.jsx (bingkai, label, armatur lampu)
│   │   └── ui/                   ← LoadingScreen, TicketIntro (tiket masuk), HUD, PhotoModal, SettingsPanel
│   ├── hooks/useGameControls.js  ← tombol E/Esc/H, pointer lock
│   ├── lib/                      ← collision, input, audio, geometri, preset kualitas
│   ├── styles/global.css
│   ├── store.js                  ← state global ringan (tanpa library)
│   ├── App.jsx
│   └── main.jsx
├── tools/generate_assets.py      ← (opsional) pembuat tekstur & karya placeholder
├── tools/rocketbox/             ← (opsional) pipeline impor avatar Rocketbox
├── tools/animations/Soldier.glb ← sumber animasi Mixamo untuk retarget (tidak dimuat website)
├── tools/retarget_animations.mjs ← (opsional) retarget antar-karakter Mixamo
└── package.json
```

---

## 5. Menambahkan / Mengganti Foto

1. **Siapkan file.** Simpan foto ke `public/photos/` (mis. `pantai-bali.jpg`). Sisi terpanjang ±1600–2400 px, JPG kualitas 80–85 sudah cukup tajam.
2. **(Disarankan) buat thumbnail** sisi terpanjang ±768 px dengan nama yang sama di `public/photos/thumbs/`. Thumbnail inilah yang ditempel di dinding 3D, sehingga memori GPU tetap kecil. Foto besar hanya diunduh saat modal dibuka.
3. **Tambahkan entri** di `src/data/photos.js`:

```js
{
  id: 'pantai-bali',                         // unik
  title: 'Pantai Bali',
  description: 'Matahari terbenam di Pantai Kuta…',
  src: '/photos/pantai-bali.jpg',
  thumb: '/photos/thumbs/pantai-bali.jpg',   // opsional
  position: [-17.85, 1.7, 3],                // titik tengah foto di permukaan dinding
  rotationY: FACING.EAST,                    // arah hadap foto
  size: [1.6, 1.07],                         // [lebar, tinggi] meter — samakan rasio dengan foto
  frame: 'dark',                             // 'dark' | 'oak' | 'white'
  info: { Tanggal: 'Agustus 2025', Tempat: 'Bali' },
},
```

**Menentukan posisi:** komentar di atas `photos.js` mencantumkan koordinat permukaan setiap dinding. Contoh: dinding barat ada di `x = -17.85` dan fotonya harus menghadap timur (`FACING.EAST`); posisi sepanjang dinding diatur lewat `z` (rentang -11 sampai 11). Tinggi pusat foto standar `1.7`. Beri jarak antar-foto minimal ±1 m lebih dari lebarnya.

**Menghitung `size`:** jika foto 3000×2000 px (rasio 1.5) dan lebar yang diinginkan 1.6 m, maka tinggi = 1.6 / 1.5 = 1.07 → `size: [1.6, 1.07]`.

Dua nilai pertama di `info` (mis. tanggal & tempat) tampil di label dinding dan di atas judul modal; field tambahan muncul sebagai tabel di modal. Lampu sorot, armatur plafon, label dinding, dan deteksi tombol E otomatis mengikuti data ini. Semua judul & cerita foto yang ada sekarang hanyalah contoh. Jumlah foto yang direkomendasikan: di bawah 50.

Membuat thumbnail cepat (butuh Python + Pillow):
```bash
python -c "from PIL import Image;import glob,os;[ (lambda im:(im.thumbnail((768,768)),im.save('public/photos/thumbs/'+os.path.basename(p),quality=82)))(Image.open(p)) for p in glob.glob('public/photos/*.jpg')]"
```

---

## 6. Karakter & Mengganti Karakter

- **Showi** — *Casual Man -RIGGED-* (Ready Player Me) oleh NABEEL619. Rig-nya sudah ada tapi tanpa animasi.
- **Fasya** — *Ready Player Me female character* oleh readyplayerme. Rig-nya sudah ada tapi tanpa animasi; tekstur besar dikompres ulang ke JPEG.

Animasi Idle/Walk/Run keduanya diambil dari karakter Mixamo (`tools/animations/Soldier.glb`) lalu di-*retarget* oleh `tools/retarget_animations.mjs`:

- nama tulang hasil ekspor Sketchfab (`Hips_66`) dikembalikan ke nama aslinya;
- pose rest target (pose-A) diselaraskan ke pose-T sumber per tulang, lalu rotasi dipindahkan di ruang dunia;
- Idle "kuda-kuda" bawaan Soldier ditenangkan jadi posisi berdiri santai.

Hasilnya sudah tersimpan di `public/models/`, jadi pipeline ini **tidak perlu dijalankan** kecuali ingin ganti avatar.

Kedua model dimuat di awal (±4.6 MB total) supaya ganti karakter di tiket langsung terlihat. Karakter juga bisa diganti saat menjelajah lewat ⚙ Pengaturan.

### Mengganti dengan avatar ber-rig lain (Ready Player Me / Mixamo)

```bash
node tools/retarget_animations.mjs tools/animations/Soldier.glb sumber/Karakter.glb public/models/Showi.glb
```

### Mengganti dengan avatar Rocketbox lain

Daftar avatar beserta gambar pratinjaunya ada di https://github.com/microsoft/Microsoft-Rocketbox/tree/master/Assets/Avatars (folder `Adults`, tiap folder punya file `.png` pratinjau). Butuh Python 3 (`pip install numpy pillow`).

```bash
# 1. Ambil folder avatar, mis. Female_Adult_15 (berisi Export/*.fbx dan Textures/*.tga)
# 2. FBX → GLB
node tools/rocketbox/fbx_to_glb.mjs Female_Adult_15/Export/Female_Adult_15.fbx tmp/Female_Adult_15.glb
# 3. Tekstur → ukuran web
python tools/rocketbox/convert_textures.py Female_Adult_15/Textures tmp/tex-f15
# 4. Pasang tekstur + retarget animasi
node tools/rocketbox/import_rocketbox.mjs tmp/Female_Adult_15.glb tmp/tex-f15 tools/animations/Soldier.glb public/models/Fasya.glb
```

Untuk karakter cowok, ganti nama output menjadi `Showi.glb`, atau ubah `url` di objek `characters` dalam `src/data/exhibition.js`.

Model GLB lain yang sudah punya animasi bernama **`Idle`**, **`Walk`**, dan **`Run`** serta menghadap -Z juga bisa langsung dipakai tanpa langkah di atas.

---

## 7. Optimasi & Performa

Target perangkat: laptop RAM 8 GB, Intel Core i3 Gen 11 (Iris Xe / UHD).

- **Preset kualitas** (menu awal atau ⚙ Pengaturan):
  - *Rendah* — resolusi render 0.75–1×, tanpa lampu sorot real-time, bayangan blob.
  - *Sedang* (default) — 2 lampu sorot real-time di foto terdekat, bayangan blob.
  - *Tinggi* — 4 lampu sorot, bayangan karakter real-time, resolusi hingga 2×.
  - Aktifkan **Tampilkan FPS** di Pengaturan untuk memantau; turunkan preset bila di bawah ±40 FPS.
- **Anggaran lampu tetap:** 1 hemisphere + 3 point light + 1 directional + 0–4 spotlight. Spotlight dipinjamkan otomatis ke foto terdekat, sementara foto lain diterangi "sapuan cahaya" palsu (tekstur) yang hampir tanpa biaya.
- **Hanya satu sumber bayangan real-time** (karakter, kualitas Tinggi). Furnitur memakai bayangan kontak statis.
- **Geometri digabung**: semua dinding = 1 mesh, skirting = 1 mesh, armatur lampu = instanced mesh.
- **Material & tekstur dipakai ulang**; UV berskala dunia sehingga satu tekstur 1K melapisi semua dinding tanpa melar.
- **Pemuatan bertahap**: loading screen hanya menunggu arsitektur + karakter (±6.5 MB termasuk kedua karakter). Thumbnail foto dimuat per bingkai setelahnya; foto resolusi penuh baru diunduh saat modal dibuka.
- **Render on demand** saat modal terbuka (GPU beristirahat).
- **Tanpa render ulang React per frame**: gerak, kamera, dan deteksi jarak berjalan di `useFrame`; React hanya diperbarui saat nilai yang ditampilkan HUD berubah.
- **Collision tanpa physics engine**: lingkaran vs kotak (AABB) dari data denah — murah dan stabil.

Total aset saat ini ±12.5 MB (dua model 5 MB, tekstur 1.2 MB, foto+thumbnail ±5.6 MB, decoder 0.8 MB) — jauh di bawah target 50–150 MB.

**Mengompresi model GLB sendiri** (mis. model karakter/furnitur baru dari Blender):
```bash
npx @gltf-transform/cli optimize input.glb public/models/output.glb --texture-compress webp --texture-size 1024
```
Decoder Draco dan Meshopt sudah tersedia lokal, jadi model terkompresi tetap bisa dimuat tanpa internet.

---

## 8. Mengubah Denah Museum

Seluruh arsitektur dibaca dari `src/data/museumLayout.js`. Setiap dinding adalah kotak `{ x, z, w, d }` (pusat + ukuran dalam meter). Kotak yang sama dipakai untuk **render dan collision**, jadi keduanya selalu sinkron. Bangku, alas patung, dan pot tanaman juga otomatis menjadi penghalang.

---

## 9. Sumber Aset & Lisensi

| Aset | Sumber | Lisensi / catatan |
|---|---|---|
| `models/Showi.glb` | **"Casual Man -RIGGED-"** oleh NABEEL619 (https://skfb.ly/oXXO6), dibuat dengan Ready Player Me; animasi diretarget dari Soldier.glb oleh `tools/retarget_animations.mjs`. | **CC Attribution 4.0** — nama pembuat wajib dicantumkan. |
| `models/Fasya.glb` | **"Ready Player Me female character"** oleh readyplayerme (https://sketchfab.com/3d-models/42588cec14bb4e2ba537d6fe94ce4849); animasi diretarget dari Soldier.glb. | **CC BY-NC-SA 4.0** — cantumkan nama pembuat, **tidak untuk komersial**, turunan harus berlisensi sama. |
| `tools/animations/Soldier.glb` (sumber animasi) | Contoh resmi Three.js; karakter & animasi dari **Mixamo** (Adobe). Hanya dipakai saat build, tidak dimuat website. | Animasi Mixamo bebas royalti untuk proyek pribadi/komersial, tetapi file aslinya tidak boleh dibagikan ulang sebagai aset mentah. |
| Tekstur (`textures/`) | Dibuat secara prosedural oleh `tools/generate_assets.py` | Buatan sendiri — bebas dipakai |
| Karya placeholder (`photos/`) | Dibuat secara prosedural oleh `tools/generate_assets.py` | Buatan sendiri — bebas dipakai, tinggal diganti |
| Font Cormorant Garamond, Inter & DM Mono | Paket npm `@fontsource/*` (dibundel lokal) | SIL Open Font License 1.1 |
| Decoder Draco (`draco/`) | Disalin dari `three/examples/jsm/libs/draco` | Apache 2.0 |
| Suara (ambience & klik UI) | Disintesis langsung dengan Web Audio API | Tanpa file, tanpa lisensi |
| Musik latar | Diputar dari YouTube via IFrame Player API (default: Stephen Sanchez — *Until I Found You*, video resmi) | Tidak disalin ke proyek; hak cipta tetap milik pemilik lagu |

Membuat ulang tekstur/karya placeholder (opsional, butuh Python 3 + `pip install numpy pillow`):
```bash
python tools/generate_assets.py            # semuanya
python tools/generate_assets.py wood arts  # sebagian
```

---

## 10. Pemecahan Masalah

- **Layar hitam / "WebGL tidak didukung"** — perbarui driver grafis Intel dan pastikan *Hardware acceleration* aktif di pengaturan browser.
- **Mouse tidak menggerakkan kamera** — klik sekali di area 3D untuk mengunci kursor. Setelah menekan Esc, browser memberi jeda ±1 detik sebelum kursor bisa dikunci lagi.
- **FPS rendah** — pilih preset *Rendah*, tutup tab browser lain, dan sambungkan charger (mode baterai menurunkan performa GPU).
- **Foto baru tidak muncul** — periksa path di `photos.js` (diawali `/photos/…`, huruf besar/kecil harus sama persis) dan lihat Console browser (F12).
- **Port 5173 terpakai** — Vite otomatis memakai port berikutnya; lihat alamat yang tercetak di terminal.
- **Debug (mode dev)** — di Console browser: `__museum.get()` untuk melihat state, `__player.set(x, z, yaw)` untuk memindahkan karakter.

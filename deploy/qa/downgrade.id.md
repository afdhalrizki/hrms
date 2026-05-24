# Panduan Downgrade & Transisi Server QA

Dokumen ini berisi panduan langkah demi langkah untuk melakukan transisi penurunan spesifikasi (*downgrade*) server QA aplikasi HariKerja HRMS dari spesifikasi **8 Cores / 8 GB RAM** (Biznet GIO NEO Lite MM 8.8) ke spesifikasi optimal **2 Cores / 4 GB RAM** (Biznet GIO NEO Lite MM 4.2).

---

## 📌 Mengapa Melakukan Downgrade?
1. **Mengurangi Pemborosan Biaya:** Mengurangi pengeluaran bulanan VPS sebesar **50% hingga 75%**.
2. **Kesesuaian Beban Kerja:** Server QA hanya digunakan untuk pengujian fungsional internal (UAT manual). Spesifikasi 8 Cores / 8 GB RAM sangat berlebihan (*overkill*), mengingat server **Produksi 1K** saja hanya membutuhkan 4 Cores / 8 GB RAM untuk 1.000 pengguna aktif.
3. **Optimasi Memori via Swap:** Kita menggunakan **Swap Memory 4 GB** untuk membantu mengatasi lonjakan penggunaan memori secara temporer saat proses *Docker Build* Next.js, sehingga server 4 GB RAM tetap aman dan stabil tanpa crash.

---

## ⚡ Skenario A: Mengubah Paket Langsung (In-Place Resize)
*Gunakan cara ini jika dashboard Biznet GIO Anda mengizinkan downgrade langsung pada instance yang sama. Karena kapasitas storage kedua paket ini sama (60 GB SSD), cara ini biasanya didukung.*

### Langkah 1: Backup Database QA saat ini
Sebelum menyentuh konfigurasi VM, buatlah backup database QA yang ada dan simpan salinannya di komputer lokal Anda:
```bash
# Akses server QA via SSH, masuk ke folder project
cd /opt/hrms

# Jalankan script backup otomatis
./deploy/qa/backup_qa.sh
```
*Catatan:* Ambil berkas `.sql.gz` hasil pencadangan di folder `/opt/hrms/backups/` menggunakan SFTP (FileZilla) atau `scp` ke komputer Anda untuk keamanan ekstra.

### Langkah 2: Hentikan Instansi VM
1. Masuk ke portal manajemen **Biznet GIO**.
2. Buka panel virtual machine `harikerja-qa`.
3. Pilih tindakan **Stop** / **Power Off** dan tunggu hingga status instansi berubah menjadi *Stopped*.

### Langkah 3: Ubah Spesifikasi (Resize)
1. Pada detail instansi VM, pilih menu **Resize** atau **Change Package**.
2. Pilih tipe paket **NEO Lite MM 4.2** (2 Cores, 4 GB RAM, 60 GB SSD).
3. Konfirmasikan perubahan spesifikasi tersebut.

### Langkah 4: Nyalakan Kembali Server
1. Jalankan kembali VM Anda (**Start** / **Power On**).
2. Hubungkan kembali terminal Anda menggunakan SSH setelah server aktif.

### Langkah 5: Pasang Swap Memory 4 GB (Wajib)
Sangat krusial untuk membuat partisi swap 4 GB agar proses build Docker tidak mengalami *Out-Of-Memory* (OOM):
```bash
# Buat berkas swap sebesar 4 Gigabyte
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Buat agar swap berjalan otomatis setiap kali server dinyalakan
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Langkah 6: Jalankan Deployment Ulang
Tarik berkas pembaruan kode terbaru (yang telah berisi limitasi kontainer Docker yang ramah terhadap RAM 4GB) lalu deploy:
```bash
cd /opt/hrms
git pull
./deploy/qa/deploy_qa.sh
```
Verifikasi bahwa seluruh kontainer menyala dengan normal menggunakan perintah `docker ps`.

---

## 💾 Skenario B: Migrasi ke VPS Baru
*Gunakan cara ini jika sistem penagihan/billing Biznet GIO tidak mengizinkan downgrade langsung pada instansi yang aktif, atau jika Anda ingin menghindari downtime selama proses transisi.*

### Langkah 1: Backup Database & Ambil Berkasnya
Jalankan backup di VPS QA lama Anda, lalu unduh berkas backup tersebut ke komputer lokal:
```bash
cd /opt/hrms
./deploy/qa/backup_qa.sh
```

### Langkah 2: Buat VPS QA Baru
1. Sewa VPS baru di portal Biznet GIO dengan paket **NEO Lite MM 4.2** (2 Cores, 4 GB RAM, 60 GB SSD).
2. Catat alamat **IP Publik Baru** dari VPS tersebut.

### Langkah 3: Setup Awal pada VPS Baru
Lakukan persiapan awal server sesuai panduan utama [deploy/qa/qa.id.md](file:///home/afdhal/data/hr/hrms/deploy/qa/qa.id.md):
* **Wajib:** Setup Swap Memory 4 GB (lihat instruksi Langkah 5 pada Skenario A).
* Instalasi utilitas dasar, Docker, Docker Compose, Nginx, dan Certbot.
* Buat direktori kerja `/opt/hrms` dan lakukan clone repositori kode Anda.

### Langkah 4: Pindahkan Data dari VPS Lama ke VPS Baru
Kirim berkas cadangan database `.sql.gz` dari VPS lama ke folder `/opt/hrms/backups/` di VPS baru Anda. Anda bisa menggunakan perintah `scp`:
```bash
# Jalankan perintah ini dari VPS lama Anda:
scp /opt/hrms/backups/qa_backup_xxxx.sql.gz user@<IP_VPS_BARU>:/opt/hrms/backups/
```
*Tip:* Jika ada berkas media/unggahan foto hasil pengujian tester sebelumnya yang ingin dipertahankan, kirimkan juga direktori `/opt/hrms/backend/media/` ke server baru.

### Langkah 5: Restore Database pada VPS Baru
1. Masuk ke VPS baru Anda menggunakan SSH.
2. Siapkan file konfigurasi environment `.env.local` pada folder `environments/`.
3. Jalankan kontainer database terlebih dahulu di VPS baru:
   ```bash
   cd /opt/hrms
   docker compose -f deploy/qa/docker-compose.qa.yml --env-file deploy/environments/.env.qa up -d db
   ```
4. Tunggu beberapa detik hingga kontainer database siap, lalu pulihkan data Anda:
   ```bash
   gunzip -c /opt/hrms/backups/qa_backup_xxxx.sql.gz | docker exec -i hrms-db-qa psql -U hrms_qa_user -d hrms_qa
   ```

### Langkah 6: Selesaikan Deployment Awal
Jalankan proses deployment penuh pada server baru untuk membangun frontend, backend, dan celery worker:
```bash
./deploy/qa/deploy_qa.sh
```
Pastikan API merespons dengan HTTP 200 pada akhir eksekusi script smoke test.

### Langkah 7: Pengalihan DNS & SSL Wildcard
1. Masuk ke panel **NEO DNS Manager** Biznet GIO.
2. Pilih domain `harikerja.web.id`.
3. Ubah nilai IP Address pada **A Record** (`@` dan `*`) agar menunjuk ke **IP VPS Baru** Anda.
4. Lakukan instalasi SSL Let's Encrypt Wildcard baru pada VPS baru:
   ```bash
   sudo certbot certonly --manual --preferred-challenges=dns --email admin@harikerja.web.id --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d harikerja.web.id -d *.harikerja.web.id
   ```
   Tambahkan berkas TXT challenge baru ke DNS manager, tunggu propagasi, lalu selesaikan certbot.

### Langkah 8: Hapus VPS Lama
Uji akses ke `https://harikerja.web.id` dan sub-domain tenant Anda. Jika semua data dan fitur UAT sudah terverifikasi berjalan sempurna pada server baru, Anda dapat menghapus / mematikan kontrak VPS lama `NEO Lite MM 8.8` pada portal Biznet untuk menghentikan tagihannya secara permanen.

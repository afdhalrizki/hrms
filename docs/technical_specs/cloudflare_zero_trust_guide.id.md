# Panduan Integrasi Cloudflare Zero Trust & Tunnel

Panduan ini menjelaskan cara mengamankan Portal Admin Utama (Django Admin) HariKerja HRMS menggunakan **Cloudflare Zero Trust** dan **Cloudflare Tunnel (Argo Tunnel)**. Solusi ini menyembunyikan server QA Anda sepenuhnya dari internet publik dan membatasi akses hanya untuk anggota tim yang terautentikasi—tanpa memerlukan server VPN tradisional atau file profil `.ovpn`.

---

## 1. Cara Kerja
Alih-alih membuka port firewall (seperti 80 atau 443) pada server QA Anda ke internet publik, kita menginstal daemon Cloudflare ringan (`cloudflared`) di server. Daemon ini membangun koneksi keluar (*outbound-only*) yang aman ke jaringan tepi (*edge network*) Cloudflare terdekat.

```
[Staf Operasional] ──> [Cloudflare Edge (WARP / Access Auth)] ──> [Cloudflare Tunnel] ──> [Server QA (Nginx / Django)]
```

* **Tanpa Port Terbuka:** Firewall server QA Anda dapat memblokir semua lalu lintas masuk (*inbound*) pada port 80 dan 443. Hanya koneksi keluar ke Cloudflare yang diperlukan.
* **Autentikasi SSO:** Siapa pun yang mencoba mengakses `/portal-admin-secure-auth-39f28j/` harus memverifikasi identitasnya terlebih dahulu menggunakan email korporat mereka.

---

## 2. Langkah 1: Buat Cloudflare Tunnel di Dasbor
1. Masuk ke [Dasbor Cloudflare](https://dash.cloudflare.com/) dan buka menu **Zero Trust** di bilah sisi.
2. Navigasikan ke **Networks** -> **Tunnels** dan klik **Create a Tunnel**.
3. Pilih **Cloudflare Tunnel (connector)** dan klik **Next**.
4. Beri nama tunnel Anda (misal: `harikerja-qa-tunnel`) dan klik **Save tunnel**.
5. Biarkan halaman ini tetap terbuka; Anda akan melihat instruksi yang berisi **Tunnel Token** (string alfanumerik panjang yang dimulai dengan `ey...`).

---

## 3. Langkah 2: Instal Konektor Cloudflare di Server QA

Karena lingkungan QA Anda berjalan menggunakan Docker (dikelola oleh `deploy_qa.sh`), cara paling elegan untuk menjalankan `cloudflared` adalah sebagai kontainer terisolasi di dalam berkas `docker-compose.qa.yml` Anda.

### A. Tambahkan Layanan Cloudflare ke `deploy/qa/docker-compose.qa.yml`
Buka `deploy/qa/docker-compose.qa.yml` dan tambahkan layanan `tunnel` di bawah `services`:

```yaml
  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared_tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - nginx
```

### B. Tambahkan Token ke Berkas `deploy/environments/.env.qa`
Buka `deploy/environments/.env.qa` dan tambahkan token tunnel Anda:
```env
CLOUDFLARE_TUNNEL_TOKEN=token_tunnel_asli_anda_di_sini
```

### C. Sambungkan Nginx di Dasbor Cloudflare
Di Dasbor Cloudflare Zero Trust tempat Anda membuat tunnel:
1. Klik **Next** untuk melanjutkan ke tab **Route Traffic**.
2. Di bawah **Public Hostname**, konfigurasi:
   * **Subdomain:** `harikerja.web.id` (atau domain staging Anda).
   * **Service Type:** `HTTP`
   * **URL:** `nginx:80` (atau `http://localhost:80` jika menggunakan jaringan host).
3. Klik **Save hostname**. Sekarang, Cloudflare mengarahkan lalu lintas secara aman ke kontainer Nginx QA Anda!

---

## 4. Langkah 3: Buat Kebijakan Akses untuk Portal Admin
Sekarang kita memblokir akses publik ke path admin rahasia dan mewajibkan autentikasi.

1. Di bilah sisi Cloudflare Zero Trust, buka **Access** -> **Applications** dan klik **Add an Application**.
2. Pilih **Self-hosted**.
3. Konfigurasikan **Application Configuration**:
   * **Application Name:** `HRMS QA Admin Portal`
   * **Session Duration:** `24 jam`
   * **Domain:** `harikerja.web.id`
   * **Path:** `portal-admin-secure-auth-39f28j/` (URL rahasia `ADMIN_URL` Anda).
4. Klik **Next** untuk mengonfigurasi **Policy**:
   * **Policy Name:** `Allow Authorized Staff`
   * **Action:** `Allow`
5. Pada bagian **Configure rules** (Siapa yang diizinkan?):
   * **Selector:** `Emails`
   * **Value:** Masukkan email staf yang diizinkan (misal: `superadmin@harikerja.com`, `support@harikerja.com`).
   * *(Alternatif: pilih `Emails ending in` dan masukkan `@domainanda.com` untuk mendaftarkan seluruh tim Anda).*
6. Klik **Next** lalu klik **Add application**.

---

## 5. Langkah 4: Cara Staf Mengakses Portal Admin (Panduan Klien)

### Skenario A: Mengakses dari Peramban Web (Browser)
1. Buka browser Anda dan navigasikan ke URL rahasia permanen:
   `https://harikerja.web.id/portal-admin-secure-auth-39f28j/`
2. Karena akses dibatasi, Cloudflare akan menampilkan halaman login yang meminta alamat email Anda.
3. Masukkan email kantor Anda yang terdaftar dan klik **Send Code**.
4. Buka kotak masuk email Anda dan cari **6-digit PIN dari Cloudflare**.
5. Masukkan PIN tersebut di halaman Cloudflare.
6. Setelah diverifikasi, Anda akan langsung diarahkan ke halaman login Django Admin Portal!
7. Masukkan kredensial administrator standar Anda dan selesaikan autentikasi MFA Django.

### Skenario B: Mengakses Menggunakan Aplikasi Cloudflare WARP (Direkomendasikan)
1. Unduh dan instal [Cloudflare WARP Client](https://1.1.1.1/).
2. Buka aplikasi, masuk ke Pengaturan -> **Account** -> **Login to Cloudflare Zero Trust**.
3. Masukkan team domain Anda (disediakan oleh DevOps) dan login dengan email kantor Anda.
4. Geser tombol toggle ke **Connected**.
5. Anda sekarang dapat mengakses `https://harikerja.web.id/portal-admin-secure-auth-39f28j/` secara langsung tanpa perlu memasukkan PIN browser setiap kali mengakses!

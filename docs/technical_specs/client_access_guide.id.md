# 🖥️ Panduan Klien: Akses Portal Admin (Dua Kondisi Jaringan)

Dokumen ini adalah panduan praktis langkah-demi-langkah bagi **Staf Administrasi, Customer Support, DevOps, dan Penguji** untuk mengonfigurasi perangkat lokal agar dapat mengakses Portal Admin Utama (SaaS Next.js) dan Django Admin pada platform HariKerja HRMS.

Akses administratif dilindungi secara ketat dan hanya dapat dibuka menggunakan salah satu dari **dua kondisi jaringan** yang sedang aktif di server QA/Staging saat ini.

---

## 🧭 Matriks Pemilihan Metode Akses

Sebelum memulai, tanyakan kepada administrator server (DevOps) kondisi mana yang sedang aktif pada server saat ini:

| Kondisi Server | Metode Akses Klien | Aplikasi yang Dibutuhkan | File / Akun yang Dibutuhkan |
| :--- | :--- | :--- | :--- |
| **Kondisi 1: VPN-Only** (Default) | Koneksi VPN Tradisional | OpenVPN Connect atau WireGuard | File profil `.ovpn` atau `.conf` |
| **Kondisi 2: Zero Trust** (Cloudflare) | **Metode A:** SSO Email PIN<br>**Metode B:** Cloudflare WARP | Peramban Web (Browser) biasa<br>Aplikasi Cloudflare WARP | Email kantor aktif (`@harikerja.com` atau domain terdaftar) |

---

## 🔒 Bagian 1: Panduan Kondisi 1 - Akses via VPN Tradisional (VPN-Only)

Gunakan metode ini jika server QA di-deploy menggunakan mode default tanpa Cloudflare. Koneksi VPN wajib dinyalakan agar IP lokal Anda diizinkan menembus firewall Nginx.

### A. Pengaturan pada Ubuntu / Debian Linux
Anda dapat tersambung menggunakan antarmuka grafis (GUI) atau Terminal (CLI).

#### Opsi 1: Menggunakan Antarmuka Grafis (GUI Settings) - *Direkomendasikan*
1.  Buka terminal (`Ctrl + Alt + T`) dan instal dependensi integrasi OpenVPN untuk GNOME Network Manager:
    ```bash
    sudo apt update
    sudo apt install network-manager-openvpn-gnome -y
    sudo systemctl restart NetworkManager
    ```
2.  Buka menu **Settings** di komputer Ubuntu Anda.
3.  Pilih menu **Network** di panel sebelah kiri.
4.  Pada bagian **VPN**, klik tombol **`+` (Add)**.
5.  Pilih **Import from file...** pada bagian paling bawah dialog modal.
6.  Pilih file profil `.ovpn` yang diberikan oleh administrator DevOps Anda.
7.  Klik **Add** untuk menyimpan.
8.  Untuk terhubung, klik menu status jaringan di pojok kanan atas layar Anda, pilih profil VPN baru Anda, lalu klik **Connect**.

#### Opsi 2: Menggunakan Terminal (CLI)
*   **Menggunakan OpenVPN:**
    ```bash
    sudo apt update && sudo apt install openvpn -y
    sudo openvpn --config /path/to/profile_anda.ovpn
    ```
    *(Biarkan terminal tetap terbuka selama Anda bekerja. Tekan `Ctrl + C` untuk memutuskan koneksi).*
*   **Menggunakan WireGuard:**
    ```bash
    sudo apt update && sudo apt install wireguard -y
    sudo cp /path/to/profile_anda.conf /etc/wireguard/wg0.conf
    sudo wg-quick up wg0
    ```
    *(Jalankan `sudo wg-quick down wg0` di terminal untuk memutuskan koneksi).*

---

### B. Pengaturan pada Windows
1.  Unduh dan instal aplikasi resmi [OpenVPN Connect untuk Windows](https://openvpn.net/client-connect-vpn-for-windows/).
2.  Buka aplikasi **OpenVPN Connect**.
3.  Masuk ke tab **File**, lalu drag-and-drop file profil `.ovpn` Anda ke dalam aplikasi tersebut.
4.  Aktifkan koneksi dengan mengklik tombol toggle (tombol akan berubah menjadi hijau jika berhasil terhubung).

---

### C. Pengaturan pada macOS
1.  Unduh dan instal aplikasi resmi [OpenVPN Connect untuk macOS](https://openvpn.net/client-connect-vpn-for-mac-os/).
2.  Buka aplikasi **OpenVPN Connect**.
3.  Drag-and-drop file profil `.ovpn` Anda ke tab **File** pada aplikasi.
4.  Geser tombol toggle ke kanan. Jika macOS meminta persetujuan untuk menambahkan konfigurasi jaringan, masukkan password Mac Anda dan pilih **Allow**.

---

## ☁️ Bagian 2: Panduan Kondisi 2 - Akses via Cloudflare Zero Trust (Tanpa VPN Tradisional)

Gunakan metode ini jika server di-deploy menggunakan opsi `--with-cloudflare` / `-c`. Anda tidak membutuhkan file profil VPN (`.ovpn` / `.conf`).

### Metode A: Akses Browser Cepat (SSO PIN - Tanpa Aplikasi)
Sangat cocok untuk akses sesekali atau perangkat pinjaman karena tidak memerlukan instalasi aplikasi apa pun.

1.  Buka browser Anda dan langsung buka alamat rahasia Portal Admin:
    `https://harikerja.web.id/login/portal-admin-secure-39f28j`
2.  Halaman pemblokiran **Cloudflare Access** akan muncul otomatis meminta verifikasi.
3.  Masukkan alamat email kantor Anda yang telah didaftarkan oleh administrator (misal: `staf@harikerja.com`), lalu klik **Send Code**.
4.  Buka inbox email Anda, cari pesan berisi **6-digit PIN kode sekali pakai** dari Cloudflare.
5.  Masukkan PIN tersebut di halaman browser Anda.
6.  Setelah sukses, Anda akan langsung dialihkan ke halaman login Portal Admin Next.js.

---

### Metode B: Koneksi Otomatis via Cloudflare WARP (VPN Modern - Direkomendasikan)
Sangat cocok bagi staf harian untuk menghindari pengisian PIN berulang kali di browser.

1.  Unduh dan pasang aplikasi resmi **Cloudflare WARP** dari [1.1.1.1](https://1.1.1.1/) sesuai OS Anda (Windows, macOS, atau Linux).
2.  Buka aplikasi **Cloudflare WARP** di komputer Anda.
3.  Buka menu **Preferences / Settings** (ikon gir) -> pilih tab **Account** -> klik **Login to Cloudflare Zero Trust**.
4.  Masukkan nama domain tim perusahaan Anda (disediakan oleh DevOps, contoh: `harikerja-team`) dan klik **Ok**.
5.  Browser Anda akan terbuka secara otomatis untuk meminta otentikasi. Masukkan email kantor Anda dan selesaikan verifikasi PIN satu kali.
6.  Kembali ke aplikasi WARP, geser tombol toggle utama menjadi **Connected**.
7.  Kini Anda bebas membuka alamat portal admin `https://harikerja.web.id/login/portal-admin-secure-39f28j` secara langsung tanpa ada tantangan PIN browser lagi!

---

## 🛠️ Panduan Pemecahan Masalah (Troubleshooting)

### 1. Muncul Error "403 Forbidden"
*   **Penyebab (Kondisi 1):** Koneksi VPN tradisional Anda terputus atau IP publik lokal Anda belum didaftarkan di konfigurasi whitelisting Nginx.
*   **Solusi (Kondisi 1):** Periksa aplikasi OpenVPN Anda, pastikan indikatornya berwarna hijau. Jika masih gagal, hubungi DevOps untuk memeriksa apakah IP publik Anda saat ini perlu ditambahkan ke whitelist.
*   **Penyebab (Kondisi 2):** Anda mencoba mengakses URL admin kustom langsung tanpa menggunakan Cloudflare WARP dan tanpa melewati Cloudflare Access (misalnya saat server memblokir port publik secara fisik).
*   **Solusi (Kondisi 2):** Pastikan aplikasi Cloudflare WARP Anda aktif dalam status **Connected**.

### 2. Muncul Error "502 Bad Gateway"
*   **Penyebab:** Nginx di server aktif, tetapi kontainer backend (Django) atau frontend (Next.js) sedang mati atau mengalami kegagalan proses di server.
*   **Solusi:** Hubungi administrator server (DevOps) untuk memverifikasi status kontainer menggunakan perintah `docker ps` atau merestart kontainer via `./deploy/qa/deploy_qa.sh`.

### 3. PIN Kode OTP Cloudflare Tidak Masuk ke Inbox Email
*   **Penyebab:** Email terfilter ke folder Spam, atau alamat email Anda belum didaftarkan di daftar izin (*Access Policy*) Cloudflare Zero Trust oleh DevOps.
*   **Solusi:** Periksa folder Spam/Junk di email Anda. Jika tidak ada, hubungi DevOps untuk memastikan email kantor Anda sudah terdaftar di aplikasi *HRMS QA Admin Portal* pada dashboard Zero Trust.

---
*Dokumen ini merupakan panduan resmi akses klien HariKerja HRMS.*

# Panduan Koneksi VPN

Panduan ini menjelaskan cara menghubungkan perangkat Anda ke jaringan VPN Privat perusahaan HariKerja untuk mengakses Portal Admin secara aman.

---

## 1. Klien Ubuntu (Linux)

Ubuntu mendukung koneksi VPN secara bawaan melalui tampilan grafis (GUI) maupun terminal (CLI).

### Opsi A: Melalui GUI (Ubuntu Settings) - *Direkomendasikan*
1. **Instal Plugin GNOME (Hanya Sekali):**
   Buka terminal (`Ctrl + Alt + T`) lalu jalankan perintah:
   ```bash
   sudo apt update
   sudo apt install network-manager-openvpn-gnome -y
   sudo systemctl restart NetworkManager
   ```
2. **Impor Profil VPN:**
   * Klik menu status koneksi di pojok kanan atas layar Ubuntu Anda, lalu klik **Settings** (ikon gir).
   * Pilih menu **Network** di sebelah kiri.
   * Di bagian **VPN**, klik tombol **`+` (Tambah)**.
   * Pilih opsi **Import from file...** pada bagian paling bawah modal.
   * Pilih file konfigurasi `.ovpn` yang diberikan oleh tim DevOps Anda.
3. **Hubungkan:**
   * Klik kembali menu status koneksi di pojok kanan atas layar.
   * Klik koneksi VPN baru Anda, lalu klik **Connect**.

### Opsi B: Melalui CLI/Terminal
* **Jika menggunakan OpenVPN (`.ovpn`):**
  ```bash
  sudo apt update && sudo apt install openvpn -y
  sudo openvpn --config /jalur/ke/profil_anda.ovpn
  ```
  *(Biarkan terminal ini terbuka selama Anda menggunakan VPN. Tekan `Ctrl + C` untuk berhenti).*
* **Jika menggunakan WireGuard (`.conf`):**
  ```bash
  sudo apt update && sudo apt install wireguard -y
  sudo cp /jalur/ke/profil.conf /etc/wireguard/wg0.conf
  sudo wg-quick up wg0
  ```
  *(Jalankan `sudo wg-quick down wg0` untuk memutuskan koneksi).*

---

## 2. Klien Windows

### Langkah Koneksi (OpenVPN):
1. **Unduh Aplikasi:** Unduh dan pasang aplikasi resmi [OpenVPN Connect for Windows](https://openvpn.net/client-connect-vpn-for-windows/).
2. **Impor Berkas:**
   * Buka aplikasi *OpenVPN Connect*.
   * Pilih tab **File**.
   * Tarik dan lepas (*drag and drop*) file `.ovpn` Anda ke dalam jendela aplikasi, atau klik **Browse** untuk memilih file tersebut.
3. **Koneksikan:**
   * Klik tombol toggle **Connect** (berwarna abu-abu menjadi hijau).
   * Begitu ikon berubah menjadi hijau dan grafik statistik muncul, koneksi Anda telah aktif.

---

## 3. Klien macOS

### Langkah Koneksi (OpenVPN):
1. **Unduh Aplikasi:** Unduh dan pasang aplikasi resmi [OpenVPN Connect for macOS](https://openvpn.net/client-connect-vpn-for-mac-os/).
2. **Impor Berkas:**
   * Jalankan aplikasi *OpenVPN Connect* dari Launchpad.
   * Impor berkas `.ovpn` dengan menyeretnya ke dalam tab **File** pada aplikasi.
3. **Koneksikan:**
   * Klik tombol slide **Connect**.
   * Jika muncul permintaan dari sistem untuk meminta izin konfigurasi jaringan, klik **Allow** (Izinkan). Status berwarna hijau menandakan koneksi telah berhasil terhubung.

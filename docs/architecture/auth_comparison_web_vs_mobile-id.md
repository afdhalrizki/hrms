# Perbandingan Autentikasi: Web vs. Mobile

Dokumen ini menjelaskan perbedaan konseptual dan teknis antara cara autentikasi dan navigasi ditangani di aplikasi HRMS Web (Frontend) dan Mobile (Flutter).

## 1. Perbedaan Arsitektur Inti

| Fitur | Web (Frontend) | Mobile (Flutter) |
| :--- | :--- | :--- |
| **Navigasi Utama** | Berbasis URL (Rute) | Berbasis Tumpukan (Screen/Stack) |
| **Penjaga Pintu** | Layout Guard (`DashboardLayout`) | Startup Logic (`initState`) |
| **Identifikasi Tenant** | Otomatis (via Hostname/Subdomain) | Manual (User input Subdomain) |
| **Penyimpanan Token** | `localStorage` | `FlutterSecureStorage` (Terenkripsi) |

---

## 2. Alur Autentikasi Web (Konsep "Guard")

Di aplikasi web, navigasi digerakkan oleh URL. Karena pengguna dapat "melompat" ke URL mana pun (misalnya mengetik `/en/attendance` secara langsung), sistem menggunakan pola **Layout Guard**.

- **Cara Kerja**: `DashboardLayout` membungkus setiap halaman yang dilindungi. Setiap kali halaman dimuat atau di-refresh, layout akan mengecek apakah ada token yang valid.
- **Perilaku**: Jika tidak ada token, pengguna akan langsung dialihkan ke `/login`.
- **Konteks Tenant**: Tenant diidentifikasi melalui alamat browser saat ini (misal: `perusahaan-a.harikerja.web.id`).

## 3. Alur Autentikasi Mobile (Konsep "Startup")

Di aplikasi mobile, tidak ada URL. Navigasi dikelola dengan menumpuk (push) atau melepas (pop) layar pada sebuah stack.

- **Cara Kerja**: Aplikasi selalu dimulai di `LoginScreen`. Di dalam logika inisialisasi, aplikasi mengecek penyimpanan terenkripsi untuk mencari token yang tersimpan.
- **Perilaku**: 
    - Jika token ada, aplikasi melakukan "Auto-Login" dengan mengganti `LoginScreen` menjadi `HomeScreen`.
    - Jika tidak ada token, aplikasi menampilkan form login.
- **Konteks Tenant**: Karena hanya ada satu aplikasi mobile untuk semua perusahaan, pengguna harus memasukkan **Subdomain Perusahaan** secara manual agar aplikasi tahu server mana yang harus dihubungi.

---

## 4. Ringkasan untuk Pengembang

- **Pengembang Web**: Fokus untuk memastikan semua halaman terproteksi dibungkus oleh `DashboardLayout` agar "Guard" tetap aktif.
- **Pengembang Mobile**: Fokus pada singleton `ApiService` untuk memastikan header `X-Tenant-Domain` terkirim dengan benar di setiap permintaan berdasarkan subdomain yang dimasukkan manual.
- **Kesamaan**: Kedua platform menggunakan endpoint backend berbasis JWT yang sama persis (`/auth/login/`, `/auth/token/refresh/`).

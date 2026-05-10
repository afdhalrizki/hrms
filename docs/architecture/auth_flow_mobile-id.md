# Alur Autentikasi Mobile (Flutter)

Dokumen ini menjelaskan siklus hidup autentikasi untuk Aplikasi Mobile HRMS.

## Tumpukan Teknologi
- **Framework**: Flutter
- **Keamanan**: `flutter_secure_storage` (Keychain/Keystore)
- **Pengaturan**: `shared_preferences`
- **Jaringan**: Paket `http` dengan wrapper `ApiService` kustom.

## Proses Autentikasi

### 1. Logika Startup
Aplikasi dimulai di `LoginScreen`.

```mermaid
flowchart TD
    A[Startup Aplikasi] --> B[LoginScreen: initState]
    B --> C[ApiService: hasValidToken]
    C -- Ya --> D[Buka Layar Beranda (Home)]
    C -- Tidak --> E[Tampilkan Formulir Login]
```

### 2. Alur Kerja Login
Berbeda dengan versi web, aplikasi mobile mengharuskan pengguna untuk menentukan subdomain perusahaan mereka secara manual.

```mermaid
flowchart LR
    A[Masukkan Subdomain] --> B[Masukkan Email/Pass]
    B --> C[Ketuk Masuk (Sign In)]
    C --> D[POST /auth/login/]
    D -- Berhasil --> E[Simpan access/refresh ke Secure Storage]
    E --> F[Simpan subdomain ke SharedPreferences]
    F --> G[Navigasi ke Beranda]
```

## Keamanan & Jaringan

### Penyimpanan Aman
- **JWT Access Token**: Disimpan dalam penyimpanan terenkripsi (`jwt_token`).
- **Refresh Token**: Disimpan dalam penyimpanan terenkripsi (`refresh_token`).
- **Tenant ID**: Disimpan dalam shared preferences biasa (`tenant_subdomain`).

### Permintaan Terautentikasi
Semua permintaan ke endpoint yang terlindungi menggunakan helper `_authenticatedRequest`:
1. Menambahkan header `Authorization: Bearer <token>`.
2. Menambahkan header `X-Tenant-Domain: <tenant>.<domain_suffix>`.
3. Jika permintaan gagal dengan `401 Unauthorized`, secara otomatis memanggil `refreshToken()`.
4. Jika refresh gagal, ia menghapus penyimpanan dan meminta pengguna untuk login.

## Batasan yang Diketahui
- **Input Subdomain**: Pengguna harus mengetahui subdomain unik perusahaan mereka untuk masuk.
- **Flicker Auto-Login**: Layar login terlihat sejenak sebelum redirect auto-login terjadi.

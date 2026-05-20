# Arsitektur Autentikasi: Web vs. Mobile

Dokumen ini menjelaskan perbandingan arsitektur, mekanisme kerja, dan diagram alir autentikasi antara aplikasi Web (Next.js) dan Mobile (Flutter) pada platform **HariKerja HRMS**.

---

## 🏗️ 1. Perbedaan Arsitektur Inti

| Fitur | Web (Next.js) | Mobile (Flutter) |
| :--- | :--- | :--- |
| **Navigasi Utama** | Berbasis URL Rute (Next.js App Router) | Berbasis Tumpukan Layar (Screen Stack Navigation) |
| **Penjaga Proteksi** | Pola Layout Guard (`DashboardLayout.tsx`) | Logika Inisialisasi Startup (`initState` & State) |
| **Resolusi Domain Tenant** | Otomatis (dibaca dari Hostname / Subdomain browser) | Manual (diinput pertama kali oleh pengguna) |
| **Penyimpanan Kunci JWT** | Browser `localStorage` / Secure Session Cookies | Hardware-Backed `FlutterSecureStorage` (Terenkripsi) |
| **Header Identifikasi API** | Injeksi otomatis subdomain via axios interceptor | `X-Tenant-Domain` pada setiap outbound http request |

---

## 🌐 2. Mekanisme & Diagram Alir Autentikasi Web (Next.js)

Karena aplikasi Next.js digerakkan oleh rute URL (pengguna bisa mengetik langsung alamat `/en/attendance` di browser), sistem web menerapkan pola **Layout Guard** di tingkat layout utama.

```mermaid
flowchart TD
    Start([Pengguna Mengakses Rute Web]) --> CheckPublic{Apakah Rute Publik?\n- /login, /signup\n- /about, /}
    
    CheckPublic -- Ya --> RenderPage[Render Halaman Langsung]
    CheckPublic -- Tidak --> CheckLocalToken{Apakah ada access_token\ndi LocalStorage?}
    
    CheckLocalToken -- Tidak --> RedirectLogin[Redirect ke /login \nserta simpan rute asal]
    CheckLocalToken -- Ya --> ShowSpinner[Tampilkan Loading Spinner / \nSkeleton UI]
    
    ShowSpinner --> FetchMe[Kirim Request ke GET /users/me]
    FetchMe --> CheckSuccess{Apakah Request Sukses?}
    
    CheckSuccess -- Ya --> UpdateState[Simpan Detail User di AuthContext\ndan render halaman terlindungi]
    CheckSuccess -- Gagal: 401 Unauthorized --> TryRefresh{Apakah ada \nrefresh_token?}
    
    TryRefresh -- Ya --> PostRefresh[Kirim POST /auth/token/refresh/]
    PostRefresh -- Sukses --> SaveNewTokens[Simpan Token Baru di LocalStorage]
    SaveNewTokens --> FetchMe
    PostRefresh -- Gagal --> ClearTokens[Hapus Token & Redirect ke /login]
    
    TryRefresh -- Tidak --> ClearTokens
    UpdateState --> RenderProtected[Render Halaman Terproteksi]

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class RenderPage,RenderProtected success;
    class RedirectLogin,ClearTokens fail;
    class ShowSpinner,FetchMe,UpdateState,PostRefresh,SaveNewTokens step;
    class CheckPublic,CheckLocalToken,CheckSuccess,TryRefresh decision;
```

*   **Next.js Middleware/Context**: `TenantContext` menyelesaikan nama tenant dari URL (contoh: `ptmaju.harikerja.com`) sebelum pemeriksaan otentikasi.
*   **Interceptor API**: Menggunakan pembungkus `apiFetch.ts` kustom. Jika API mengembalikan error `401 Unauthorized`, interceptor menangguhkan request saat ini, memicu call refresh token, dan mengulang request asli dengan access token baru.

---

## 📱 3. Mekanisme & Diagram Alir Autentikasi Mobile (Flutter)

Aplikasi mobile Flutter tidak memiliki URL rute browser, sehingga keamanan layar dikelola dengan menyaring widget di layar awal berdasarkan ketersediaan token JWT terenkripsi.

```mermaid
flowchart TD
    Start([Aplikasi Mobile Dibuka]) --> ReadStorage[Baca SecureStorage untuk token & subdomain]
    ReadStorage --> CheckSubdomain{Apakah Subdomain \nTersimpan?}
    
    CheckSubdomain -- Tidak --> ShowTenantInput[Tampilkan Layar Input Subdomain]
    CheckSubdomain -- Ya --> CheckToken{Apakah access_token \nTersimpan?}
    
    ShowTenantInput --> InputSub[User input subdomain & validate]
    InputSub --> PingTenant[GET /tenant/validate/]
    PingTenant -- Terdaftar --> SaveSub[Simpan Subdomain ke Storage]
    SaveSub --> CheckToken
    PingTenant -- Tidak Terdaftar --> ShowSubError[Tampilkan Eror Subdomain]
    ShowSubError --> ShowTenantInput
    
    CheckToken -- Tidak --> ShowLogin[Tampilkan Layar Form Login]
    CheckToken -- Ya --> FetchProfile[Kirim GET /users/me \nHeader: X-Tenant-Domain = subdomain]
    
    ShowLogin --> SubmitLogin[Kirim POST /auth/login/]
    SubmitLogin -- Sukses --> SaveTokens[Simpan JWT ke SecureStorage]
    SaveTokens --> FetchProfile
    SubmitLogin -- Gagal --> ShowLoginError[Tampilkan Eror Kredensial]
    ShowLoginError --> ShowLogin
    
    FetchProfile -- Sukses --> SaveProfileState[Simpan Profile ke State Manager]
    SaveProfileState --> GoHome[Tampilkan Layar Utama / Home Screen]
    
    FetchProfile -- Gagal: 401 Unauthorized --> TryRefresh{Apakah ada \nrefresh_token?}
    TryRefresh -- Ya --> PostRefresh[Kirim POST /auth/token/refresh/]
    PostRefresh -- Sukses --> SaveNewTokens[Simpan Token Baru ke SecureStorage]
    SaveNewTokens --> FetchProfile
    PostRefresh -- Gagal --> ClearAll[Hapus Semua Data Sesi]
    ClearAll --> ShowLogin
    TryRefresh -- Tidak --> ClearAll

    classDef success fill:#10B981,stroke:#059669,color:#fff;
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff;
    classDef step fill:#3B82F6,stroke:#2563EB,color:#fff;
    classDef decision fill:#F59E0B,stroke:#D97706,color:#fff;
    
    class GoHome success;
    class ShowSubError,ShowLoginError,ClearAll fail;
    class ReadStorage,ShowTenantInput,InputSub,PingTenant,SaveSub,ShowLogin,SubmitLogin,SaveTokens,FetchProfile,SaveProfileState,PostRefresh,SaveNewTokens step;
    class CheckSubdomain,CheckToken,TryRefresh decision;
```

*   **Penyimpanan Kunci Terenkripsi**: Menggunakan `FlutterSecureStorage` yang memanfaatkan *Keychain* (iOS) dan *Keystore* (Android) untuk melindungi token JWT dari serangan fisik perangkat.
*   **API Client Interceptor**: Objek singleton `ApiService` Flutter otomatis menginjeksi header `X-Tenant-Domain` di setiap request HTTP outgoing.

---

## 🔒 4. Praktik Terbaik Pengamanan JWT

Untuk menjaga kerahasiaan sesi pengguna, platform menerapkan aturan keamanan berikut:
1.  **Lifetime Token**: Access token diatur kedaluwarsa pendek (24 jam) untuk menekan penyalahgunaan jika token bocor. Refresh token diatur kedaluwarsa menengah (7 hari).
2.  **Blacklisting Token**: Setiap kali pengguna menekan tombol Logout, sistem mengirim request ke `/api/auth/logout/` yang memasukkan `refresh_token` bersangkutan ke dalam daftar hitam (*blacklist database*) backend. Sesi lama tidak akan bisa di-refresh kembali.
3.  **Cross-Origin Protections (Web)**: Header respons API menyertakan perlindungan CORS ketat, membatasi origin request hanya dari domain tenant yang terdaftar pada skema `public`.

# Perbedaan: Portal Admin Global vs. Django Admin

Dokumen ini menjelaskan perbedaan arsitektur dan fungsionalitas antara **Portal Admin Global (SaaS Frontend)** dan **Django Admin (Backend Console)** pada platform HariKerja HRMS.

---

## 1. Tabel Perbandingan Ringkas

| Atribut / Dimensi | Portal Admin Global (SaaS Portal) | Django Admin (Backend Console) |
| :--- | :--- | :--- |
| **Lapisan Sistem** | **Frontend (Next.js)** | **Backend (Django Python)** |
| **URL Utama** | `/login/portal-admin-secure-39f28j/` (Login Portal) | `/django-admin-secure-39f28j/` (URL Rahasia) |
| **Antarmuka (UI)** | Next.js UI kustom, modern, dan dinamis | Tampilan bawaan standar Django Admin server-side |
| **Interaksi Data** | Melalui REST API yang aman (autentikasi JWT) | Manipulasi langsung ke baris database (CRUD) |
| **Target Pengguna** | Superadmin SaaS, Agen Support, Sales, Keuangan | DevOps, Sysadmin, Core Backend Developer |
| **Kontrol Akses** | RBAC (Role Based Access Control) & JWT | Flag database `is_staff` dan `is_superuser` |

---

## 2. Portal Admin Global (SaaS Frontend Portal)
**Portal Admin Global** adalah dasbor operasional resmi untuk menjalankan bisnis SaaS HariKerja. Ini adalah aplikasi frontend Next.js yang dibangun secara kustom dan berkomunikasi dengan server backend melalui REST API.

### Fungsi & Fitur Utama:
* **Manajemen Penyewa (Tenant):** Menyetujui atau menolak pendaftaran perusahaan baru, mengelola kuota karyawan, dan melacak masa aktif langganan.
* **Tagihan & Keuangan:** Mengubah paket langganan aktif, memantau riwayat faktur, dan menganalisis pendapatan bisnis SaaS.
* **Dukungan Pelanggan (Support):** Menyelesaikan tiket bantuan klien, menugaskan agen support ke tenant, dan mengelola panduan bantuan.
* **Keamanan & Kenyamanan:** Staf operasional dapat menjalankan bisnis harian dengan antarmuka yang ramah pengguna tanpa risiko kecelakaan menghapus baris database mentah.

---

## 3. Django Admin (Backend Console)
**Django Admin** adalah konsol administrasi database bawaan dari framework Django Python. Konsol ini digunakan sebagai alat bantu utilitas database tingkat rendah (*low-level*).

### Fungsi & Fitur Utama:
* **Manipulasi Database Langsung:** Melakukan operasi CRUD langsung pada tabel database (tabel user, tenant, log alur kerja, transaksi pembayaran) untuk perbaikan data darurat.
* **Konfigurasi Pengaturan Sistem:** Mengatur grup hak akses sistem Django, memvalidasi token API, dan menyesuaikan tabel sistem internal.
* **Fokus DevOps & Sysadmin:** Hanya digunakan saat keadaan darurat, troubleshooting backend rute, dan validasi migrasi skema database yang rusak.

---

## 4. Hubungan Arsitektur Sistem

```
                     ┌──────────────────────────────────┐
                     │          Staf Operasional        │
                     └────────────────┬─────────────────┘
                                      │
             ┌────────────────────────┴────────────────────────┐
             ▼                                                 ▼
┌──────────────────────────┐                      ┌──────────────────────────┐
│    Portal Admin Global   │                      │       Django Admin       │
│    (Next.js Frontend)    │                      │     (Backend Console)    │
├──────────────────────────┤                      ├──────────────────────────┤
│ • URL: /login/portal-... │                      │ • URL: /django-admin-... │
│ • Tampilan Modern Kustom │                      │ • Akses CRUD DB Mentah   │
│ • Jalur REST API Aman    │                      │ • Engine Python Langsung │
└────────────┬─────────────┘                      └────────────┬─────────────┘
             │ (REST API)                                      │ (Direct SQL)
             ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                             Database Postgres                              │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Kebijakan Keamanan Operasional
Demi menjaga integritas dan konsistensi database, **seluruh aktivitas bisnis operasional harian WAJIB dilakukan melalui Portal Admin Global (Next.js)**. Akses ke konsol backend Django Admin harus dibatasi secara sangat ketat hanya untuk tim DevOps dan hanya digunakan sebagai jalan terakhir saat penanganan masalah darurat (*emergency debugging*).

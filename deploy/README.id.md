# HariKerja HRMS - Pusat Infrastruktur & Deployment

Direktori ini adalah **Single Point of Truth (Sumber Informasi Tunggal)** untuk semua hal yang berkaitan dengan infrastruktur, konfigurasi lingkungan (environment), dan prosedur deployment platform HariKerja HRMS.

## 📂 Ikhtisar Struktur

Infrastruktur disusun berdasarkan target lingkungan (environment):

### 1. [Pengembangan Lokal (Local Development)](./local/local.md)
*   **Jalur**: `deploy/local/`
*   **Tujuan**: Menjalankan HRMS di mesin developer menggunakan Docker.
*   **Titik Masuk**: `up.mjs` di tingkat root.

### 2. [QA (Quality Assurance)](./qa/qa.id.md)
*   **Jalur**: `deploy/qa/`
*   **Tujuan**: Pengujian fungsional dan UAT (User Acceptance Testing) pada domain `harikerja.web.id`.

### 3. [Production 1K (VPS Single-Instance)](./production-1k/production-1k.md)
*   **Jalur**: `deploy/production-1k/`
*   **Tujuan**: Peluncuran awal klien skala kecil (hingga 1.000 pengguna aktif) pada VPS standar.
*   **Otomatisasi**: Menyertakan [deploy_1k_production.sh](./production-1k/deploy_1k_production.sh).

### 4. [Production 10K (Kluster VPS Skala Menengah)](./production-10k/production-10k.md)
*   **Jalur**: `deploy/production-10k/`
*   **Tujuan**: Peluncuran skala menengah (hingga 10.000 pengguna aktif) pada node VPS berspesifikasi tinggi.
*   **Otomatisasi**: Menyertakan [deploy_10k_production.sh](./production-10k/deploy_10k_production.sh).

### 5. [Staging 1K (Staging Aktif)](./staging-1k/staging-1k.md)
*   **Jalur**: `deploy/staging-1k/`
*   **Tujuan**: Lingkungan staging aktif untuk pengujian integrasi beban (scaling) dan kesiapan 1.000 pengguna.
*   **Otomatisasi**: Menyertakan [safe_deploy_staging-1k.sh](./staging-1k/safe_deploy_staging-1k.sh).

### 6. [Staging Global (Ditangguhkan)](./staging/staging.md)
*   **Jalur**: `deploy/staging/`
*   **Status**: Ditangguhkan (on hold) hingga pengujian beban Fase 3.

### 7. [Enterprise AWS (Produksi High-Availability)](./production/production.md)
*   **Jalur**: `deploy/production/`
*   **Tujuan**: Kluster AWS enterprise multi-node dengan target 100.000 hingga 1 juta lebih pengguna aktif.

---

## 🗺️ Strategi & Peta Jalan (Roadmap)
Lihat seluruh perjalanan infrastruktur di **[roadmap.id.md](./roadmap.id.md)**.

## 🛠️ Utilitas Deployment

| Alat | Lokasi | Penggunaan | Tujuan |
| :--- | :--- | :--- | :--- |
| **`up.mjs`** | `/` (Root) | `node up.mjs [env]` | Asisten Node.js lintas platform untuk orkestrasi kontainer. |
| **`Makefile`** | `/` (Root) | `make [env]` | Orkestrasi standar untuk server Linux. |
| **Panduan DNS** | `deploy/common/` | **[Baca Panduan](./common/dns_setup.md)** | **Konfigurasi DNS Domain & Wildcard.** |
| **File `.env`** | `deploy/environments/` | N/A | Rahasia (secrets) dan konfigurasi terpusat. |

## 🧩 Komponen Inti Infrastruktur

Terlepas dari lingkungan yang digunakan, platform beroperasi pada:
- **Django API Backend** (Python) + **PgBouncer** (Pooling Koneksi)
- **Next.js Frontend** (React)
- **PostgreSQL 15** (Skema Multi-tenant)
- **Redis 7** (Caching & Pub/Sub)

---

> [!TIP]
> **Menambahkan lingkungan baru?** Buat subfolder baru di bawah `deploy/` dan tambahkan file `.env` yang sesuai di `deploy/environments/`.

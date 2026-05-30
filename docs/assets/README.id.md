# 🖼️ Aset Dokumentasi Teknis

Direktori ini berisi aset-aset visual, termasuk tangkapan layar antarmuka pengguna (UI Screenshots), diagram alur sistem (system flowcharts), visualisasi database, dan diagram arsitektur yang disematkan di dalam seluruh file dokumentasi teknis platform HariKerja HRMS.

---

## 🧭 Panduan & Penggunaan Aset Visual

Semua aset di dalam folder ini ditautkan secara langsung ke dalam file markdown dokumentasi utama. Beberapa gambar penting yang tersedia meliputi:

*   **Diagram Alur Kerja Terintegrasi (`hrms_integrated_workflow.png`):** Menampilkan interaksi data end-to-end dari frontend, API, broker, hingga database Postgres.
*   **Alur Penggajian (`payroll_flowchart.png`):** Menampilkan bagan alur proses perhitungan gaji, persetujuan admin, hingga pembuatan slip gaji.
*   **Tangkapan Layar UI Premium:** Aset visual dengan resolusi tinggi untuk memandu penguji (UAT) memahami tata letak dashboard utama, form rekrutmen karyawan, dan pengaturan tenant.
*   **RBAC Walkthrough (`rbac_walkthrough_proven...webp`):** Ilustrasi visual mengenai konsep pembatasan akses data berbasis peran dalam sistem multi-tenant.

---

## 📊 Matriks Referensi Aset Gambar Utama

| Nama Aset Gambar | Kategori | Digunakan Dalam Dokumen | Topik Visual |
| :--- | :--- | :--- | :--- |
| **`hrms_integrated_workflow.png`** | Diagram | `docs/workflows_features/hrms_operations_workflow.md` | Interaksi data sistem terpadu |
| **`payroll_flowchart.png`** | Flowchart | `docs/modules/payroll.md` | Logika hitung gaji & persetujuan |
| **`rbac_walkthrough_proven...webp`** | Infografis | `docs/workflows_features/rbac_security.md` | Visualisasi hak akses & isolasi tenant |
| **`mobile_preview.png`** | Mockup | `docs/workflows_features/mobile_app_workflows.md` | Tampilan aplikasi mobile Flutter |
| **`dashboard_preview.png`** | Mockup | `docs/workflows_features/web_app_workflows.md` | Dashboard operasional web Next.js |

---
*Aset di dalam folder ini dikelola secara ketat agar tautan file di dokumen markdown utama tidak rusak.*

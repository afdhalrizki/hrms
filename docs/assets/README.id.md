# 🖼️ Aset Dokumentasi Teknis

Direktori ini berisi aset-aset visual, termasuk tangkapan layar antarmuka pengguna (UI Screenshots), diagram alur sistem (system flowcharts), visualisasi database, dan diagram arsitektur yang disematkan di dalam seluruh file dokumentasi teknis platform HariKerja HRMS.

---

## 🧭 Panduan & Penggunaan Aset Visual

Semua aset di dalam folder ini ditautkan secara langsung ke dalam file markdown dokumentasi utama. Beberapa gambar penting yang tersedia meliputi:

*   **Diagram Alur Kerja Terintegrasi ([hrms_integrated_workflow.png](./hrms_integrated_workflow.png)):** Menampilkan interaksi data end-to-end dari frontend, API, broker, hingga database Postgres.
*   **Alur Penggajian ([payroll_flowchart.png](./payroll_flowchart.png)):** Menampilkan bagan alur proses perhitungan gaji, persetujuan admin, hingga pembuatan slip gaji.
*   **Tangkapan Layar UI Premium:** Aset visual dengan resolusi tinggi untuk memandu penguji (UAT) memahami tata letak dashboard utama, form rekrutmen karyawan, dan pengaturan tenant.
*   **RBAC Walkthrough ([rbac_walkthrough_proven_1773645692977.webp](./rbac_walkthrough_proven_1773645692977.webp)):** Ilustrasi visual mengenai konsep pembatasan akses data berbasis peran dalam sistem multi-tenant.

---

## 📊 Matriks Referensi Aset Gambar Utama

| Nama Aset Gambar | Kategori | Digunakan Dalam Dokumen | Topik Visual |
| :--- | :--- | :--- | :--- |
| **[hrms_integrated_workflow.png](./hrms_integrated_workflow.png)** | Diagram | **[hrms_operations_workflow.id.md](../workflows_features/hrms_operations_workflow.id.md)** | Interaksi data sistem terpadu |
| **[payroll_flowchart.png](./payroll_flowchart.png)** | Flowchart | **[payroll.id.md](../modules/payroll.id.md)** | Logika hitung gaji & persetujuan |
| **[rbac_walkthrough_proven_1773645692977.webp](./rbac_walkthrough_proven_1773645692977.webp)** | Infografis | **[rbac_security.id.md](../workflows_features/rbac_security.id.md)** | Visualisasi hak akses & isolasi tenant |
| **[mobile_preview.png](./mobile_preview.png)** | Mockup | **[mobile_app_workflows.id.md](../workflows_features/mobile_app_workflows.id.md)** | Tampilan aplikasi mobile Flutter |
| **[dashboard_preview.png](./dashboard_preview.png)** | Mockup | **[web_app_workflows.id.md](../workflows_features/web_app_workflows.id.md)** | Dashboard operasional web Next.js |

---
*Aset di dalam folder ini dikelola secara ketat agar tautan file di dokumen markdown utama tidak rusak.*

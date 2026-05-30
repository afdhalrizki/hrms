# 🏛️ Rekaman Keputusan Arsitektur (ADR)

Folder ini berisi dokumentasi keputusan arsitektur penting (*Architectural Decision Records*) yang diambil selama pengembangan platform HariKerja HRMS. Setiap rekaman mencatat konteks, alternatif solusi, keputusan akhir, serta konsekuensi teknis dari keputusan tersebut.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Setiap dokumen di folder ini tersedia dalam dua versi bahasa untuk memudahkan pengembang lokal dan global:

1.  **`employee_counter_optimization.id.md` (Bahasa Indonesia):** 
    Mencatat keputusan arsitektur mengenai optimalisasi perhitungan data karyawan (employee counter) untuk mengurangi beban kueri database secara dinamis.
2.  **`employee_counter_optimization.md` (Bahasa Inggris):** 
    Versi bahasa Inggris resmi dari dokumentasi optimalisasi perhitungan karyawan tersebut.

---

## 📊 Matriks Dokumentasi: ADR

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[employee_counter_optimization.id.md](file:///home/afdhal/data/hr/hrms/docs/adr/employee_counter_optimization.id.md)** | Optimalisasi DB | Tech Lead, Developer | Optimasi kueri count, caching Redis, efisiensi database |
| **[employee_counter_optimization.md](file:///home/afdhal/data/hr/hrms/docs/adr/employee_counter_optimization.md)** | DB Optimization | Tech Lead, Developer | Count query optimization, Redis caching, database efficiency |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*

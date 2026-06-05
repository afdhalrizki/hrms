# Panduan Operasional & Diagnostik Server QA

Panduan ini berisi petunjuk langkah-demi-langkah untuk menjalankan perintah diagnostik, mengakses shell, dan mengeksekusi tugas database Django di server QA **HariKerja HRMS**.

> [!IMPORTANT]
> Semua perintah yang tercantum dalam panduan ini **WAJIB** dijalankan dari **direktori root proyek** pada server QA (`/home/afdhalqa/hrms`).

---

## 🛠️ 1. Menjalankan Perintah Django di Server QA

Karena lingkungan QA dideploy menggunakan file compose khusus (`deploy/qa/docker-compose.qa.yml`) dan konfigurasi environment (`deploy/environments/.env.qa`), Anda wajib menyertakan file konfigurasi tersebut menggunakan flag `-f` untuk semua perintah eksekusi `docker compose`.

### 1.1 Mengakses Django Shell (Interaktif)
Untuk membuka python shell interaktif di dalam kontainer backend:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell
```

### 1.2 Mengakses Django Shell (Satu Baris Perintah)
Untuk mengeksekusi kode python tertentu secara langsung:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell -c "<kode_python>"
```

### 1.3 Menjalankan Migrasi Database Django
Untuk menjalankan migrasi database pada server QA:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py migrate
```

---

## 🔍 2. Cuplikan Perintah Diagnostik

### 2.1 Memeriksa Pengguna Superadmin
Untuk mencetak daftar semua pengguna superadmin terdaftar (`is_superuser=True`) beserta username dan email mereka:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print([f'Username: {u.username} | Email: {u.email}' for u in User.objects.filter(is_superuser=True)])"
```

### 2.2 Memeriksa Tenant yang Aktif
Untuk mencetak daftar semua schema/tenant yang saat ini terkonfigurasi di database:
```bash
docker compose -f deploy/qa/docker-compose.qa.yml exec backend python manage.py shell -c "from tenants.models import Tenant; print([t.schema_name for t in Tenant.objects.all()])"
```

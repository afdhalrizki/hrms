# 📋 Struktur Log Pengujian Mobile

## ✅ Sistem Logging Terpadu

Semua log pengujian di mobile sekarang terpusat di **`mobile/logs/`**

### Lokasi Log

```
mobile/logs/
├── unit_test_*.log           # Log pengujian unit (79 tes)
├── e2e_test_*.log            # Log pengujian E2E (25 tes)
└── archive/                  # Log riwayat (diarsipkan)
```

### Konvensi Penamaan

- **Unit Test**: `unit_test_YYYY-MM-DD_HH-mm-ss.log`
- **E2E Test**: `e2e_test_YYYY-MM-DD_HH-mm-ss.log`

### Lokasi Skrip

```
mobile/scripts/
├── run_unit_tests.mjs        # Log ke: mobile/logs/unit_test_*.log
├── run_e2e_tests.mjs         # Log ke: mobile/logs/e2e_test_*.log
├── run_tests.mjs             # Orkestrator (memanggil keduanya)
└── manage_logs.mjs           # Utilitas manajemen log
```

## 🛠️ Manajemen Log

### Lihat Log

```bash
# List log terbaru
node mobile/scripts/manage_logs.mjs list

# List hanya log pengujian unit
node mobile/scripts/manage_logs.mjs list unit

# List hanya log pengujian e2e
node mobile/scripts/manage_logs.mjs list e2e
```

### Statistik

```bash
# Tampilkan statistik log
node mobile/scripts/manage_logs.mjs stats
```

### Arsipkan Log Lama

```bash
# Arsipkan log yang lebih lama dari 7 hari
node mobile/scripts/manage_logs.mjs archive 7

# Arsipkan log yang lebih lama dari 30 hari
node mobile/scripts/manage_logs.mjs archive 30
```

### Hapus Log Lama

```bash
# Hapus log yang lebih lama dari 30 hari
node mobile/scripts/manage_logs.mjs clear 30

# Hapus log yang lebih lama dari 90 hari
node mobile/scripts/manage_logs.mjs clear 90
```

## 📊 Struktur Saat Ini

```
✅ Logging Unit Test ke: /mobile/logs/unit_test_*.log
✅ Logging E2E Test ke:  /mobile/logs/e2e_test_*.log
✅ Folder tunggal terpadu untuk semua tes
✅ Format stempel waktu konsisten (YYYY-MM-DD_HH-mm-ss)
✅ Pembuatan direktori otomatis
```

## 🔄 Alur Kerja

1. **Jalankan Tes** → Log dibuat di `mobile/logs/`

   ```bash
   node mobile/scripts/run_tests.mjs
   ```

2. **Lihat Log Terbaru** → List log pengujian terbaru

   ```bash
   node mobile/scripts/manage_logs.mjs list
   ```

3. **Arsipkan Log Lama** → Menjaga folder tetap bersih

   ```bash
   node mobile/scripts/manage_logs.mjs archive
   ```

4. **Cek Statistik** → Memantau jumlah log
   ```bash
   node mobile/scripts/manage_logs.mjs stats
   ```

## 📁 Entri .gitignore

Semua file log sudah di-ignore:

```gitignore
mobile/logs/
mobile/e2e/logs/
**/unit_test_*.log
**/e2e_test_*.log
**/*.log
```

---

**Terakhir Diperbarui**: 13 April 2026

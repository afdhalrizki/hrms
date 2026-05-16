#!/bin/bash

# --- Script Deployment Aman HRMS (Lingkungan QA) ---
# Script ini dirancang untuk melakukan deployment dengan aman ke server QA.
# Urutan proses: Memastikan koneksi stabil, backup database, tarik kode terbaru (git pull),
# build container docker baru, jalankan migrasi database, dan tes kesehatan (smoke test).

set -e # Hentikan script secara otomatis jika ada perintah yang gagal (mengembalikan exit code selain 0)
set -o pipefail # Hentikan script jika ada perintah di dalam pipe (|) yang gagal

# ==========================================
# Konfigurasi Direktori dan Environment
# ==========================================
# Mengambil direktori tempat script ini berada, lalu kembali 2 tingkat ke root project
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." &> /dev/null && pwd )"
ENV_FILE="deploy/environments/.env.qa"

# ==========================================
# Tahap 0: Stabilitas Koneksi SSH
# ==========================================
# Mencegah terminal terputus (freeze/timeout) saat proses deployment yang memakan waktu lama.
echo "🛡️ Tahap 0: Memastikan Stabilitas Terminal (SSH KeepAlive)..."
if grep -q "ClientAliveInterval 0" /etc/ssh/sshd_config; then
    echo "🔧 Mengoptimalkan pengaturan SSH untuk mencegah terminal terputus..."
    # Mengirim paket "alive" setiap 60 detik ke client agar koneksi tetap aktif
    sudo sed -i 's/ClientAliveInterval 0/ClientAliveInterval 60/' /etc/ssh/sshd_config
    sudo sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 3/' /etc/ssh/sshd_config
    sudo systemctl restart ssh
    echo "✅ SSH dioptimalkan. Terminal sekarang lebih stabil."
else
    echo "✅ Stabilitas SSH sudah terkonfigurasi."
fi

# Pindah ke direktori utama project
cd "$PROJECT_ROOT"

echo "🚀 Memulai Proses Deployment Aman untuk HRMS QA..."

# ==========================================
# Tahap 1: Pencadangan Database (Backup)
# ==========================================
# Sangat krusial! Memastikan kita punya titik pemulihan jika deployment gagal atau merusak data.
echo "📦 Tahap 1: Membuat backup database..."
if ! "$SCRIPT_DIR/backup_qa.sh"; then
    echo "❌ Backup gagal! Menghentikan proses deployment demi keamanan."
    exit 1
fi

# ==========================================
# Tahap 2: Pembaruan Kode (Git Pull)
# ==========================================
# Mengambil pembaruan kode terbaru dari repositori git.
# Mengecek apakah direktori saat ini adalah repositori git yang valid.
if [ -d ".git" ]; then
    echo "⬇️ Tahap 2: Menarik kode terbaru dari repositori (git pull)..."
    git pull || echo "⚠️ Tahap 2: Git pull gagal (mungkin ada perubahan lokal). Tetap melanjutkan..."
else
    echo "⚠️ Tahap 2: Bukan repositori git, melewati proses git pull."
fi

# ==========================================
# Tahap 3: Membangun Ulang & Menjalankan Container (Deployment)
# ==========================================
echo "🏗️ Tahap 3: Membangun ulang (rebuild) dan menjalankan container..."
# Mematikan dan menghapus container lama ('down') untuk membersihkan IP dan cache DNS Docker.
# '--remove-orphans' akan menghapus container yang tidak terdefinisi di docker-compose saat ini.
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" down --remove-orphans

# Menjalankan ulang ('up') container di latar belakang ('-d') dan memaksa build ulang image ('--build') 
# agar kode terbaru teraplikasikan.
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" up -d --build

# ==========================================
# Tahap 4: Migrasi Database
# ==========================================
echo "⚙️ Tahap 4: Menjalankan migrasi database (Schema Publik & Tenant)..."
# Mengeksekusi perintah Django 'migrate_schemas' di dalam container 'backend' untuk menerapkan 
# perubahan struktur database ke schema utama dan semua schema tenant yang ada.
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" exec -T backend python manage.py migrate_schemas

# ==========================================
# Tahap 4.1: Inisialisasi Tenant
# ==========================================
echo "🏗️ Tahap 4.1: Menginisialisasi Public Tenant dan Domain..."
# Menjalankan script khusus untuk memastikan setup awal tenant untuk QA sudah sesuai dan terdaftar di database.
docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" exec -T backend python scripts/setup_qa_tenant.py

# ==========================================
# Tahap 5: Pengujian Unit (Unit Testing) - Diabaikan
# ==========================================
# (Komentar asli dipertahankan, saat ini tidak dijalankan karena masih di-comment)
# echo "🧪 Tahap 5: Menjalankan Backend Unit Tests..."
# if ! docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" exec -T backend pytest -m "not e2e" -n auto; then
#     echo "❌ Unit Tests Gagal! Deployment mungkin tidak stabil."
#     echo "Cek output test di atas."
#     exit 1
# fi
# echo "✅ Unit Tests Berhasil!"

# ==========================================
# Tahap 6: Smoke Test (Cek Kesehatan Sistem)
# ==========================================
echo "🔍 Tahap 6: Menjalankan Smoke Test (Cek Status API)..."
echo "Menunggu 15 detik agar semua layanan siap dan stabil..."
sleep 15

# Mengecek endpoint API `/api/health/`. Kita melakukan request ke localhost:80 
# tetapi memanipulasi Header ('Host' dan 'X-Forwarded-Proto') untuk menyimulasikan 
# request aslinya (harikerja.web.id dengan HTTPS) sehingga Nginx atau Backend tidak melakukan redirect.
API_STATUS=$(curl -sk -o /dev/null -w "%{http_code}" \
  -H "Host: harikerja.web.id" \
  -H "X-Forwarded-Proto: https" \
  http://localhost:80/api/health/ || echo "000")

if [ "$API_STATUS" -eq 200 ]; then
    echo "✅ Smoke Test Berhasil! API merespons dengan baik (HTTP $API_STATUS)."
else
    echo "❌ Smoke Test Gagal! API tidak merespons dengan benar (HTTP $API_STATUS)."
    echo "Menampilkan 100 baris log backend terakhir untuk menganalisa masalah:"
    # Tampilkan log dari container backend, filter kata 'health' agar tidak berisik, lalu keluar dengan kode error
    docker compose -f deploy/qa/docker-compose.qa.yml --env-file "$ENV_FILE" logs --tail=100 backend | grep -v "health"
    exit 1
fi

# ==========================================
# Tahap 7: Pembersihan (Cleanup)
# ==========================================
echo "🧹 Tahap 7: Membersihkan artifact Docker yang tidak terpakai..."
# Menghapus image Docker yang lama (dangling images) untuk menghemat ruang disk di server.
docker image prune -f

# ==========================================
# Selesai
# ==========================================
echo "✅ Deployment Aman Berhasil Diselesaikan!"
echo "Aplikasi telah diperbarui dan cadangan data telah disimpan di folder 'backups/'."

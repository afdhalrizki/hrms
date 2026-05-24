# Panduan Pemindaian Keamanan Mandiri (Security Self-Assessment Guide)

Dokumen ini menyediakan panduan langkah-demi-langkah bagi tim pengembang dan tim sistem untuk melakukan pemindaian keamanan secara mandiri (*self-assessment*) pada seluruh komponen aplikasi HRMS: **Backend**, **Frontend**, **Mobile**, dan **Infrastruktur/Server**. 

Pemindaian berkala sangat penting untuk mendeteksi kerentanan sejak dini (DevSecOps) sebelum kode dipindahkan ke lingkungan produksi.

---

## Ringkasan Matriks Alat Pemindaian (Security Tooling Matrix)

| Komponen | Jenis Pengujian | Alat (Tools) | Frekuensi Rekomendasi |
| :--- | :--- | :--- | :--- |
| **Backend** (Django/Python) | SAST (Static Analysis) | `bandit` | Setiap Pull Request / CI/CD |
| | Dependensi (SCA) | `pip-audit` / `safety` | Setiap Pull Request / Mingguan |
| | Konfigurasi Framework | `django check --deploy` | Sebelum Rilis / CI/CD |
| **Frontend** (JS/TS/React) | Dependensi (SCA) | `npm audit` | Setiap Pull Request / CI/CD |
| | SAST (Static Analysis) | `eslint-plugin-security` | Setiap Commit / PR |
| **Mobile** (React Native/dll) | SAST & DAST Komprehensif | `MobSF` (Mobile Security Framework) | Sebelum Rilis Utama (Major Release) |
| **Infrastruktur / Server** | Container Security | `trivy` | CI/CD Build / Mingguan |
| | Audit OS Linux | `lynis` | Bulanan |
| | Port & TLS Audit | `nmap` & `testssl.sh` | Sebelum Go-Live / Bulanan |
| **Semua Komponen** | Deteksi Kebocoran Kunci | `trufflehog` | CI/CD Pipeline |

---

## 1. Pemindaian Backend (Python/Django)

Backend menggunakan teknologi Django. Fokus utama adalah pada keamanan kode kustom, dependensi pustaka, dan konfigurasi framework.

### A. Static Application Security Testing (SAST) menggunakan `bandit`
`bandit` menganalisis AST (Abstract Syntax Tree) kode Python untuk menemukan kerentanan umum seperti penggunaan `eval()`, penulisan hash yang lemah, atau hardcoded password.

*   **Instalasi:**
    ```bash
    pip install bandit
    ```
*   **Cara Menjalankan:**
    Jalankan perintah ini di dalam direktori `backend`:
    ```bash
    bandit -r . -f txt -o bandit_report.txt
    ```
    *Argumen `-r .` memindai seluruh subdirektori secara rekursif. Laporan akan disimpan di `bandit_report.txt`.*

### B. Software Composition Analysis (SCA) menggunakan `pip-audit`
`pip-audit` memindai pustaka-pustaka yang terdaftar di `requirements.txt` terhadap database kerentanan PyPA (Python Packaging Advisory) dan OSV (Open Source Vulnerabilities).

*   **Instalasi:**
    ```bash
    pip install pip-audit
    ```
*   **Cara Menjalankan:**
    ```bash
    pip-audit -r requirements.txt --format columns
    ```

### C. Audit Konfigurasi Django (`check --deploy`)
Django memiliki sistem audit bawaan untuk memeriksa konfigurasi `settings.py` sebelum dideploy ke lingkungan produksi.

*   **Cara Menjalankan:**
    Setel variabel lingkungan `DJANGO_SETTINGS_MODULE` ke konfigurasi produksi Anda terlebih dahulu, lalu jalankan:
    ```bash
    python manage.py check --deploy
    ```
    > [!IMPORTANT]
    > Pastikan status `DEBUG = False` diaktifkan saat melakukan pengujian ini untuk mendapatkan hasil audit produksi yang akurat.

---

## 2. Pemindaian Frontend (Node.js/JavaScript/TypeScript)

Frontend berbasis JavaScript/TypeScript membutuhkan analisis dependensi pihak ketiga (karena ekosistem npm sangat dinamis) serta pengkodean aman untuk mencegah XSS.

### A. Audit Dependensi (SCA) menggunakan `npm audit`
`npm audit` secara bawaan telah terintegrasi dengan package manager npm untuk menganalisis pohon ketergantungan paket dari `package-lock.json` terhadap database kerentanan npm registry.

*   **Cara Menjalankan:**
    Masuk ke direktori `frontend`, lalu jalankan:
    ```bash
    npm audit
    ```
*   **Perbaikan Otomatis:**
    Untuk memperbarui dependensi yang rentan ke versi aman yang kompatibel secara otomatis:
    ```bash
    npm audit fix
    ```

### B. Analisis Kode Statis menggunakan ESLint (`eslint-plugin-security`)
Mengintegrasikan aturan keamanan ke dalam linter kode JavaScript membantu mencegah penggunaan fungsi berbahaya (seperti `dangerouslySetInnerHTML` yang tidak disanitasi).

*   **Instalasi:**
    ```bash
    npm install --save-dev eslint-plugin-security
    ```
*   **Konfigurasi di `.eslintrc.json`:**
    ```json
    {
      "extends": [
        "eslint:recommended",
        "plugin:security/recommended"
      ],
      "plugins": [
        "security"
      ]
    }
    ```
*   **Cara Menjalankan:**
    ```bash
    npm run lint
    ```

---

## 3. Pemindaian Mobile (Android/iOS)

Aplikasi mobile rentan terhadap dekompilasi (rekayasa balik), penyimpanan data lokal yang tidak aman, dan kebocoran API Key.

### A. Mobile Security Framework (MobSF)
`MobSF` adalah solusi otomatis all-in-one untuk analisis keamanan statis (SAST) dan dinamis (DAST) file biner aplikasi mobile (`.apk` untuk Android atau `.ipa` untuk iOS).

*   **Cara Menjalankan melalui Docker:**
    Cara termudah dan tercepat untuk menjalankan MobSF secara lokal adalah dengan menggunakan kontainer Docker:
    ```bash
    docker run -it --rm -p 8000:8000 opensecurity/mobsf:latest
    ```
*   **Cara Penggunaan:**
    1. Buka browser dan akses `http://localhost:8000`.
    2. Unggah file hasil build aplikasi Anda (`.apk`, `.aab`, atau `.ipa`).
    3. MobSF akan menganalisis manifes aplikasi, izin (*permissions*), kemungkinan hardcoded API key, keamanan enkripsi lokal, serta mendeteksi celah OWASP Mobile Top 10.

---

## 4. Pemindaian Infrastruktur & Server

Pengamanan sistem operasi, konfigurasi server web (seperti Nginx), dan kontainerisasi (Docker) adalah benteng pertahanan terakhir.

### A. Pemindaian Kontainer dan Konfigurasi Docker menggunakan `trivy`
`trivy` adalah alat pemindai keamanan yang sangat cepat dan komprehensif untuk mendeteksi kerentanan pada sistem operasi di dalam kontainer Docker, file konfigurasi (seperti `docker-compose.yml`), dan repositori git.

*   **Instalasi (Ubuntu/Debian):**
    ```bash
    sudo apt-get install wget apt-transport-https gnupg lsb-release
    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
    sudo apt-get update
    sudo apt-get install trivy
    ```
*   **Cara Menjalankan:**
    *   **Memindai file Dockerfile / Docker Compose:**
        ```bash
        trivy config .
        ```
    *   **Memindai Docker Image yang sudah di-build:**
        ```bash
        trivy image nama_image_backend:latest
        ```

### B. Audit Keamanan Sistem Operasi Linux menggunakan `lynis`
`lynis` adalah alat audit keamanan opensource untuk sistem berbasis Linux. Lynis melakukan pemindaian mendalam terhadap konfigurasi OS, permission file, konfigurasi SSH, firewall, sistem logging, dan kernel hardening.

*   **Instalasi:**
    ```bash
    sudo apt-get install lynis
    ```
*   **Cara Menjalankan:**
    ```bash
    sudo lynis audit system
    ```
    > [!TIP]
    > Hasil audit `lynis` akan menghasilkan skor indeks keamanan (*Hardening index*) serta daftar tindakan perbaikan (*Suggestions* dan *Warnings*) yang sangat terperinci beserta referensi kodenya.

### C. Pemindaian Sertifikat SSL/TLS menggunakan `testssl.sh`
Alat command-line gratis ini menguji layanan server pada port apa pun untuk memeriksa dukungan enkripsi TLS/SSL, cipher suites, kerentanan protokol (seperti Heartbleed, POODLE, ROBOT), dan konfigurasi sertifikat.

*   **Cara Menjalankan via Docker:**
    ```bash
    docker run --rm -ti drwetter/testssl.sh https://domain-anda.com
    ```

---

## 5. Deteksi Kebocoran Kredensial / Secret Detection

Kebocoran API Key, password database, atau kunci SSH ke repositori Git adalah salah satu celah paling fatal.

### A. Menggunakan `trufflehog`
`trufflehog` memindai seluruh riwayat git untuk mencari rahasia (*secrets*) yang tidak sengaja ter-commit, baik yang berupa string dengan entropi tinggi maupun yang cocok dengan pola regex kredensial tertentu (seperti AWS Keys, Stripe, dll).

*   **Instalasi via Go/Docker:**
    ```bash
    docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --repo https://github.com/username/repo.git
    ```
    *Atau jalankan pemindaian direktori lokal:*
    ```bash
    docker run --rm -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest filesystem /pwd
    ```

---

## Tindakan Lanjut Pasca Pemindaian (Remediation Workflow)

1.  **Klasifikasi Temuan**: Kategorikan temuan menjadi *Critical*, *High*, *Medium*, dan *Low*.
2.  **Mitigasi Segera**: Temuan dengan kategori *Critical* dan *High* (misalnya dependensi yang memiliki exploit aktif, atau port basis data yang terbuka ke publik) harus segera diperbaiki sebelum rilis berikutnya.
3.  **Otomatisasi CI/CD**: Integrasikan secara bertahap alat pemindai seperti `bandit`, `pip-audit`, dan `npm audit` ke dalam alur kerja integrasi berkelanjutan (CI/CD) Anda agar pemindaian berjalan secara otomatis pada setiap Pull Request.

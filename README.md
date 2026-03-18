# harikerja HRMS SaaS

[**English**](#english) | [**Bahasa Indonesia**](#bahasa-indonesia)

---

<a name="english"></a>
## 🌐 English Version

A next-generation, multi-tenant Human Resource Management System (HRMS) built for enterprise scale. This platform provides a comprehensive suite for HR management, attendance tracking with AI biometric verification, Indonesian payroll compliance (TER 2024), and Executive Analytics.

### ✨ Platform Highlights
- **Professional Admin Dashboard**: Modern, glassmorphism-based command center for HR professionals.
- **Secure Mobile Attendance**: Biometric face verification and real-time ESS (Employee Self-Service).
- **Indonesian Payroll Compliance**: Automated PPh 21 (TER 2024) and BPJS calculation engine.

### 🚀 Quick Start
Unified scripts to manage **Development**, **Staging**, and **Production** environments seamlessly.

#### Windows (PowerShell)
```powershell
.\up.ps1 dev -build    # Start local dev
```

#### Access Points (Local):
- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

### 💎 Premium Features
- **Multi-Tenant Foundation**: Complete data isolation using PostgreSQL schemas per customer.
- **Biometric Security**: AI-powered Face ID with liveness check using Google ML Kit.
- **Expense Claim Management**: Automated reimbursement system with digital receipt tracking and integrated payroll.
- **SaaS Tiering & Quotas**: Graduated feature access (Basic, Professional, Enterprise) with resource-based quotas.

### 🛠 Tech Stack
- **Backend**: Python 3.12+, Django 5.0, Django-Tenants, DRF Spectacular.
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion.
- **Mobile**: Flutter 3.19+, Google ML Kit (Face ID).
- **Infrastructure**: PostgreSQL 15, Redis 7, PgBouncer, Docker Compose, AWS.

---

<a name="bahasa-indonesia"></a>
## 🇮🇩 Versi Bahasa Indonesia

Sistem Manajemen Sumber Daya Manusia (HRMS) multi-tenant generasi terbaru yang dibangun untuk skala perusahaan. Platform ini menyediakan rangkaian lengkap pengelolaan HR, pelacakan kehadiran dengan verifikasi biometrik AI, kepatuhan payroll Indonesia (TER 2024), dan Analitik Eksekutif.

### ✨ Sorotan Platform
- **Dashboard Admin Profesional**: Pusat komando berbasis *glassmorphism* modern untuk profesional HR.
- **Presensi Mobile Aman**: Verifikasi wajah biometrik dan ESS (*Employee Self-Service*) secara real-time.
- **Kepatuhan Payroll Indonesia**: Mesin kalkulasi PPh 21 (TER 2024) dan BPJS otomatis.

### 🚀 Memulai dengan Cepat
Skrip terpadu untuk mengelola lingkungan **Development**, **Staging**, dan **Production** dengan lancar.

#### Windows (PowerShell)
```powershell
.\up.ps1 dev -build    # Menjalankan dev lokal
```

#### Titik Akses (Lokal):
- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)

### 💎 Fitur Premium
- **Pondasi Multi-Tenant**: Isolasi data lengkap menggunakan skema PostgreSQL per pelanggan.
- **Keamanan Biometrik**: Face ID bertenaga AI dengan pemeriksaan liveness menggunakan Google ML Kit.
- **Manajemen Klaim Biaya**: Sistem reimbursement otomatis dengan pelacakan tanda terima digital yang terintegrasi dengan payroll.
- **SaaS Tiering & Kuota**: Akses fitur bertahap (Basic, Professional, Enterprise) dengan kuota berbasis sumber daya.

### 🛠 Teknologi yang Digunakan
- **Backend**: Python 3.12+, Django 5.0, Django-Tenants, DRF Spectacular.
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion.
- **Mobile**: Flutter 3.19+, Google ML Kit (Face ID).
- **Infrastruktur**: PostgreSQL 15, Redis 7, PgBouncer, Docker Compose, AWS.

---
**Status**: Milestone 🎉 Phase 41 (Reimbursement & Expense Claim) 100% Complete. Integrated with **TER 2024 Payroll Engine** and **SaaS Tiering Logic**. Rebranded to **harikerja** on March 19, 2026.

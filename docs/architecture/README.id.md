# 🏗️ Arsitektur Sistem & Desain Platform

Folder ini berisi dokumentasi arsitektur sistem tingkat tinggi, desain infrastruktur, dan strategi skalabilitas platform HariKerja HRMS. Dokumentasi ini menjadi acuan utama bagi arsitek sistem, insinyur DevOps, dan pengembang senior untuk memahami bagaimana subsistem berinteraksi dan skalabilitas dikelola.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumen di folder ini terbagi ke dalam beberapa fokus arsitektur utama, sebagian besar tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Sistem Autentikasi ([auth_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/auth_architecture.id.md)):** 
    Menjelaskan alur keamanan token JWT, manajemen session cookie silang sub-domain, dan proteksi CSRF.
2.  **AWS High Availability ([aws_high_availability_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/aws_high_availability_architecture.id.md)):** 
    Panduan merancang infrastruktur cloud AWS yang tahan banjir *traffic* menggunakan Multi-AZ RDS, Auto-Scaling Groups, dan Application Load Balancer.
3.  **Strategi Deployment ([deployment_strategy.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/deployment_strategy.id.md)):** 
    Menjelaskan skema rilis perangkat lunak (Blue-Green Deployment, Canary Release) demi meminimalkan *downtime*.
4.  **Arsitektur Email ([email_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/email_architecture.id.md)):** 
    Desain pengiriman notifikasi email secara asinkron menggunakan broker Redis dan antrean Celery.
5.  **Integrasi Mesin Fingerprint ([fingerprint_integration_design.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/fingerprint_integration_design.id.md)):** 
    Panduan integrasi mesin absensi fisik sidik jari berbasis protokol TCP/IP langsung ke backend cloud.
6.  **Multi-Tenancy System ([multi_tenancy_system.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/multi_tenancy_system.id.md)):** 
    Penjelasan teknis pembatasan data tingkat database menggunakan skema PostgreSQL dinamis via `django-tenants`.
7.  **Panduan Scaling ([scaling_architecture_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/scaling_architecture_guide.id.md)):** 
    Panduan membagi beban kerja database, replikasi read-write, caching Redis, dan optimalisasi koneksi via PgBouncer.
8.  **Penilaian Mandiri Keamanan ([security_self_assessment_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/security_self_assessment_guide.id.md)):** 
    Daftar periksa audit kepatuhan keamanan internal untuk mendeteksi kerentanan OWASP Top 10 secara mandiri.

---

## 📊 Matriks Dokumentasi: Arsitektur Sistem

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[auth_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/auth_architecture.id.md)** | Keamanan | Security, Developer | JWT, Secure cookies, proteksi CSRF, session |
| **[aws_high_availability_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/aws_high_availability_architecture.id.md)** | Cloud Infra | DevOps, Architect | AWS Multi-AZ RDS, Auto Scaling, ALB, HA |
| **[deployment_strategy.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/deployment_strategy.id.md)** | Rilis & CI/CD | DevOps, Developer | Blue-Green, Canary rilis, zero-downtime |
| **[email_architecture.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/email_architecture.id.md)** | Integrasi | Developer, Sysadmin | Antrean email, Redis broker, Celery worker |
| **[fingerprint_integration_design.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/fingerprint_integration_design.id.md)** | Biometrik | IoT/Hardware, Dev | Protokol TCP/IP fingerprint, log penarikan data |
| **[multi_tenancy_system.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/multi_tenancy_system.id.md)** | Database | DB Architect, Dev | Skema Postgres isolation, django-tenants |
| **[scaling_architecture_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/scaling_architecture_guide.id.md)** | Optimalisasi | DB Architect, DevOps | PgBouncer, replikasi DB, horizontal scaling |
| **[security_self_assessment_guide.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/security_self_assessment_guide.id.md)** | Kepatuhan | Security Auditor, Dev | Penilaian mandiri OWASP, audit enkripsi, GDPR |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*

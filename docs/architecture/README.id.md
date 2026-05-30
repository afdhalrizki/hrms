# 🏗️ Arsitektur Sistem & Desain Platform

Folder ini berisi dokumentasi arsitektur sistem tingkat tinggi, desain infrastruktur, dan strategi skalabilitas platform HariKerja HRMS. Dokumentasi ini menjadi acuan utama bagi arsitek sistem, insinyur DevOps, dan pengembang senior untuk memahami bagaimana subsistem berinteraksi dan skalabilitas dikelola.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumen di folder ini terbagi ke dalam beberapa fokus arsitektur utama, sebagian besar tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Sistem Autentikasi (`auth_architecture`):** 
    Menjelaskan alur keamanan token JWT, manajemen session cookie silang sub-domain, dan proteksi CSRF.
2.  **AWS High Availability (`aws_high_availability_architecture`):** 
    Panduan merancang infrastruktur cloud AWS yang tahan banjir *traffic* menggunakan Multi-AZ RDS, Auto-Scaling Groups, dan Application Load Balancer.
3.  **Strategi Deployment (`deployment_strategy`):** 
    Menjelaskan skema rilis perangkat lunak (Blue-Green Deployment, Canary Release) demi meminimalkan *downtime*.
4.  **Arsitektur Email (`email_architecture`):** 
    Desain pengiriman notifikasi email secara asinkron menggunakan broker Redis dan antrean Celery.
5.  **Integrasi Mesin Fingerprint (`fingerprint_integration_design.id.md`):** 
    Panduan integrasi mesin absensi fisik sidik jari berbasis protokol TCP/IP langsung ke backend cloud.
6.  **Multi-Tenancy System (`multi_tenancy_system`):** 
    Penjelasan teknis pembatasan data tingkat database menggunakan skema PostgreSQL dinamis via `django-tenants`.
7.  **Panduan Scaling (`scaling_architecture_guide`):** 
    Panduan membagi beban kerja database, replikasi read-write, caching Redis, dan optimalisasi koneksi via PgBouncer.
8.  **Penilaian Mandiri Keamanan (`security_self_assessment_guide`):** 
    Daftar periksa audit kepatuhan keamanan internal untuk mendeteksi kerentanan OWASP Top 10 secara mandiri.

---

## 📊 Matriks Dokumentasi: Arsitektur Sistem

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[auth_architecture.md](file:///home/afdhal/data/hr/hrms/docs/architecture/auth_architecture.md)** | Security | Security, Developer | JWT, Secure cookies, CSRF protection, session management |
| **[aws_high_availability_architecture.md](file:///home/afdhal/data/hr/hrms/docs/architecture/aws_high_availability_architecture.md)** | Cloud Infra | DevOps, Architect | AWS Multi-AZ RDS, Auto Scaling, ALB, High Availability |
| **[deployment_strategy.md](file:///home/afdhal/data/hr/hrms/docs/architecture/deployment_strategy.md)** | Release & CI/CD | DevOps, Developer | Blue-Green, Canary release, zero-downtime |
| **[email_architecture.md](file:///home/afdhal/data/hr/hrms/docs/architecture/email_architecture.md)** | Integration | Developer, Sysadmin | Email queue, Redis broker, Celery worker async |
| **[fingerprint_integration_design.id.md](file:///home/afdhal/data/hr/hrms/docs/architecture/fingerprint_integration_design.id.md)** | Biometric | IoT/Hardware, Dev | Biometric TCP/IP protocol, data pulling log |
| **[multi_tenancy_system.md](file:///home/afdhal/data/hr/hrms/docs/architecture/multi_tenancy_system.md)** | Database | DB Architect, Dev | Postgres schema isolation, django-tenants |
| **[scaling_architecture_guide.md](file:///home/afdhal/data/hr/hrms/docs/architecture/scaling_architecture_guide.md)** | Optimization | DB Architect, DevOps | PgBouncer, DB replication, horizontal scaling |
| **[security_self_assessment_guide.md](file:///home/afdhal/data/hr/hrms/docs/architecture/security_self_assessment_guide.md)** | Compliance | Security Auditor, Dev | OWASP self-audit checklist, encryption audits |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*

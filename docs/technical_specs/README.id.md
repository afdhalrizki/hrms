# ⚙️ Spesifikasi Teknis & Panduan Implementasi

Folder ini berisi spesifikasi teknis terperinci, panduan implementasi infrastruktur sistem keamanan, referensi API, audit kepatuhan keamanan, serta panduan operasional pengembang dan klien di platform HariKerja HRMS.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumentasi spesifikasi teknis dikelompokkan ke dalam beberapa topik utama, tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Strategi Proteksi Admin (`admin_portal_protection_strategy`):** 
    Konsep pertahanan berlapis (Defense in Depth) untuk mengamankan portal administratif Django.
2.  **Perbedaan Portal Admin (`admin_portals_differentiation`):** 
    Menjelaskan perbedaan arsitektur, URL, dan target pengguna antara *Django Admin* dengan *Next.js SaaS Portal*.
3.  **Laporan Evaluasi Portal Admin (`admin_portals_review`):** 
    Review mendalam kesesuaian implementasi portal admin, status kepatuhan keamanan (VPN & Cloudflare), cakupan testing, serta rekomendasi keamanan masa depan.
4.  **Referensi API (`api_reference`):** 
    Petunjuk integrasi endpoint API utama, format skema JSON request-response, autentikasi JWT, dan penanganan error.
5.  **Panduan Akses Klien (`client_access_guide`):** 
    Panduan praktis non-teknis bagi staf operasional untuk menghubungkan laptop mereka ke halaman admin (baik di Skenario VPN-Only maupun Cloudflare).
6.  **Panduan Cloudflare Zero Trust (`cloudflare_zero_trust_guide`):** 
    Langkah setup secure outbound-only tunnel (`cloudflared`) dan konfigurasi Access Policy (SSO Email PIN) di dasbor Cloudflare.
7.  **Panduan Developer (`developer_guide`):** 
    Kitab panduan lengkap developer full-stack mengenai local dev setup, multi-tenant Postgres schema, standar coding, dan perintah test.
8.  **Audit Keamanan Sistem (`security_audit`):** 
    Hasil pengujian penetrasi kerentanan OWASP Top 10 pada modul HRMS, audit enkripsi database, dan daftar perbaikan kepatuhan keamanan.
9.  **Panduan Koneksi VPN (`vpn_connection_guide`):** 
    Panduan lengkap administrator server untuk men-deploy server OpenVPN/WireGuard, nat routing `ufw`, dan whitelisting Nginx proxy.

---

## 📊 Matriks Dokumentasi: Spesifikasi Teknis

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[admin_portal_protection_strategy.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portal_protection_strategy.md)** | Security | Security, Architect | Defense in depth administrative portals |
| **[admin_portals_differentiation.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portals_differentiation.md)** | Architecture | Sysadmin, Developer | Functional isolation Django vs Next.js admin |
| **[admin_portals_review.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/admin_portals_review.md)** | Audit & Review | Staf Management, DevOps | Code alignment, VPN/Cloudflare status, test coverage |
| **[api_reference.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/api_reference.md)** | Integration | Developer, Third-Party | JSON endpoint schema, JWT Bearer, exception codes |
| **[client_access_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/client_access_guide.md)** | Operations | Staf Admin, Support, QA | Client connection configs via VPN or Cloudflare |
| **[cloudflare_zero_trust_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/cloudflare_zero_trust_guide.md)** | Networking | DevOps, Sysadmin | Argo Tunnel cloudflared, SSO Email PIN Access |
| **[developer_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/developer_guide.md)** | Development | Full-stack Developer | Local dev up.mjs, multi-tenant schema, testing |
| **[security_audit.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/security_audit.md)** | Compliance | Security Auditor, Dev | OWASP Top 10 penetration testing, DB encryption |
| **[vpn_connection_guide.md](file:///home/afdhal/data/hr/hrms/docs/technical_specs/vpn_connection_guide.md)** | Networking | DevOps, Sysadmin | OpenVPN server build, ufw NAT routing, Nginx allow/deny |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*

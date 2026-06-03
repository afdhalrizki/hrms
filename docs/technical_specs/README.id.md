# ⚙️ Spesifikasi Teknis & Panduan Implementasi

Folder ini berisi spesifikasi teknis terperinci, panduan implementasi infrastruktur sistem keamanan, referensi API, audit kepatuhan keamanan, serta panduan operasional pengembang dan klien di platform HariKerja HRMS.

---

## 🧭 Panduan & Perbedaan Berkas Dokumen

Dokumentasi spesifikasi teknis dikelompokkan ke dalam beberapa topik utama, tersedia dalam versi Bahasa Indonesia (`*.id.md`) dan Bahasa Inggris (`*.md`):

1.  **Strategi Proteksi Admin ([admin_portal_protection_strategy.id.md](./admin_portal_protection_strategy.id.md)):** 
    Konsep pertahanan berlapis (Defense in Depth) untuk mengamankan portal administratif Django.
2.  **Perbedaan Portal Admin ([admin_portals_differentiation.id.md](./admin_portals_differentiation.id.md)):** 
    Menjelaskan perbedaan arsitektur, URL, dan target pengguna antara *Django Admin* dengan *Next.js SaaS Portal*.
3.  **Laporan Evaluasi Portal Admin ([admin_portals_review.id.md](./admin_portals_review.id.md)):** 
    Review mendalam kesesuaian implementasi portal admin, status kepatuhan keamanan (VPN & Cloudflare), cakupan testing, serta rekomendasi keamanan masa depan.
4.  **Referensi API ([api_reference.id.md](./api_reference.id.md)):** 
    Petunjuk integrasi endpoint API utama, format skema JSON request-response, autentikasi JWT, dan penanganan error.
5.  **Panduan Akses Klien ([client_access_guide.id.md](./client_access_guide.id.md)):** 
    Panduan praktis non-teknis bagi staf operasional untuk menghubungkan laptop mereka ke halaman admin (baik di Skenario VPN-Only maupun Cloudflare).
6.  **Panduan Cloudflare Zero Trust ([cloudflare_zero_trust_guide.id.md](./cloudflare_zero_trust_guide.id.md)):** 
    Langkah setup secure outbound-only tunnel (`cloudflared`) dan konfigurasi Access Policy (SSO Email PIN) di dasbor Cloudflare.
7.  **Panduan Developer ([developer_guide.id.md](./developer_guide.id.md)):** 
    Kitab panduan lengkap developer full-stack mengenai local dev setup, multi-tenant Postgres schema, standar coding, dan perintah test.
8.  **Audit Keamanan Sistem ([security_audit.id.md](./security_audit.id.md)):** 
    Hasil pengujian penetrasi kerentanan OWASP Top 10 pada modul HRMS, audit enkripsi database, dan daftar perbaikan kepatuhan keamanan.
9.  **Panduan Koneksi VPN ([vpn_connection_guide.id.md](./vpn_connection_guide.id.md)):** 
    Panduan lengkap administrator server untuk men-deploy server OpenVPN/WireGuard, nat routing `ufw`, dan whitelisting Nginx proxy.
10. **Panduan Lingkungan Pembayaran ([payment_environment_guide.id.md](./payment_environment_guide.id.md)):**
    Detail konfigurasi sandbox Midtrans, pencairan rekening merchant live, dan panduan migrasi ke produksi.

---

## 📊 Matriks Dokumentasi: Spesifikasi Teknis

| Nama Berkas | Kategori | Target Pembaca | Topik Utama |
| :--- | :--- | :--- | :--- |
| **[admin_portal_protection_strategy.id.md](./admin_portal_protection_strategy.id.md)** | Keamanan | Security, Architect | Konsep Defense in Depth portal admin |
| **[admin_portals_differentiation.id.md](./admin_portals_differentiation.id.md)** | Arsitektur | Sysadmin, Developer | Pemisahan fungsional Django vs Next.js admin |
| **[admin_portals_review.id.md](./admin_portals_review.id.md)** | Audit & Review | Staf Management, DevOps | Kesesuaian kode, status VPN/Cloudflare, testing |
| **[api_reference.id.md](./api_reference.id.md)** | Integrasi | Developer, Third-Party | Endpoint JSON, autentikasi Bearer JWT, error |
| **[client_access_guide.id.md](./client_access_guide.id.md)** | Operasional | Staf Admin, Support, QA | Pengaturan koneksi klien via VPN atau Cloudflare |
| **[cloudflare_zero_trust_guide.id.md](./cloudflare_zero_trust_guide.id.md)** | Jaringan | DevOps, Sysadmin | Argo Tunnel cloudflared, SSO Email PIN Access |
| **[developer_guide.id.md](./developer_guide.id.md)** | Pengembangan | Full-stack Developer | Local dev up.mjs, multi-tenant schema, testing |
| **[payment_environment_guide.id.md](./payment_environment_guide.id.md)** | Integrasi | DevOps, Developer | Midtrans sandbox, rekening bank merchant live, konfigurasi produksi |
| **[security_audit.id.md](./security_audit.id.md)** | Kepatuhan | Security Auditor, Dev | Penetration testing OWASP Top 10, database encryption |
| **[vpn_connection_guide.id.md](./vpn_connection_guide.id.md)** | Jaringan | DevOps, Sysadmin | Deploy OpenVPN, ufw NAT forwarding, Nginx allow/deny |

---
*Dokumen ini merupakan bagian dari standarisasi dokumentasi platform HariKerja HRMS.*

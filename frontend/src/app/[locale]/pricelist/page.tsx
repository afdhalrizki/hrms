'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Check, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSalesEmail } from '@/lib/api';

export default function PriceListPage() {
  const plans = [
    {
      name: "FREE",
      price: "0",
      description: "Untuk startup & UMKM mikro yang baru memulai digitalisasi HR.",
      features: [
        "Maksimal 10 Karyawan",
        "Penyimpanan 50 MB",
        "Absensi Dasar (Web)",
        "Manajemen Karyawan Dasar",
        "Dashboard Analitik Dasar"
      ],
      buttonText: "Mulai Gratis",
      highlight: false
    },
    {
      name: "ESSENTIAL",
      price: "250.000",
      period: "/bulan",
      description: "Standar baru untuk bisnis kecil yang fokus pada kehadiran.",
      features: [
        "Maksimal 50 Karyawan",
        "Penyimpanan 250 MB",
        "Absensi Geofencing (GPS)",
        "Manajemen Cuti & Izin",
        "Ekspor Laporan (Excel/PDF)"
      ],
      buttonText: "Pilih Essential",
      highlight: false
    },
    {
      name: "PROFESSIONAL",
      price: "750.000",
      period: "/bulan",
      description: "Terbaik untuk bisnis berkembang yang butuh penggajian.",
      features: [
        "Maksimal 100 Karyawan",
        "Penyimpanan 1 GB",
        "Payroll PPh 21 & BPJS",
        "Sistem Reimbursement",
        "Absensi Foto (Anti-Fraud)"
      ],
      buttonText: "Pilih Professional",
      highlight: true
    },
    {
      name: "PREMIUM",
      price: "1.500.000",
      period: "/bulan",
      description: "Solusi lengkap untuk perusahaan high-growth.",
      features: [
        "Maksimal 500 Karyawan",
        "Penyimpanan 5 GB",
        "Manajemen Kinerja (KPI)",
        "Self-Appraisal Karyawan",
        "RBAC Lanjutan (Izin Khusus)"
      ],
      buttonText: "Pilih Premium",
      highlight: false
    },
    {
      name: "ENTERPRISE",
      price: "Custom",
      description: "Keamanan, skala, dan dukungan prioritas untuk organisasi besar.",
      features: [
        "2.000+ Karyawan",
        "Penyimpanan 20 GB+",
        "Audit Trail Lengkap",
        "SLA & Dukungan Prioritas",
        "Integrasi Custom API"
      ],
      buttonText: "Hubungi Kami",
      highlight: false
    }
  ];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center space-y-6 mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-black tracking-tighter"
          >
            Pilih Paket yang Sesuai dengan <br />
            <span className="text-primary">Skala Bisnis Anda</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium"
          >
            Transparan, kompetitif, dan dirancang untuk membantu Anda tumbuh tanpa hambatan biaya operasional HR.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-20">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col p-8 rounded-[2rem] border transition-all hover:scale-[1.02]",
                plan.highlight 
                  ? "bg-primary text-white border-primary shadow-2xl shadow-primary/30 z-10 scale-105" 
                  : "bg-white/5 border-glass-border hover:border-primary/50"
              )}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                  Paling Populer
                </div>
              )}
              
              <div className="mb-8">
                <h3 className={cn("text-lg font-black tracking-widest mb-4", plan.highlight ? "text-white/90" : "text-primary")}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold opacity-70">Rp</span>
                  <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                  {plan.period && <span className="text-sm font-medium opacity-70">{plan.period}</span>}
                </div>
                <p className={cn("mt-4 text-sm leading-relaxed", plan.highlight ? "text-white/80" : "text-muted-foreground")}>
                  {plan.description}
                </p>
              </div>

              <div className="flex-grow space-y-4 mb-8 text-sm">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={16} className={cn("shrink-0 mt-0.5", plan.highlight ? "text-white" : "text-primary")} />
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <a 
                href={plan.name === 'ENTERPRISE' ? `mailto:${getSalesEmail()}` : '/signup'}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-center transition-all",
                  plan.highlight
                    ? "bg-white text-primary hover:bg-white/90"
                    : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                )}
              >
                {plan.buttonText}
              </a>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section Placeholder */}
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight flex items-center justify-center gap-3">
              <HelpCircle className="text-primary" /> Pertanyaan Umum
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">Apakah saya bisa ganti paket kapan saja?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ya, Anda bisa melakukan upgrade paket kapan saja. Biaya akan dihitung secara prorata berdasarkan sisa masa aktif langganan Anda.
              </p>
            </div>
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">Bagaimana dengan keamanan data saya?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kami menggunakan enkripsi tingkat lanjut dan isolasi database untuk setiap tenant. Data Anda tidak akan tercampur dengan data perusahaan lain.
              </p>
            </div>
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">Apakah sudah sesuai TER 2024?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Tentu. Sistem penggajian kami selalu diperbarui mengikuti regulasi pajak terbaru di Indonesia, termasuk skema Tarif Efektif Rata-Rata (TER) 2024.
              </p>
            </div>
            <div className="space-y-4 p-8 glass-card rounded-3xl">
              <h4 className="font-bold text-lg">Berapa lama masa tenggang jika lupa bayar?</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Kami memberikan masa tenggang selama 14 hari setelah masa berlaku paket habis sebelum sistem menonaktifkan akses ke modul tertentu.
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-20 p-8 rounded-[2rem] bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Info className="text-primary" />
          </div>
          <div className="flex-grow text-center md:text-left">
            <h4 className="font-bold">Butuh Kapasitas Penyimpanan Tambahan?</h4>
            <p className="text-muted-foreground text-sm">
              Anda dapat membeli add-on penyimpanan tambahan sebesar 1 GB seharga Rp 50.000/bulan tanpa harus melakukan upgrade paket utama.
            </p>
          </div>
          <a href="#" className="font-bold text-primary hover:underline">Pelajari Add-on</a>
        </div>
      </div>
    </PublicLayout>
  );
}

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Home from '@/app/[locale]/page';
import AboutPage from '@/app/[locale]/about/page';
import PriceListPage from '@/app/[locale]/pricelist/page';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));

describe('Landing Pages Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Home Page (Landing State)', () => {
    it('renders landing page content for unauthenticated users', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
      });
      (useTenant as any).mockReturnValue({
        isPublic: true,
      });

      render(<Home />);

      expect(screen.getByText(/Kelola SDM Jadi Lebih/i)).toBeDefined();
      expect(screen.getAllByText(/Simpel & Akurat/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Mulai Sekarang \(Gratis\)/i)).toBeDefined();
      expect(screen.getByText(/Fitur Utama HariKerja/i)).toBeDefined();
    });

    it('renders specific features on landing page', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
      });
      (useTenant as any).mockReturnValue({
        isPublic: true,
      });

      render(<Home />);

      expect(screen.getByText(/Absensi & Kehadiran/i)).toBeDefined();
      expect(screen.getByText(/Otomatisasi Payroll/i)).toBeDefined();
      expect(screen.getByText(/Manajemen Kinerja/i)).toBeDefined();
    });
  });

  describe('About Page', () => {
    it('renders mission and vision content', () => {
      render(<AboutPage />);

      expect(screen.getAllByText(/Tentang/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/HariKerja/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Visi & Misi Kami/i)).toBeDefined();
      expect(screen.getByText(/Klien Terpercaya/i)).toBeDefined();
    });

    it('renders core principles', () => {
      render(<AboutPage />);

      expect(screen.getByText(/Keamanan Data/i)).toBeDefined();
      expect(screen.getByText(/Kecepatan & Efisiensi/i)).toBeDefined();
      expect(screen.getByText(/Dukungan Lokal/i)).toBeDefined();
    });
  });

  describe('Pricelist Page', () => {
    it('renders all pricing plans', () => {
      render(<PriceListPage />);

      expect(screen.getAllByText(/FREE/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/ESSENTIAL/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/PROFESSIONAL/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/PREMIUM/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/ENTERPRISE/i).length).toBeGreaterThan(0);
    });

    it('renders specific plan prices', () => {
      render(<PriceListPage />);

      expect(screen.getByText(/250.000/i)).toBeDefined();
      expect(screen.getByText(/750.000/i)).toBeDefined();
      expect(screen.getByText(/1.500.000/i)).toBeDefined();
      expect(screen.getAllByText(/Custom/i).length).toBeGreaterThan(0);
    });

    it('renders FAQ section', () => {
      render(<PriceListPage />);

      expect(screen.getByText(/Pertanyaan Umum/i)).toBeDefined();
      expect(screen.getByText(/Apakah saya bisa ganti paket kapan saja\?/i)).toBeDefined();
    });
  });
});

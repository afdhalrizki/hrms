import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Home from '@/app/[locale]/page';
import AboutPage from '@/app/[locale]/about/page';
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

      // Use translation keys as mocked in setup.ts
      expect(screen.getByText(/heroTitle1/i)).toBeDefined();
      expect(screen.getByText(/heroTitle2/i)).toBeDefined();
      expect(screen.getByText(/ctaStart/i)).toBeDefined();
      expect(screen.getByText(/featuresTitle/i)).toBeDefined();
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

      // Feature titles are also translated
      expect(screen.getByText(/feature1.title/i)).toBeDefined();
      expect(screen.getByText(/feature3.title/i)).toBeDefined();
      expect(screen.getByText(/feature6.title/i)).toBeDefined();
    });
  });

  describe('About Page', () => {
    it('renders mission and vision content', () => {
      render(<AboutPage />);

      expect(screen.getAllByText(/title/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/visionTitle/i)).toBeDefined();
      // "Klien Terpercaya" was removed, so we don't expect it anymore
    });

    it('renders core principles', () => {
      render(<AboutPage />);

      expect(screen.getByText(/principle1Title/i)).toBeDefined();
      expect(screen.getByText(/principle2Title/i)).toBeDefined();
      expect(screen.getByText(/principle3Title/i)).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import BrandingPage from '../app/[locale]/settings/branding/page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
}));

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: () => ({
    tenantName: 'Acme Corp',
    themePrimaryColor: '#ff0000',
    themeSecondaryColor: '#00ff00',
    logo: '/logo.png'
  }),
}));

describe('BrandingPage (Phase 67)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding settings with current values', async () => {
    render(<BrandingPage />);
    
    // Strict matching to avoid "previewTitle" matches
    expect(screen.getAllByText('title').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('#ff0000').length).toBeGreaterThan(0);
  });
});

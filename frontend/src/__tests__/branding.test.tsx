import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getAllByDisplayValue('#ff0000').length).toBeGreaterThan(0);
  });

  it('handles logo change', async () => {
    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    
    const { container } = render(<BrandingPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByAltText('Logo Preview')).toHaveAttribute('src', 'blob:mock-url');
  });

  it('submits branding updates successfully', async () => {
    (apiFetch as any).mockResolvedValue({ success: true });
    
    render(<BrandingPage />);
    const primaryInput = screen.getAllByDisplayValue('#ff0000')[0];
    fireEvent.change(primaryInput, { target: { value: '#0000ff' } });
    
    const submitBtn = screen.getByRole('button', { name: /updateBtn/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/tenant/settings', expect.objectContaining({
        method: 'PATCH'
      }));
    });
  });

  it('handles submission error', async () => {
    const { toast } = await import('sonner');
    (apiFetch as any).mockRejectedValue(new Error('API Error'));
    
    render(<BrandingPage />);
    const submitBtn = screen.getByRole('button', { name: /updateBtn/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update branding');
    });
  });
});

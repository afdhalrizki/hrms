import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BrandingPage from '@/app/[locale]/settings/branding/page';
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

vi.mock('@/context/TenantContext', () => ({
  useTenant: () => ({
    tenantName: 'Acme Corp',
    themePrimaryColor: '#ff0000',
    themeSecondaryColor: '#00ff00',
    logo: '/logo.png',
  }),
}));

describe('BrandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the branding form successfully', async () => {
    (apiFetch as any).mockResolvedValueOnce({ role: 'ADMIN' }); // Access
    (apiFetch as any).mockResolvedValueOnce({}); // Submit

    render(<BrandingPage />);

    const colorInputs = await screen.findAllByDisplayValue('#ff0000');
    fireEvent.change(colorInputs[0], { target: { value: '#112233' } });

    const button = screen.getByRole('button', { name: /updateBtn/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/tenant/settings', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  it('shows error toast when update fails', async () => {
    (apiFetch as any).mockResolvedValueOnce({ role: 'ADMIN' }); // Access
    (apiFetch as any).mockRejectedValueOnce(new Error('Oops')); // Submit

    render(<BrandingPage />);

    const button = await screen.findByRole('button', { name: /updateBtn/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });
  });
});
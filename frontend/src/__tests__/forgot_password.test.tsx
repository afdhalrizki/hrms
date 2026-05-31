import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ForgotPasswordPage from '@/app/[locale]/forgot-password/page';
import { useTenant } from '@/context/TenantContext';
import { apiFetch } from '@/lib/api';

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (params) {
      return `${key} ${Object.values(params).join(' ')}`;
    }
    return key;
  },
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: vi.fn(() => '/forgot-password'),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password page correctly', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    render(<ForgotPasswordPage />);

    expect(await screen.findByText(/forgotPasswordTitle/i)).toBeDefined();
    expect(screen.getByLabelText(/emailLabel/i)).toBeDefined();
  });

  it('submits forgot password request successfully', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    const mockResponse = { detail: 'Link reset sent.' };
    vi.mocked(apiFetch).mockResolvedValue(mockResponse);

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/emailLabel/i), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /sendResetLink/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/auth/forgot-password/', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      });
    });

    expect(await screen.findByText('Link reset sent.')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    vi.mocked(apiFetch).mockRejectedValue(new Error('Gagal mengirim link reset.'));

    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText(/emailLabel/i), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /sendResetLink/i }));

    await waitFor(() => {
      expect(screen.getByText('Gagal mengirim link reset.')).toBeInTheDocument();
    });
  });
});

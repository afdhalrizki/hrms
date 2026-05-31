import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ResetPasswordPage from '@/app/[locale]/reset-password/page';
import { useTenant } from '@/context/TenantContext';
import { apiFetch } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
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
  usePathname: vi.fn(() => '/reset-password'),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error if uid or token is missing', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => null,
    } as any);

    render(<ResetPasswordPage />);

    expect(await screen.findByText(/invalidToken/i)).toBeInTheDocument();
  });

  it('renders input fields if uid and token are present', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => {
        if (key === 'uid') return 'mock-uid';
        if (key === 'token') return 'mock-token';
        return null;
      },
    } as any);

    render(<ResetPasswordPage />);

    expect(await screen.findByText(/resetPasswordTitle/i)).toBeDefined();
    expect(screen.getByLabelText(/newPasswordLabel/i)).toBeDefined();
    expect(screen.getByLabelText(/confirmPasswordLabel/i)).toBeDefined();
  });

  it('shows error if password and confirm password do not match', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => {
        if (key === 'uid') return 'mock-uid';
        if (key === 'token') return 'mock-token';
        return null;
      },
    } as any);

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/newPasswordLabel/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirmPasswordLabel/i), { target: { value: 'different123' } });

    fireEvent.click(screen.getByRole('button', { name: /resetBtn/i }));

    expect(await screen.findByText(/passwordsDoNotMatch/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('submits reset password request successfully', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => {
        if (key === 'uid') return 'mock-uid';
        if (key === 'token') return 'mock-token';
        return null;
      },
    } as any);

    const mockResponse = { detail: 'Password updated.' };
    vi.mocked(apiFetch).mockResolvedValue(mockResponse);

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/newPasswordLabel/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirmPasswordLabel/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /resetBtn/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/auth/reset-password/', {
        method: 'POST',
        body: JSON.stringify({
          uid: 'mock-uid',
          token: 'mock-token',
          password: 'password123',
        }),
      });
    });

    expect(await screen.findByText('Password updated.')).toBeInTheDocument();
  });

  it('shows API error on submit failure', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja',
    });

    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => {
        if (key === 'uid') return 'mock-uid';
        if (key === 'token') return 'mock-token';
        return null;
      },
    } as any);

    vi.mocked(apiFetch).mockRejectedValue(new Error('Invalid token.'));

    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/newPasswordLabel/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirmPasswordLabel/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /resetBtn/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid token.')).toBeInTheDocument();
    });
  });
});

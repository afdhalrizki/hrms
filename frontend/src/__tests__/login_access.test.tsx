import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { LoginView } from '@/components/auth/LoginView';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (params) {
      return `${key} ${Object.values(params).join(' ')}`;
    }
    return key;
  },
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: mockRefresh,
  }),
  usePathname: vi.fn(() => '/login'),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: vi.fn(() => '/login'),
}));

describe('LoginPage Access Restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Akses Terbatas" on public domain without forceShowForm', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja Platform',
    });

    render(<LoginView />);
    
    expect(await screen.findByText(/restrictedTitle/i)).toBeDefined();
    expect(screen.queryByLabelText(/emailLabel/i)).toBeNull();
    expect(await screen.findByText(/restrictedDesc/i)).toBeDefined();
  });

  it('renders login form on public domain when forceShowForm is true', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'HariKerja Platform',
    });

    render(<LoginView forceShowForm={true} />);
    
    expect(await screen.findByText(/portalBadge/i)).toBeDefined();
    expect(await screen.findByLabelText(/emailLabel/i)).toBeDefined();
    expect(await screen.findByLabelText(/passwordLabel/i)).toBeDefined();
    expect(screen.queryByText(/restrictedTitle/i)).toBeNull();
  });

  it('renders normal login form on tenant subdomain', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: false,
      tenantName: 'Acme Corp',
    });

    render(<LoginView />);
    
    expect(await screen.findByText(/welcomePortal/i)).toBeDefined();
    expect(await screen.findByText(/Acme Corp/i)).toBeDefined();
    expect(await screen.findByLabelText(/emailLabel/i)).toBeDefined();
    expect(await screen.findByLabelText(/passwordLabel/i)).toBeDefined();
    expect(screen.queryByText(/restrictedTitle/i)).toBeNull();
  });

  it('submits login form and navigates home', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined);

    (useTenant as any).mockReturnValue({ isPublic: false, tenantName: 'Acme Corp' });
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      login: mockLogin,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(<LoginView />);

    fireEvent.change(screen.getByLabelText(/emailLabel/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/passwordLabel/i), { target: { value: 'pass123' } });

    fireEvent.click(screen.getByRole('button', { name: /signIn/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'pass123'));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('renders an explicit error box when login attempts fail with invalid credentials', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    (useTenant as any).mockReturnValue({ isPublic: false, tenantName: 'Acme Corp' });
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      login: mockLogin,
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(<LoginView />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/emailLabel/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/passwordLabel/i), { target: { value: 'wrongpass123' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /signIn/i }));

    // Verify the error message is successfully captured and rendered in the DOM
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('renders "Workspace Tidak Ditemukan" when isValid is false on subdomain', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: false,
      isValid: false,
      tenantName: 'Acme Corp',
    });

    render(<LoginView />);

    expect(await screen.findByText(/Workspace Tidak Ditemukan/i)).toBeDefined();
    expect(screen.queryByLabelText(/emailLabel/i)).toBeNull();
    expect(screen.queryByText(/restrictedTitle/i)).toBeNull();
  });
});

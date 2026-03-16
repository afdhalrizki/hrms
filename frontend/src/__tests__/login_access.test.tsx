import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LoginPage from '@/app/login/page';
import { useTenant } from '@/context/TenantContext';

// Mock dependencies
vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('LoginPage Access Restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Akses Terbatas" on public domain without forceShowForm', () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'Public',
    });

    render(<LoginPage />);
    
    expect(screen.getByText('Akses Terbatas')).toBeDefined();
    expect(screen.queryByLabelText(/Email Address/i)).toBeNull();
    expect(screen.getByText(/Login hanya tersedia melalui subdomain perusahaan Anda/i)).toBeDefined();
  });

  it('renders login form on public domain when forceShowForm is true', () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'Public',
    });

    render(<LoginPage forceShowForm={true} />);
    
    expect(screen.getByText('Portal Admin Global')).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.queryByText('Akses Terbatas')).toBeNull();
  });

  it('renders normal login form on tenant subdomain', () => {
    (useTenant as any).mockReturnValue({
      isPublic: false,
      tenantName: 'Acme Corp',
    });

    render(<LoginPage />);
    
    expect(screen.getByText(/Welcome to/i)).toBeDefined();
    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(screen.queryByText('Akses Terbatas')).toBeNull();
  });
});

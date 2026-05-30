import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Mock HelpSupportWidget so it does not fetch or have side effects in unit tests
vi.mock('@/components/shared/HelpSupportWidget', () => ({
  HelpSupportWidget: () => <div data-testid="mock-help-widget" />,
}));

const mockLogout = vi.fn();

// Mock Auth Context
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { fullname: 'Test User', email: 'test@example.com' },
    loading: false,
    logout: mockLogout,
  }),
}));

// Mock Next-Intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock i18n Routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  routing: { locales: ['en', 'id'], defaultLocale: 'en' },
}));

// Mock Next Navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Mock Permission Hook
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

// Mock Tenant Context
vi.mock('@/context/TenantContext', () => ({
  useTenant: () => ({ 
    logo: null, 
    tenantName: 'Test Tenant', 
    enabledModules: ['dashboard', 'employees', 'attendance'] 
  }),
}));

describe('Sidebar Logout Button Unit Test', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('access_token', 'mock-token');
    }
  });

  it('should render the logout button in the user profile card', () => {
    render(<DashboardLayout><div>Test Child</div></DashboardLayout>);
    
    // The logout button has the title attribute "Logout"
    const logoutBtn = screen.getByTitle('Logout');
    expect(logoutBtn).toBeInTheDocument();
  });

  it('should trigger the logout method from AuthContext when clicked', () => {
    render(<DashboardLayout><div>Test Child</div></DashboardLayout>);
    
    const logoutBtn = screen.getByTitle('Logout');
    fireEvent.click(logoutBtn);
    
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

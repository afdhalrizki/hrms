import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

// Mock the contexts
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Sidebar Component', () => {
  it('renders loading state for profile', () => {
    (useTenant as any).mockReturnValue({ tenantName: 'TestCorp' });
    (useAuth as any).mockReturnValue({ user: null, loading: true });

    render(<Sidebar />);
    
    expect(screen.getByText('Loading...')).toBeDefined();
    expect(screen.getByText('...')).toBeDefined();
  });

  it('renders user data when loaded', () => {
    (useTenant as any).mockReturnValue({ tenantName: 'TestCorp' });
    (useAuth as any).mockReturnValue({ 
      user: { 
        fullname: 'John Doe', 
        email: 'john@example.com' 
      }, 
      loading: false 
    });

    render(<Sidebar />);
    
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('john@example.com')).toBeDefined();
    expect(screen.getByText('JD')).toBeDefined(); // Initials
  });

  it('renders fallback for admin when no fullname', () => {
    (useTenant as any).mockReturnValue({ tenantName: 'TestCorp' });
    (useAuth as any).mockReturnValue({ 
      user: { 
        email: 'admin@testcorp.com' 
      }, 
      loading: false 
    });

    render(<Sidebar />);
    
    expect(screen.getByText('Admin User')).toBeDefined();
    expect(screen.getByText('admin@testcorp.com')).toBeDefined();
    expect(screen.getByText('A')).toBeDefined(); // Fallback initial from admin@...
  });
});

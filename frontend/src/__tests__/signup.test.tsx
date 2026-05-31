import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SignupPage from '@/app/[locale]/signup/page';
import * as api from '@/lib/api';

// Mock the apiFetch helper
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
  getDomainSuffix: vi.fn(() => 'harikerja.com'),
}));

describe('SignupPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all registration fields', () => {
    render(<SignupPage />);
    // Sync with actual keys in SignupPage.tsx
    expect(screen.getByPlaceholderText(/companyPlaceholder/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/subdomainPlaceholder/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/adminPlaceholder/i)).toBeDefined();
    expect(screen.getByText(/submitBtn/i)).toBeDefined();
  });

  it('handles successful form submission', async () => {
    const mockPost = vi.mocked(api.apiFetch).mockResolvedValue({ success: true });
    
    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText(/companyPlaceholder/i), { target: { value: 'Acme Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText(/subdomainPlaceholder/i), { target: { value: 'acmecorp', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText(/adminPlaceholder/i), { target: { value: 'test@acme.com', name: 'admin_email' } });

    fireEvent.click(screen.getByText(/submitBtn/i));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/public/signup', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          company_name: 'Acme Corp',
          subdomain_prefix: 'acmecorp',
          admin_email: 'test@acme.com',
        }),
      }));
      expect(screen.getByText(/successTitle/i)).toBeDefined();
    });
  });

  it('displays error message on submission failure', async () => {
    vi.mocked(api.apiFetch).mockRejectedValue(new Error('Subdomain already exists'));
    
    render(<SignupPage />);
    
    // Fill ALL required fields
    fireEvent.change(screen.getByPlaceholderText(/companyPlaceholder/i), { target: { value: 'Fail Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText(/subdomainPlaceholder/i), { target: { value: 'fail', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText(/adminPlaceholder/i), { target: { value: 'fail@test.com', name: 'admin_email' } });
    
    fireEvent.click(screen.getByText(/submitBtn/i));
    
    await waitFor(() => {
      expect(screen.queryByText(/Subdomain already exists/i)).not.toBeNull();
    });
  });

  it('automatically sanitizes subdomain input on change', () => {
    render(<SignupPage />);
    const subdomainInput = screen.getByPlaceholderText(/subdomainPlaceholder/i) as HTMLInputElement;

    fireEvent.change(subdomainInput, { target: { value: 'My_Company 123!', name: 'subdomain_prefix' } });
    expect(subdomainInput.value).toBe('mycompany123');
  });

  it('validates subdomain length before submission', async () => {
    render(<SignupPage />);
    
    fireEvent.change(screen.getByPlaceholderText(/companyPlaceholder/i), { target: { value: 'Short Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText(/subdomainPlaceholder/i), { target: { value: 'co', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText(/adminPlaceholder/i), { target: { value: 'test@short.com', name: 'admin_email' } });
    
    fireEvent.click(screen.getByText(/submitBtn/i));
    
    await waitFor(() => {
      expect(screen.queryByText(/errSubdomainLength/i)).not.toBeNull();
    });
  });

  it('validates starting/ending hyphens before submission', async () => {
    render(<SignupPage />);
    
    fireEvent.change(screen.getByPlaceholderText(/companyPlaceholder/i), { target: { value: 'Hyphen Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText(/subdomainPlaceholder/i), { target: { value: '-company-', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText(/adminPlaceholder/i), { target: { value: 'test@hyphen.com', name: 'admin_email' } });
    
    fireEvent.click(screen.getByText(/submitBtn/i));
    
    await waitFor(() => {
      expect(screen.queryByText(/errSubdomainInvalid/i)).not.toBeNull();
    });
  });

  it('validates reserved subdomains before submission', async () => {
    render(<SignupPage />);
    
    fireEvent.change(screen.getByPlaceholderText(/companyPlaceholder/i), { target: { value: 'Reserved Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText(/subdomainPlaceholder/i), { target: { value: 'www', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText(/adminPlaceholder/i), { target: { value: 'test@reserved.com', name: 'admin_email' } });
    
    fireEvent.click(screen.getByText(/submitBtn/i));
    
    await waitFor(() => {
      expect(screen.queryByText(/errSubdomainReserved/i)).not.toBeNull();
    });
  });
});

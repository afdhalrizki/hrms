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
    expect(screen.getByPlaceholderText('Acme Inc.')).toBeDefined();
    expect(screen.getByPlaceholderText('acme')).toBeDefined();
    expect(screen.getByPlaceholderText('admin@acme.com')).toBeDefined();
    expect(screen.getByText('Create Workspace')).toBeDefined();
  });

  it('handles successful form submission', async () => {
    const mockPost = vi.mocked(api.apiFetch).mockResolvedValue({ success: true });
    
    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText('Acme Inc.'), { target: { value: 'Acme Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText('acme'), { target: { value: 'acmecorp', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), { target: { value: 'test@acme.com', name: 'admin_email' } });

    fireEvent.click(screen.getByText('Create Workspace'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/public/signup', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          company_name: 'Acme Corp',
          subdomain_prefix: 'acmecorp',
          admin_email: 'test@acme.com',
        }),
      }));
      expect(screen.getByText('Request Submitted!')).toBeDefined();
    });
  });

  it('displays error message on submission failure', async () => {
    vi.mocked(api.apiFetch).mockRejectedValue(new Error('Subdomain already exists'));
    
    render(<SignupPage />);
    
    // Fill ALL required fields
    fireEvent.change(screen.getByPlaceholderText('Acme Inc.'), { target: { value: 'Fail Corp', name: 'company_name' } });
    fireEvent.change(screen.getByPlaceholderText('acme'), { target: { value: 'fail', name: 'subdomain_prefix' } });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), { target: { value: 'fail@test.com', name: 'admin_email' } });
    
    fireEvent.click(screen.getByText('Create Workspace'));

    await waitFor(() => {
      expect(screen.queryByText(/Subdomain already exists/i)).not.toBeNull();
    });
  });
});

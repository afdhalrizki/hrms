import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfilePage from '../app/[locale]/profile/page';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// Mock Dependencies
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

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ProfilePage (Phase 70 ESS)', () => {
  const mockEmployee = {
    id: 1,
    fullname: 'John Doe',
    nik: 'EMP001',
    email: 'john@test.com',
    phone: '08123456789',
    address: 'Original Address',
    department_name: 'Engineering',
    role_name: 'Developer',
    golongan_name: 'IIIA',
    supervisor_name: 'Jane Boss',
    ktp_number: '1234567890',
    npwp_number: 'NPWP12345',
    ptkp_status: 'TK/0',
    join_date: '2024-01-01',
    status: 'PERMANENT',
    face_reference: null,
    ktp_image: null,
    npwp_image: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (useAuth as any).mockReturnValue({
      user: { employee_id: 1 }
    });
    (apiFetch as any).mockResolvedValue(mockEmployee);
  });

  it('loads and displays profile data', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/employees/1');
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText(/EMP001/)).toBeDefined();
      expect(screen.getByDisplayValue('08123456789')).toBeDefined();
      expect(screen.getByDisplayValue('Original Address')).toBeDefined();
    });
  });

  it('updates profile fields and saves', async () => {
    render(<ProfilePage />);

    await waitFor(() => screen.getByDisplayValue('08123456789'));

    const phoneInput = screen.getByPlaceholderText('+62...');
    const addressInput = screen.getByPlaceholderText('Write your home address...');
    const saveButton = screen.getByText('save'); // From tCommon('save') mock returning 'save'

    fireEvent.change(phoneInput, { target: { value: '08999999999' } });
    fireEvent.change(addressInput, { target: { value: 'New Updated Address' } });

    (apiFetch as any).mockResolvedValue({ ...mockEmployee, phone: '08999999999', address: 'New Updated Address' });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"phone":"08999999999"')
      }));
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        body: expect.stringContaining('"address":"New Updated Address"')
      }));
    });
  });

  it('handles document upload', async () => {
    const { container } = render(<ProfilePage />);

    await waitFor(() => screen.getByText(/EMP001/));

    const file = new File(['hello'], 'ktp.png', { type: 'image/png' });
    const ktpInput = container.querySelector('#ktp-upload') as HTMLInputElement;
    
    // Simulating file change
    fireEvent.change(ktpInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        method: 'PATCH',
        body: expect.any(FormData)
      }));
    });
    
    const formDataCall = (apiFetch as any).mock.calls.find((call: any) => call[1] && call[1].body instanceof FormData);
    expect(formDataCall[1].body.get('ktp_image')).toBeDefined();
  });

  it('handles profile fetch error', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Fetch failed'));
    
    render(<ProfilePage />);
    
    const { toast } = await import('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fetch failed');
    });
  });

  it('handles update error', async () => {
    render(<ProfilePage />);
    await waitFor(() => screen.getByDisplayValue('08123456789'));
    
    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (options?.method === 'PATCH') {
        return Promise.reject(new Error('Update failed'));
      }
      return Promise.resolve(mockEmployee);
    });
    
    const saveButton = screen.getByText('save');
    fireEvent.click(saveButton);
    
    const { toast } = await import('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });

  it('handles avatar upload', async () => {
    const { container } = render(<ProfilePage />);
    await waitFor(() => screen.getByText(/EMP001/));

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const avatarInput = container.querySelector('#avatar-upload') as HTMLInputElement;
    
    fireEvent.change(avatarInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        method: 'PATCH',
        body: expect.any(FormData)
      }));
    });
    
    const formDataCall = (apiFetch as any).mock.calls.find((call: any) => 
      call[1] && call[1].body instanceof FormData && call[1].body.has('face_reference')
    );
    expect(formDataCall).toBeDefined();
    expect(formDataCall[1].body.get('face_reference')).toBeDefined();
  });

  it('updates KTP, NPWP and PTKP fields', async () => {
    render(<ProfilePage />);
    await waitFor(() => screen.getByDisplayValue('1234567890'));

    const ktpInput = screen.getByDisplayValue('1234567890');
    const npwpInput = screen.getByDisplayValue('NPWP12345');
    // Using the value as select labels might be specific
    const ptkpSelect = screen.getByDisplayValue('TK/0: Single, No dependents');

    fireEvent.change(ktpInput, { target: { value: '9999999999' } });
    fireEvent.change(npwpInput, { target: { value: 'NPWP99999' } });
    fireEvent.change(ptkpSelect, { target: { value: 'K/1' } });

    const saveButton = screen.getByText('save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"ktp_number":"9999999999"')
      }));
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        body: expect.stringContaining('"npwp_number":"NPWP99999"')
      }));
      expect(apiFetch).toHaveBeenCalledWith('/employees/1', expect.objectContaining({
        body: expect.stringContaining('"ptkp_status":"K/1"')
      }));
    });
  });
});

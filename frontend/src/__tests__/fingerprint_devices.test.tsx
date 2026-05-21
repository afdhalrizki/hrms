import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FingerprintDevicesPage from '../app/[locale]/settings/fingerprint-devices/page';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Mock DashboardLayout
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ 
    user: { id: 1, fullname: 'Admin', is_staff: true, permissions: { tenant_manage_hr: true } }, 
    loading: false 
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Mock apiFetch
const mockDevices = [
  {
    id: 1,
    name: 'Main Lobby Machine',
    device_model: 'ZKTeco K40',
    serial_number: 'ZK-SN-12345',
    branch: 1,
    branch_name: 'Cilandak Office',
    is_active: true,
    last_activity: '2026-05-21T08:00:00Z'
  }
];

const mockBranches = [
  { id: 1, name: 'Cilandak Office' },
  { id: 2, name: 'Sudirman Branch' }
];

const mockApiFetch = vi.fn((url: string, options?: any) => {
  if (url === '/fingerprint-devices') {
    return Promise.resolve(mockDevices);
  }
  if (url === '/branches') {
    return Promise.resolve(mockBranches);
  }
  return Promise.resolve({});
});

vi.mock('@/lib/api', () => ({
  apiFetch: (url: string, options?: any) => mockApiFetch(url, options),
  getBaseUrl: () => 'http://localhost:8000/api',
}));

describe('FingerprintDevicesPage (Unit Test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the fingerprint devices list correctly', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <FingerprintDevicesPage />
      </NextIntlClientProvider>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Main Lobby Machine')).toBeInTheDocument();
    });

    expect(screen.getByText('Fingerprint Devices')).toBeInTheDocument();
    expect(screen.getByText('ZK-SN-12345')).toBeInTheDocument();
    expect(screen.getByText('ZKTeco K40')).toBeInTheDocument();
    expect(screen.getByText('Cilandak Office')).toBeInTheDocument();
  });

  it('opens registration modal when clicking add device', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <FingerprintDevicesPage />
      </NextIntlClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('add-device-btn')).toBeInTheDocument();
    });

    const addBtn = screen.getByTestId('add-device-btn');
    fireEvent.click(addBtn);

    // Verify modal elements are displayed
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Register Fingerprint Device');
    expect(screen.getByTestId('device-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('device-serial-input')).toBeInTheDocument();
  });

  it('opens import modal when clicking import logs', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <FingerprintDevicesPage />
      </NextIntlClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('import-logs-btn')).toBeInTheDocument();
    });

    const importBtn = screen.getByTestId('import-logs-btn');
    fireEvent.click(importBtn);

    // Verify modal elements are displayed
    expect(screen.getByTestId('import-modal-title')).toHaveTextContent('Import Fingerprint Logs');
    expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
  });

  it('submits import form successfully when file is selected', async () => {
    // Setup mock resolution for import endpoint
    mockApiFetch.mockImplementation((url: string, options?: any) => {
      if (url === '/fingerprint-devices') {
        return Promise.resolve(mockDevices);
      }
      if (url === '/branches') {
        return Promise.resolve(mockBranches);
      }
      if (url === '/fingerprint-devices/import-logs') {
        return Promise.resolve({
          status: 'success',
          received: 2,
          inserted: 2,
          processed: 2
        });
      }
      return Promise.resolve({});
    });

    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <FingerprintDevicesPage />
      </NextIntlClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('import-logs-btn')).toBeInTheDocument();
    });

    // Open Modal
    fireEvent.click(screen.getByTestId('import-logs-btn'));

    // Select file
    const fileInput = screen.getByTestId('import-file-input');
    const file = new File(['dummy content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit
    const submitBtn = screen.getByTestId('submit-import-btn');
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/fingerprint-devices/import-logs',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
    });
  });
});


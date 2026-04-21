import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import ApiKeysPage from '@/app/[locale]/settings/api-keys/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';
import { apiFetch } from '@/lib/api';

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Spy on apiFetch while letting it call the real backend
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiFetch: vi.fn((...args) => actual.apiFetch(...args)),
    getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
  };
});

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/settings/CreateApiKeyModal', () => ({
  CreateApiKeyModal: ({ onClose }: any) => <div data-testid="create-api-key-modal">CreateApiKeyModal<button onClick={onClose}>Close</button></div>,
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  );
};

describe('ApiKeysPage (Integrated)', () => {
  beforeAll(async () => {
    await loginAs('admin@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('shows key list from real backend', async () => {
    render(<ApiKeysPage />, { wrapper: AllProviders });

    await waitFor(() => {
      // Seeded data has 'ERP Sync'
      expect(screen.getByText(/ERP Sync/i)).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);

  it('opens CreateApiKeyModal when button is clicked', async () => {
    render(<ApiKeysPage />, { wrapper: AllProviders });

    const btn = await screen.findByRole('button', { name: /newKey/i });
    fireEvent.click(btn);
    expect(screen.getByTestId('create-api-key-modal')).toBeDefined();
  });
});
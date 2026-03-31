import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateApiKeyModal } from '@/components/settings/CreateApiKeyModal';
import * as api from '@/lib/api';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreateApiKeyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates API key and reveals secret on success', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    vi.spyOn(api, 'apiFetch').mockResolvedValueOnce({ secret_key: 'secret-123' });

    render(<CreateApiKeyModal onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('e.g. ERP Integration');
    fireEvent.change(input, { target: { value: 'ERP Integration' } });

    const submitButton = screen.getByRole('button', { name: 'submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('secret-123')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
    });

    expect(api.apiFetch).toHaveBeenCalledWith('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ label: 'ERP Integration' }),
    });

    const doneButton = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneButton);

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error toast when key creation fails', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    vi.spyOn(api, 'apiFetch').mockRejectedValueOnce(new Error('API unavailable'));
    const toast = await import('sonner');

    render(<CreateApiKeyModal onClose={onClose} onSuccess={onSuccess} />);

    const input = screen.getByPlaceholderText('e.g. ERP Integration');
    fireEvent.change(input, { target: { value: 'ERP Integration' } });

    const submitButton = screen.getByRole('button', { name: 'submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.toast.error).toHaveBeenCalledWith('Failed to create API key');
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
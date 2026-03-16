import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/',
}));

describe('Frontend Smoke Test', () => {
  it('renders a basic component', () => {
    render(<div data-testid="test-div">HRMS Next.js</div>);
    expect(screen.getByTestId('test-div')).toBeDefined();
    expect(screen.getByText('HRMS Next.js')).toBeDefined();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignIn = vi.fn();
vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import LoginButtons from './LoginButtons';

describe('LoginButtons', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    // Don't resolve by default so buttons stay in loading state
    mockSignIn.mockReturnValue(new Promise(() => {}));
  });

  it('renders both buttons', () => {
    render(<LoginButtons />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try demo/i })).toBeInTheDocument();
  });

  it('both buttons are enabled initially', () => {
    render(<LoginButtons />);
    expect(screen.getByRole('button', { name: /continue with google/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /try demo/i })).not.toBeDisabled();
  });

  it('disables both buttons after clicking Try Demo', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /try demo/i }));
    expect(screen.getByRole('button', { name: /try demo/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
  });

  it('disables both buttons after clicking Continue with Google', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /try demo/i })).toBeDisabled();
  });

  it('calls signIn with "demo" when clicking Try Demo', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /try demo/i }));
    expect(mockSignIn).toHaveBeenCalledWith('demo', { callbackUrl: '/user' });
  });

  it('calls signIn with "google" when clicking Continue with Google', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/user' });
  });
});

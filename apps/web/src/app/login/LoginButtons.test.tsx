import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignIn = vi.fn();
const mockUseSearchParams = vi.fn(() => new URLSearchParams());
vi.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

import LoginButtons from './LoginButtons';

describe('LoginButtons', () => {
  beforeEach(() => {
    mockSignIn.mockClear();
    mockUseSearchParams.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    // Don't resolve by default so buttons stay in loading state
    mockSignIn.mockReturnValue(new Promise(() => {}));
  });

  it('renders all buttons', () => {
    render(<LoginButtons />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^try demo$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try demo \(coach\)/i })).toBeInTheDocument();
  });

  it('all buttons are enabled initially', () => {
    render(<LoginButtons />);
    expect(screen.getByRole('button', { name: /continue with google/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^try demo$/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /try demo \(coach\)/i })).not.toBeDisabled();
  });

  it('disables all buttons after clicking Try Demo', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /^try demo$/i }));
    expect(screen.getByRole('button', { name: /^try demo$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /try demo \(coach\)/i })).toBeDisabled();
  });

  it('disables all buttons after clicking Continue with Google', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^try demo$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /try demo \(coach\)/i })).toBeDisabled();
  });

  it('disables all buttons after clicking Try Demo (Coach)', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /try demo \(coach\)/i }));
    expect(screen.getByRole('button', { name: /try demo \(coach\)/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^try demo$/i })).toBeDisabled();
  });

  it('calls signIn with "demo" when clicking Try Demo', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /^try demo$/i }));
    expect(mockSignIn).toHaveBeenCalledWith('demo', { callbackUrl: `${window.location.origin}/user` });
  });

  it('calls signIn with "google" when clicking Continue with Google', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: `${window.location.origin}/user` });
  });

  it('calls signIn with "demo-coach" when clicking Try Demo (Coach)', () => {
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /try demo \(coach\)/i }));
    expect(mockSignIn).toHaveBeenCalledWith('demo-coach', { callbackUrl: `${window.location.origin}/user` });
  });

  it('falls back to /user when callbackUrl points back to /login', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('callbackUrl=/login'));
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /^try demo$/i }));
    expect(mockSignIn).toHaveBeenCalledWith('demo', { callbackUrl: `${window.location.origin}/user` });
  });

  it('keeps same-origin callbackUrls on the current host', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('callbackUrl=/user/calendar?view=week'));
    render(<LoginButtons />);
    fireEvent.click(screen.getByRole('button', { name: /^try demo$/i }));
    expect(mockSignIn).toHaveBeenCalledWith('demo', {
      callbackUrl: `${window.location.origin}/user/calendar?view=week`,
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SignalAccordion } from './SignalAccordion';

describe('SignalAccordion', () => {
  it('exposes aria-expanded and aria-controls on the header', () => {
    render(
      <SignalAccordion summary="Header">
        <div>Body</div>
      </SignalAccordion>,
    );
    const header = screen.getByRole('button', { name: 'Header' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(header).toHaveAttribute('aria-controls');
  });

  it('toggles expanded state when clicked', () => {
    render(
      <SignalAccordion summary="Header">
        <div>Body</div>
      </SignalAccordion>,
    );
    const header = screen.getByRole('button', { name: 'Header' });
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps children mounted by default', () => {
    render(
      <SignalAccordion summary="Header">
        <div data-testid="content">Body</div>
      </SignalAccordion>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('lazy mode delays mount until first expand', () => {
    render(
      <SignalAccordion summary="Header" lazy>
        <div data-testid="content">Body</div>
      </SignalAccordion>,
    );
    expect(screen.queryByTestId('content')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Header' }));
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDispatch = vi.fn();

vi.mock('@/context/WorkoutEditorContext', () => ({
  useWorkoutEditorContext: () => ({ dispatch: mockDispatch }),
}));

vi.mock('./useNewPlan', () => ({
  useNewPlan: () => ({
    statePlan: { id: -1, userId: 'user-1', name: 'New Plan', description: null, order: 1, weeks: [] },
    dispatch: mockDispatch,
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { AiImportDialog } from './AiImportDialog';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDialog(props: Partial<React.ComponentProps<typeof AiImportDialog>> = {}) {
  return render(
    <AiImportDialog
      open={true}
      onClose={vi.fn()}
      onImportSuccess={vi.fn()}
      {...props}
    />,
  );
}

function mockFetchResponse(body: unknown, ok = true) {
  mockFetch.mockResolvedValue({
    ok,
    json: async () => body,
  });
}

const minimalParsedPlan = {
  plan: {
    name: 'PPL',
    description: null,
    order: 1,
    weeks: [{ order: 1, workouts: [] }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('AiImportDialog — rendering', () => {
  it('renders the dialog with import button disabled when input is empty', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /import/i })).toBeDisabled();
  });

  it('enables the Import button once text is entered', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'Bench 3x8' },
    });
    expect(screen.getByRole('button', { name: /import/i })).not.toBeDisabled();
  });
});

// ── Error feedback ─────────────────────────────────────────────────────────────

describe('AiImportDialog — error feedback', () => {
  it('shows the error message when the API returns an error', async () => {
    mockFetchResponse({ error: 'AI did not return a structured plan' }, false);

    renderDialog();
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'some plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText('AI did not return a structured plan')).toBeInTheDocument();
    });
  });

  it('shows parseIssues as a list when included in the error response', async () => {
    mockFetchResponse(
      {
        error: 'Could not parse the plan structure returned by AI',
        parseIssues: [
          'name: String must contain at least 1 character(s)',
          'weeks: Array must contain at least 1 element(s)',
        ],
      },
      false,
    );

    renderDialog();
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'bad plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(
        screen.getByText('name: String must contain at least 1 character(s)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('weeks: Array must contain at least 1 element(s)'),
      ).toBeInTheDocument();
    });
  });

  it('shows the fallback message alongside parse issues', async () => {
    mockFetchResponse(
      {
        error: 'Could not parse the plan structure returned by AI',
        parseIssues: ['name: String must contain at least 1 character(s)'],
      },
      false,
    );

    renderDialog();
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'bad plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText(/build the plan manually/i)).toBeInTheDocument();
    });
  });

  it('shows no parse issue list when the error has no parseIssues', async () => {
    mockFetchResponse({ error: 'AI service temporarily unavailable' }, false);

    renderDialog();
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'some plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('clears parse issues when the dialog is closed and reopened', async () => {
    const onClose = vi.fn();

    mockFetchResponse(
      {
        error: 'Could not parse the plan structure returned by AI',
        parseIssues: ['name: String must contain at least 1 character(s)'],
      },
      false,
    );

    const { rerender } = renderDialog({ onClose });
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'bad plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(
        screen.getByText('name: String must contain at least 1 character(s)'),
      ).toBeInTheDocument();
    });

    // Close the dialog
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Reopen with a fresh render (open=false then open=true)
    rerender(
      <AiImportDialog open={false} onClose={onClose} onImportSuccess={vi.fn()} />,
    );
    rerender(
      <AiImportDialog open={true} onClose={onClose} onImportSuccess={vi.fn()} />,
    );

    expect(
      screen.queryByText('name: String must contain at least 1 character(s)'),
    ).not.toBeInTheDocument();
  });

  it('shows a network error message when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    renderDialog();
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'some plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});

// ── Success path ───────────────────────────────────────────────────────────────

describe('AiImportDialog — success', () => {
  it('calls onImportSuccess with week count and closes on successful import', async () => {
    const onImportSuccess = vi.fn();
    const onClose = vi.fn();
    mockFetchResponse(minimalParsedPlan);

    renderDialog({ onImportSuccess, onClose });
    fireEvent.change(screen.getByLabelText(/workout plan text/i), {
      target: { value: 'PPL plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import/i }));

    await waitFor(() => {
      expect(onImportSuccess).toHaveBeenCalledWith('1');
      expect(onClose).toHaveBeenCalled();
    });
  });
});

import {render, screen, waitFor} from '@testing-library/react';
import {vi} from 'vitest';
import Calendar from './Calendar';
import {EventPrisma} from "@/types/dataTypes";

const mockEvents: EventPrisma[] = [
  {
    id: 1,
    name: 'Event 1',
    userId: 1,
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-07-01'),
    description: null,
    color: null
  },
  {
    id: 2,
    name: 'Event 2',
    userId: 1,
    startDate: new Date('2025-08-01'),
    endDate: new Date('2025-09-01'),
    description: null,
    color: null
  },
  {
    id: 3,
    name: 'Other user event',
    userId: 2,
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-07-01'),
    description: null,
    color: null
  }
];

vi.mock('./calendarUtils', async () => {
  const actual = await vi.importActual('./calendarUtils');
  return {
    ...actual,
    generateWeeks: () => Array.from({length: 52}, (_, weekIdx) =>
      Array.from({length: 7}, (_, dayIdx) => {
        const base = new Date(2024, 0, 1);
        base.setDate(base.getDate() + weekIdx * 7 + dayIdx);
        return new Date(base);
      })
    ),
    getMonthLabels: () => ({'January 2024': 0}),
  };
});

describe('Calendar', () => {
  it('renders all weeks and month headers', () => {
    render(<Calendar events={mockEvents}/>);
    expect(screen.getByText('January 2024')).toBeInTheDocument();
    // Should render two weeks
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('loading spinner disappears (too quick in tests to actually do properly)', async () => {
    render(<Calendar events={mockEvents}/>);
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());
  });
});
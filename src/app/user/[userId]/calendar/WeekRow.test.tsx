import { render, screen } from '@testing-library/react';
import WeekRow from './WeekRow';

describe('WeekRow', () => {
  const week = [
    new Date(2024, 0, 1),
    new Date(2024, 0, 2),
    new Date(2024, 0, 3),
    new Date(2024, 0, 4),
    new Date(2024, 0, 5),
    new Date(2024, 0, 6),
    new Date(2024, 0, 7),
  ];

  it('renders 7 days for each week', () => {
    render(<WeekRow week={week} isCurrentWeek={false} rowHeight={60} />);
    week.forEach(date => {
      expect(screen.getByText(String(date.getDate()))).toBeInTheDocument();
    });
  });

  it('highlights the current week', () => {
    render(<WeekRow week={week} isCurrentWeek rowHeight={60} />);
    const row = screen.getByText('1').closest('.MuiGrid-container');
    expect(row).toHaveStyle({ backgroundColor: '#e3f2fd' });
  });
});
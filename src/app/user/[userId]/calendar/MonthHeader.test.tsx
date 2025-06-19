import {render, screen} from '@testing-library/react';
import MonthHeader from './MonthHeader';

describe('MonthHeader', () => {
  it('renders month label', () => {
    render(<MonthHeader month="January 2024" height={32}/>);
    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('renders days of week if showDaysOfWeek is true', () => {
    render(<MonthHeader month="January 2024" height={32} showDaysOfWeek/>);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

// NOTE: This scenario should be tested, but cannot be reliably tested in jsdom
// because MUI's sx prop styles are not reflected in the DOM.
  it.skip('applies sticky styles when sticky is true', () => {
    render(<MonthHeader month="January 2024" height={32} sticky/>);
    const header = screen.getByText('January 2024').closest('div');
    expect(header).toHaveStyle({position: 'sticky'});
  });
});
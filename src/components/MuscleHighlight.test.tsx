import {render, screen} from '@testing-library/react';
import type React from 'react';
import {describe, expect, it, vi} from 'vitest';
import MuscleHighlight from './MuscleHighlight';

vi.mock('./front.svg', () => ({
  default: ({style}: {style?: React.CSSProperties}) => (
    <svg data-testid="front-body" style={style}/>
  ),
}));

vi.mock('./back.svg', () => ({
  default: ({style}: {style?: React.CSSProperties}) => (
    <svg data-testid="back-body" style={style}/>
  ),
}));

describe('MuscleHighlight', () => {
  it('does not render without muscles unless alwaysShow is enabled', () => {
    const {container} = render(
      <MuscleHighlight primaryMuscles={[]} exerciseId={1}/>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the full front and back bodies when quadrant filtering is disabled', () => {
    render(
      <MuscleHighlight primaryMuscles={[]} exerciseId={1} alwaysShow/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.getAllByTestId('back-body')).toHaveLength(1);
  });

  it('renders the full front and back bodies with alwaysShow when quadrant filtering has no matches', () => {
    render(
      <MuscleHighlight primaryMuscles={[]} exerciseId={1} alwaysShow filterByQuadrants/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.getAllByTestId('back-body')).toHaveLength(1);
  });

  it('renders only the matching side for a single visible quadrant', () => {
    render(
      <MuscleHighlight primaryMuscles={['biceps']} exerciseId={1} filterByQuadrants/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.queryByTestId('back-body')).not.toBeInTheDocument();
  });

  it('renders a full side when both halves on that side are visible', () => {
    render(
      <MuscleHighlight primaryMuscles={['biceps', 'quads']} exerciseId={1} filterByQuadrants/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.queryByTestId('back-body')).not.toBeInTheDocument();
  });

  it('renders both matching halves for a top-only front/back split', () => {
    render(
      <MuscleHighlight primaryMuscles={['biceps', 'triceps']} exerciseId={1} filterByQuadrants/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.getAllByTestId('back-body')).toHaveLength(1);
  });

  it('renders diagonal two-quadrant selections instead of falling back to invalid content', () => {
    render(
      <MuscleHighlight primaryMuscles={['biceps', 'glutes']} exerciseId={1} filterByQuadrants/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.getAllByTestId('back-body')).toHaveLength(1);
  });

  it('renders full front and back bodies for three or more visible quadrants', () => {
    render(
      <MuscleHighlight primaryMuscles={['biceps', 'quads', 'glutes']} exerciseId={1} filterByQuadrants/>,
    );

    expect(screen.getAllByTestId('front-body')).toHaveLength(1);
    expect(screen.getAllByTestId('back-body')).toHaveLength(1);
  });
});

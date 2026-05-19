import { describe, expect, it } from 'vitest';
import theme from './theme';
import { signalThemes } from './signal/theme';

describe('input autocomplete defaults', () => {
  it('disables autocomplete in the main app theme', () => {
    expect(theme.components?.MuiTextField?.defaultProps).toMatchObject({ autoComplete: 'off' });
    expect(theme.components?.MuiInputBase?.defaultProps).toMatchObject({ autoComplete: 'off' });
  });

  it('disables autocomplete in signal themes', () => {
    Object.values(signalThemes).forEach(signalTheme => {
      expect(signalTheme.components?.MuiTextField?.defaultProps).toMatchObject({ autoComplete: 'off' });
      expect(signalTheme.components?.MuiInputBase?.defaultProps).toMatchObject({ autoComplete: 'off' });
    });
  });
});

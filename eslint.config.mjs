import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import playwright from 'eslint-plugin-playwright';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'react/display-name': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // React Compiler rules (react-hooks@7): not using the React Compiler yet
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='NextResponse'][callee.property.name='json'] Literal[value=/^(Unauthorized|Not authenticated|Not authorized|Forbidden)$/]",
          message: 'Use shared auth helpers from @lib/apiResponses (unauthenticatedResponse/forbiddenResponse), not inline auth strings.',
        },
      ],
    },
  },
  // ── Test files: disable app-only rules that create false positives ──────────
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Playwright uses a `use` callback that ESLint mistakes for a React hook
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // ── Playwright E2E test rules ────────────────────────────────────────────────
  // Scoped to tests/e2e/ so Playwright globals don't leak into app code.
  //
  // STRICT MODE REMINDER: Playwright locators are strict — a locator that
  // matches more than one element throws at runtime. Always narrow ambiguous
  // locators with .first(), .last(), .nth(n), or a more specific selector.
  // There is no static rule that catches every violation; treat every locator
  // that could match multiple elements as a bug.
  {
    files: ['tests/e2e/**/*.ts'],
    plugins: { playwright },
    rules: {
      // Catch quality issues that commonly hide real bugs
      'playwright/no-focused-test': 'error',       // no test.only left behind
      'playwright/no-skipped-test': 'warn',         // flag test.skip
      'playwright/valid-expect': 'error',           // expect() used correctly
      'playwright/no-element-handle': 'error',      // use Locator API, not ElementHandle
      'playwright/no-eval': 'error',                // no page.evaluate with string
      'playwright/no-wait-for-timeout': 'warn',     // prefer waitFor conditions
      'playwright/prefer-web-first-assertions': 'error', // toBeVisible() not expect(await isVisible())
      'playwright/no-useless-await': 'error',       // flag pointless awaits
      'playwright/prefer-to-have-count': 'error',   // toHaveCount() not toHaveLength()
    },
  },
];

export default eslintConfig;

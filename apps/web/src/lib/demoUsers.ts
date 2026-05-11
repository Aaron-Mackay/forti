export type DemoUserOption = {
  email: string;
  name: string;
  label: string;
  description: string;
  role: 'user' | 'coach';
};

export const DEFAULT_DEMO_EMAIL = 'jeff@example.com';
export const DEFAULT_DEMO_COACH_EMAIL = 'todd@example.com';

export const DEMO_USER_OPTIONS: DemoUserOption[] = [
  {
    email: DEFAULT_DEMO_EMAIL,
    name: 'Jeff Demo',
    label: 'Jeff Demo — full coached user',
    description: 'Full demo client with training, check-ins, nutrition, learning, and notifications.',
    role: 'user',
  },
  {
    email: 'maria@example.com',
    name: 'Maria Client',
    label: 'Maria Client — recomposition client',
    description: 'Full demo client with recomposition-style targets and coach review data.',
    role: 'user',
  },
  {
    email: 'alex@example.com',
    name: 'Alex Client',
    label: 'Alex Client — strength client',
    description: 'Full demo client with strength-style training and nutrition data.',
    role: 'user',
  },
  {
    email: 'signal-empty@example.com',
    name: 'Signal Empty',
    label: 'Signal Empty — first-run states',
    description: 'Completed user with Signal enabled and almost no product data.',
    role: 'user',
  },
  {
    email: 'signal-sparse@example.com',
    name: 'Signal Sparse',
    label: 'Signal Sparse — partial data',
    description: 'Small amount of training, metrics, check-ins, supplements, and notifications.',
    role: 'user',
  },
  {
    email: 'signal-edge@example.com',
    name: 'Signal Edge Case',
    label: 'Signal Edge — long text / odd data',
    description: 'Long names, dense copy, historical data, and awkward layout cases.',
    role: 'user',
  },
  {
    email: DEFAULT_DEMO_COACH_EMAIL,
    name: 'Todd Coach',
    label: 'Todd Coach — full demo coach',
    description: 'Default coach account used by the rich demo ecosystem.',
    role: 'coach',
  },
  {
    email: 'signal-coach@example.com',
    name: 'Signal Coach',
    label: 'Signal Coach — review queue',
    description: 'Coach account with clients arranged for Signal review-flow testing.',
    role: 'coach',
  },
  {
    email: 'testuser@example.com',
    name: 'TestUser',
    label: 'TestUser — deterministic E2E user',
    description: 'Existing deterministic test account for regression coverage.',
    role: 'user',
  },
];

export function findDemoUserOption(email: string | null | undefined): DemoUserOption | undefined {
  if (!email) return undefined;
  return DEMO_USER_OPTIONS.find((option) => option.email === email);
}

export function isAllowedDemoUserEmail(email: string | null | undefined): boolean {
  return Boolean(findDemoUserOption(email));
}

export function resolveDemoUserEmail(input: string | null | undefined, fallbackEmail: string): string {
  return isAllowedDemoUserEmail(input) ? String(input) : fallbackEmail;
}

export function defaultSettingsForDemoUser(email: string) {
  const option = findDemoUserOption(email);
  return {
    registrationComplete: true,
    onboardingSeenWelcome: true,
    onboardingDismissed: true,
    signalUiEnabled: true,
    showSupplements: true,
    coachModeActive: option?.role === 'coach',
  };
}

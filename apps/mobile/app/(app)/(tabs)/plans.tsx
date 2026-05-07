import { PlaceholderScaffold } from '@/components/shell/PlaceholderScaffold';
import { StatusCard } from '@/components/shell/StatusCard';

export default function PlansScreen() {
  return (
    <PlaceholderScaffold
      title="Plans placeholder"
      subtitle="This route is reserved for the first real training-plan mobile flow after the visual system lands."
      caption="Navigation and auth protection are live; product UI is intentionally deferred."
    >
      <StatusCard
        label="Planned integration"
        value="Read active plan data through the shared contract layer and mobile API client."
      />
    </PlaceholderScaffold>
  );
}

import { PlaceholderScaffold } from '@/components/shell/PlaceholderScaffold';
import { StatusCard } from '@/components/shell/StatusCard';

export default function CheckInsScreen() {
  return (
    <PlaceholderScaffold
      title="Check-ins placeholder"
      subtitle="This route marks the mobile check-in surface without committing to visual design or form UX yet."
      caption="The backend bearer-token path is ready for later check-in reads and submissions."
    >
      <StatusCard
        label="Planned integration"
        value="Connect current check-in, metric history, and weekly submission flows after restyle decisions are final."
      />
    </PlaceholderScaffold>
  );
}

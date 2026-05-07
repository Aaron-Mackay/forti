import { ActivityIndicator, Text } from 'react-native';

import { PlaceholderScaffold } from '@/components/shell/PlaceholderScaffold';
import { StatusCard } from '@/components/shell/StatusCard';
import { useMobileBootstrap } from '@/lib/bootstrap/useMobileBootstrap';

export default function HomeScreen() {
  const bootstrap = useMobileBootstrap();

  return (
    <PlaceholderScaffold
      title="Forti mobile foundation"
      subtitle="This shell validates authenticated Expo routing, bearer-auth API access, and shared contracts before the restyle begins."
      caption="The tabs and cards stay intentionally plain in this phase."
      status={
        bootstrap.status === 'loading' ? <ActivityIndicator color="#f5f7fb" /> : null
      }
    >
      {bootstrap.status === 'ready' ? (
        <>
          <StatusCard label="Signed in as" value={bootstrap.profile.email} />
          <StatusCard label="Display name" value={bootstrap.profile.name ?? 'No display name set'} />
          <StatusCard
            label="Settings snapshot"
            value={`Units: ${bootstrap.settings.weightUnit} • Check-in day: ${bootstrap.settings.checkInDay}`}
          />
        </>
      ) : null}

      {bootstrap.status === 'error' ? (
        <StatusCard label="Bootstrap error" tone="danger" value={bootstrap.error} />
      ) : null}

      {bootstrap.status === 'loading' ? (
        <StatusCard label="Loading" value="Fetching profile and settings through the mobile API client." />
      ) : null}

      <Text style={{ color: '#8f9bb3', lineHeight: 20 }}>
        Next feature slices can plug into this shell without changing auth, token refresh, or route structure.
      </Text>
    </PlaceholderScaffold>
  );
}

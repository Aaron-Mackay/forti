import { Text } from 'react-native';

import { PlaceholderScaffold } from '@/components/shell/PlaceholderScaffold';
import { StatusCard } from '@/components/shell/StatusCard';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSignedOutReasonMessage } from '@/lib/auth/sessionTypes';

export default function AccountScreen() {
  const auth = useAuth();
  const statusMessage = auth.status === 'signed-out' ? getSignedOutReasonMessage(auth.reason) : null;

  return (
    <PlaceholderScaffold
      title="Account placeholder"
      subtitle="This route exercises stable auth state, session lifecycle messaging, and an intentional sign-out path."
      actions={
        auth.status === 'signed-in'
          ? [{ label: 'Sign out', onPress: () => auth.signOut() }]
          : []
      }
    >
      <StatusCard
        label="Auth state"
        value={auth.status === 'signed-in' ? `Signed in as ${auth.user.email}` : 'Signed out'}
      />
      {statusMessage ? <StatusCard label="Last auth event" value={statusMessage} /> : null}
      <Text style={{ color: '#8f9bb3', lineHeight: 20 }}>
        Future account work can attach profile editing and settings updates to this route without changing session ownership.
      </Text>
    </PlaceholderScaffold>
  );
}

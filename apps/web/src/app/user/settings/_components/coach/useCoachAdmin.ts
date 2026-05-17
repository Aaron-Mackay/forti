'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSettings } from '@lib/providers/SettingsProvider';

export type CoachInfo = {
  coachCode: string | null;
  coachLogoUrl: string | null;
  coachModeActive: boolean;
  currentCoach: { id: string; name: string } | null;
  sentRequest: { id: number; status: 'Pending' | 'Rejected'; coach: { id: string; name: string } } | null;
  pendingRequests: { id: number; client: { id: string; name: string } }[];
  confirmedClients: { id: string; name: string }[];
};

export function useCoachAdmin() {
  const { updateSetting } = useSettings();
  const [info, setInfo] = useState<CoachInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await fetch('/api/coach');
      if (!res.ok) throw new Error('Failed to load coaching info');
      const data = (await res.json()) as CoachInfo;
      setInfo(data);
    } catch {
      setFetchError('Could not load coaching information');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = useCallback(
    async (key: string, fn: () => Promise<Response>, errorPrefix: string) => {
      setBusy(key);
      setActionError(null);
      try {
        const res = await fn();
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setActionError(body.error ?? errorPrefix);
        } else {
          await load();
        }
      } catch {
        setActionError(errorPrefix);
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const linkCoach = useCallback(
    (code: string) =>
      doAction(
        'link',
        () =>
          fetch('/api/coach/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }),
        'Failed to send request',
      ),
    [doAction],
  );

  const cancelRequest = useCallback(
    () => doAction('cancel', () => fetch('/api/coach/request', { method: 'DELETE' }), 'Failed to cancel request'),
    [doAction],
  );

  const unlinkCoach = useCallback(
    () => doAction('unlink', () => fetch('/api/coach/unlink', { method: 'DELETE' }), 'Failed to unlink coach'),
    [doAction],
  );

  const acceptRequest = useCallback(
    (id: number) =>
      doAction(
        `accept-${id}`,
        () =>
          fetch(`/api/coach/request/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept' }),
          }),
        'Failed to accept request',
      ),
    [doAction],
  );

  const rejectRequest = useCallback(
    (id: number) =>
      doAction(
        `reject-${id}`,
        () =>
          fetch(`/api/coach/request/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject' }),
          }),
        'Failed to reject request',
      ),
    [doAction],
  );

  const removeClient = useCallback(
    (id: string) =>
      doAction(`remove-${id}`, () => fetch(`/api/coach/clients/${id}`, { method: 'DELETE' }), 'Failed to remove client'),
    [doAction],
  );

  const sendInvite = useCallback(
    (email: string) =>
      doAction(
        'invite',
        () =>
          fetch('/api/coach/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          }),
        'Failed to send invite',
      ),
    [doAction],
  );

  const setCoachMode = useCallback(
    async (active: boolean) => {
      setBusy('coach-mode');
      setActionError(null);
      try {
        const res = await fetch('/api/coach/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setActionError(body.error ?? 'Failed to update coach mode');
        } else {
          updateSetting('coachModeActive', active);
          await load();
        }
      } catch {
        setActionError('Failed to update coach mode');
      } finally {
        setBusy(null);
      }
    },
    [load, updateSetting],
  );

  const uploadLogo = useCallback(async (blob: Blob) => {
    setBusy('logo');
    setActionError(null);
    try {
      const form = new FormData();
      form.append('file', new File([blob], 'logo.jpg', { type: 'image/jpeg' }));
      const res = await fetch('/api/coach/logo', { method: 'POST', body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? 'Upload failed');
      } else {
        await load();
        window.dispatchEvent(new CustomEvent('coach-logo-changed'));
      }
    } catch {
      setActionError('Upload failed');
    } finally {
      setBusy(null);
    }
  }, [load]);

  const removeLogo = useCallback(async () => {
    setBusy('logo');
    setActionError(null);
    try {
      const res = await fetch('/api/coach/logo', { method: 'DELETE' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(body.error ?? 'Remove failed');
      } else {
        await load();
        window.dispatchEvent(new CustomEvent('coach-logo-changed'));
      }
    } catch {
      setActionError('Remove failed');
    } finally {
      setBusy(null);
    }
  }, [load]);

  return {
    info,
    fetchError,
    actionError,
    busy,
    clearActionError: () => setActionError(null),
    linkCoach,
    cancelRequest,
    unlinkCoach,
    acceptRequest,
    rejectRequest,
    removeClient,
    sendInvite,
    setCoachMode,
    uploadLogo,
    removeLogo,
    reload: load,
  };
}

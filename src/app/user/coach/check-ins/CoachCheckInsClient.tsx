'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { CheckInWithUser } from '@/types/checkInTypes';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse {
  checkIns: CheckInWithUser[];
  total: number;
  clients: Client[];
}

export default function CoachCheckInsClient() {
  const [tab, setTab] = useState<0 | 1>(0); // 0 = New, 1 = Browse
  const [clients, setClients] = useState<Client[]>([]);
  const [newCheckIns, setNewCheckIns] = useState<CheckInWithUser[]>([]);
  const [browseCheckIns, setBrowseCheckIns] = useState<CheckInWithUser[]>([]);
  const [browseTotal, setBrowseTotal] = useState(0);
  const [browseOffset, setBrowseOffset] = useState(0);
  const [filterClientId, setFilterClientId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNew = useCallback(async () => {
    const res = await fetch('/api/coach/check-ins?unread=true&limit=20&offset=0');
    if (!res.ok) throw new Error('Failed to load check-ins');
    const data = await res.json() as ApiResponse;
    setNewCheckIns(data.checkIns);
    setClients(data.clients);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchNew()
      .catch(() => setError('Failed to load client check-ins.'))
      .finally(() => setLoading(false));
  }, [fetchNew]);

  async function runBrowse(offset: number, append = false) {
    setBrowseLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '20', offset: String(offset) });
      if (filterClientId) params.set('clientId', filterClientId);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const res = await fetch(`/api/coach/check-ins?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json() as ApiResponse;
      if (append) {
        setBrowseCheckIns(prev => [...prev, ...data.checkIns]);
      } else {
        setBrowseCheckIns(data.checkIns);
        setBrowseOffset(0);
      }
      setBrowseTotal(data.total);
      setBrowseOffset(offset);
    } catch {
      setError('Failed to load check-ins.');
    } finally {
      setBrowseLoading(false);
    }
  }

  function handleNotesUpdated(id: number, notes: string) {
    setNewCheckIns(prev => prev.map(c => c.id === id ? { ...c, coachNotes: notes, coachReviewedAt: new Date() } : c));
    setBrowseCheckIns(prev => prev.map(c => c.id === id ? { ...c, coachNotes: notes, coachReviewedAt: new Date() } : c));
  }

  // Lazy-import the card to keep this file leaner
  const [CardComponent, setCardComponent] = useState<React.ComponentType<{
    checkIn: CheckInWithUser;
    onNotesUpdated: (id: number, notes: string) => void;
  }> | null>(null);

  useEffect(() => {
    import('./CoachCheckInCard').then(m => setCardComponent(() => m.default));
  }, []);

  return (
    <Box sx={{ pt: 2, pb: 6, maxWidth: 640 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v as 0 | 1)} sx={{ mb: 2 }}>
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              New
              {!loading && newCheckIns.length > 0 && (
                <Chip label={newCheckIns.length} size="small" color="warning" />
              )}
            </Box>
          }
        />
        <Tab label="Browse" />
      </Tabs>

      {/* ── New tab ── */}
      {tab === 0 && (
        <>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={52} />)}
            </Box>
          ) : newCheckIns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No new unreviewed check-ins.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {CardComponent
                ? newCheckIns.map(c => (
                    <CardComponent key={c.id} checkIn={c} onNotesUpdated={handleNotesUpdated} />
                  ))
                : <CircularProgress size={24} />
              }
            </Box>
          )}
        </>
      )}

      {/* ── Browse tab ── */}
      {tab === 1 && (
        <>
          {/* Filters */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                value={filterClientId}
                label="Client"
                onChange={e => setFilterClientId(e.target.value)}
              >
                <MenuItem value="">All clients</MenuItem>
                {clients.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="From"
                type="date"
                size="small"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
            </Box>
            <Button variant="outlined" onClick={() => runBrowse(0)} disabled={browseLoading}>
              {browseLoading ? <CircularProgress size={18} /> : 'Search'}
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {browseLoading && browseCheckIns.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={52} />)}
            </Box>
          ) : browseCheckIns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Use the filters above and tap Search.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {CardComponent
                ? browseCheckIns.map(c => (
                    <CardComponent key={c.id} checkIn={c} onNotesUpdated={handleNotesUpdated} />
                  ))
                : <CircularProgress size={24} />
              }
              {browseCheckIns.length < browseTotal && (
                <Button
                  variant="text"
                  onClick={() => runBrowse(browseOffset + 20, true)}
                  disabled={browseLoading}
                >
                  Load more
                </Button>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

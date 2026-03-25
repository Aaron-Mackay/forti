'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import { useRouter } from 'next/navigation';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import { useApiMutation } from '@lib/hooks/useApiMutation';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

interface PlanSummary {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  _count: { steps: number; assignments: number };
}

export default function CoachLearningPlansClient() {
  const router = useRouter();
  const { data, loading, error } = useApiGet<{ plans: PlanSummary[] }>('/api/coach/learning-plans');
  const { mutate: createPlan, loading: creating } = useApiMutation<{ plan: PlanSummary }>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function handleCreate() {
    if (!title.trim()) return;
    const result = await createPlan('/api/coach/learning-plans', 'POST', {
      title: title.trim(),
      description: description.trim() || null,
    });
    if (result) {
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      router.push(`/user/coach/learning-plans/${result.plan.id}`);
    }
  }

  return (
    <Box sx={{ p: 2, minHeight: HEIGHT_EXC_APPBAR }}>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Failed to load learning plans.
        </Typography>
      )}

      {!loading && !error && data && (
        <>
          {data.plans.length === 0 ? (
            <Box sx={{ textAlign: 'center', pt: 8 }}>
              <SchoolIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No learning plans yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create a plan to start delivering structured content to your clients.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
                New Plan
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.plans.map(plan => (
                <Card key={plan.id} variant="outlined">
                  <CardActionArea onClick={() => router.push(`/user/coach/learning-plans/${plan.id}`)}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {plan.title}
                      </Typography>
                      {plan.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {plan.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {plan._count.steps} {plan._count.steps === 1 ? 'step' : 'steps'} ·{' '}
                        {plan._count.assignments} {plan._count.assignments === 1 ? 'client' : 'clients'}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </>
      )}

      {/* FAB — only shown when there are already plans */}
      {!loading && data && data.plans.length > 0 && (
        <Fab
          color="primary"
          aria-label="new plan"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => setDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Create plan dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Learning Plan</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 200 }}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            inputProps={{ maxLength: 1000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!title.trim() || creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

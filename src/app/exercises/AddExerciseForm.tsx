'use client';

import { useState } from 'react';
import { TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { CreateExerciseRequest } from '@/app/api/exercises/route';

export function AddExerciseForm({ onExerciseAdded }: { onExerciseAdded?: () => void }) {
  const [formData, setFormData] = useState<CreateExerciseRequest>({
    name: '',
    category: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category || null,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          setError('Exercise already exists');
        } else {
          setError(errorData.error || 'Failed to add exercise');
        }
        return;
      }

      setSuccess(true);
      setFormData({ name: '', category: '', description: '' });
      setTimeout(() => setSuccess(false), 3000);

      if (onExerciseAdded) {
        onExerciseAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <h2>Add New Exercise</h2>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Exercise added successfully!</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
        <TextField
          label="Exercise Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          fullWidth
          placeholder="e.g., Barbell Bench Press"
        />
        <TextField
          label="Category"
          name="category"
          value={formData.category || ''}
          onChange={handleChange}
          fullWidth
          placeholder="e.g., Chest"
        />
      </Box>

      <TextField
        label="Description"
        name="description"
        value={formData.description || ''}
        onChange={handleChange}
        fullWidth
        multiline
        rows={3}
        placeholder="Optional: Brief description or form cues"
        sx={{ mb: 2 }}
      />

      <Button
        type="submit"
        variant="contained"
        disabled={loading || !formData.name}
      >
        {loading ? <CircularProgress size={24} sx={{ mr: 1 }} /> : null}
        {loading ? 'Adding...' : 'Add Exercise'}
      </Button>
    </Box>
  );
}

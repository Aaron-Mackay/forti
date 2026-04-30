'use client';

import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { CheckInTemplate, CheckInRatingField, CustomCard } from '@/types/checkInTemplateTypes';
import { parseCustomResponses, isFieldVisible } from '@/types/checkInTemplateTypes';

interface Props {
  /** Raw value from WeeklyCheckIn.customResponses (Prisma JsonValue). */
  responses: unknown;
  /** Template snapshot or current template — defines card structure and field labels. */
  template: CheckInTemplate;
}

function RatingResponse({ field, value }: { field: CheckInRatingField; value: number | null }) {
  if (value === null) return null;
  const pct = Math.round(((value - field.minScale) / (field.maxScale - field.minScale)) * 100);
  const label = value === field.minScale && field.minLabel
    ? field.minLabel
    : value === field.maxScale && field.maxLabel
    ? field.maxLabel
    : `${pct}%`;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{field.label}</Typography>
      <Chip label={`${value} / ${field.maxScale} · ${label}`} size="small" variant="outlined" />
    </Box>
  );
}

function TextResponse({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>{value}</Typography>
    </Box>
  );
}

/**
 * Renders custom check-in responses using the template's card structure.
 * System cards (photos, metrics, workouts) are skipped — they are rendered
 * separately by the surrounding view. Custom cards with no answered fields
 * are also skipped. Renders in the same 2-column grid the client saw.
 */
export default function CustomCheckInResponseDisplay({ responses: rawResponses, template }: Props) {
  const responses = parseCustomResponses(rawResponses);

  const visibleCustomCards = template.cards
    .filter((c): c is CustomCard => c.kind === 'custom')
    .filter(card =>
      card.fields.some(f =>
        isFieldVisible(f, responses) &&
        responses[f.id] !== undefined &&
        responses[f.id] !== null &&
        responses[f.id] !== '',
      )
    );

  if (visibleCustomCards.length === 0) return null;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      {visibleCustomCards.map(card => {
        const visibleFields = card.fields.filter(f => isFieldVisible(f, responses));

        return (
          <Paper
            key={card.id}
            variant="outlined"
            sx={{
              gridColumn: { xs: '1 / -1', sm: `span ${card.columnSpan}` },
              p: 2,
              borderRadius: 2,
            }}
          >
            {card.title && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {card.title}
              </Typography>
            )}
            <Stack spacing={0.5}>
              {visibleFields.map(field => {
                const val = responses[field.id];
                if (field.type === 'rating') {
                  return (
                    <RatingResponse
                      key={field.id}
                      field={field as CheckInRatingField}
                      value={typeof val === 'number' ? val : null}
                    />
                  );
                }
                // Capitalise yes/no responses for display
                const displayVal = typeof val === 'string'
                  ? (field.type === 'yesno' ? val.charAt(0).toUpperCase() + val.slice(1) : val)
                  : null;
                return (
                  <TextResponse
                    key={field.id}
                    label={field.label}
                    value={displayVal}
                  />
                );
              })}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}

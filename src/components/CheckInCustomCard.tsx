'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Paper, Stack, Typography } from '@mui/material';
import type { CustomCard, CustomCheckInResponses } from '@/types/checkInTemplateTypes';
import { isFieldVisible } from '@/types/checkInTemplateTypes';
import CustomCheckInField from '@/app/user/check-in/CustomCheckInField';

interface Props {
  card: CustomCard;
  /** Pre-computed gridColumn value — callers differ on responsive vs. toggle-driven. */
  gridColumn: string | Record<string, string>;
  responses: CustomCheckInResponses;
  onChange: (fieldId: string, value: string | number | null) => void;
}

/**
 * Renders a single custom check-in card — Paper shell, optional title, and an
 * animated stack of visible input fields. Returns null when no fields are visible.
 *
 * Used by both CheckInForm (client-facing) and TemplatePreview (coach editor) to
 * ensure the two surfaces stay in sync.
 */
export default function CheckInCustomCard({ card, gridColumn, responses, onChange }: Props) {
  const visibleFields = card.fields.filter(f => isFieldVisible(f, responses));
  if (visibleFields.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2 }}>
      {card.title && (
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{card.title}</Typography>
      )}
      <Stack spacing={2}>
        <AnimatePresence initial={false}>
          {visibleFields.map(field => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <CustomCheckInField field={field} responses={responses} onChange={onChange} />
            </motion.div>
          ))}
        </AnimatePresence>
      </Stack>
    </Paper>
  );
}

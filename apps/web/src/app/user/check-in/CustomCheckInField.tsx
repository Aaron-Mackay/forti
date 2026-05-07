'use client';

import { Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type {
  CheckInInputField,
  CheckInRatingField,
  CheckInYesNoField,
  CustomCheckInResponses,
} from '@/types/checkInTemplateTypes';

interface Props {
  field: CheckInInputField;
  responses: CustomCheckInResponses;
  onChange: (fieldId: string, value: string | number | null) => void;
  /** Hide the field label — used in the editor where the label is shown in the card header row. */
  hideLabel?: boolean;
}

function RatingInput({
  field,
  value,
  hideLabel,
  onChange,
}: {
  field: CheckInRatingField;
  value: number | null;
  hideLabel?: boolean;
  onChange: (v: number) => void;
}) {
  const scale = Array.from({ length: field.maxScale - field.minScale + 1 }, (_, i) => i + field.minScale);

  return (
    <Box>
      {!hideLabel && (
        <Typography variant="body2" sx={{ mb: 0.25 }}>{field.label}</Typography>
      )}
      {field.description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {field.description}
        </Typography>
      )}
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_e, v) => { if (v !== null) onChange(v as number); }}
        size="small"
        sx={{
          flexWrap: 'wrap',
          gap: 0.5,
          display: 'flex',
          width: '100%',
          '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px !important',
            margin: 0,
            '&.Mui-selected': { borderColor: 'primary.main' },
          },
        }}
      >
        {scale.map(n => (
          <ToggleButton
            key={n}
            value={n}
            aria-label={String(n)}
            sx={{ minWidth: 36, flex: '1 1 auto' }}
          >
            {n}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {(field.minLabel || field.maxLabel) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
          <Typography variant="caption" color="text.disabled">{field.minLabel}</Typography>
          <Typography variant="caption" color="text.disabled">{field.maxLabel}</Typography>
        </Box>
      )}
    </Box>
  );
}

function YesNoInput({
  field,
  value,
  hideLabel,
  onChange,
}: {
  field: CheckInYesNoField;
  value: string | null;
  hideLabel?: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <Box>
      {!hideLabel && (
        <Typography variant="body2" sx={{ mb: 0.25 }}>{field.label}</Typography>
      )}
      {field.description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {field.description}
        </Typography>
      )}
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={(_e, v) => onChange(v as string | null)}
        size="small"
        sx={{
          width: '100%',
          '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px !important',
            margin: 0,
            flex: 1,
            '&.Mui-selected': { borderColor: 'primary.main' },
          },
        }}
      >
        <ToggleButton value="yes" aria-label="Yes">Yes</ToggleButton>
        <ToggleButton value="no" aria-label="No">No</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

/** Renders a single input field inside the check-in form (rating, text, textarea, or yes/no). */
export default function CustomCheckInField({ field, responses, onChange, hideLabel }: Props) {
  if (field.type === 'yesno') {
    const yesNoField = field as CheckInYesNoField;
    const currentValue = typeof responses[field.id] === 'string' ? responses[field.id] as string : null;
    return (
      <YesNoInput
        field={yesNoField}
        value={currentValue}
        hideLabel={hideLabel}
        onChange={v => onChange(field.id, v)}
      />
    );
  }

  if (field.type === 'rating') {
    const ratingField = field as CheckInRatingField;
    const currentValue = typeof responses[field.id] === 'number' ? responses[field.id] as number : null;
    return (
      <RatingInput
        field={ratingField}
        value={currentValue}
        hideLabel={hideLabel}
        onChange={v => onChange(field.id, v)}
      />
    );
  }

  const currentText = typeof responses[field.id] === 'string' ? responses[field.id] as string : '';

  return (
    <TextField
      label={hideLabel ? undefined : field.label}
      helperText={field.description}
      multiline={field.type === 'textarea'}
      minRows={field.type === 'textarea' ? 3 : undefined}
      fullWidth
      value={currentText}
      onChange={e => onChange(field.id, e.target.value || null)}
    />
  );
}

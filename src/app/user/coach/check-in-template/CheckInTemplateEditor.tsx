'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloseIcon from '@mui/icons-material/Close';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  makeDefaultCards,
  MAX_RATING_SCALE,
  MAX_TEMPLATE_FIELDS,
  MAX_TEMPLATE_CARDS,
  MIN_RATING_SCALE,
  validateTemplate,
  isFieldVisible,
  getAllInputFields,
} from '@/types/checkInTemplateTypes';
import type {
  CheckInTemplate,
  CheckInCard,
  SystemCard,
  CustomCard,
  CheckInInputField,
  CheckInRatingField,
  CheckInTextField,
  CheckInTextareaField,
  CheckInYesNoField,
  ConditionRule,
  RatingOperator,
  TextOperator,
  CustomCheckInResponses,
} from '@/types/checkInTemplateTypes';
import type { DataVizCard, RelativeWeeks } from '@/types/datavizTypes';
import { RELATIVE_WEEK_OPTIONS } from '@/types/datavizTypes';
import { BUILTIN_METRIC_KEYS, BUILTIN_METRIC_LABELS } from '@/types/metricTypes';
import type { BuiltInMetricKey } from '@/types/metricTypes';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TemplateCardRenderer from '@/components/TemplateCardRenderer';
import DataVizChartCard from '@/components/DataVizChartCard';
import MetricsSystemCard from '@/components/MetricsSystemCard';
import CustomCheckInField from '@/app/user/check-in/CustomCheckInField';
import {HEIGHT_EXC_APPBAR} from "@/components/CustomAppBar";
import { DEFAULT_CHECK_IN_TEMPLATE_PREVIEW_DATA } from '@/components/checkInTemplatePreviewData';

// Motion-wrapped MUI Box — accepts both `sx` and Framer Motion props
const MotionBox = motion.create(Box);

// ─── System card metadata ─────────────────────────────────────────────────────

const SYSTEM_CARD_META: Record<SystemCard['systemType'], { label: string; Icon: React.ElementType }> = {
  photos:   { label: 'Progress photos',    Icon: PhotoCameraIcon },
  metrics:  { label: 'Weekly metrics',     Icon: BarChartIcon },
  workouts: { label: 'Training', Icon: FitnessCenterIcon },
};

function SystemCardPreview({ card }: { card: SystemCard }) {
  const { systemType } = card;
  const previewData = DEFAULT_CHECK_IN_TEMPLATE_PREVIEW_DATA;

  if (systemType === 'photos') {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {(['Front', 'Side', 'Back'] as const).map(angle => (
          <Box key={angle} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: '100%', aspectRatio: '1', border: '1px dashed', borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }} />
            <Typography variant="caption" color="text.disabled">{angle}</Typography>
          </Box>
        ))}
      </Box>
    );
  }

  if (systemType === 'metrics') {
    return (
      <MetricsSystemCard
        currentWeek={previewData.currentWeek}
        weekPrior={previewData.priorWeek}
        weekTargets={previewData.weekTargets}
        customMetricDefs={previewData.customMetricDefs}
        weekStartDate={previewData.weekStart}
        defaultExpanded={card.columnSpan === 2}
        interactive={false}
      />
    );
  }

  // training
  return (
    <Stack spacing={1}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary">Training</Typography>
        <Typography variant="body2" fontWeight={600} color="text.secondary">
          {previewData.trainingCounts.completed}/{previewData.trainingCounts.planned}
        </Typography>
      </Box>
      <Stack spacing={0.5}>
        {previewData.trainingSessions.map(session => (
          <Box key={`${session.day}-${session.name}`} sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
            <Typography variant="caption" color="text.disabled" sx={{ minWidth: 28 }}>{session.day}</Typography>
            <Typography variant="body2" color="text.secondary">{session.name}</Typography>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

// ─── Column span toggle ───────────────────────────────────────────────────────

function ColumnSpanToggle({ value, onChange }: { value: 1 | 2; onChange: (v: 1 | 2) => void }) {
  return (
    <IconButton
      size="small"
      onClick={() => onChange(value === 1 ? 2 : 1)}
      aria-label={value === 1 ? 'Expand to full width' : 'Collapse to half width'}
    >
      {value === 1
        ? <UnfoldMoreIcon fontSize="small" sx={{ transform: 'rotate(90deg)' }} />
        : <UnfoldLessIcon fontSize="small" sx={{ transform: 'rotate(90deg)' }} />}
    </IconButton>
  );
}

// ─── Condition builder ────────────────────────────────────────────────────────

const RATING_OPS: { value: RatingOperator; label: string }[] = [
  { value: 'eq',  label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'lte', label: '≤' },
  { value: 'gte', label: '≥' },
];

const TEXT_OPS: { value: TextOperator; label: string }[] = [
  { value: 'answered',     label: 'was answered' },
  { value: 'not_answered', label: 'was not answered' },
];

interface ConditionBuilderProps {
  fieldId: string;
  showIf: ConditionRule | undefined;
  eligibleFields: CheckInInputField[];
  wide?: boolean;
  onUpdate: (rule: ConditionRule | undefined) => void;
}

function ConditionBuilder({ fieldId: _fieldId, showIf, eligibleFields, wide = false, onUpdate }: ConditionBuilderProps) {
  const sourceField = eligibleFields.find(f => f.id === showIf?.fieldId) ?? null;
  const isRating = sourceField?.type === 'rating';

  const inputEligible = eligibleFields.filter(f => f.type === 'rating' || f.type === 'text' || f.type === 'textarea' || f.type === 'yesno');

  if (inputEligible.length === 0) {
    return (
      <Typography variant="caption" color="text.disabled">
        Add a rating or text field to enable conditions.
      </Typography>
    );
  }

  function handleSourceChange(id: string) {
    if (!id) { onUpdate(undefined); return; }
    const src = inputEligible.find(f => f.id === id);
    if (!src) return;
    if (src.type === 'rating') {
      onUpdate({ fieldId: id, operator: 'gte', value: 1 });
    } else {
      onUpdate({ fieldId: id, operator: 'answered' });
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        Show only if…
      </Typography>
      <FormControl size="small" fullWidth>
        <InputLabel>Field</InputLabel>
        <Select
          label="Field"
          value={showIf?.fieldId ?? ''}
          onChange={e => handleSourceChange(e.target.value)}
        >
          <MenuItem value="">No condition</MenuItem>
          {inputEligible.map(f => (
            <MenuItem key={f.id} value={f.id}>{f.label || getFieldLabelPlaceholder(f)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {showIf && sourceField && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: wide && isRating ? 'minmax(0, 1fr) minmax(0, 120px)' : '1fr',
            gap: 1,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>Operator</InputLabel>
            <Select
              label="Operator"
              value={showIf.operator}
              onChange={e => {
                const op = e.target.value as string;
                if (op === 'answered' || op === 'not_answered') {
                  onUpdate({ fieldId: showIf.fieldId, operator: op as TextOperator });
                } else {
                  const prev = showIf as { value?: number };
                  onUpdate({ fieldId: showIf.fieldId, operator: op as RatingOperator, value: prev.value ?? 1 });
                }
              }}
            >
              {(isRating ? RATING_OPS : TEXT_OPS).map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {isRating && 'value' in showIf && (
            <TextField
              label="Value"
              type="number"
              size="small"
              fullWidth
              value={(showIf as { value: number }).value}
              onChange={e => onUpdate({ ...showIf as { fieldId: string; operator: RatingOperator; value: number }, value: Number(e.target.value) })}
              slotProps={{ htmlInput: { min: 1, max: MAX_RATING_SCALE } }}
            />
          )}
        </Box>
      )}
    </Stack>
  );
}

// ─── Field preview (widget only, label shown in header row) ──────────────────

function FieldPreview({ field }: { field: CheckInInputField }) {
  return <CustomCheckInField field={field} responses={{}} onChange={() => {}} hideLabel />;
}

function getFieldLabelPlaceholder(field: CheckInInputField): string {
  return field.type === 'rating' ? 'New rating' : 'New question';
}

// ─── Sortable field item ──────────────────────────────────────────────────────

interface SortableFieldProps {
  field: CheckInInputField;
  allInputFields: CheckInInputField[];
  wide?: boolean;
  initialExpanded?: boolean;
  onUpdate: (updated: CheckInInputField) => void;
  onRemove: () => void;
}

function SortableField({ field, allInputFields, wide = false, initialExpanded = false, onUpdate, onRemove }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const [expanded, setExpanded] = useState(initialExpanded);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const ratingField = field.type === 'rating' ? field as CheckInRatingField : null;

  // Cross-card eligible sources: all input fields except self
  const eligibleSources = allInputFields.filter(f => f.id !== field.id);

  const showIf = 'showIf' in field ? field.showIf : undefined;

  function updateShowIf(rule: ConditionRule | undefined) {
    onUpdate({ ...field, showIf: rule } as CheckInInputField);
  }

  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
        {/* Header row: drag handle + label (text or input) + ⋮ menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', color: 'text.disabled', flexShrink: 0, touchAction: 'none' }}
          >
            <DragHandleIcon fontSize="small" />
          </Box>

          {expanded ? (
            <TextField
              size="small"
              value={field.label}
              onChange={e => onUpdate({ ...field, label: e.target.value })}
              placeholder={getFieldLabelPlaceholder(field)}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { 'aria-label': 'Field label' } }}
            />
          ) : (
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{ flex: 1 }}
              color={field.label ? 'text.primary' : 'text.secondary'}
            >
              {field.label || getFieldLabelPlaceholder(field)}
            </Typography>
          )}

          <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="Field options">
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Widget preview — always visible, label suppressed (shown in header) */}
        <FieldPreview field={field} />

        {/* Expanded settings */}
        <Collapse in={expanded} unmountOnExit>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {'description' in field && (
              <TextField
                label="Description (optional)"
                size="small"
                fullWidth
                value={(field as CheckInTextField | CheckInTextareaField | CheckInRatingField).description ?? ''}
                onChange={e => onUpdate({ ...field, description: e.target.value || undefined } as CheckInInputField)}
              />
            )}

            {ratingField && (
              <>
                {wide ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(120px, 160px)',
                      gap: 1,
                    }}
                  >
                    <TextField
                      label="Min label (optional)"
                      size="small"
                      fullWidth
                      value={ratingField.minLabel ?? ''}
                      onChange={e => onUpdate({ ...ratingField, minLabel: e.target.value || undefined })}
                    />
                    <TextField
                      label="Max label (optional)"
                      size="small"
                      fullWidth
                      value={ratingField.maxLabel ?? ''}
                      onChange={e => onUpdate({ ...ratingField, maxLabel: e.target.value || undefined })}
                    />
                    <FormControl size="small" fullWidth>
                      <InputLabel>Scale max</InputLabel>
                      <Select
                        label="Scale max"
                        value={ratingField.maxScale}
                        onChange={e => onUpdate({ ...ratingField, maxScale: Number(e.target.value) })}
                      >
                        {Array.from({ length: MAX_RATING_SCALE - MIN_RATING_SCALE + 1 }, (_, i) => i + MIN_RATING_SCALE).map(n => (
                          <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                        Scale: 1 to
                      </Typography>
                      <Select
                        size="small"
                        value={ratingField.maxScale}
                        onChange={e => onUpdate({ ...ratingField, maxScale: Number(e.target.value) })}
                        sx={{ minWidth: 72 }}
                      >
                        {Array.from({ length: MAX_RATING_SCALE - MIN_RATING_SCALE + 1 }, (_, i) => i + MIN_RATING_SCALE).map(n => (
                          <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <TextField
                      label="Min label (optional)"
                      size="small"
                      fullWidth
                      value={ratingField.minLabel ?? ''}
                      onChange={e => onUpdate({ ...ratingField, minLabel: e.target.value || undefined })}
                    />
                    <TextField
                      label="Max label (optional)"
                      size="small"
                      fullWidth
                      value={ratingField.maxLabel ?? ''}
                      onChange={e => onUpdate({ ...ratingField, maxLabel: e.target.value || undefined })}
                    />
                  </>
                )}
              </>
            )}

            <ConditionBuilder
              fieldId={field.id}
              showIf={showIf}
              eligibleFields={eligibleSources}
              wide={wide}
              onUpdate={updateShowIf}
            />
          </Stack>
        </Collapse>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { setMenuAnchor(null); setExpanded(e => !e); }}>
            {expanded ? 'Collapse' : 'Edit'}
          </MenuItem>
          <MenuItem onClick={() => { setMenuAnchor(null); onRemove(); }} sx={{ color: 'error.main' }}>
            Remove
          </MenuItem>
        </Menu>
      </Paper>
    </Box>
  );
}

// ─── Sortable system card ─────────────────────────────────────────────────────

interface SortableSystemCardProps {
  card: SystemCard;
  onUpdate: (updated: SystemCard) => void;
  onRemove: () => void;
}

function SortableSystemCard({ card, onUpdate, onRemove }: SortableSystemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const { label, Icon } = SYSTEM_CARD_META[card.systemType];

  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, height: '100%' }} sx={{ display: 'grid', minWidth: 0 }}>
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover', minWidth: 0 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', color: 'text.disabled', flexShrink: 0, touchAction: 'none' }}
          >
            <DragHandleIcon fontSize="small" />
          </Box>

          <Icon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }} color="text.secondary">
            {label}
          </Typography>

          <ColumnSpanToggle
            value={card.columnSpan}
            onChange={v => onUpdate({ ...card, columnSpan: v })}
          />

          <IconButton size="small" onClick={onRemove} aria-label={`Remove ${label} card`}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ opacity: 0.6, pointerEvents: 'none' }}>
          <SystemCardPreview card={card} />
        </Box>
      </Paper>
    </Box>
  );
}

// ─── Sortable custom card ─────────────────────────────────────────────────────

interface SortableCustomCardProps {
  card: CustomCard;
  allInputFields: CheckInInputField[];
  atFieldLimit: boolean;
  onUpdate: (updated: CustomCard) => void;
  onRemove: () => void;
}

function makeNewField(type: 'rating' | 'text' | 'textarea' | 'yesno'): CheckInInputField {
  const id = crypto.randomUUID();
  switch (type) {
    case 'rating':
      return { id, type: 'rating', label: '', minScale: 1, maxScale: 10 } satisfies CheckInRatingField;
    case 'text':
      return { id, type: 'text', label: '' } satisfies CheckInTextField;
    case 'textarea':
      return { id, type: 'textarea', label: '' } satisfies CheckInTextareaField;
    case 'yesno':
      return { id, type: 'yesno', label: '' } satisfies CheckInYesNoField;
  }
}

function SortableCustomCard({ card, allInputFields, atFieldLimit, onUpdate, onRemove }: SortableCustomCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [addAnchor, setAddAnchor] = useState<null | HTMLElement>(null);
  const [lastAddedFieldId, setLastAddedFieldId] = useState<string | null>(null);

  const fieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor),
  );

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = card.fields.findIndex(f => f.id === active.id);
      const newIdx = card.fields.findIndex(f => f.id === over.id);
      onUpdate({ ...card, fields: arrayMove(card.fields, oldIdx, newIdx) });
    }
  }

  function addField(type: 'rating' | 'text' | 'textarea' | 'yesno') {
    const newField = makeNewField(type);
    onUpdate({ ...card, fields: [...card.fields, newField] });
    setLastAddedFieldId(newField.id);
    setAddAnchor(null);
  }

  function updateField(fieldId: string, updated: CheckInInputField) {
    onUpdate({ ...card, fields: card.fields.map(f => f.id === fieldId ? updated : f) });
  }

  function removeField(fieldId: string) {
    onUpdate({ ...card, fields: card.fields.filter(f => f.id !== fieldId) });
  }

  const isWideCard = card.columnSpan === 2;

  return (
    <Box ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, height: '100%' }} sx={{ display: 'grid', minWidth: 0 }}>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
        {/* Card header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {/* Drag handle — outside inner DndContext */}
          <Box
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', color: 'text.disabled', flexShrink: 0, touchAction: 'none' }}
          >
            <DragHandleIcon fontSize="small" />
          </Box>

          <TextField
            size="small"
            placeholder="Card title (optional)"
            value={card.title ?? ''}
            onChange={e => onUpdate({ ...card, title: e.target.value || undefined })}
            sx={{ flex: 1 }}
            slotProps={{ htmlInput: { 'aria-label': 'Card title' } }}
          />

          <ColumnSpanToggle
            value={card.columnSpan}
            onChange={v => onUpdate({ ...card, columnSpan: v })}
          />

          <IconButton size="small" onClick={e => setMenuAnchor(e.currentTarget)} aria-label="Card options">
            <MoreVertIcon fontSize="small" />
          </IconButton>

          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setMenuAnchor(null); onRemove(); }} sx={{ color: 'error.main' }}>
              Remove card
            </MenuItem>
          </Menu>
        </Box>

        {/* Fields — inner DnD for field reorder */}
        <DndContext
          id={`fields-${card.id}`}
          sensors={fieldSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleFieldDragEnd}
        >
          <SortableContext items={card.fields.map(f => f.id)} strategy={rectSortingStrategy}>
            <Stack spacing={1} sx={{ mb: card.fields.length > 0 ? 1.5 : 0 }}>
              {card.fields.map(field => (
                <SortableField
                  key={field.id}
                  field={field}
                  allInputFields={allInputFields}
                  wide={isWideCard}
                  initialExpanded={field.id === lastAddedFieldId}
                  onUpdate={updated => updateField(field.id, updated)}
                  onRemove={() => removeField(field.id)}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>

        {/* Add field */}
        <Button
          startIcon={<AddIcon />}
          onClick={e => setAddAnchor(e.currentTarget)}
          disabled={atFieldLimit}
          variant="outlined"
          size="small"
          fullWidth
        >
          Add field
        </Button>
        <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
          <MenuItem onClick={() => addField('rating')}>Rating</MenuItem>
          <MenuItem onClick={() => addField('text')}>Short text</MenuItem>
          <MenuItem onClick={() => addField('textarea')}>Long text</MenuItem>
          <MenuItem onClick={() => addField('yesno')}>Yes / No</MenuItem>
        </Menu>
      </Paper>
    </Box>
  );
}

// ─── Sortable dataviz card ────────────────────────────────────────────────────

interface SortableDataVizCardProps {
  card: DataVizCard;
  onUpdate: (updated: DataVizCard) => void;
  onRemove: () => void;
}

function SortableDataVizCard({ card, onUpdate, onRemove }: SortableDataVizCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const isWideCard = card.columnSpan === 2;

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, height: '100%' }}
      sx={{ display: 'grid', minWidth: 0 }}
    >
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.disabled', flexShrink: 0, touchAction: 'none' }}>
            <DragHandleIcon fontSize="small" />
          </Box>
          <ShowChartIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }} color="text.secondary">
            Data Visualisation
          </Typography>
          <ColumnSpanToggle value={card.columnSpan} onChange={v => onUpdate({ ...card, columnSpan: v })} />
          <IconButton size="small" onClick={onRemove} aria-label="Remove chart card">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Stack spacing={1.5}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: isWideCard ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
              gap: 1,
            }}
          >
            <TextField
              label="Title (optional)"
              size="small"
              value={card.title ?? ''}
              onChange={e => onUpdate({ ...card, title: e.target.value || undefined })}
              fullWidth
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Metric</InputLabel>
              <Select
                label="Metric"
                value={card.metric}
                onChange={e => onUpdate({ ...card, metric: e.target.value as BuiltInMetricKey })}
              >
                {BUILTIN_METRIC_KEYS.map(k => (
                  <MenuItem key={k} value={k}>{BUILTIN_METRIC_LABELS[k]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {card.timeRange.mode === 'relative' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isWideCard ? 'minmax(0, 1fr) minmax(180px, 260px)' : '1fr',
                gap: 1,
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={card.timeRange.mode}
                fullWidth
                onChange={(_e, mode: string | null) => {
                  if (!mode) return;
                  if (mode === 'relative') {
                    onUpdate({ ...card, timeRange: { mode: 'relative', weeks: 4 } });
                  } else {
                    const today = new Date().toISOString().slice(0, 10);
                    const sixWeeksAgo = new Date(Date.now() - 42 * 86_400_000).toISOString().slice(0, 10);
                    onUpdate({ ...card, timeRange: { mode: 'absolute', startDate: sixWeeksAgo, endDate: today } });
                  }
                }}
              >
                <ToggleButton value="relative" size="small">Last N weeks</ToggleButton>
                <ToggleButton value="absolute" size="small">Date range</ToggleButton>
              </ToggleButtonGroup>

              <FormControl size="small" fullWidth>
                <InputLabel>Weeks</InputLabel>
                <Select
                  label="Weeks"
                  value={card.timeRange.weeks}
                  onChange={e => onUpdate({ ...card, timeRange: { mode: 'relative', weeks: Number(e.target.value) as RelativeWeeks } })}
                >
                  {RELATIVE_WEEK_OPTIONS.map(n => (
                    <MenuItem key={n} value={n}>Last {n} week{n > 1 ? 's' : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: isWideCard ? 'minmax(0, 1fr) minmax(0, 1.2fr)' : '1fr',
                gap: 1,
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={card.timeRange.mode}
                fullWidth
                onChange={(_e, mode: string | null) => {
                  if (!mode) return;
                  if (mode === 'relative') {
                    onUpdate({ ...card, timeRange: { mode: 'relative', weeks: 4 } });
                  } else {
                    const today = new Date().toISOString().slice(0, 10);
                    const sixWeeksAgo = new Date(Date.now() - 42 * 86_400_000).toISOString().slice(0, 10);
                    onUpdate({ ...card, timeRange: { mode: 'absolute', startDate: sixWeeksAgo, endDate: today } });
                  }
                }}
              >
                <ToggleButton value="relative" size="small">Last N weeks</ToggleButton>
                <ToggleButton value="absolute" size="small">Date range</ToggleButton>
              </ToggleButtonGroup>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isWideCard ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
                  gap: 1,
                }}
              >
                <TextField
                  label="Start date"
                  type="date"
                  size="small"
                  fullWidth
                  value={card.timeRange.startDate}
                  onChange={e => {
                    if (card.timeRange.mode === 'absolute') {
                      onUpdate({ ...card, timeRange: { ...card.timeRange, startDate: e.target.value } });
                    }
                  }}
                  slotProps={{ htmlInput: { max: card.timeRange.endDate } }}
                />
                <TextField
                  label="End date"
                  type="date"
                  size="small"
                  fullWidth
                  value={card.timeRange.endDate}
                  onChange={e => {
                    if (card.timeRange.mode === 'absolute') {
                      onUpdate({ ...card, timeRange: { ...card.timeRange, endDate: e.target.value } });
                    }
                  }}
                  slotProps={{ htmlInput: { min: card.timeRange.startDate } }}
                />
              </Box>
            </Box>
          )}

          <DataVizChartCard
            card={card}
            gridColumn="1 / -1"
            mode="editor-preview"
            withPaper={false}
          />
        </Stack>
      </Paper>
    </Box>
  );
}

// ─── Add card menu ────────────────────────────────────────────────────────────

interface AddCardMenuProps {
  hasPhotos: boolean;
  hasMetrics: boolean;
  hasWorkouts: boolean;
  atCardLimit: boolean;
  onAddCustom: () => void;
  onAddSystem: (systemType: SystemCard['systemType']) => void;
  onAddDataViz: () => void;
}

function AddCardMenu({ hasPhotos, hasMetrics, hasWorkouts, atCardLimit, onAddCustom, onAddSystem, onAddDataViz }: AddCardMenuProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const systemTypes: { type: SystemCard['systemType']; label: string; has: boolean }[] = [
    { type: 'photos',   label: 'Progress photos',    has: hasPhotos },
    { type: 'metrics',  label: 'Weekly metrics',     has: hasMetrics },
    { type: 'workouts', label: 'Training', has: hasWorkouts },
  ];

  return (
    <>
      <Button
        startIcon={<AddIcon />}
        onClick={e => setAnchor(e.currentTarget)}
        disabled={atCardLimit}
        variant="outlined"
        size="small"
      >
        Add card
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onAddCustom(); setAnchor(null); }}>
          Custom card
        </MenuItem>
        <MenuItem onClick={() => { onAddDataViz(); setAnchor(null); }}>
          Data Visualisation
        </MenuItem>
        <Divider />
        {systemTypes.map(({ type, label, has }) => (
          <MenuItem
            key={type}
            disabled={has}
            onClick={() => { onAddSystem(type); setAnchor(null); }}
          >
            {label}
            {has && (
              <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                (already added)
              </Typography>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ─── Template preview modal ───────────────────────────────────────────────────

interface TemplatePreviewProps {
  cards: CheckInCard[];
  onClose: () => void;
}

function TemplatePreview({ cards, onClose }: TemplatePreviewProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [previewResponses, setPreviewResponses] = useState<CustomCheckInResponses>({});
  const [metricsExpandedByCardId, setMetricsExpandedByCardId] = useState<Record<string, boolean>>(() =>
    cards.reduce<Record<string, boolean>>((acc, card) => {
      if (card.kind === 'system' && card.systemType === 'metrics') {
        acc[card.id] = card.columnSpan === 2;
      }
      return acc;
    }, {})
  );

  const isMobile = device === 'mobile';
  const template: CheckInTemplate = { version: 2, cards };
  const allFields = getAllInputFields(template);

  useEffect(() => {
    const hidden = allFields.filter(f => !isFieldVisible(f, previewResponses));
    if (hidden.some(f => previewResponses[f.id] !== undefined)) {
      setPreviewResponses(prev => {
        const next = { ...prev };
        hidden.forEach(f => { delete next[f.id]; });
        return next;
      });
    }
  }, [previewResponses, allFields]);

  useEffect(() => {
    setMetricsExpandedByCardId(
      cards.reduce<Record<string, boolean>>((acc, card) => {
        if (card.kind === 'system' && card.systemType === 'metrics') {
          acc[card.id] = card.columnSpan === 2;
        }
        return acc;
      }, {})
    );
  }, [cards]);

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen
      slotProps={{ paper: { sx: { bgcolor: 'background.default', height: HEIGHT_EXC_APPBAR , pt: 5} } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6">Preview</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={device}
            onChange={(_e, v) => { if (v) setDevice(v as 'mobile' | 'desktop'); }}
          >
            <ToggleButton value="mobile" aria-label="Mobile view">
              <PhoneAndroidIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value="desktop" aria-label="Desktop view">
              <DesktopWindowsIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={onClose} aria-label="Close preview" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'auto' }}>
        <Box
          sx={{
            px: 3,
            py: 3,
          }}
        >
          <Box
            sx={{
              mx: 'auto',
              width: '100%',
              maxWidth: device === 'mobile' ? 430 : 1200,
              display: 'flex',
              justifyContent: 'center',
              transition: 'max-width 300ms ease',
            }}
          >
            <Box
              component={isMobile ? Paper : 'div'}
              elevation={isMobile ? 12 : undefined}
              sx={{
                width: '100%',
                maxWidth: device === 'mobile' ? 390 : '100%',
                px: device === 'mobile' ? 2 : 0,
                py: device === 'mobile' ? 2 : 0,
                borderRadius: device === 'mobile' ? 2 : 0,
                bgcolor: device === 'mobile' ? 'background.paper' : 'transparent',
              }}
            >
              {cards.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No cards to preview.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 2 }}>
                  {cards.map(card => {
                    const metricsExpanded = card.kind === 'system' && card.systemType === 'metrics'
                      ? (metricsExpandedByCardId[card.id] ?? card.columnSpan === 2)
                      : undefined;
                    const desktopSpan = card.kind === 'system' && card.systemType === 'metrics'
                      ? (metricsExpanded ? 2 : 1)
                      : card.columnSpan;
                    const gridColumn = isMobile ? '1 / -1' : `span ${desktopSpan}`;

                    // Custom cards with all fields hidden — show placeholder (preview-only UX)
                    if (card.kind === 'custom' && card.fields.length > 0) {
                      const visibleFields = card.fields.filter(f => isFieldVisible(f, previewResponses));
                      if (visibleFields.length === 0) {
                        return (
                          <Paper key={card.id} variant="outlined" sx={{ gridColumn, p: 2, borderRadius: 2, opacity: 0.4 }}>
                            {card.title && <Typography variant="subtitle2" sx={{ mb: 1 }}>{card.title}</Typography>}
                            <Typography variant="caption" color="text.disabled">
                              All fields hidden by conditions
                            </Typography>
                          </Paper>
                        );
                      }
                    }

                    return (
                      <TemplateCardRenderer
                        key={card.id}
                        card={card}
                        gridColumn={gridColumn}
                        // No systemData — renders placeholder for system cards
                        responses={previewResponses}
                        onResponseChange={(fieldId, value) => setPreviewResponses(r => ({ ...r, [fieldId]: value }))}
                        // No clientId — preview shows coach's own data for dataviz cards
                        systemPreviewInteractive
                        datavizPreviewInteractive
                        forceMobileLayout={isMobile}
                        metricsExpanded={metricsExpanded}
                        onMetricsExpandedChange={next =>
                          setMetricsExpandedByCardId(prev => ({ ...prev, [card.id]: next }))
                        }
                      />
                    );
                  })}
                </Box>
              )}

              {cards.length > 0 && (
                <Button variant="contained" fullWidth disabled size="large" sx={{ mt: 3 }}>
                  Submit Check-in
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

function ensureUniqueCardIds(cards: CheckInCard[]): CheckInCard[] {
  const seen = new Set<string>();
  return cards.map(card => {
    if (!seen.has(card.id)) {
      seen.add(card.id);
      return card;
    }
    const id = crypto.randomUUID();
    seen.add(id);
    return { ...card, id };
  });
}

export default function CheckInTemplateEditor() {
  const [cards, setCards] = useState<CheckInCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const cardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor),
  );

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coach/check-in-template');
      if (!res.ok) throw new Error('Failed to load template');
      const data = await res.json() as { template: CheckInTemplate | null };
      setCards(ensureUniqueCardIds(data.template?.cards ?? makeDefaultCards()));
    } catch {
      setError('Could not load your check-in template.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTemplate(); }, [loadTemplate]);

  function handleCardDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCards(cs => {
        const oldIdx = cs.findIndex(c => c.id === active.id);
        const newIdx = cs.findIndex(c => c.id === over.id);
        return arrayMove(cs, oldIdx, newIdx);
      });
    }
  }

  function addCustomCard() {
    setCards(cs => [...cs, { kind: 'custom', id: crypto.randomUUID(), columnSpan: 1, fields: [] }]);
  }

  function addSystemCard(systemType: SystemCard['systemType']) {
    setCards(cs => [...cs, { kind: 'system', id: crypto.randomUUID(), systemType, columnSpan: systemType === 'photos' ? 2 : 1 }]);
  }

  function addDataVizCard() {
    const card: DataVizCard = {
      kind: 'dataviz',
      id: crypto.randomUUID(),
      metric: 'weight',
      timeRange: { mode: 'relative', weeks: 2 },
      columnSpan: 1,
    };
    setCards(cs => [...cs, card]);
  }

  function updateCardAt(index: number, updated: CheckInCard) {
    setCards(cs => {
      if (index < 0 || index >= cs.length) return cs;
      return cs.map((c, i) => i === index ? updated : c);
    });
  }

  function removeCardAt(index: number) {
    setCards(cs => {
      if (index < 0 || index >= cs.length) return cs;
      return cs.filter((_c, i) => i !== index);
    });
  }

  async function handleSave() {
    setError(null);
    const template: CheckInTemplate = { version: 2, cards };

    if (cards.length > 0) {
      const validationError = validateTemplate(template);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setSaving(true);
    try {
      const res = cards.length === 0
        ? await fetch('/api/coach/check-in-template', { method: 'DELETE' })
        : await fetch('/api/coach/check-in-template', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template }),
        });

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to save template');
      }
      setSavedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  const allInputFields = getAllInputFields({ version: 2, cards });
  const atFieldLimit   = allInputFields.length >= MAX_TEMPLATE_FIELDS;
  const atCardLimit    = cards.length >= MAX_TEMPLATE_CARDS;

  const hasPhotos   = cards.some(c => c.kind === 'system' && c.systemType === 'photos');
  const hasMetrics  = cards.some(c => c.kind === 'system' && c.systemType === 'metrics');
  const hasWorkouts = cards.some(c => c.kind === 'system' && c.systemType === 'workouts');

  if (loading) {
    return (
      <Box sx={{ pt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 2 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Button size="small" variant="text" onClick={() => setCards(makeDefaultCards())}>
          Start from default check-in
        </Button>
        {cards.length > 0 && (
          <Button size="small" variant="text" color="error" onClick={() => setCards([])}>
            Clear all
          </Button>
        )}
      </Box>

      {cards.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No cards yet. Add cards below, or start from the default check-in.
        </Typography>
      ) : (
        <DndContext id="cards-dnd" sensors={cardSensors} collisionDetection={closestCenter} onDragEnd={handleCardDragEnd}>
          <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 2, mb: 2, height: '100%' }}>
              <AnimatePresence initial={false}>
                {cards.map((card, cardIndex) => {
                  return (
                    <MotionBox
                      key={card.id}
                      layout
                      sx={{ gridColumn: `span ${card.columnSpan}`, minWidth: 0 }}
                      initial={{opacity: 0, scale: 0.97}}
                      animate={{opacity: 1, scale: 1}}
                      exit={{opacity: 0, scale: 0.97}}
                      transition={{duration: 0.15}}
                    >
                      {card.kind === 'system' ? (
                        <SortableSystemCard
                          card={card}
                          onUpdate={updated => updateCardAt(cardIndex, updated)}
                          onRemove={() => removeCardAt(cardIndex)}
                        />
                      ) : card.kind === 'dataviz' ? (
                        <SortableDataVizCard
                          card={card}
                          onUpdate={updated => updateCardAt(cardIndex, updated)}
                          onRemove={() => removeCardAt(cardIndex)}
                        />
                      ) : (
                        <SortableCustomCard
                          card={card}
                          allInputFields={allInputFields}
                          atFieldLimit={atFieldLimit}
                          onUpdate={updated => updateCardAt(cardIndex, updated)}
                          onRemove={() => removeCardAt(cardIndex)}
                        />
                      )}
                    </MotionBox>
                  )
                })}
              </AnimatePresence>
            </Box>
          </SortableContext>
        </DndContext>
      )}

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        <AddCardMenu
          hasPhotos={hasPhotos}
          hasMetrics={hasMetrics}
          hasWorkouts={hasWorkouts}
          atCardLimit={atCardLimit}
          onAddCustom={addCustomCard}
          onAddSystem={addSystemCard}
          onAddDataViz={addDataVizCard}
        />
        {atCardLimit && (
          <Typography variant="caption" color="text.secondary">
            Maximum of {MAX_TEMPLATE_CARDS} cards reached.
          </Typography>
        )}
        {atFieldLimit && (
          <Typography variant="caption" color="text.secondary">
            Maximum of {MAX_TEMPLATE_FIELDS} input fields reached.
          </Typography>
        )}
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {cards.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => setPreviewOpen(true)}
            sx={{ flex: 1 }}
          >
            Preview
          </Button>
        )}
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={{ flex: 1 }}
        >
          {cards.length === 0 ? 'Remove Template (use default form)' : 'Save Template'}
        </Button>
      </Box>

      {savedAt && !saving && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Last saved:{' '}
          {savedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' at '}
          {savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      )}

      {previewOpen && (
        <TemplatePreview cards={cards} onClose={() => setPreviewOpen(false)} />
      )}
    </Box>
  );
}

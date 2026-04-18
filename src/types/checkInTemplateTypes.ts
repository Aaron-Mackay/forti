// Types for coach-customisable check-in templates.
// A template replaces the default hardcoded check-in form.
// null template → legacy form is shown.
//
// v2 model: fields are grouped into cards.
//   SystemCard  — pre-defined atomic block (photos, metrics, workouts); no editable fields
//   CustomCard  — coach-defined; contains input fields (rating, text, textarea)
// v1 → v2 migration is applied transparently on read via parseCheckInTemplate.

// ─── Conditional branching ────────────────────────────────────────────────────

export type RatingOperator = 'eq' | 'neq' | 'lte' | 'gte';
export type TextOperator = 'answered' | 'not_answered';

/** Show THIS field only if a rating field satisfies a numeric condition. */
export interface RatingCondition {
  fieldId: string;
  operator: RatingOperator;
  value: number;
}

/** Show THIS field only if a text/textarea field was answered or left blank. */
export interface TextCondition {
  fieldId: string;
  operator: TextOperator;
}

export type ConditionRule = RatingCondition | TextCondition;

const RATING_OPERATORS = new Set<string>(['eq', 'neq', 'lte', 'gte']);
const TEXT_OPERATORS   = new Set<string>(['answered', 'not_answered']);

// ─── Input field interfaces ───────────────────────────────────────────────────
// Only these four types live inside CustomCard.fields.
// photos / metrics / workouts are now SystemCard types, not field types.

export interface CheckInRatingField {
  id: string;
  type: 'rating';
  label: string;
  description?: string;
  minScale: number;  // always 1
  maxScale: number;  // 2–10
  minLabel?: string;
  maxLabel?: string;
  required?: boolean;
  showIf?: ConditionRule;
}

export interface CheckInTextField {
  id: string;
  type: 'text';
  label: string;
  description?: string;
  required?: boolean;
  showIf?: ConditionRule;
}

export interface CheckInTextareaField {
  id: string;
  type: 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  showIf?: ConditionRule;
}

export interface CheckInYesNoField {
  id: string;
  type: 'yesno';
  label: string;
  description?: string;
  required?: boolean;
  showIf?: ConditionRule;
}

export type CheckInInputField =
  | CheckInRatingField
  | CheckInTextField
  | CheckInTextareaField
  | CheckInYesNoField;

// ─── Card interfaces ──────────────────────────────────────────────────────────

/** Pre-defined system block — renders existing app data at the coach-chosen position. */
export interface SystemCard {
  kind: 'system';
  id: string;
  systemType: 'photos' | 'metrics' | 'workouts';
  columnSpan: 1 | 2;  // desktop grid column span; xs always full-width
}

/** Coach-defined card containing input fields. */
export interface CustomCard {
  kind: 'custom';
  id: string;
  title?: string;
  columnSpan: 1 | 2;
  fields: CheckInInputField[];  // always stack vertically within the card
}

export type CheckInCard = SystemCard | CustomCard;

// ─── Template ─────────────────────────────────────────────────────────────────

export interface CheckInTemplate {
  version: 2;
  cards: CheckInCard[];
}

// Stored in WeeklyCheckIn.customResponses: field ID → value (input fields only)
export type CustomCheckInResponses = Record<string, string | number | null>;

// ─── Validation constants ────────────────────────────────────────────────────

export const MAX_TEMPLATE_FIELDS = 20;  // total input fields across all custom cards
export const MAX_TEMPLATE_CARDS  = 20;
export const MAX_RATING_SCALE    = 10;
export const MIN_RATING_SCALE    = 2;

// ─── Utility helpers ─────────────────────────────────────────────────────────

/** Flatten all input fields from all custom cards in order. */
export function getAllInputFields(template: CheckInTemplate): CheckInInputField[] {
  return template.cards
    .filter((c): c is CustomCard => c.kind === 'custom')
    .flatMap(c => c.fields);
}

// ─── Default template (mirrors the existing hardcoded legacy check-in) ────────

export const DEFAULT_TEMPLATE: CheckInTemplate = {
  version: 2,
  cards: [
    { id: 'default-metrics',  kind: 'system', systemType: 'metrics',  columnSpan: 1 },
    { id: 'default-workouts', kind: 'system', systemType: 'workouts', columnSpan: 1 },
    { id: 'default-photos',   kind: 'system', systemType: 'photos',   columnSpan: 2 },
    {
      id: 'default-wellbeing', kind: 'custom', title: 'How was your week?', columnSpan: 1,
      fields: [
        { id: 'default-energy',    type: 'rating', label: 'Energy level',               minScale: 1, maxScale: 5 },
        { id: 'default-mood',      type: 'rating', label: 'Mood / Motivation',          minScale: 1, maxScale: 5 },
        { id: 'default-stress',    type: 'rating', label: 'Stress level',               minScale: 1, maxScale: 5 },
        { id: 'default-sleep',     type: 'rating', label: 'Sleep quality (subjective)', minScale: 1, maxScale: 5 },
        { id: 'default-recovery',  type: 'rating', label: 'Recovery between sessions',  minScale: 1, maxScale: 5 },
        { id: 'default-adherence', type: 'rating', label: 'Adherence to plan',          minScale: 1, maxScale: 5 },
      ],
    },
    {
      id: 'default-reflection', kind: 'custom', title: 'Reflection', columnSpan: 1,
      fields: [
        { id: 'default-review',  type: 'textarea', label: 'How did your week go overall?' },
        { id: 'default-goals',   type: 'textarea', label: 'Goals / focus for next week' },
        { id: 'default-message', type: 'textarea', label: 'Message to your coach (optional)' },
      ],
    },
  ],
};

/** Return a copy of the default template with fresh UUIDs (safe for multiple coaches). */
export function makeDefaultCards(): CheckInCard[] {
  return DEFAULT_TEMPLATE.cards.map(card =>
    card.kind === 'system'
      ? { ...card, id: crypto.randomUUID() }
      : {
          ...card,
          id: crypto.randomUUID(),
          fields: card.fields.map(f => ({ ...f, id: crypto.randomUUID() })),
        },
  );
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseConditionRule(raw: unknown, fieldId: string): ConditionRule | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const c = raw as Record<string, unknown>;
  if (typeof c.fieldId !== 'string' || !c.fieldId) return undefined;
  if (c.fieldId === fieldId) return undefined; // self-reference not allowed
  if (typeof c.operator !== 'string') return undefined;

  if (RATING_OPERATORS.has(c.operator)) {
    if (typeof c.value !== 'number') return undefined;
    return { fieldId: c.fieldId, operator: c.operator as RatingOperator, value: c.value };
  }
  if (TEXT_OPERATORS.has(c.operator)) {
    return { fieldId: c.fieldId, operator: c.operator as TextOperator };
  }
  return undefined;
}

function parseInputField(raw: unknown): CheckInInputField | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== 'string' || !f.id) return null;
  if (typeof f.label !== 'string' || !f.label) return null;

  const showIf = parseConditionRule(f.showIf, f.id as string);

  switch (f.type) {
    case 'rating': {
      const min = typeof f.minScale === 'number' ? f.minScale : 1;
      const max = typeof f.maxScale === 'number' ? f.maxScale : 5;
      if (min !== 1) return null;
      if (max < MIN_RATING_SCALE || max > MAX_RATING_SCALE) return null;
      const field: CheckInRatingField = {
        id: f.id as string, type: 'rating', label: f.label as string, minScale: min, maxScale: max,
      };
      if (typeof f.description === 'string') field.description = f.description;
      if (typeof f.minLabel === 'string')    field.minLabel = f.minLabel;
      if (typeof f.maxLabel === 'string')    field.maxLabel = f.maxLabel;
      if (typeof f.required === 'boolean')   field.required = f.required;
      if (showIf) field.showIf = showIf;
      return field;
    }
    case 'text': {
      const field: CheckInTextField = { id: f.id as string, type: 'text', label: f.label as string };
      if (typeof f.description === 'string') field.description = f.description;
      if (typeof f.required === 'boolean')   field.required = f.required;
      if (showIf) field.showIf = showIf;
      return field;
    }
    case 'textarea': {
      const field: CheckInTextareaField = { id: f.id as string, type: 'textarea', label: f.label as string };
      if (typeof f.description === 'string') field.description = f.description;
      if (typeof f.required === 'boolean')   field.required = f.required;
      if (showIf) field.showIf = showIf;
      return field;
    }
    case 'yesno': {
      const field: CheckInYesNoField = { id: f.id as string, type: 'yesno', label: f.label as string };
      if (typeof f.description === 'string') field.description = f.description;
      if (typeof f.required === 'boolean')   field.required = f.required;
      if (showIf) field.showIf = showIf;
      return field;
    }
    default:
      return null; // photos / metrics / workouts are now system card types
  }
}

function parseColumnSpan(raw: unknown): 1 | 2 {
  return raw === 2 ? 2 : 1;
}

function parseCustomCard(raw: Record<string, unknown>): CustomCard | null {
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (!Array.isArray(raw.fields)) return null;

  const fields: CheckInInputField[] = [];
  for (const item of raw.fields) {
    const field = parseInputField(item);
    if (field) fields.push(field);
  }

  const card: CustomCard = {
    kind: 'custom',
    id: raw.id as string,
    columnSpan: parseColumnSpan(raw.columnSpan),
    fields,
  };
  if (typeof raw.title === 'string' && raw.title) card.title = raw.title;
  return card;
}

function parseSystemCard(raw: Record<string, unknown>): SystemCard | null {
  if (typeof raw.id !== 'string' || !raw.id) return null;
  if (raw.systemType !== 'photos' && raw.systemType !== 'metrics' && raw.systemType !== 'workouts') return null;
  return {
    kind: 'system',
    id: raw.id as string,
    systemType: raw.systemType as SystemCard['systemType'],
    columnSpan: parseColumnSpan(raw.columnSpan),
  };
}

/** Auto-migrate a v1 template (flat fields[]) to v2 cards.
 *  photos/metrics/workouts fields → SystemCard; input fields → single-field CustomCard. */
export function migrateV1Template(raw: { version: 1; fields: unknown[] }): CheckInTemplate {
  const photosUsed   = new Set<string>();
  const metricsUsed  = new Set<string>();
  const workoutsUsed = new Set<string>();
  const cards: CheckInCard[] = [];

  for (const item of raw.fields) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const f = item as Record<string, unknown>;
    if (typeof f.id !== 'string' || !f.id) continue;

    if (f.type === 'photos' && photosUsed.size === 0) {
      photosUsed.add(f.id as string);
      cards.push({ kind: 'system', id: crypto.randomUUID(), systemType: 'photos', columnSpan: 2 });
    } else if (f.type === 'metrics' && metricsUsed.size === 0) {
      metricsUsed.add(f.id as string);
      cards.push({ kind: 'system', id: crypto.randomUUID(), systemType: 'metrics', columnSpan: 1 });
    } else if (f.type === 'workouts' && workoutsUsed.size === 0) {
      workoutsUsed.add(f.id as string);
      cards.push({ kind: 'system', id: crypto.randomUUID(), systemType: 'workouts', columnSpan: 1 });
    } else {
      const field = parseInputField(item);
      if (field) {
        cards.push({ kind: 'custom', id: crypto.randomUUID(), columnSpan: 1, fields: [field] });
      }
    }
  }

  return { version: 2, cards };
}

/** Defensively parse a Prisma JsonValue into a CheckInTemplate or null.
 *  Transparently migrates v1 templates to v2 on read. */
export function parseCheckInTemplate(raw: unknown): CheckInTemplate | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const t = raw as Record<string, unknown>;

  // v1 migration path
  if (t.version === 1 && Array.isArray(t.fields)) {
    return migrateV1Template(t as { version: 1; fields: unknown[] });
  }

  // v2 parse path
  if (t.version !== 2) return null;
  if (!Array.isArray(t.cards)) return null;

  const cards: CheckInCard[] = [];
  let photosCount   = 0;
  let metricsCount  = 0;
  let workoutsCount = 0;
  let totalFields   = 0;

  for (const rawCard of t.cards) {
    if (!rawCard || typeof rawCard !== 'object' || Array.isArray(rawCard)) continue;
    const c = rawCard as Record<string, unknown>;

    if (c.kind === 'system') {
      const card = parseSystemCard(c);
      if (!card) continue;
      if (card.systemType === 'photos')   { photosCount++;   if (photosCount   > 1) continue; }
      if (card.systemType === 'metrics')  { metricsCount++;  if (metricsCount  > 1) continue; }
      if (card.systemType === 'workouts') { workoutsCount++; if (workoutsCount > 1) continue; }
      cards.push(card);
    } else if (c.kind === 'custom') {
      const card = parseCustomCard(c);
      if (!card) continue;
      // Cap total input fields across all custom cards
      if (totalFields + card.fields.length > MAX_TEMPLATE_FIELDS) {
        const allowed = MAX_TEMPLATE_FIELDS - totalFields;
        if (allowed <= 0) continue;
        card.fields = card.fields.slice(0, allowed);
      }
      totalFields += card.fields.length;
      cards.push(card);
    }
    // Unknown kind — skip

    if (cards.length >= MAX_TEMPLATE_CARDS) break;
  }

  return { version: 2, cards };
}

/** Defensively parse a Prisma JsonValue into CustomCheckInResponses. */
export function parseCustomResponses(raw: unknown): CustomCheckInResponses {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: CustomCheckInResponses = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key) continue;
    if (typeof val === 'string' || typeof val === 'number' || val === null) {
      result[key] = val;
    }
  }
  return result;
}

/** Evaluate whether an input field should be visible given current responses. */
export function isFieldVisible(
  field: CheckInInputField,
  responses: CustomCheckInResponses,
): boolean {
  if (!field.showIf) return true;
  const { fieldId, operator } = field.showIf;
  const val = responses[fieldId];
  if (operator === 'answered')     return val !== null && val !== undefined && val !== '';
  if (operator === 'not_answered') return val === null || val === undefined || val === '';
  // Rating operators
  if (typeof val !== 'number') return false;
  const { value } = field.showIf as RatingCondition;
  if (operator === 'eq')  return val === value;
  if (operator === 'neq') return val !== value;
  if (operator === 'lte') return val <= value;
  if (operator === 'gte') return val >= value;
  return true;
}

/** Validate a CheckInTemplate for the PUT API endpoint. Returns an error string or null. */
export function validateTemplate(template: CheckInTemplate): string | null {
  if (template.version !== 2) return 'Invalid template version';
  if (!Array.isArray(template.cards)) return 'cards must be an array';
  if (template.cards.length > MAX_TEMPLATE_CARDS) {
    return `Template may not exceed ${MAX_TEMPLATE_CARDS} cards`;
  }

  // Build id→type map for showIf cross-validation (input fields only)
  const fieldTypes = new Map<string, CheckInInputField['type']>();
  let totalFields = 0;
  for (const card of template.cards) {
    if (card.kind === 'custom') {
      for (const field of card.fields) {
        if (typeof field.id === 'string' && field.id) {
          fieldTypes.set(field.id, field.type);
        }
        totalFields++;
      }
    }
  }
  if (totalFields > MAX_TEMPLATE_FIELDS) {
    return `Template may not exceed ${MAX_TEMPLATE_FIELDS} input fields in total`;
  }

  const cardIds    = new Set<string>();
  const fieldIds   = new Set<string>();
  let photosCount   = 0;
  let metricsCount  = 0;
  let workoutsCount = 0;

  for (const card of template.cards) {
    if (!card.id || typeof card.id !== 'string') return 'Each card must have a string id';
    if (cardIds.has(card.id)) return `Duplicate card id: ${card.id}`;
    cardIds.add(card.id);
    if (card.columnSpan !== 1 && card.columnSpan !== 2) {
      return `Card "${card.id}" columnSpan must be 1 or 2`;
    }

    if (card.kind === 'system') {
      if (card.systemType === 'photos')   { photosCount++;   if (photosCount   > 1) return 'Only one photos card is allowed per template'; }
      if (card.systemType === 'metrics')  { metricsCount++;  if (metricsCount  > 1) return 'Only one metrics card is allowed per template'; }
      if (card.systemType === 'workouts') { workoutsCount++; if (workoutsCount > 1) return 'Only one workouts card is allowed per template'; }
    } else if (card.kind === 'custom') {
      if (!Array.isArray(card.fields)) return `Card "${card.id}" fields must be an array`;

      for (const field of card.fields) {
        if (!field.id || typeof field.id !== 'string') return 'Each field must have a string id';
        if (fieldIds.has(field.id)) return `Duplicate field id: ${field.id}`;
        fieldIds.add(field.id);
        if (!field.label || typeof field.label !== 'string') return 'Each field must have a label';

        if (field.type === 'rating') {
          if (field.minScale !== 1) return `Rating field "${field.label}" minScale must be 1`;
          if (field.maxScale < MIN_RATING_SCALE || field.maxScale > MAX_RATING_SCALE) {
            return `Rating field "${field.label}" maxScale must be between ${MIN_RATING_SCALE} and ${MAX_RATING_SCALE}`;
          }
        } else if (field.type !== 'text' && field.type !== 'textarea' && field.type !== 'yesno') {
          return `Unknown input field type: ${String((field as CheckInInputField).type)}`;
        }

        // Validate showIf condition
        if (field.showIf) {
          const cond = field.showIf;
          if (cond.fieldId === field.id) return `Field "${field.label}" cannot reference itself in showIf`;
          const refType = fieldTypes.get(cond.fieldId);
          if (!refType) return `Field "${field.label}" showIf references unknown field id: ${cond.fieldId}`;
          if (RATING_OPERATORS.has(cond.operator) && refType !== 'rating') {
            return `Field "${field.label}" uses a rating operator but references a non-rating field`;
          }
          if (TEXT_OPERATORS.has(cond.operator) && refType !== 'text' && refType !== 'textarea' && refType !== 'yesno') {
            return `Field "${field.label}" uses an answered/not_answered operator but references a non-text field`;
          }
        }
      }
    } else {
      return `Unknown card kind: ${String((card as CheckInCard & { kind: string }).kind)}`;
    }
  }

  return null;
}

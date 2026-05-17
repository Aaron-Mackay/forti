import type {
  CheckInInputField,
  CheckInRatingField,
  CheckInTemplate,
  CustomCheckInResponses,
} from '@/types/checkInTemplateTypes';
import { getAllInputFields, isFieldVisible } from '@/types/checkInTemplateTypes';

function isEmptyValue(value: string | number | null | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function validateFieldValue(
  field: CheckInInputField,
  value: string | number | null | undefined,
): string | null {
  if (field.type === 'rating') {
    if (value === undefined || value === null) return null;
    const ratingField = field as CheckInRatingField;
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < ratingField.minScale ||
      value > ratingField.maxScale
    ) {
      return `"${field.label}" must be an integer between ${ratingField.minScale} and ${ratingField.maxScale}`;
    }
    return null;
  }

  if (field.type === 'yesno') {
    if (value === undefined || value === null) return null;
    if (value !== 'yes' && value !== 'no') {
      return `"${field.label}" must be "yes" or "no"`;
    }
    return null;
  }

  if (value !== undefined && value !== null && typeof value !== 'string') {
    return `"${field.label}" must be a string`;
  }

  return null;
}

export function validateCustomResponsesForDraft(
  responses: CustomCheckInResponses,
  template: CheckInTemplate,
): string | null {
  for (const field of getAllInputFields(template)) {
    const error = validateFieldValue(field, responses[field.id]);
    if (error) return error;
  }
  return null;
}

export function validateCustomResponsesForSubmit(
  responses: CustomCheckInResponses,
  template: CheckInTemplate,
): string | null {
  for (const field of getAllInputFields(template)) {
    if (!isFieldVisible(field, responses)) continue;

    const value = responses[field.id];
    if (field.required && isEmptyValue(value)) {
      return `"${field.label}" is required`;
    }

    const error = validateFieldValue(field, value);
    if (error) return error;
  }

  return null;
}

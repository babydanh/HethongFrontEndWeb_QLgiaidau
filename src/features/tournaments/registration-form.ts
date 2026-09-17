import { trimSpaces } from '@/utils/string';

export type RegistrationFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'EMAIL'
  | 'PHONE'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'FILE';

export interface RegistrationField {
  id: string;
  label: string;
  type: RegistrationFieldType;
  required: boolean;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
  acceptedFileTypes?: string[];
  maxFileSizeMb?: number;
  confidence?: number;
  needsReview?: boolean;
}

export interface RegistrationFormConfig {
  version: 1;
  status: 'DRAFT' | 'PUBLISHED';
  fields: RegistrationField[];
  divisionIds: string[];
}

export const REGISTRATION_MAX_FILE_SIZE_MB = 10;
export const VIETNAMESE_PHONE_PATTERN = /^(?:\+84|0[35789])\d{8}$/;

export const REGISTRATION_FIELD_TYPES: readonly RegistrationFieldType[] = [
  'TEXT',
  'TEXTAREA',
  'EMAIL',
  'PHONE',
  'NUMBER',
  'SELECT',
  'MULTI_SELECT',
  'CHECKBOX',
  'FILE',
];

// Họ tên, số điện thoại và email đã được lấy từ hồ sơ tài khoản ở luồng đăng ký.
// Không tự chèn lại để người chơi không phải nhập trùng; BTC có thể thêm câu hỏi riêng.
export const DEFAULT_REGISTRATION_FIELDS: RegistrationField[] = [];

export function isRegistrationFieldType(value: unknown): value is RegistrationFieldType {
  return typeof value === 'string' && REGISTRATION_FIELD_TYPES.includes(value as RegistrationFieldType);
}

function normalizeOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = Array.from(
    new Set(
      value
        .filter((option): option is string => typeof option === 'string')
        .map((option) => trimSpaces(option))
        .filter(Boolean),
    ),
  );
  return options.length > 0 ? options : undefined;
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function normalizeRegistrationField(field: RegistrationField): RegistrationField {
  const normalized: RegistrationField = {
    ...field,
    label: trimSpaces(field.label),
    required: field.required === true,
    helpText: field.helpText ? trimSpaces(field.helpText) || undefined : undefined,
    options: normalizeOptions(field.options),
    min: normalizeFiniteNumber(field.min),
    max: normalizeFiniteNumber(field.max),
    acceptedFileTypes: field.acceptedFileTypes
      ? Array.from(new Set(field.acceptedFileTypes.map((type) => trimSpaces(type)).filter(Boolean)))
      : undefined,
    maxFileSizeMb: field.type === 'FILE' && normalizeFiniteNumber(field.maxFileSizeMb) !== undefined
      ? Math.min(Math.max(normalizeFiniteNumber(field.maxFileSizeMb) ?? REGISTRATION_MAX_FILE_SIZE_MB, 1), REGISTRATION_MAX_FILE_SIZE_MB)
      : undefined,
  };
  return normalized;
}

export type RegistrationFormValidationError =
  | { code: 'missingLabel'; label: string }
  | { code: 'choiceOptions'; label: string }
  | { code: 'numberRange'; label: string };

export function validateRegistrationFormForPublish(
  config: RegistrationFormConfig,
): RegistrationFormValidationError | null {
  for (const rawField of config.fields) {
    const field = normalizeRegistrationField(rawField);
    if (!field.label) return { code: 'missingLabel', label: rawField.label };
    if (
      (field.type === 'SELECT' || field.type === 'MULTI_SELECT') &&
      (field.options?.length ?? 0) < 2
    ) {
      return { code: 'choiceOptions', label: field.label };
    }
    if (
      field.type === 'NUMBER' &&
      field.min !== undefined &&
      field.max !== undefined &&
      field.min > field.max
    ) {
      return { code: 'numberRange', label: field.label };
    }
  }
  return null;
}

export function normalizeRegistrationResponses(
  responses: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(responses).map(([fieldId, value]) => {
      if (typeof value === 'string') {
        const normalized = trimSpaces(value);
        return [fieldId, normalized || undefined];
      }
      if (Array.isArray(value)) {
        return [
          fieldId,
          value
            .map((item) => (typeof item === 'string' ? trimSpaces(item) : item))
            .filter((item) => item !== ''),
        ];
      }
      return [fieldId, value];
    }),
  );
}

export function readRegistrationFormConfig(raw: unknown, divisionIds: string[]): RegistrationFormConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { version: 1, status: 'DRAFT', fields: DEFAULT_REGISTRATION_FIELDS, divisionIds };
  }
  const value = raw as Partial<RegistrationFormConfig>;
  const rawFields: unknown = value.fields;
  const fields = Array.isArray(rawFields)
    ? rawFields
      .filter((field): field is Record<string, unknown> => Boolean(field && typeof field === 'object' && !Array.isArray(field)))
      .filter((field) => typeof field.id === 'string' && typeof field.label === 'string' && isRegistrationFieldType(field.type))
      .map((field): RegistrationField => ({
        id: field.id as string,
        label: trimSpaces(field.label as string),
        type: field.type as RegistrationFieldType,
        required: field.required === true,
        helpText: typeof field.helpText === 'string' ? field.helpText : undefined,
        options: normalizeOptions(field.options),
        min: normalizeFiniteNumber(field.min),
        max: normalizeFiniteNumber(field.max),
        acceptedFileTypes: Array.isArray(field.acceptedFileTypes)
          ? Array.from(new Set(field.acceptedFileTypes
            .filter((type): type is string => typeof type === 'string')
            .map((type) => trimSpaces(type))
            .filter(Boolean)))
          : undefined,
        maxFileSizeMb: field.type === 'FILE' && normalizeFiniteNumber(field.maxFileSizeMb) !== undefined
          ? Math.min(Math.max(normalizeFiniteNumber(field.maxFileSizeMb) ?? REGISTRATION_MAX_FILE_SIZE_MB, 1), REGISTRATION_MAX_FILE_SIZE_MB)
          : undefined,
        confidence: typeof field.confidence === 'number' ? field.confidence : undefined,
        needsReview: field.needsReview === true,
      }))
    : DEFAULT_REGISTRATION_FIELDS;
  return {
    version: 1,
    status: value.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    fields: fields.length > 0 ? fields : DEFAULT_REGISTRATION_FIELDS,
    divisionIds: Array.isArray(value.divisionIds) ? value.divisionIds.filter((id): id is string => typeof id === 'string') : divisionIds,
  };
}

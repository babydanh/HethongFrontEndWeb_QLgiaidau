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

function isRegistrationFieldType(value: unknown): value is RegistrationFieldType {
  return typeof value === 'string' && REGISTRATION_FIELD_TYPES.includes(value as RegistrationFieldType);
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
        label: field.label as string,
        type: field.type as RegistrationFieldType,
        required: field.required === true,
        helpText: typeof field.helpText === 'string' ? field.helpText : undefined,
        options: Array.isArray(field.options) ? field.options.filter((option): option is string => typeof option === 'string') : undefined,
        min: typeof field.min === 'number' ? field.min : undefined,
        max: typeof field.max === 'number' ? field.max : undefined,
        acceptedFileTypes: Array.isArray(field.acceptedFileTypes) ? field.acceptedFileTypes.filter((type): type is string => typeof type === 'string') : undefined,
        maxFileSizeMb: typeof field.maxFileSizeMb === 'number' ? field.maxFileSizeMb : undefined,
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

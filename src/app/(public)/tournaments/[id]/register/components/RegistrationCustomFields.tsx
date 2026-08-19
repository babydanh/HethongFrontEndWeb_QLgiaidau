'use client';

import { useTranslations } from 'next-intl';
import type { RegistrationField } from '@/features/tournaments/registration-form';

interface Props {
  fields: RegistrationField[];
  responses: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
}

type RegistrationTranslate = (key: string, values?: Record<string, string | number>) => string;

export function validateRegistrationResponses(fields: RegistrationField[], responses: Record<string, unknown>, translate?: RegistrationTranslate): string | null {
  for (const field of fields) {
    const value = responses[field.id];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (field.required && empty) return translate?.('fieldRequired', { label: field.label }) ?? `Please complete “${field.label}”.`;
    if (empty) continue;
    if (field.type === 'EMAIL' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) return translate?.('emailInvalid', { label: field.label }) ?? `“${field.label}” must be a valid email.`;
    if (field.type === 'NUMBER') {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) return translate?.('numberInvalid', { label: field.label }) ?? `“${field.label}” must be a number.`;
      if (field.min !== undefined && numberValue < field.min) return translate?.('numberBelowMinimum', { label: field.label, min: field.min }) ?? `“${field.label}” cannot be less than ${field.min}.`;
      if (field.max !== undefined && numberValue > field.max) return translate?.('numberAboveMaximum', { label: field.label, max: field.max }) ?? `“${field.label}” cannot be greater than ${field.max}.`;
    }
    if (field.type === 'SELECT' && field.options?.length && !field.options.includes(String(value))) return translate?.('invalidSelect', { label: field.label }) ?? `Please choose a valid value for “${field.label}”.`;
    if (field.type === 'MULTI_SELECT' && field.options?.length && (!Array.isArray(value) || value.some((item) => !field.options?.includes(String(item))))) return translate?.('invalidMultiSelect', { label: field.label }) ?? `Please choose valid values for “${field.label}”.`;
    if (field.type === 'CHECKBOX' && value !== true) return translate?.('checkboxRequired', { label: field.label }) ?? `You must confirm “${field.label}”.`;
  }
  return null;
}

export default function RegistrationCustomFields({ fields, responses, onChange }: Props) {
  const registrationTranslate = useTranslations('TournamentRegistration');
  if (fields.length === 0) return null;

  return (
    <section className="mb-6 space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5 transition-all">
      <div className="border-b border-blue-200/50 pb-2.5">
        <h3 className="text-sm font-bold text-slate-900">{registrationTranslate('customFieldsTitle')}</h3>
        <p className="mt-0.5 text-xs text-slate-500">{registrationTranslate('customFieldsDescription')}</p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => {
          const value = responses[field.id];
          const label = (
            <span className="block text-xs font-bold text-slate-700">
              {field.label}
              {field.required && <span className="ml-1 text-rose-500">*</span>}
            </span>
          );

          if (field.type === 'CHECKBOX') {
            return (
              <label key={field.id} className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-700 bg-white/60 p-2.5 rounded-lg border border-slate-200/60 hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  checked={value === true}
                  onChange={(event) => onChange(field.id, event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-blue-600 cursor-pointer"
                />
                <span className="font-semibold">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</span>
              </label>
            );
          }

          if (field.type === 'SELECT') {
            return (
              <label key={field.id} className="block space-y-1">
                {label}
                <select
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => onChange(field.id, event.target.value || undefined)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-medium text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">{registrationTranslate('selectOptionPlaceholder')}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {field.helpText && <span className="block text-[11px] text-slate-500 font-normal">{field.helpText}</span>}
              </label>
            );
          }

          if (field.type === 'MULTI_SELECT') {
            return (
              <fieldset key={field.id} className="space-y-2 bg-white/60 p-3 rounded-lg border border-slate-200/60">
                {label}
                {field.helpText && <p className="text-[11px] text-slate-500">{field.helpText}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {(field.options ?? []).map((option) => {
                    const selected = Array.isArray(value) && value.includes(option);
                    return (
                      <label key={option} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 bg-white p-2 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => {
                            const current = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
                            onChange(field.id, event.target.checked ? [...current, option] : current.filter((item) => item !== option));
                          }}
                          className="h-4 w-4 shrink-0 rounded accent-blue-600 cursor-pointer"
                        />
                        <span className="truncate">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          }

          if (field.type === 'FILE') {
            return (
              <label key={field.id} className="block space-y-1">
                {label}
                <input
                  type="file"
                  accept={field.acceptedFileTypes?.join(',') || undefined}
                  onChange={(event) => onChange(field.id, event.target.files?.[0]?.name || undefined)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {field.helpText && <span className="block text-[11px] text-slate-500 font-normal">{field.helpText}</span>}
                <span className="block text-[11px] text-slate-400 font-medium">
                  {field.maxFileSizeMb ? registrationTranslate('maxFileSize', { size: field.maxFileSizeMb }) : registrationTranslate('attachmentFallback')}
                </span>
              </label>
            );
          }

          if (field.type === 'TEXTAREA') {
            return (
              <label key={field.id} className="block space-y-1">
                {label}
                <textarea
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => onChange(field.id, event.target.value)}
                  placeholder={field.helpText}
                  className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </label>
            );
          }

          return (
            <label key={field.id} className="block space-y-1">
              {label}
              <input
                type={field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : field.type === 'PHONE' ? 'tel' : 'text'}
                value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                onChange={(event) => onChange(field.id, event.target.value || undefined)}
                min={field.min}
                max={field.max}
                placeholder={field.helpText}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

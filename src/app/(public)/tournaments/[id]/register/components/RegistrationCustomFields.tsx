'use client';

import type { RegistrationField } from '@/features/tournaments/registration-form';

interface Props {
  fields: RegistrationField[];
  responses: Record<string, unknown>;
  onChange: (fieldId: string, value: unknown) => void;
}

export function validateRegistrationResponses(fields: RegistrationField[], responses: Record<string, unknown>): string | null {
  for (const field of fields) {
    const value = responses[field.id];
    const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
    if (field.required && empty) return `Vui lòng điền “${field.label}”.`;
    if (empty) continue;
    if (field.type === 'EMAIL' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) return `“${field.label}” phải là email hợp lệ.`;
    if (field.type === 'NUMBER') {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) return `“${field.label}” phải là số.`;
      if (field.min !== undefined && numberValue < field.min) return `“${field.label}” không được nhỏ hơn ${field.min}.`;
      if (field.max !== undefined && numberValue > field.max) return `“${field.label}” không được lớn hơn ${field.max}.`;
    }
    if (field.type === 'SELECT' && field.options?.length && !field.options.includes(String(value))) return `Vui lòng chọn một giá trị hợp lệ cho “${field.label}”.`;
    if (field.type === 'CHECKBOX' && value !== true) return `Bạn cần xác nhận “${field.label}”.`;
  }
  return null;
}

export default function RegistrationCustomFields({ fields, responses, onChange }: Props) {
  if (fields.length === 0) return null;
  return <section className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
    <div><h3 className="text-sm font-bold text-slate-900">Thông tin đăng ký bổ sung</h3><p className="mt-1 text-xs text-slate-500">Ban tổ chức yêu cầu các thông tin dưới đây cho nội dung bạn đã chọn.</p></div>
    <div className="space-y-3">
      {fields.map((field) => {
        const value = responses[field.id];
        const label = <span className="text-xs font-semibold text-slate-700">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</span>;
        if (field.type === 'CHECKBOX') return <label key={field.id} className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={value === true} onChange={(event) => onChange(field.id, event.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />{label}</label>;
        if (field.type === 'SELECT') return <label key={field.id} className="block">{label}<select value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(field.id, event.target.value || undefined)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Chọn một lựa chọn</option>{(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select>{field.helpText && <span className="mt-1 block text-[11px] text-slate-500">{field.helpText}</span>}</label>;
        if (field.type === 'TEXTAREA') return <label key={field.id} className="block">{label}<textarea value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(field.id, event.target.value)} placeholder={field.helpText} className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label>;
        return <label key={field.id} className="block">{label}<input type={field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : field.type === 'PHONE' ? 'tel' : 'text'} value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''} onChange={(event) => onChange(field.id, event.target.value || undefined)} min={field.min} max={field.max} placeholder={field.helpText} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />{field.helpText && <span className="mt-1 block text-[11px] text-slate-500">{field.helpText}</span>}</label>;
      })}
    </div>
  </section>;
}

'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, GripVertical, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { getErrorMessage } from '@/utils/error';
import { cn } from '@/utils/cn';
import { tournamentsApi, type Division } from '@/features/tournaments/api';
import type { Tournament } from '@/types/tournament';
import {
  readRegistrationFormConfig,
  REGISTRATION_FIELD_TYPE_LABELS,
  type RegistrationField,
  type RegistrationFieldType,
  type RegistrationFormConfig,
} from '@/features/tournaments/registration-form';

interface RegistrationFormBuilderProps {
  tournament: Tournament;
  divisions: Division[];
}

const createField = (): RegistrationField => ({
  id: `custom_${Date.now()}`,
  label: 'Câu hỏi mới',
  type: 'TEXT',
  required: false,
});

export function RegistrationFormBuilder({ tournament, divisions }: RegistrationFormBuilderProps) {
  const initial = useMemo(() => readRegistrationFormConfig(tournament.tournamentConfig?.registrationForm, divisions.map((division) => division.id)), [divisions, tournament.tournamentConfig?.registrationForm]);
  const [config, setConfig] = useState<RegistrationFormConfig>(initial);
  const [isOpen, setIsOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isLocked = Boolean(tournament.isRegistrationLocked) || ['REGISTRATION_CLOSED', 'IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(tournament.status);

  const updateField = (fieldId: string, patch: Partial<RegistrationField>) => {
    setConfig((current) => ({ ...current, fields: current.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field) }));
  };
  const moveField = (fieldId: string, direction: -1 | 1) => {
    setConfig((current) => {
      const index = current.fields.findIndex((field) => field.id === fieldId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.fields.length) return current;
      const fields = [...current.fields];
      [fields[index], fields[nextIndex]] = [fields[nextIndex], fields[index]];
      return { ...current, fields };
    });
  };
  const duplicateField = (fieldId: string) => {
    setConfig((current) => {
      const index = current.fields.findIndex((field) => field.id === fieldId);
      if (index < 0) return current;
      const source = current.fields[index];
      const duplicate: RegistrationField = { ...source, id: `${source.id}_copy_${Date.now()}`, label: `${source.label} (bản sao)`, options: source.options ? [...source.options] : undefined };
      const fields = [...current.fields];
      fields.splice(index + 1, 0, duplicate);
      return { ...current, fields };
    });
  };
  const save = async (status: RegistrationFormConfig['status'] = 'DRAFT') => {
    if (config.fields.some((field) => !field.label.trim())) {
      toast.error('Mỗi trường phải có tên hiển thị.');
      return;
    }
    setIsSaving(true);
    try {
      const nextConfig = { ...config, status, divisionIds: config.divisionIds.length > 0 ? config.divisionIds : divisions.map((division) => division.id), fields: config.fields.map((field) => ({ ...field, label: field.label.trim(), helpText: field.helpText?.trim() || undefined })) };
      await tournamentsApi.updateTournament(tournament.id, { tournamentConfig: { ...(tournament.tournamentConfig ?? {}), registrationForm: nextConfig } });
      setConfig(nextConfig);
      toast.success(status === 'PUBLISHED' ? 'Đã công bố form đăng ký.' : 'Đã lưu bản nháp form đăng ký.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Form đăng ký tùy chỉnh</p>
            <p className="mt-1 text-xs text-slate-500">Thiết lập câu hỏi, điều kiện và thông tin cần thu theo từng nội dung thi đấu.</p>
          </div>
          <Button type="button" onClick={() => setIsOpen(true)} disabled={isLocked} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <Settings2 className="h-4 w-4" /> Thiết lập form
          </Button>
        </div>
        {isLocked && <p className="mt-3 text-xs font-semibold text-amber-700">Form đã khóa vì danh sách đăng ký hoặc giải đấu đã chốt. Hãy mở một phiên bản mới nếu cần thay đổi.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{config.fields.length} trường</span>
          <span className={cn('rounded-full border px-2.5 py-1', config.status === 'PUBLISHED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>{config.status === 'PUBLISHED' ? 'Đang sử dụng' : 'Bản nháp'}</span>
        </div>
      </section>

      {isOpen && (
        <Modal open={isOpen} onOpenChange={setIsOpen}>
          <ModalContent className="max-h-[92vh] max-w-5xl overflow-y-auto bg-slate-50 p-0">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <ModalHeader><ModalTitle className="text-lg font-bold">Thiết lập form đăng ký</ModalTitle></ModalHeader>
              <p className="mt-1 text-xs text-slate-500">Cách dùng giống Google Forms: thêm trường, đặt bắt buộc và xem trước ngay.</p>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Áp dụng cho nội dung thi đấu</p>
                  <p className="mt-1 text-xs text-slate-500">Chọn một hoặc nhiều nội dung. Nếu không chọn, form sẽ áp dụng cho tất cả.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {divisions.map((division) => {
                      const selected = config.divisionIds.includes(division.id);
                      return <button key={division.id} type="button" onClick={() => setConfig((current) => ({ ...current, divisionIds: selected ? current.divisionIds.filter((id) => id !== division.id) : [...current.divisionIds, division.id] }))} className={cn('rounded-lg border px-3 py-2 text-xs font-semibold transition-colors', selected ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300')}>{selected && <Check className="mr-1 inline h-3.5 w-3.5" />}{division.name}</button>;
                    })}
                  </div>
                </div>
                {config.fields.map((field, index) => (
                  <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div><p className="text-sm font-bold text-slate-900">{field.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{REGISTRATION_FIELD_TYPE_LABELS[field.type]}{field.required ? ' · Bắt buộc' : ' · Không bắt buộc'}</p></div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => moveField(field.id, -1)} disabled={index === 0} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Đưa lên"><ChevronUp className="h-4 w-4" /></button>
                            <button type="button" onClick={() => moveField(field.id, 1)} disabled={index === config.fields.length - 1} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Đưa xuống"><ChevronDown className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setEditingFieldId(field.id)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50" aria-label="Sửa trường"><Settings2 className="h-4 w-4" /></button>
                            <button type="button" onClick={() => duplicateField(field.id)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Nhân bản trường"><Copy className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setConfig((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id) }))} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Xóa trường"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                        {field.helpText && <p className="mt-2 text-xs text-slate-500">{field.helpText}</p>}
                        {editingFieldId === field.id && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                          <label className="block text-xs font-semibold text-slate-700">Tên câu hỏi<input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" autoFocus /></label>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-slate-700">Loại trường<select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as RegistrationFieldType })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">{Object.entries(REGISTRATION_FIELD_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                            <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={field.required} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> Bắt buộc trả lời</label>
                          </div>
                          <label className="block text-xs font-semibold text-slate-700">Mô tả hướng dẫn<textarea value={field.helpText ?? ''} onChange={(event) => updateField(field.id, { helpText: event.target.value })} className="mt-1.5 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Hướng dẫn hoặc điều kiện cho người đăng ký" /></label>
                          {(field.type === 'SELECT' || field.type === 'MULTI_SELECT') && <label className="block text-xs font-semibold text-slate-700">Các lựa chọn, mỗi dòng một lựa chọn<textarea value={(field.options ?? []).join('\n')} onChange={(event) => updateField(field.id, { options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>}
                          {field.type === 'NUMBER' && <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-semibold text-slate-700">Tối thiểu<input type="number" value={field.min ?? ''} onChange={(event) => updateField(field.id, { min: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Tối đa<input type="number" value={field.max ?? ''} onChange={(event) => updateField(field.id, { max: event.target.value === '' ? undefined : Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></label></div>}
                          <button type="button" onClick={() => setEditingFieldId(null)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Thu gọn</button>
                        </div>}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => { const field = createField(); setConfig((current) => ({ ...current, fields: [...current.fields, field] })); setEditingFieldId(field.id); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"><Plus className="h-4 w-4" /> Thêm trường</button>
              </div>
              <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Xem trước</p>
                <h3 className="mt-2 text-base font-bold text-slate-900">{tournament.name}</h3>
                <div className="mt-4 space-y-3">{config.fields.map((field) => <div key={field.id}><label className="text-xs font-semibold text-slate-700">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</label>{field.type === 'TEXTAREA' ? <textarea className="mt-1 min-h-16 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" placeholder={field.helpText} /> : field.type === 'CHECKBOX' ? <label className="mt-1 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" /> Tôi đồng ý</label> : <input className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs" type={field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : 'text'} placeholder={field.helpText} />}</div>)}</div>
              </aside>
            </div>
            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
              <Button type="button" variant="outline" onClick={() => save('DRAFT')} disabled={isSaving}><Save className="mr-1.5 h-4 w-4" /> Lưu nháp</Button>
              <Button type="button" onClick={() => save('PUBLISHED')} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700"><Check className="mr-1.5 h-4 w-4" /> Dùng form này</Button>
            </div>
          </ModalContent>
        </Modal>
      )}

    </>
  );
}

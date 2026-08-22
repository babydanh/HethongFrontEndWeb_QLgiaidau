'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileUp,
  GripVertical,
  HelpCircle,
  ListPlus,
  Plus,
  Save,
  Settings2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/Modal';
import { getErrorMessage } from '@/utils/error';
import { cn } from '@/utils/cn';
import { tournamentsApi, type Division } from '@/features/tournaments/api';
import type { Tournament } from '@/types/tournament';
import {
  readRegistrationFormConfig,
  REGISTRATION_FIELD_TYPES,
  type RegistrationField,
  type RegistrationFieldType,
  type RegistrationFormConfig,
} from '@/features/tournaments/registration-form';

interface RegistrationFormBuilderProps {
  tournament: Tournament;
  divisions: Division[];
}

const createField = (label: string): RegistrationField => ({
  id: `custom_${Date.now()}`,
  label,
  type: 'TEXT',
  required: false,
});

const fieldTypeLabelKey: Record<RegistrationFieldType, 'fieldText' | 'fieldTextarea' | 'fieldEmail' | 'fieldPhone' | 'fieldNumber' | 'fieldSelect' | 'fieldMultiSelect' | 'fieldCheckbox' | 'fieldFile'> = {
  TEXT: 'fieldText',
  TEXTAREA: 'fieldTextarea',
  EMAIL: 'fieldEmail',
  PHONE: 'fieldPhone',
  NUMBER: 'fieldNumber',
  SELECT: 'fieldSelect',
  MULTI_SELECT: 'fieldMultiSelect',
  CHECKBOX: 'fieldCheckbox',
  FILE: 'fieldFile',
};

const FILE_TYPE_PRESETS = [
  { labelKey: 'fileImagePreset', value: 'image/*' },
  { labelKey: 'fileDocumentPreset', value: '.pdf,.doc,.docx' },
  { labelKey: 'fileSpreadsheetPreset', value: '.xlsx,.xls,.csv' },
] as const;

export function RegistrationFormBuilder({ tournament, divisions }: RegistrationFormBuilderProps) {
  const registrationFormTranslate = useTranslations('OrganizerRegistrationForm');
  const initial = useMemo(() => readRegistrationFormConfig(tournament.tournamentConfig?.registrationForm, divisions.map((division) => division.id)), [divisions, tournament.tournamentConfig?.registrationForm]);
  const [config, setConfig] = useState<RegistrationFormConfig>(initial);
  const [isOpen, setIsOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  const isLocked = Boolean(tournament.isRegistrationLocked) || ['REGISTRATION_CLOSED', 'IN_PROGRESS', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(tournament.status);

  // Kiểm tra xem giải có nội dung đánh đôi hay đồng đội không để hiển thị preview thông tin mặc định phù hợp
  const hasDoublesOrTeam = useMemo(() => {
    const categorySlug = tournament.category?.slug?.toLowerCase() || '';
    const isTeam = categorySlug.includes('football') || categorySlug.includes('bong-da');
    const hasDoublesDivision = divisions.some(
      (d) => d.matchType === 'DOUBLES' || d.matchType === 'MIXED_DOUBLES'
    );
    return isTeam || hasDoublesDivision;
  }, [divisions, tournament.category?.slug]);

  const updateField = (fieldId: string, patch: Partial<RegistrationField>) => {
    setConfig((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
    }));
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
      const duplicate: RegistrationField = {
        ...source,
        id: `${source.id}_copy_${Date.now()}`,
        label: `${source.label} (${registrationFormTranslate('duplicateSuffix')})`,
        options: source.options ? [...source.options] : undefined,
        acceptedFileTypes: source.acceptedFileTypes ? [...source.acceptedFileTypes] : undefined,
      };
      const fields = [...current.fields];
      fields.splice(index + 1, 0, duplicate);
      return { ...current, fields };
    });
  };

  const addOptionToField = (fieldId: string) => {
    const text = (newOptionInputs[fieldId] ?? '').trim();
    if (!text) return;
    const targetField = config.fields.find((f) => f.id === fieldId);
    const existing = targetField?.options ?? [];
    if (!existing.includes(text)) {
      updateField(fieldId, { options: [...existing, text] });
    }
    setNewOptionInputs((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const removeOptionFromField = (fieldId: string, optionIndex: number) => {
    const targetField = config.fields.find((f) => f.id === fieldId);
    if (!targetField?.options) return;
    const nextOptions = targetField.options.filter((_, idx) => idx !== optionIndex);
    updateField(fieldId, { options: nextOptions });
  };

  const save = async (status: RegistrationFormConfig['status'] = 'DRAFT') => {
    if (config.fields.some((field) => !field.label.trim())) {
      toast.error(registrationFormTranslate('requiredValidation'));
      return;
    }
    setIsSaving(true);
    try {
      const nextConfig = {
        ...config,
        status,
        divisionIds: config.divisionIds.length > 0 ? config.divisionIds : divisions.map((division) => division.id),
        fields: config.fields.map((field) => ({
          ...field,
          label: field.label.trim(),
          helpText: field.helpText?.trim() || undefined,
        })),
      };
      await tournamentsApi.updateTournament(tournament.id, {
        tournamentConfig: { ...(tournament.tournamentConfig ?? {}), registrationForm: nextConfig },
      });
      setConfig(nextConfig);
      toast.success(status === 'PUBLISHED' ? registrationFormTranslate('publishedSaved') : registrationFormTranslate('draftSaved'));
      if (status === 'PUBLISHED') {
        setIsOpen(false);
      }
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
            <p className="text-sm font-bold text-slate-900">{registrationFormTranslate('title')}</p>
            <p className="mt-1 text-xs text-slate-500">{registrationFormTranslate('description')}</p>
          </div>
          <Button
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={isLocked}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Settings2 className="h-4 w-4" /> {registrationFormTranslate('setupForm')}
          </Button>
        </div>
        {isLocked && <p className="mt-3 text-xs font-semibold text-amber-700">{registrationFormTranslate('lockedMessage')}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            {registrationFormTranslate('fieldCount', { count: config.fields.length })}
          </span>
          <span
            className={cn(
              'rounded-full border px-2.5 py-1',
              config.status === 'PUBLISHED'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            )}
          >
            {config.status === 'PUBLISHED' ? registrationFormTranslate('inUse') : registrationFormTranslate('draft')}
          </span>
        </div>
      </section>

      {isOpen && (
        <Modal open={isOpen} onOpenChange={setIsOpen}>
          <ModalContent className="max-h-[92vh] max-w-5xl overflow-y-auto bg-slate-50 p-0">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
              <ModalHeader>
                <ModalTitle className="text-lg font-bold">{registrationFormTranslate('modalTitle')}</ModalTitle>
              </ModalHeader>
              <p className="mt-1 text-xs text-slate-500">{registrationFormTranslate('modalDescription')}</p>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_340px]">
              {/* Left Column: Form Builder / Configuration */}
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {registrationFormTranslate('applyToDivisions')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{registrationFormTranslate('applyToDivisionsHint')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {divisions.map((division) => {
                      const selected = config.divisionIds.includes(division.id);
                      return (
                        <button
                          key={division.id}
                          type="button"
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              divisionIds: selected
                                ? current.divisionIds.filter((id) => id !== division.id)
                                : [...current.divisionIds, division.id],
                            }))
                          }
                          className={cn(
                            'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                            selected
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                          )}
                        >
                          {selected && <Check className="mr-1 inline h-3.5 w-3.5" />}
                          {division.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {config.fields.map((field, index) => {
                  const isEditing = editingFieldId === field.id;
                  return (
                    <div
                      key={field.id}
                      className={cn(
                        'rounded-xl border bg-white p-4 shadow-sm transition-all',
                        isEditing ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-slate-900">{field.label || registrationFormTranslate('unnamedQuestion')}</p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {registrationFormTranslate(fieldTypeLabelKey[field.type])}
                                {field.required ? ` · ${registrationFormTranslate('required')}` : ` · ${registrationFormTranslate('notRequired')}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveField(field.id, -1)}
                                disabled={index === 0}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                                aria-label={registrationFormTranslate('moveUp')}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveField(field.id, 1)}
                                disabled={index === config.fields.length - 1}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                                aria-label={registrationFormTranslate('moveDown')}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                                className={cn('rounded-md p-1.5 transition-colors', isEditing ? 'bg-blue-100 text-blue-700' : 'text-blue-600 hover:bg-blue-50')}
                                aria-label={registrationFormTranslate('editField')}
                              >
                                <Settings2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateField(field.id)}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                                aria-label={registrationFormTranslate('duplicateField')}
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfig((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id) }))}
                                className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"
                                aria-label={registrationFormTranslate('deleteField')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {field.helpText && <p className="mt-1.5 text-xs text-slate-500">{field.helpText}</p>}

                          {/* Chi tiết chỉnh sửa dạng Google Forms */}
                          {isEditing && (
                            <div className="mt-4 space-y-3.5 border-t border-slate-100 pt-4">
                              <label className="block text-xs font-semibold text-slate-700">
                                {registrationFormTranslate('questionName')}
                                <input
                                  value={field.label}
                                  onChange={(event) => updateField(field.id, { label: event.target.value })}
                                  placeholder={registrationFormTranslate('questionNamePlaceholder')}
                                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                                  autoFocus
                                />
                              </label>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-semibold text-slate-700">
                                  {registrationFormTranslate('fieldType')}
                                  <select
                                    value={field.type}
                                    onChange={(event) => {
                                      const nextType = event.target.value as RegistrationFieldType;
                                      updateField(field.id, {
                                        type: nextType,
                                        options: (nextType === 'SELECT' || nextType === 'MULTI_SELECT') && !field.options?.length
                                          ? [registrationFormTranslate('choiceOption', { number: 1 }), registrationFormTranslate('choiceOption', { number: 2 })]
                                          : field.options,
                                      });
                                    }}
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
                                  >
                                    {REGISTRATION_FIELD_TYPES.map((value) => (
                                      <option key={value} value={value}>
                                        {registrationFormTranslate(fieldTypeLabelKey[value])}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="flex items-center gap-2 pt-6 text-xs font-semibold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(event) => updateField(field.id, { required: event.target.checked })}
                                    className="h-4 w-4 rounded accent-blue-600"
                                  />
                                  {registrationFormTranslate('requiredAnswer')}
                                </label>
                              </div>

                              <label className="block text-xs font-semibold text-slate-700">
                                {registrationFormTranslate('helpText')}
                                <input
                                  value={field.helpText ?? ''}
                                  onChange={(event) => updateField(field.id, { helpText: event.target.value })}
                                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs focus:border-blue-500 focus:outline-none"
                                  placeholder={registrationFormTranslate('helpPlaceholder')}
                                />
                              </label>

                              {/* Thiết lập danh sách lựa chọn trực quan */}
                              {(field.type === 'SELECT' || field.type === 'MULTI_SELECT') && (
                                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <span className="text-xs font-bold text-slate-700">{registrationFormTranslate('choiceOptionsTitle')}</span>
                                      <p className="mt-0.5 text-[11px] text-slate-500">
                                        {field.type === 'SELECT'
                                          ? registrationFormTranslate('singleChoiceHint')
                                          : registrationFormTranslate('multiChoiceHint')}
                                      </p>
                                    </div>
                                    <span className={cn(
                                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                      field.type === 'SELECT'
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-violet-50 text-violet-700'
                                    )}>
                                      {field.type === 'SELECT'
                                        ? registrationFormTranslate('singleChoiceBadge')
                                        : registrationFormTranslate('multiChoiceBadge')}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {(field.options ?? []).map((option, optIdx) => (
                                      <div key={optIdx} className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 w-4">{optIdx + 1}.</span>
                                        <input
                                          value={option}
                                          onChange={(e) => {
                                            const next = [...(field.options ?? [])];
                                            next[optIdx] = e.target.value;
                                            updateField(field.id, { options: next });
                                          }}
                                          className="h-8 flex-1 rounded border border-slate-300 bg-white px-2.5 text-xs focus:border-blue-500 focus:outline-none"
                                          placeholder={registrationFormTranslate('choiceOption', { number: optIdx + 1 })}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeOptionFromField(field.id, optIdx)}
                                          className="p-1 text-slate-400 hover:text-rose-500"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <input
                                      value={newOptionInputs[field.id] ?? ''}
                                      onChange={(e) => setNewOptionInputs((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addOptionToField(field.id);
                                        }
                                      }}
                                      placeholder={registrationFormTranslate('addOptionPlaceholder')}
                                      className="h-8 flex-1 rounded border border-dashed border-slate-300 bg-white px-2.5 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addOptionToField(field.id)}
                                      className="h-8 text-xs font-semibold"
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> {registrationFormTranslate('addOption')}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Thiết lập File upload */}
                              {field.type === 'FILE' && (
                                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs">
                                  <p className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <UploadCloud className="h-4 w-4 text-blue-600" /> {registrationFormTranslate('fileUploadSettings')}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                    {FILE_TYPE_PRESETS.map((preset) => {
                                      const isChecked = field.acceptedFileTypes?.includes(preset.value) ?? false;
                                      return (
                                        <label key={preset.value} className="flex items-center gap-2 font-medium text-slate-700 bg-white p-2 rounded border border-slate-200">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const current = field.acceptedFileTypes ?? [];
                                              const next = e.target.checked
                                                ? [...current, preset.value]
                                                : current.filter((v) => v !== preset.value);
                                              updateField(field.id, { acceptedFileTypes: next.length > 0 ? next : undefined });
                                            }}
                                            className="h-3.5 w-3.5 rounded accent-blue-600"
                                          />
                                          <span>{registrationFormTranslate(preset.labelKey)}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center gap-2 pt-1.5">
                                    <span className="text-slate-600">{registrationFormTranslate('maxFileSize')}</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={20}
                                      value={field.maxFileSizeMb ?? 10}
                                      onChange={(e) => updateField(field.id, { maxFileSizeMb: Number(e.target.value) || 10 })}
                                      className="h-8 w-20 rounded border border-slate-300 bg-white px-2 text-xs font-semibold text-center focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Thiết lập Number limit */}
                              {field.type === 'NUMBER' && (
                                <div className="grid grid-cols-2 gap-3">
                                  <label className="block text-xs font-semibold text-slate-700">
                                    {registrationFormTranslate('minimum')}
                                    <input
                                      type="number"
                                      value={field.min ?? ''}
                                      onChange={(event) =>
                                        updateField(field.id, {
                                          min: event.target.value === '' ? undefined : Number(event.target.value),
                                        })
                                      }
                                      className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs"
                                    />
                                  </label>
                                  <label className="block text-xs font-semibold text-slate-700">
                                    {registrationFormTranslate('maximum')}
                                    <input
                                      type="number"
                                      value={field.max ?? ''}
                                      onChange={(event) =>
                                        updateField(field.id, {
                                          max: event.target.value === '' ? undefined : Number(event.target.value),
                                        })
                                      }
                                      className="mt-1.5 h-9 w-full rounded-lg border border-slate-300 px-3 text-xs"
                                    />
                                  </label>
                                </div>
                              )}

                              <div className="flex justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingFieldId(null)}
                                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                                >
                                  {registrationFormTranslate('collapse')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    const field = createField(registrationFormTranslate('newQuestion'));
                    setConfig((current) => ({ ...current, fields: [...current.fields, field] }));
                    setEditingFieldId(field.id);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4" /> {registrationFormTranslate('addField')}
                </button>
              </div>

              {/* Right Column: Dynamic Realtime Preview */}
              <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {registrationFormTranslate('preview')}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {registrationFormTranslate('athleteInterface')}
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-bold text-slate-900 line-clamp-2">{tournament.name}</h3>

                {/* Thông tin mặc định từ hệ thống */}
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 space-y-1.5 text-[11px] text-slate-500">
                  <p className="font-bold text-slate-700 text-[11px]">{registrationFormTranslate('systemDefaultInfo')}</p>
                  <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                    <span>{registrationFormTranslate('athleteFullName')}</span>
                    <span className="font-semibold text-slate-700">{registrationFormTranslate('fromProfile')}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                    <span>{registrationFormTranslate('emailAndPhone')}</span>
                    <span className="font-semibold text-slate-700">{registrationFormTranslate('linkedAccount')}</span>
                  </div>
                  {hasDoublesOrTeam && (
                    <div className="flex justify-between py-0.5">
                      <span>{registrationFormTranslate('partnerOrTeam')}</span>
                      <span className="font-semibold text-blue-600">{registrationFormTranslate('choosePartner')}</span>
                    </div>
                  )}
                </div>

                {/* Các câu hỏi tùy chỉnh do BTC thêm với giao diện thực tế */}
                {config.fields.length > 0 && (
                  <div className="mt-4 space-y-3.5 border-t border-slate-100 pt-3">
                    <p className="font-bold text-slate-700 text-xs flex items-center justify-between">
                      <span>{registrationFormTranslate('additionalQuestions')}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{registrationFormTranslate('questionCount', { count: config.fields.length })}</span>
                    </p>

                    {config.fields.map((field) => (
                      <div key={field.id} className="space-y-1 text-xs">
                        <label className="font-semibold text-slate-700 block">
                          {field.label || registrationFormTranslate('unnamedQuestionShort')}
                          {field.required && <span className="ml-1 text-rose-500">*</span>}
                        </label>
                        {field.helpText && <p className="text-[10px] text-slate-400">{field.helpText}</p>}

                        {/* Switch case render tương ứng 100% với giao diện VĐV */}
                        {field.type === 'TEXTAREA' ? (
                          <textarea
                            disabled
                            className="min-h-14 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-400 cursor-not-allowed resize-none"
                            placeholder={field.helpText || registrationFormTranslate('answerPlaceholder')}
                          />
                        ) : field.type === 'CHECKBOX' ? (
                          <label className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                            <input type="checkbox" disabled className="rounded accent-blue-600" />
                            <span>{field.label || registrationFormTranslate('agree')}</span>
                          </label>
                        ) : field.type === 'SELECT' ? (
                          <fieldset className="space-y-1.5 rounded-lg border border-blue-100 bg-blue-50/40 p-2">
                            <legend className="px-1 text-[10px] font-bold text-blue-700">
                              {registrationFormTranslate('singleChoiceInstruction')}
                            </legend>
                            {(field.options && field.options.length > 0 ? field.options : [registrationFormTranslate('choiceOption', { number: 1 }), registrationFormTranslate('choiceOption', { number: 2 })]).map((opt, i) => (
                              <label key={i} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700">
                                <input type="radio" name={`preview-${field.id}`} disabled className="h-3.5 w-3.5 accent-blue-600" />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </fieldset>
                        ) : field.type === 'MULTI_SELECT' ? (
                          <fieldset className="space-y-1.5 rounded-lg border border-violet-100 bg-violet-50/40 p-2">
                            <legend className="px-1 text-[10px] font-bold text-violet-700">
                              {registrationFormTranslate('multiChoiceInstruction')}
                            </legend>
                            {(field.options && field.options.length > 0 ? field.options : [registrationFormTranslate('choiceOption', { number: 1 }), registrationFormTranslate('choiceOption', { number: 2 })]).map((opt, i) => (
                              <label key={i} className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-700">
                                <input type="checkbox" disabled className="h-3.5 w-3.5 rounded accent-violet-600" />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </fieldset>
                        ) : field.type === 'FILE' ? (
                          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-2.5 text-center">
                            <FileUp className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                            <p className="text-[11px] font-semibold text-blue-700">{registrationFormTranslate('uploadFileOrImage')}</p>
                            <p className="text-[9px] text-slate-400">{registrationFormTranslate('maximumFileSize', { size: field.maxFileSizeMb ?? 10 })}</p>
                          </div>
                        ) : (
                          <input
                            disabled
                            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-400 cursor-not-allowed"
                            type={field.type === 'EMAIL' ? 'email' : field.type === 'NUMBER' ? 'number' : 'text'}
                            placeholder={field.helpText || registrationFormTranslate('answerPlaceholder')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>

            <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {registrationFormTranslate('close')}
              </Button>
              <Button type="button" variant="outline" onClick={() => save('DRAFT')} disabled={isSaving}>
                <Save className="mr-1.5 h-4 w-4" /> {registrationFormTranslate('saveDraft')}
              </Button>
              <Button
                type="button"
                onClick={() => save('PUBLISHED')}
                disabled={isSaving}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Check className="mr-1.5 h-4 w-4" /> {registrationFormTranslate('useForm')}
              </Button>
            </div>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

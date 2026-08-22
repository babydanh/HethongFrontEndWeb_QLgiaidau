'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Region } from '@/features/regions/api';
import { useTranslations } from 'next-intl';

interface SearchableRegionSelectProps {
  value: string;
  options: Region[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  inputName?: string;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN')
    .trim();

const labelOf = (region: Region) => region.fullName || region.name;

export function SearchableRegionSelect({
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  error,
  className = '',
  inputName,
}: SearchableRegionSelectProps) {
  const translate = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = options.find((option) => option.code === value);
  const selectedLabel = selected ? labelOf(selected) : '';

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    return [...options]
      .sort((a, b) => normalize(labelOf(a)).localeCompare(normalize(labelOf(b)), 'vi-VN'))
      .filter((option) => !normalizedQuery || normalize(labelOf(option)).includes(normalizedQuery));
  }, [options, query]);

  const openMenu = () => {
    if (disabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setQuery('');
    setOpen(true);
  };

  const closeMenu = () => {
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setQuery('');
    }, 120);
  };

  const selectOption = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm transition focus-within:ring-2 ${
          error
            ? 'border-rose-500 focus-within:ring-rose-500/20'
            : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-blue-500/20'
        } ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-400' : ''}`}
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          name={inputName}
          value={open ? query : selectedLabel}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={openMenu}
          onBlur={closeMenu}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
            if (event.key === 'Enter' && filteredOptions.length > 0) {
              event.preventDefault();
              selectOption(filteredOptions[0].code);
            }
          }}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        {value && !disabled ? (
          <button
            type="button"
            aria-label={translate('regionClearSelection')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectOption('')}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </div>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {filteredOptions.length > 0 ? filteredOptions.map((option) => {
            const optionLabel = labelOf(option);
            const isSelected = option.code === value;
            return (
              <button
                key={option.code}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option.code)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{optionLabel}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          }) : (
            <p className="px-3 py-3 text-sm text-slate-500">{translate('noMatchingRegions')}</p>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

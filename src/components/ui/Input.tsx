import * as React from "react"
import { cn } from "@/utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, label, ...props }, ref) => {
    return (
      <div className="w-full relative flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
            error && "border-rose-500 focus-visible:ring-red-500 focus-visible:border-rose-500",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="absolute -bottom-5 text-xs font-medium text-rose-500 left-1">{error}</p>
        )}
        </div>
      </div>
    )
  }
)
Input.displayName = "Input";

export interface DateTimePickerProps {
  name?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
}

export const DateTimePicker = React.forwardRef<HTMLInputElement, DateTimePickerProps>(
  ({ name, label, value, onChange, error, className, disabled, min, max }, ref) => {
    const defaultRef = React.useRef<HTMLInputElement>(null);
    const activeRef = (ref as React.RefObject<HTMLInputElement>) || defaultRef;
    const [draft, setDraft] = React.useState('');

    const handleWrapperClick = () => {
      if (disabled) return;
      if (activeRef.current) {
        try {
          activeRef.current.showPicker();
        } catch (err) {
          activeRef.current.focus();
        }
      }
    };

    const formatDateTime = (isoStr: string) => {
      if (!isoStr) return '';
      const parts = isoStr.split('T');
      if (parts.length !== 2) {
        const dateObj = new Date(isoStr);
        if (isNaN(dateObj.getTime())) return '';
        const dayObj = String(dateObj.getDate()).padStart(2, '0');
        const monthObj = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yearObj = dateObj.getFullYear();
        const hoursObj = String(dateObj.getHours()).padStart(2, '0');
        const minutesObj = String(dateObj.getMinutes()).padStart(2, '0');
        return `${dayObj}/${monthObj}/${yearObj} ${hoursObj}:${minutesObj}`;
      }
      const [datePart, timePart] = parts;
      const dateSplit = datePart.split('-');
      if (dateSplit.length !== 3) return isoStr;
      const [year, month, day] = dateSplit;
      const [hours, minutes] = timePart.split(':');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    React.useEffect(() => {
      setDraft(value ? formatDateTime(value) : '');
    }, [value]);

    const parseManualValue = (input: string) => {
      const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
      if (!match) return null;
      const [, day, month, year, hour, minute] = match;
      const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day) || date.getHours() !== Number(hour) || date.getMinutes() !== Number(minute)) return null;
      return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    return (
      <div className="w-full relative flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative w-full flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 transition-colors duration-200",
            disabled && "cursor-not-allowed opacity-50 bg-slate-50",
            error && "border-rose-500 focus-within:ring-red-500 focus-within:border-rose-500",
            className
          )}
        >
          <input
            value={draft}
            disabled={disabled}
            placeholder="dd/mm/yyyy HH:mm"
            onChange={(event) => {
              setDraft(event.target.value);
              const parsed = parseManualValue(event.target.value);
              onChange(parsed ?? '');
            }}
            onBlur={() => {
              if (draft && !parseManualValue(draft)) setDraft(value ? formatDateTime(value) : draft);
            }}
            className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
          <button type="button" aria-label="Mở lịch chọn ngày giờ" disabled={disabled} onClick={handleWrapperClick} className="shrink-0 text-slate-400 hover:text-blue-600 disabled:cursor-not-allowed">
            <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-slate-400 shrink-0"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          
          <input
            type="datetime-local"
            name={name}
            ref={activeRef}
            value={value}
            min={min}
            max={max}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
            />
          </button>
          {error && (
            <p className="absolute -bottom-5 text-xs font-medium text-rose-500 left-1">{error}</p>
          )}
        </div>
      </div>
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";

export interface DatePickerProps {
  name?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ name, label, value, onChange, error, className, disabled }, ref) => {
    const defaultRef = React.useRef<HTMLInputElement>(null);
    const activeRef = (ref as React.RefObject<HTMLInputElement>) || defaultRef;

    const handleWrapperClick = () => {
      if (disabled) return;
      if (activeRef.current) {
        try {
          activeRef.current.showPicker();
        } catch (err) {
          activeRef.current.focus();
        }
      }
    };

    const formatDate = (isoStr: string) => {
      if (!isoStr) return '';
      const parts = isoStr.split('-');
      if (parts.length !== 3) return isoStr;
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    };

    return (
      <div className="w-full relative flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative w-full flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 transition-colors duration-200",
            disabled && "cursor-not-allowed opacity-50 bg-slate-50",
            error && "border-rose-500 focus-within:ring-red-500 focus-within:border-rose-500",
            className
          )}
        >
          <input
            value={formatDate(value)}
            disabled={disabled}
            readOnly
            placeholder="dd/mm/yyyy"
            className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
          <button type="button" aria-label="Mở lịch chọn ngày" disabled={disabled} onClick={handleWrapperClick} className="shrink-0 text-slate-400 hover:text-blue-600 disabled:cursor-not-allowed">
            <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-slate-400 shrink-0"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <input
            type="date"
            name={name}
            ref={activeRef}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
          />
          </button>
          {error && (
            <p className="absolute -bottom-5 text-xs font-medium text-rose-500 left-1">{error}</p>
          )}
        </div>
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";

export { Input, DatePicker }

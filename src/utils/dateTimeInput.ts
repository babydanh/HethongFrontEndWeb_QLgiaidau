/** Convert an API ISO timestamp to a datetime-local value in local time. */
export function toDateTimeLocalValue(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const getVietnamDateTimeParts = (instant: Date): DateTimeParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    return value ? Number(value) : 0;
  };

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
};

const formatUtcPartsAsDateTimeLocal = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

/** Return the current Vietnam wall-clock time as a datetime-local value. */
export function getVietnamCurrentIsoMinute(instant: Date = new Date()): string {
  const parts = getVietnamDateTimeParts(instant);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Round a current Vietnam wall-clock time up to the next exact hour when needed. */
export function getVietnamNextRoundedIsoMinute(instant: Date = new Date()): string {
  const parts = getVietnamDateTimeParts(instant);
  const rounded = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (parts.minute > 0) rounded.setUTCHours(rounded.getUTCHours() + 1);
  rounded.setUTCMinutes(0, 0, 0);
  return formatUtcPartsAsDateTimeLocal(rounded);
}

/** Return Vietnam wall-clock time rounded up to the next exact hour, plus additional hours ahead. Minute is always 00. */
export function getVietnamFutureRoundedHour(hoursAhead: number = 0, instant: Date = new Date()): string {
  const parts = getVietnamDateTimeParts(instant);
  const rounded = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  if (parts.minute > 0) rounded.setUTCHours(rounded.getUTCHours() + 1);
  rounded.setUTCHours(rounded.getUTCHours() + hoursAhead);
  rounded.setUTCMinutes(0, 0, 0);
  return formatUtcPartsAsDateTimeLocal(rounded);
}

/** Serialize a datetime-local value as an absolute API timestamp. */
export function toApiIsoDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toDateLocalValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

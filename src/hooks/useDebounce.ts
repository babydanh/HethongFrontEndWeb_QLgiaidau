import { useEffect, useState } from 'react';

/**
 * Hook to delay the update of a value (useful for search inputs to prevent making API calls on every keystroke)
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

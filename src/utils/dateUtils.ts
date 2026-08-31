/**
 * Universal Date and Time Utility for Live Device & Local System Operations
 */

export function getDeviceLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDeviceLocalMonthStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Converts any ISO timestamp or time string into the user's device Local Time in 12-hour format (e.g., '09:30 AM')
 */
export function formatIsoToLocalTime(
  isoStr?: string | null,
  options?: { includeSeconds?: boolean; use24Hour?: boolean }
): string {
  if (!isoStr || isoStr === '--:--' || isoStr.trim() === '') return '--:--';

  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      // If it's already a HH:mm or HH:mm:ss string
      if (isoStr.includes(':')) {
        return formatTime12h(isoStr);
      }
      return isoStr;
    }

    if (options?.use24Hour) {
      return d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: options.includeSeconds ? '2-digit' : undefined,
        hour12: false,
      });
    }

    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: options?.includeSeconds ? '2-digit' : undefined,
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

/**
 * Converts any Date or ISO timestamp to clean readable local date (e.g., '28 Aug 2026')
 */
export function formatIsoToLocalDate(
  dateInput?: string | Date | null,
  options?: { includeWeekday?: boolean; format?: 'short' | 'long' }
): string {
  if (!dateInput) return '--';

  try {
    // If it's YYYY-MM-DD string, construct safely with local components to avoid UTC shift
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-IN', {
        weekday: options?.includeWeekday ? 'short' : undefined,
        day: 'numeric',
        month: options?.format === 'long' ? 'long' : 'short',
        year: 'numeric',
      });
    }

    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    return d.toLocaleDateString('en-IN', {
      weekday: options?.includeWeekday ? 'short' : undefined,
      day: 'numeric',
      month: options?.format === 'long' ? 'long' : 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Full Date & Time formatter (e.g., '28 Aug 2026, 09:30 AM')
 */
export function formatIsoToLocalDateTime(isoStr?: string | null): string {
  if (!isoStr) return '--';
  const datePart = formatIsoToLocalDate(isoStr);
  const timePart = formatIsoToLocalTime(isoStr);
  if (datePart === '--' && timePart === '--:--') return '--';
  if (timePart === '--:--') return datePart;
  return `${datePart}, ${timePart}`;
}

export function formatTime12h(time24: string): string {
  if (!time24) return '';
  const [hoursStr, minsStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const mins = minsStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
}

export function formatLiveDate(d: Date = new Date()): string {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLiveTime(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function getAvailableMonths(count: number = 6): Array<{ value: string; label: string }> {
  const now = new Date();
  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    months.push({
      value,
      label: i === 0 ? `${label} (Current)` : label,
    });
  }
  return months;
}

/**
 * Normalizes phone numbers to last 10 digits for accurate matching across formats (+91, 0, spaces, etc.)
 */
export function normalizePhone10(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}


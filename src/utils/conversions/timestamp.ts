/**
 * Timestamp conversion utilities
 */

export type TimestampFormat = 'unix' | 'milliseconds' | 'iso' | 'rfc2822' | 'custom';

// Unix timestamp to Date
export function unixToDate(unix: number): Date {
  return new Date(unix * 1000);
}

// Date to Unix timestamp
export function dateToUnix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

// Milliseconds to Date
export function millisecondsToDate(ms: number): Date {
  return new Date(ms);
}

// Date to milliseconds
export function dateToMilliseconds(date: Date): number {
  return date.getTime();
}

// Format date to ISO 8601
export function dateToISO(date: Date): string {
  return date.toISOString();
}

// Parse ISO 8601 to Date
export function isoToDate(iso: string): Date {
  return new Date(iso);
}

// Format date to RFC 2822
export function dateToRFC2822(date: Date): string {
  return date.toUTCString();
}

// Current timestamp
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Current milliseconds
export function nowMilliseconds(): number {
  return Date.now();
}

// Format timestamp with custom format
export function formatTimestamp(
  timestamp: number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  const date = new Date(timestamp * 1000);

  const tokens: Record<string, () => string | number> = {
    'YYYY': () => date.getFullYear(),
    'YY': () => date.getFullYear().toString().slice(-2),
    'MM': () => String(date.getMonth() + 1).padStart(2, '0'),
    'M': () => date.getMonth() + 1,
    'DD': () => String(date.getDate()).padStart(2, '0'),
    'D': () => date.getDate(),
    'HH': () => String(date.getHours()).padStart(2, '0'),
    'H': () => date.getHours(),
    'hh': () => String(date.getHours() % 12 || 12).padStart(2, '0'),
    'h': () => date.getHours() % 12 || 12,
    'mm': () => String(date.getMinutes()).padStart(2, '0'),
    'm': () => date.getMinutes(),
    'ss': () => String(date.getSeconds()).padStart(2, '0'),
    's': () => date.getSeconds(),
    'A': () => date.getHours() >= 12 ? 'PM' : 'AM',
    'a': () => date.getHours() >= 12 ? 'pm' : 'am',
  };

  let result = format;
  Object.entries(tokens).forEach(([token, getValue]) => {
    result = result.replace(new RegExp(token, 'g'), getValue().toString());
  });

  return result;
}

// Get relative time (e.g., "2 hours ago")
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - (timestamp * 1000);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return `${seconds} secondi fa`;
  if (minutes < 60) return `${minutes} minuti fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days < 7) return `${days} giorni fa`;
  if (weeks < 4) return `${weeks} settimane fa`;
  if (months < 12) return `${months} mesi fa`;
  return `${years} anni fa`;
}

// Validate Unix timestamp
export function isValidUnixTimestamp(timestamp: number): boolean {
  // Valid range: 1970-01-01 to 2099-12-31
  return timestamp >= 0 && timestamp <= 4102444800;
}

// Timezone info
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

export function getTimezoneString(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

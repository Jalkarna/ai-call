/**
 * Timezone utilities for IST (Indian Standard Time)
 */

/**
 * Convert UTC timestamp to IST
 * IST is UTC+5:30
 */
export function utcToIST(utcTimestamp: string): Date {
  const utcDate = new Date(utcTimestamp);
  // Add 5 hours 30 minutes (IST offset)
  const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate;
}

/**
 * Format a UTC timestamp as IST string
 */
export function formatAsIST(utcTimestamp: string, formatStr?: string): string {
  const istDate = utcToIST(utcTimestamp);
  
  if (formatStr) {
    // Use date-fns format if format string provided
    // This would require date-fns to be imported where used
    return istDate.toISOString();
  }
  
  return istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Get Formatted IST time (HH:MM:SS)
 */
export function getISTTime(utcTimestamp: string): string {
  const istDate = utcToIST(utcTimestamp);
  return istDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Get IST date (MMM d)
 */
export function getISTDate(utcTimestamp: string): string {
  const istDate = utcToIST(utcTimestamp);
  return istDate.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

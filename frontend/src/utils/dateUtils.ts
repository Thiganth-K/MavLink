/**
 * Utility functions for handling dates consistently with IST backend
 */

/**
 * Get current date as YYYY-MM-DD string in local timezone
 */
export function getTodayIST(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date N days ago as YYYY-MM-DD string
 */
export function getDaysAgoIST(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate array of date strings for the last N days
 */
export function getLastNDaysIST(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates;
}

/**
 * Format YYYY-MM-DD string for display
 * Avoids timezone conversion issues
 */
export function formatDateForDisplay(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  // Parse as local date to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', options || {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format ISO timestamp to local time string
 * Backend stores in UTC, display in user's local time
 */
export function formatTimestampIST(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

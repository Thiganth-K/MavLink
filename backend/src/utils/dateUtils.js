/**
 * IST Date Utility Functions
 * IST = UTC + 5:30
 */

/**
 * Convert date string (YYYY-MM-DD) to IST midnight Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object set to IST midnight
 */
export function parseISTDate(dateStr) {
  // Parse date components
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Create date in IST timezone (UTC+5:30)
  // Set to midnight IST by creating UTC time that represents midnight IST
  const istDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Subtract 5:30 to get the UTC time that represents IST midnight
  istDate.setMinutes(istDate.getMinutes() - 330); // 5:30 = 330 minutes
  
  return istDate;
}

/**
 * Get current date in IST as YYYY-MM-DD string
 * @returns {string} Current date in YYYY-MM-DD format
 */
export function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5:30 in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Convert Date object to IST date string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} Date in YYYY-MM-DD format (IST)
 */
export function toISTDateString(date) {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get the next day from an IST date
 * @param {Date} date - IST date
 * @returns {Date} Next day IST date
 */
export function getNextISTDay(date) {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
}

/**
 * Get IST timestamp for logging
 * @returns {Date} Current time
 */
export function getISTTimestamp() {
  return new Date();
}

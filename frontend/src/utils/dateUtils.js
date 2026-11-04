import.meta.env.VITE_DEFAULT_TIMEZONE;

/**
 * Get the configured timezone from environment variables
 * Defaults to 'UTC' if not specified
 */
export const DEFAULT_TIMEZONE = import.meta.env.VITE_DEFAULT_TIMEZONE || 'America/Anchorage';

/**
 * Get current date in the configured timezone as YYYY-MM-DD
 */
export const getCurrentDateInTimezone = () => {
  const now = new Date();
  return formatDateInTimezone(now, 'YYYY-MM-DD');
};

/**
 * Format a date object in the configured timezone
 * @param {Date} date - The date to format
 * @param {string} format - Format string: 'YYYY-MM-DD', 'locale', or custom
 * @param {Object} options - Intl.DateTimeFormat options for locale formatting
 */
export const formatDateInTimezone = (date, format = 'locale', options = {}) => {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  if (format === 'YYYY-MM-DD') {
    const year = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric'
    });
    const month = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      month: '2-digit'
    });
    const day = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit'
    });
    return `${year}-${month}-${day}`;
  }

  if (format === 'locale') {
    return dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      ...options
    });
  }

  // For 'toISOString', we need to adjust to the timezone
  if (format === 'toISOString') {
    const year = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      year: 'numeric'
    });
    const month = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      month: '2-digit'
    });
    const day = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit'
    });
    const hours = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      hour: '2-digit',
      hour12: false
    });
    const minutes = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      minute: '2-digit'
    });
    const seconds = dateObj.toLocaleString('en-US', {
      timeZone: DEFAULT_TIMEZONE,
      second: '2-digit'
    });
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  return dateObj.toLocaleString('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    ...options
  });
};

/**
 * Parse a date string in the configured timezone
 * @param {string} dateString - Date string (YYYY-MM-DD or ISO format)
 * @returns {Date} Date object
 */
export const parseDateInTimezone = (dateString) => {
  if (!dateString) return new Date();
  
  // If it's just YYYY-MM-DD, parse it as a calendar date in the timezone
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-');
    // Create date in UTC to avoid timezone offset issues
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }
  
  return new Date(dateString);
};

/**
 * Get current time in the configured timezone
 * @returns {Object} Object with date and time formatted strings
 */
export const getCurrentDateTimeInTimezone = () => {
  const now = new Date();
  return {
    date: formatDateInTimezone(now, 'locale', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: formatDateInTimezone(now, 'locale', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  };
};

/**
 * Format a date string (YYYY-MM-DD) for display in the configured timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {Object} options - Intl.DateTimeFormat options
 */
export const formatDateString = (dateString, options = {}) => {
  const dateObj = parseDateInTimezone(dateString);
  return formatDateInTimezone(dateObj, 'locale', options);
};

/**
 * Get a timestamp in the configured timezone for file naming
 */
export const getTimestampInTimezone = () => {
  const now = new Date();
  return formatDateInTimezone(now, 'toISOString').replace(/[:.]/g, '-').slice(0, 19);
};

/**
 * Check if a date is more than one month old in the configured timezone
 * @param {string} dateString - Date string to check
 */
export const isMoreThanOneMonthOld = (dateString) => {
  if (!dateString) return false;
  const reportDate = parseDateInTimezone(dateString);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return reportDate < oneMonthAgo;
};

/**
 * Check if a report is more than 24 hours old in the configured timezone
 * @param {Object} report - Report object with created_at or date
 */
export const isMoreThan24HoursOld = (report) => {
  if (!report) return false;
  const timeToCompare = report.created_at 
    ? new Date(report.created_at).getTime() 
    : parseDateInTimezone(report.date).getTime();
  if (isNaN(timeToCompare)) return false;
  const hoursAgo = (Date.now() - timeToCompare) / (1000 * 60 * 60);
  return hoursAgo > 24;
};

/**
 * Format relative time (e.g., "Active 5m ago") in the configured timezone
 * @param {string} dateStr - Date string
 */
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'Active just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return 'Active 1m ago';
  if (diffMin < 60) return `Active ${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `Active ${diffHr}h ago`;
};

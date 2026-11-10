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
 * Format a MySQL DATETIME string ("YYYY-MM-DD HH:MM:SS") that already represents
 * a wall-clock value in the configured timezone (e.g. backend's toMySQLDateTime
 * output). Unlike `new Date(string)`, this reads the stored components directly
 * instead of letting the browser reinterpret the naive string in its own local
 * timezone, which would double-shift the displayed time.
 * @param {string} dtString - "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS"
 */
export const parseNaiveDateTime = (dtString) => {
  if (!dtString) return null;
  const match = String(dtString).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return { year, month, day, hour, minute, second };
};

/**
 * Format a MySQL DATETIME string as a 12-hour clock time (e.g. "11:48 AM"),
 * treating it as an already-local wall-clock value (see parseNaiveDateTime).
 */
export const formatNaiveTime = (dtString, { seconds = false } = {}) => {
  const parts = parseNaiveDateTime(dtString);
  if (!parts) return '—';
  const period = parts.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  const mm = String(parts.minute).padStart(2, '0');
  if (!seconds) return `${hour12}:${mm} ${period}`;
  const ss = String(parts.second).padStart(2, '0');
  return `${hour12}:${mm}:${ss} ${period}`;
};

/**
 * Format a MySQL DATETIME string's date portion (e.g. "Nov 6, 2026"),
 * treating it as an already-local wall-clock value (see parseNaiveDateTime).
 */
export const formatNaiveDate = (dtString) => {
  const parts = parseNaiveDateTime(dtString);
  if (!parts) return '—';
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Format a MySQL DATETIME string that is genuinely stored in UTC (e.g.
 * `users.last_active_at`, set via plain `NOW()` on a server whose clock is
 * UTC - unlike daily_reports' naive-Alaska fields written through
 * toMySQLDateTime()) as a short date + time in the configured timezone.
 * Use this instead of `new Date(dtString).toLocaleString()`, which parses
 * the string as the viewer's own local time rather than UTC and then
 * re-displays it in that same local time, silently mislabeling a UTC
 * timestamp as if it were already correct for the viewer.
 */
export const formatUTCDateTimeInTimezone = (dtString) => {
  if (!dtString) return '—';
  const isoUTC = `${String(dtString).replace(' ', 'T')}Z`;
  const d = new Date(isoUTC);
  if (isNaN(d.getTime())) return '—';
  return formatDateInTimezone(d, 'locale', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/**
 * Minutes elapsed since a UTC MySQL DATETIME string (see
 * formatUTCDateTimeInTimezone) - a plain epoch diff is correct here since
 * both `dtString` and `Date.now()` are genuinely UTC-based.
 */
export const minutesSinceUTC = (dtString) => {
  if (!dtString) return null;
  const isoUTC = `${String(dtString).replace(' ', 'T')}Z`;
  const past = new Date(isoUTC).getTime();
  if (isNaN(past)) return null;
  return Math.floor((Date.now() - past) / 60000);
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

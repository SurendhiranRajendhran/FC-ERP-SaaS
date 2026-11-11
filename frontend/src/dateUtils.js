// Central Date & Time Utilities strictly enforcing Indian Standard Time (IST - Asia/Kolkata)

export const parseISTDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const s = val.trim();
    // Match YYYY-MM-DD HH:mm:ss (or with T) without timezone offset or trailing Z
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) {
      return new Date(s.replace(' ', 'T') + '+05:30');
    }
    // Match pure date YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(s + 'T00:00:00+05:30');
    }
  }
  return new Date(val);
};

export const formatISTDateTime = (val, options = {}) => {
  const d = parseISTDate(val);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: options.year || 'numeric',
    month: options.month || 'short',
    day: options.day || 'numeric',
    hour: options.hour || '2-digit',
    minute: options.minute || '2-digit',
    hour12: options.hour12 !== undefined ? options.hour12 : true,
    ...options
  });
};

export const formatISTDate = (val, options = {}) => {
  const d = parseISTDate(val);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: options.year || 'numeric',
    month: options.month || 'short',
    day: options.day || 'numeric',
    ...options
  });
};

export const formatISTTime = (val, options = {}) => {
  const d = parseISTDate(val);
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: options.hour || '2-digit',
    minute: options.minute || '2-digit',
    hour12: options.hour12 !== undefined ? options.hour12 : true,
    ...options
  });
};

export const getISTTodayString = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

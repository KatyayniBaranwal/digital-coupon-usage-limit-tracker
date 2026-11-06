// Date + money helpers. All "date keys" are local-time strings: YYYY-MM-DD.

const pad = (n) => String(n).padStart(2, '0');

export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function dateKeyPlus(days, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toDateKey(d) === value;
}

/** Whole days from today until the date key (negative = in the past). */
export function daysUntil(key) {
  const a = new Date(`${todayKey()}T00:00:00`);
  const b = new Date(`${key}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

export function formatDate(value) {
  const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(value) {
  const d = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(
    'en-IN',
    { hour: '2-digit', minute: '2-digit', hour12: true }
  )}`;
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function expiryLabel(key) {
  const d = daysUntil(key);
  if (d < 0) return `Expired ${-d} day${d === -1 ? '' : 's'} ago`;
  if (d === 0) return 'Expires today';
  if (d === 1) return 'Expires tomorrow';
  return `In ${d} days`;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const round2 = (n) => Math.round(n * 100) / 100;

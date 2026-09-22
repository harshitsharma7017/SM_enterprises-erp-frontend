// Mirrors the original ERP's `d M Y` date display and `number_format($v, 2)` amounts.
//
// Date-only API fields (inquiry_date, oc_date, …) arrive as a plain "YYYY-MM-DD"
// string (the backend's mysql2 pool sets dateStrings: true for exactly this
// reason). Parsing that through `new Date(...)` would treat it as UTC midnight,
// and formatting it back with the viewer's LOCAL timezone can then land on the
// previous calendar day for any timezone behind UTC — so these read the
// Y-M-D digits directly instead of going through Date/timezone math at all.
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value) {
  if (!value) return '—';
  const m = String(value).match(DATE_ONLY_RE);
  if (m) {
    const [, y, mo, d] = m;
    return `${d} ${MONTH_ABBR[Number(mo) - 1]} ${y}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

export function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function toDateInputValue(value) {
  if (!value) return '';
  const m = String(value).match(DATE_ONLY_RE);
  if (m) return m[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// Today's date as "YYYY-MM-DD" in the viewer's LOCAL calendar day — NOT
// `new Date().toISOString().slice(0, 10)`, which is UTC and would show
// yesterday's date for part of the day in any timezone ahead of UTC (e.g. IST).
export function todayDateInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

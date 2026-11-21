/* Number, time and label formatting for the admin page. */
import { guidedKind, MIXES_BY_ID } from '../../data/worlds';

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en');

export const num = (n: number | null | undefined) => (n == null ? '—' : Math.abs(n) >= 10000 ? compact.format(n) : whole.format(Math.round(n * 100) / 100));
export const int = (n: number | null | undefined) => (n == null ? '—' : whole.format(Math.round(n)));
export const pct = (n: number | null | undefined) => (n == null ? '—' : (Math.round(n * 10) / 10).toLocaleString('en') + '%');

export function dur(s: number | null | undefined) {
  if (s == null) return '—';
  s = Math.round(s);
  if (s < 60) return s + 's';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

export function ms(v: number | null | undefined, metric: string) {
  if (v == null) return '—';
  if (metric === 'CLS') return v.toFixed(2);
  return v >= 1000 ? (v / 1000).toFixed(2) + ' s' : Math.round(v) + ' ms';
}

let regionNames: Intl.DisplayNames | null = null;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* old browser */ }
export const countryName = (cc: string) => (!cc ? 'Unknown' : regionNames?.of(cc) ?? cc);

let langNames: Intl.DisplayNames | null = null;
try { langNames = new Intl.DisplayNames(['en'], { type: 'language' }); } catch { /* old browser */ }
export function langName(code: string) {
  if (!code) return 'Unknown';
  try { return langNames?.of(code) ?? code; } catch { return code; }
}

/** "America/New_York" -> "New York" */
export const tzCity = (tz: string) => (!tz ? 'Unknown' : (tz.split('/').pop() || tz).replace(/_/g, ' '));

/** A friendly name for a page path, when there is one. */
export function pageName(path: string) {
  if (path === '/') return 'Home';
  if (path === '/support/') return 'Support';
  if (path === '/privacy/') return 'Privacy policy';
  if (path === '/admin/') return 'Admin';
  const m = path.match(/^\/worlds\/([a-z0-9-]+)\/$/);
  if (m) return (MIXES_BY_ID[m[1]]?.name ?? m[1]) + ' (world)';
  if (path.startsWith('/lab/')) return 'Motion lab';
  return '';
}

export function soundName(id: string) {
  const mix = MIXES_BY_ID[id];
  return mix ? mix.name : id;
}
export function soundKind(id: string) {
  const k = guidedKind(id);
  return k === 'story' ? 'Story' : k === 'meditation' ? 'Meditation' : id in MIXES_BY_ID ? 'World' : 'Sound';
}

export const KIND_LABEL: Record<string, string> = {
  pageview: 'Viewed', click: 'Clicked', outbound: 'Left for', mailto: 'Emailed', store: 'Tapped store badge', play: 'Played', listen: 'Listened',
};
export const KIND_ICON: Record<string, string> = {
  pageview: 'eye', click: 'cursor-click', outbound: 'arrow-up-right', mailto: 'envelope', store: 'download-simple', play: 'play', listen: 'music-notes',
};
export const DEVICE_ICON: Record<string, string> = { Mobile: 'device-mobile', Tablet: 'device-tablet', Desktop: 'desktop' };

const dayFmt = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' });
const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });
const hourFmt = new Intl.DateTimeFormat('en', { hour: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

export function bucketLabel(d: Date, bucket: string, long = false) {
  if (bucket === 'hour') return long ? dayFmt.format(d) + ', ' + hourFmt.format(d) : hourFmt.format(d);
  if (bucket === 'month') return monthFmt.format(d);
  if (bucket === 'week') return (long ? 'Week of ' : '') + new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d);
  return long ? dayFmt.format(d) : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d);
}
export const fmtDate = (d: Date) => dateFmt.format(d);
export const fmtTime = (d: Date) => timeFmt.format(d);

export function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return fmtDate(new Date(iso));
}

/** Escapes text for HTML templates. All data from the database goes through this. */
export const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const icon = (name: string, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#a-${name}"/></svg>`;

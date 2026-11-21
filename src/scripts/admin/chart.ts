/* The main trend chart: one metric as a gold line with a soft fill, the previous period as a
   dashed line, a crosshair that snaps to the nearest bucket and one tooltip for both. Plain SVG. */
import { bucketLabel, esc } from './format';

export type Point = { t: Date; v: number | null };
type Opts = { cur: Point[]; prev: Point[] | null; bucket: string; fmt: (n: number) => string; label: string };

const tip = () => document.getElementById('tip')!;

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10;
  return step * p;
}

export function lineChart(host: HTMLElement, o: Opts) {
  // A daylight-saving change can give the previous period one bucket more; line them up by position.
  if (o.prev) o = { ...o, prev: o.prev.slice(0, o.cur.length) };
  let ro: ResizeObserver | null = null;
  const draw = () => {
    const W = host.clientWidth, H = host.clientHeight;
    if (!W || !H) return;
    const padL = 44, padR = 12, padT = 12, padB = 26;
    const vals = [...o.cur, ...(o.prev ?? [])].map((p) => p.v ?? 0);
    const max = niceMax(Math.max(0, ...vals) * 1.08);
    const n = o.cur.length;
    const x = (i: number) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
    const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
    const path = (pts: Point[]) => {
      let d = '', pen = false;
      pts.forEach((p, i) => {
        if (p.v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1);
        pen = true;
      });
      return d;
    };
    const lastReal = o.cur.reduce((a, p, i) => (p.v != null ? i : a), -1);
    const area = lastReal >= 0
      ? path(o.cur) + `L${x(lastReal).toFixed(1)} ${y(0)}L${x(o.cur.findIndex((p) => p.v != null)).toFixed(1)} ${y(0)}Z`
      : '';
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - padL) / 74))));
    const xl = o.cur.map((p, i) => (i % every === 0 ? `<text class="axis-text" x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(bucketLabel(p.t, o.bucket))}</text>` : '')).join('');
    host.innerHTML = `<svg role="img" aria-label="${esc(o.label)} over time" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="fillg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d5a24f" stop-opacity=".28"/><stop offset="1" stop-color="#d5a24f" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-text" x="${padL - 8}" y="${y(t) + 4}" text-anchor="end">${esc(o.fmt(t))}</text>`).join('')}
      ${xl}
      ${o.prev ? `<path class="line-prev" d="${path(o.prev)}"/>` : ''}
      ${area ? `<path d="${area}" fill="url(#fillg)"/>` : ''}
      <path class="line" d="${path(o.cur)}"/>
      ${lastReal >= 0 && n < 60 ? o.cur.map((p, i) => (p.v != null ? `<circle cx="${x(i)}" cy="${y(p.v)}" r="2.5" fill="#d5a24f"/>` : '')).join('') : ''}
      <g class="hover" visibility="hidden"><line class="cross" y1="${padT}" y2="${H - padB}"/>${o.prev ? '<circle class="dot-prev" r="4"/>' : ''}<circle class="dot" r="5"/></g>
      <rect x="${padL}" y="0" width="${W - padL - padR}" height="${H}" fill="transparent" tabindex="0" aria-label="Chart. Use left and right arrow keys to read values."/>
    </svg>`;

    const svg = host.querySelector('svg')!;
    const g = svg.querySelector<SVGGElement>('.hover')!;
    const cross = g.querySelector('line')!;
    const dot = g.querySelector<SVGCircleElement>('.dot')!;
    const dotPrev = g.querySelector<SVGCircleElement>('.dot-prev');
    const rect = svg.querySelector('rect')!;
    let idx = -1;
    const show = (i: number, cx?: number, cy?: number) => {
      idx = Math.max(0, Math.min(n - 1, i));
      const p = o.cur[idx], q = o.prev?.[idx];
      g.setAttribute('visibility', 'visible');
      cross.setAttribute('x1', String(x(idx))); cross.setAttribute('x2', String(x(idx)));
      dot.setAttribute('visibility', p.v == null ? 'hidden' : 'visible');
      if (p.v != null) { dot.setAttribute('cx', String(x(idx))); dot.setAttribute('cy', String(y(p.v))); }
      if (dotPrev) {
        dotPrev.setAttribute('visibility', q?.v == null ? 'hidden' : 'visible');
        if (q?.v != null) { dotPrev.setAttribute('cx', String(x(idx))); dotPrev.setAttribute('cy', String(y(q.v))); }
      }
      const t = tip();
      t.innerHTML = `<div class="tt">${esc(bucketLabel(p.t, o.bucket, true))}</div>
        <div class="tr"><i></i><b>${p.v == null ? '—' : esc(o.fmt(p.v))}</b><span>${esc(o.label)}</span></div>
        ${q ? `<div class="tr"><i class="prev"></i><b>${q.v == null ? '—' : esc(o.fmt(q.v))}</b><span>${esc(bucketLabel(q.t, o.bucket, true))}</span></div>` : ''}`;
      t.hidden = false;
      const box = svg.getBoundingClientRect();
      const px = cx ?? box.left + x(idx), py = cy ?? box.top + 20;
      const tw = t.offsetWidth, th = t.offsetHeight;
      let left = px + 16;
      if (left + tw > window.innerWidth - 8) left = px - tw - 16;
      t.style.left = Math.max(8, left) + 'px';
      t.style.top = Math.max(8, Math.min(window.innerHeight - th - 8, py - th / 2)) + 'px';
    };
    const hide = () => { g.setAttribute('visibility', 'hidden'); tip().hidden = true; };
    rect.addEventListener('pointermove', (e) => {
      const box = svg.getBoundingClientRect();
      const rel = e.clientX - box.left;
      const i = n <= 1 ? 0 : Math.round(((rel - padL) / (W - padL - padR)) * (n - 1));
      show(i, e.clientX, e.clientY);
    });
    rect.addEventListener('pointerleave', hide);
    rect.addEventListener('blur', hide);
    rect.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        show(idx < 0 ? (e.key === 'ArrowRight' ? 0 : n - 1) : idx + (e.key === 'ArrowRight' ? 1 : -1));
      } else if (e.key === 'Escape') hide();
    });
  };
  draw();
  ro = new ResizeObserver(() => draw());
  ro.observe(host);
  return () => ro?.disconnect();
}

/** Small hover tooltip for any element with data-tip-title / data-tip-rows ("value|label;value|label"). */
export function bindTips(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-tip-title]').forEach((el) => {
    const enter = (e: PointerEvent | FocusEvent) => {
      const t = tip();
      const rows = (el.dataset.tipRows || '').split(';').filter(Boolean).map((r) => r.split('|'));
      t.innerHTML = `<div class="tt">${esc(el.dataset.tipTitle)}</div>${rows.map(([v, l]) => `<div class="tr"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}`;
      t.hidden = false;
      const r = el.getBoundingClientRect();
      const px = 'clientX' in e && e.clientX ? e.clientX : r.left + r.width / 2;
      const left = Math.min(window.innerWidth - t.offsetWidth - 8, Math.max(8, px - t.offsetWidth / 2));
      t.style.left = left + 'px';
      t.style.top = Math.max(8, r.top - t.offsetHeight - 8) + 'px';
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('focus', enter);
    el.addEventListener('pointerleave', () => (tip().hidden = true));
    el.addEventListener('blur', () => (tip().hidden = true));
  });
}

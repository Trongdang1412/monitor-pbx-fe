// Địa chỉ backend. Để trống => gọi cùng domain (/api), dùng proxy của Vite khi dev
// hoặc reverse proxy khi deploy. Có thể đặt VITE_API_URL=http://host:8080 lúc build.
const BASE = import.meta.env.VITE_API_URL || '';

export async function apiGet(path, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) qs.append(k, v);
  }
  const url = `${BASE}/api${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ---- định dạng ----
export const fmtNum = (n) => Number(n || 0).toLocaleString('vi-VN');
export const fmtMoney = (n) => `${Number(n || 0).toLocaleString('vi-VN')} ₫`;
export const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;
export const fmtTime = (v) => (v ? new Date(v).toLocaleString('vi-VN') : '');

export function fmtDur(sec) {
  sec = Math.round(sec || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Chuyển Date <-> giá trị của input datetime-local (giờ địa phương)
export function toLocalInput(d) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
export const fromLocalInput = (s) => (s ? new Date(s).toISOString() : '');

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const SIDE_LABEL = { CALLER: 'Người gọi', CALLEE: 'Người nghe', SYSTEM: 'Hệ thống' };

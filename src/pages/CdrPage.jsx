import { useCallback, useEffect, useState } from 'react';
import { apiGet, fmtDur, fmtMoney, fmtNum, fmtTime, fromLocalInput, SIDE_LABEL, toLocalInput } from '../api.js';

const EMPTY = {
  from: '', to: '', customer_id: '', caller: '', callee: '',
  duration_min: '', duration_max: '', hangup_cause: '', hangup_side: '',
  connecting_min: '', connecting_max: '', fee_min: '', fee_max: '',
};

function initFilters() {
  // Mặc định 7 ngày gần nhất; để trống "Đến" = tới hiện tại (luôn thấy cuộc gọi mới)
  return { ...EMPTY, from: toLocalInput(new Date(Date.now() - 7 * 24 * 3600e3)) };
}

export default function CdrPage() {
  const [customers, setCustomers] = useState([]);
  const [causes, setCauses] = useState([]);
  const [form, setForm] = useState(initFilters);
  const [applied, setApplied] = useState(form);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    // Danh sách KH / hangup cause: tải lại nếu lần trước backend chưa sẵn sàng
    if (customers.length === 0) apiGet('/customers').then(setCustomers).catch(() => {});
    if (causes.length === 0) apiGet('/hangup-causes').then(setCauses).catch(() => {});
    apiGet('/cdr', {
      ...applied, from: fromLocalInput(applied.from), to: fromLocalInput(applied.to), page, page_size: pageSize,
    })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [applied, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(form);
  };
  const reset = () => {
    const f = initFilters();
    setForm(f);
    setApplied(f);
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>CDR</h1>
          <div className="muted">Call Detail Record</div>
        </div>
        <button className="btn-ghost" onClick={load} disabled={loading}>⟳ Tải lại</button>
      </header>

      <form className="card filters" onSubmit={submit}>
        <label>Từ<input type="datetime-local" value={form.from} onChange={set('from')} /></label>
        <label>Đến<input type="datetime-local" value={form.to} onChange={set('to')} /></label>
        <label>Khách hàng
          <select value={form.customer_id} onChange={set('customer_id')}>
            <option value="">Tất cả</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </select>
        </label>
        <label>Caller<input value={form.caller} onChange={set('caller')} placeholder="Số gọi" /></label>
        <label>Callee<input value={form.callee} onChange={set('callee')} placeholder="Số nhận" /></label>
        <label>Hangup Cause
          <select value={form.hangup_cause} onChange={set('hangup_cause')}>
            <option value="">Tất cả</option>
            {causes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Hangup Side
          <select value={form.hangup_side} onChange={set('hangup_side')}>
            <option value="">Tất cả</option>
            {Object.entries(SIDE_LABEL).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
          </select>
        </label>
        <label>Duration (giây)
          <div className="range-inputs">
            <input type="number" min="0" value={form.duration_min} onChange={set('duration_min')} placeholder="từ" />
            <input type="number" min="0" value={form.duration_max} onChange={set('duration_max')} placeholder="đến" />
          </div>
        </label>
        <label>Connecting Duration (giây)
          <div className="range-inputs">
            <input type="number" min="0" value={form.connecting_min} onChange={set('connecting_min')} placeholder="từ" />
            <input type="number" min="0" value={form.connecting_max} onChange={set('connecting_max')} placeholder="đến" />
          </div>
        </label>
        <label>Fee (VND)
          <div className="range-inputs">
            <input type="number" min="0" value={form.fee_min} onChange={set('fee_min')} placeholder="từ" />
            <input type="number" min="0" value={form.fee_max} onChange={set('fee_max')} placeholder="đến" />
          </div>
        </label>
        <div className="filter-actions">
          <button type="submit">Lọc</button>
          <button type="button" className="btn-ghost" onClick={reset}>Xóa lọc</button>
        </div>
      </form>

      {error && <div className="error">Lỗi: {error}</div>}

      <section className="card">
        <div className="card-title range-head">
          <span>
            Kết quả: <b>{fmtNum(data?.total)}</b> bản ghi · Tổng cước <b>{fmtMoney(data?.total_fee)}</b>
            {loading && <span className="muted small"> · đang tải...</span>}
          </span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / trang</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Thời gian</th><th>Khách hàng</th><th>Caller</th><th>Callee</th>
                <th className="r">Connecting</th><th className="r">Duration</th>
                <th>Hangup Cause</th><th>Hangup Side</th><th className="r">Fee</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((c) => (
                <tr key={c.id}>
                  <td className="muted">{c.id}</td>
                  <td>{fmtTime(c.start_time)}</td>
                  <td>{c.customer}</td>
                  <td className="mono">{c.caller}</td>
                  <td className="mono">{c.callee}</td>
                  <td className="r">{c.connecting_duration}s</td>
                  <td className="r">{fmtDur(c.duration)}</td>
                  <td><span className={`badge ${c.hangup_cause === 'NORMAL_CLEARING' ? 'badge-green' : 'badge-red'}`}>{c.hangup_cause}</span></td>
                  <td>{c.hangup_side}</td>
                  <td className="r">{fmtMoney(c.fee)}</td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={10} className="muted">Không có dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹ Trước</button>
          <span>Trang {page} / {totalPages}</span>
          <button className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau ›</button>
        </div>
      </section>
    </>
  );
}

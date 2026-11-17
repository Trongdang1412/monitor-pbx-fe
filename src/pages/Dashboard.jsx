import { useCallback, useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  apiGet, fmtDur, fmtMoney, fmtNum, fmtPct, fmtTime, fromLocalInput, startOfToday, toLocalInput,
} from '../api.js';

const PRESETS = [
  { label: '1 giờ', hours: 1 },
  { label: '24 giờ', hours: 24 },
  { label: '3 ngày', hours: 72 },
  { label: '7 ngày', hours: 168 },
];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat${accent ? ' stat-accent' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function SummaryCards({ s }) {
  if (!s) return <div className="muted">Đang tải...</div>;
  return (
    <div className="stats">
      <StatCard label="Tổng cuộc gọi" value={fmtNum(s.total_calls)}
        sub={`${fmtNum(s.answered_calls)} thành công · ${fmtNum(s.failed_calls)} lỗi`} />
      <StatCard label="ASR" value={fmtPct(s.asr)} sub="Tỷ lệ cuộc gọi thành công" />
      <StatCard label="ACD" value={fmtDur(s.acd)} sub="Thời lượng TB / cuộc thành công" />
      <StatCard label="Tổng thời lượng" value={fmtDur(s.total_duration)} sub={`${fmtNum(Math.round(s.total_duration / 60))} phút`} />
      <StatCard label="Cước phí" value={fmtMoney(s.total_fee)} />
    </div>
  );
}

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [ccu, setCcu] = useState(null);
  const [today, setToday] = useState(null);
  const [range, setRange] = useState(() => {
    const to = new Date();
    return { from: toLocalInput(new Date(to - 24 * 3600e3)), to: toLocalInput(to) };
  });
  const [rangeData, setRangeData] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/customers').then(setCustomers).catch((e) => setError(e.message));
  }, []);

  // CCU + summary hôm nay: tự làm mới mỗi 5 giây
  const loadLive = useCallback(() => {
    apiGet('/ccu').then(setCcu).catch((e) => setError(e.message));
    apiGet('/summary', {
      from: startOfToday().toISOString(), to: new Date().toISOString(), customer_id: customerId,
    }).then((d) => setToday(d.summary)).catch((e) => setError(e.message));
  }, [customerId]);

  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 5000);
    return () => clearInterval(t);
  }, [loadLive]);

  const loadRange = useCallback(() => {
    const params = { from: fromLocalInput(range.from), to: fromLocalInput(range.to), customer_id: customerId };
    apiGet('/summary', params).then(setRangeData).catch((e) => setError(e.message));
    apiGet('/ccu/history', params).then(setHistory).catch((e) => setError(e.message));
  }, [range, customerId]);

  useEffect(() => { loadRange(); }, [loadRange]);

  const applyPreset = (hours) => {
    const to = new Date();
    setRange({ from: toLocalInput(new Date(to - hours * 3600e3)), to: toLocalInput(to) });
  };

  const chartData = (history?.points || []).map((p) => ({
    t: new Date(p.t).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    ccu: p.ccu,
  }));
  const maxCause = Math.max(1, ...(rangeData?.hangup_causes || []).map((c) => c.count));

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="muted">Giám sát tổng đài realtime · tự làm mới mỗi 5 giây</div>
        </div>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Tất cả khách hàng</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
        </select>
      </header>

      {error && <div className="error">Lỗi: {error}</div>}

      {/* ---- CCU ---- */}
      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            CCU hiện tại <span className="live-dot" /> <span className="muted small">{ccu && fmtTime(ccu.at)}</span>
          </div>
          <div className="ccu-big">{ccu ? fmtNum(ccu.total) : '—'}</div>
          <div className="ccu-split">
            <span className="badge badge-blue">Đang nói: {ccu?.answered ?? 0}</span>
            <span className="badge badge-amber">Đổ chuông: {ccu?.ringing ?? 0}</span>
          </div>
          <div className="bars">
            {(ccu?.by_customer || []).map((c) => (
              <div key={c.customer_id} className="bar-row">
                <span className="bar-label">{c.name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${ccu.total ? (c.ccu / ccu.total) * 100 : 0}%` }} />
                </div>
                <span className="bar-val">{c.ccu}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Cuộc gọi đang diễn ra</div>
          <div className="table-wrap scroll-y">
            <table>
              <thead>
                <tr><th>KH</th><th>Caller</th><th>Callee</th><th>Bắt đầu</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {(ccu?.calls || []).map((c) => (
                  <tr key={c.id}>
                    <td>{c.customer}</td><td>{c.caller}</td><td>{c.callee}</td>
                    <td>{new Date(c.start_time).toLocaleTimeString('vi-VN')}</td>
                    <td><span className={`badge ${c.state === 'RINGING' ? 'badge-amber' : 'badge-blue'}`}>{c.state}</span></td>
                  </tr>
                ))}
                {ccu && ccu.calls.length === 0 && <tr><td colSpan={5} className="muted">Không có cuộc gọi</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- Today ---- */}
      <section className="card">
        <div className="card-title">Hôm nay</div>
        <SummaryCards s={today} />
      </section>

      {/* ---- Range ---- */}
      <section className="card">
        <div className="card-title range-head">
          <span>Theo khoảng thời gian</span>
          <div className="range-controls">
            {PRESETS.map((p) => (
              <button key={p.hours} className="btn-ghost" onClick={() => applyPreset(p.hours)}>{p.label}</button>
            ))}
            <input type="datetime-local" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            <span>→</span>
            <input type="datetime-local" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            <button onClick={loadRange}>Xem</button>
          </div>
        </div>
        <SummaryCards s={rangeData?.summary} />

        <div className="grid-2 mt">
          <div>
            <div className="sub-title">CCU theo thời gian <span className="muted small">(peak: {history?.peak ?? 0})</span></div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="t" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={40} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="ccu" name="CCU" stroke="#2563eb" strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="sub-title">Hangup cause</div>
            <div className="bars">
              {(rangeData?.hangup_causes || []).map((c) => (
                <div key={c.key} className="bar-row">
                  <span className="bar-label mono">{c.key}</span>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(c.count / maxCause) * 100}%` }} /></div>
                  <span className="bar-val">{fmtNum(c.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sub-title mt">Theo khách hàng</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Khách hàng</th><th className="r">Cuộc gọi</th><th className="r">Thành công</th>
                <th className="r">ASR</th><th className="r">ACD</th><th className="r">Thời lượng</th><th className="r">Cước</th></tr>
            </thead>
            <tbody>
              {(rangeData?.by_customer || []).map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="r">{fmtNum(c.total)}</td>
                  <td className="r">{fmtNum(c.answered)}</td>
                  <td className="r">{fmtPct(c.total ? (c.answered * 100) / c.total : 0)}</td>
                  <td className="r">{fmtDur(c.answered ? c.duration / c.answered : 0)}</td>
                  <td className="r">{fmtDur(c.duration)}</td>
                  <td className="r">{fmtMoney(c.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

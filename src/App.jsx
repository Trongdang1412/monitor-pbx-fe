import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import CdrPage from './pages/CdrPage.jsx';

const PAGES = [
  { key: 'dashboard', label: 'Dashboard', icon: '▦' },
  { key: 'cdr', label: 'CDR', icon: '☰' },
];

// Điều hướng đơn giản bằng hash (#dashboard, #cdr)
function usePage() {
  const read = () => (window.location.hash.replace('#', '') || 'dashboard');
  const [page, setPage] = useState(read);
  useEffect(() => {
    const onHash = () => setPage(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return page;
}

export default function App() {
  const page = usePage();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot">☎</span> Monitor PBX
        </div>
        <nav>
          {PAGES.map((p) => (
            <a key={p.key} href={`#${p.key}`} className={`nav-item${page === p.key ? ' active' : ''}`}>
              <span className="nav-icon">{p.icon}</span>
              {p.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">Lab · v1.0</div>
      </aside>
      <main className="main">{page === 'cdr' ? <CdrPage /> : <Dashboard />}</main>
    </div>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const check = () => getHealth().then(setHealth).catch(() => setHealth(null));
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  const esStatus = health?.elasticsearch?.status || 'unavailable';
  const dotClass = esStatus === 'green' ? 'green' : esStatus === 'yellow' ? 'yellow' : 'red';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="brand-icon">⬡</div>
          <span className="brand-text">Nuclei</span>
          <span className="brand-badge">Dashboard</span>
        </div>

        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
            </svg>
            Launchpad
          </NavLink>
          <NavLink to="/monitor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            Monitor
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            Dashboard
          </NavLink>
        </div>

        <div className="navbar-status">
          <div className="es-status" title={`Elasticsearch: ${esStatus}`}>
            <span className={`health-dot ${dotClass}`}></span>
            <span className="es-label">ES</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

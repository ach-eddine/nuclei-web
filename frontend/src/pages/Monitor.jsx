import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getScanStatus, stopScan } from '../services/api';
import { addWSListener, connectWebSocket } from '../services/websocket';
import './Monitor.css';

export default function Monitor() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({ status: 'idle', findings: 0 });
  const [logs, setLogs] = useState([]);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const consoleRef = useRef(null);

  // Poll scan status
  useEffect(() => {
    const check = () => getScanStatus().then(setStatus).catch(() => {});
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  // WebSocket logs
  useEffect(() => {
    connectWebSocket();
    const unsub = addWSListener((msg) => {
      if (msg.type === 'log') {
        setLogs((prev) => [...prev.slice(-500), msg.data]); // Keep last 500 lines
      }
    });
    return unsub;
  }, []);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStop = async () => {
    await stopScan();
    setStatus((prev) => ({ ...prev, status: 'stopped' }));
  };

  const isRunning = status.status === 'running';
  const isDone = status.status === 'complete' || status.status === 'error' || status.status === 'stopped';

  const getLogClass = (line) => {
    if (line.startsWith('[stdout]')) return 'log-stdout';
    if (line.startsWith('[stderr]')) return 'log-stderr';
    if (line.startsWith('[system]')) return 'log-system';
    return '';
  };

  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title">
        <span className="title-icon">📡</span> Scan Monitor
      </h1>
      <p className="page-subtitle">
        {isRunning ? 'Scan in progress — live output streaming below' :
         isDone ? 'Scan completed — head to the dashboard to analyze results' :
         'No active scan — start one from the Launchpad'}
      </p>

      {/* Status Cards */}
      <div className="monitor-cards">
        <div className="glass-card monitor-stat-card">
          <div className="stat-label">Status</div>
          <div className={`stat-value status-${status.status}`}>
            {isRunning && <span className="pulse-dot"></span>}
            {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
          </div>
        </div>
        <div className="glass-card monitor-stat-card">
          <div className="stat-label">Findings</div>
          <div className="stat-value stat-findings">{status.findings}</div>
        </div>
        <div className="glass-card monitor-stat-card">
          <div className="stat-label">Started</div>
          <div className="stat-value stat-time">
            {status.startedAt ? new Date(status.startedAt).toLocaleTimeString() : '—'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="monitor-progress">
          <div className="progress-bar-track">
            <div className="progress-bar-fill indeterminate"></div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="monitor-actions">
        {isRunning && (
          <button className="btn btn-danger" onClick={handleStop}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
            Stop Scan
          </button>
        )}
        {isDone && (
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
            View Dashboard
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => setConsoleOpen(!consoleOpen)}
        >
          {consoleOpen ? '▾ Hide Console' : '▸ Show Console'}
        </button>
      </div>

      {/* Console Log */}
      {consoleOpen && (
        <div className="glass-card console-wrapper animate-slide-up">
          <div className="console-header">
            <span className="console-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
              Terminal Output
            </span>
            <span className="console-lines">{logs.length} lines</span>
          </div>
          <div className="console-panel" ref={consoleRef}>
            {logs.length === 0 ? (
              <div className="console-empty">
                {isRunning ? 'Waiting for output...' : 'No logs available. Start a scan to see output.'}
              </div>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={`log-line ${getLogClass(line)}`}>{line}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

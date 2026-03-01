import { useEffect, useState, useMemo } from 'react';
import { getResults, getResultsSummary, getResultById } from '../services/api';
import {
  PieChart, Pie, Cell, Label, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import './Dashboard.css';

var SEV_COLORS = {
  critical: '#ff4757',
  high: '#ff8c00',
  medium: '#ffd700',
  low: '#4caf50',
  info: '#2196f3',
};

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function timeAgo(dateStr) {
  if (!dateStr) return '\u2014';
  var diff = Date.now() - new Date(dateStr).getTime();
  var m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + ' min' + (m > 1 ? 's' : '') + ' ago';
  var h = Math.floor(m / 60);
  if (h < 24) return h + ' hour' + (h > 1 ? 's' : '') + ' ago';
  var d = Math.floor(h / 24);
  return d + ' day' + (d > 1 ? 's' : '') + ' ago';
}

function buildTrend(hits) {
  var map = {};
  for (var i = 0; i < hits.length; i++) {
    var ts = hits[i].timestamp || hits[i]['@timestamp'];
    if (!ts) continue;
    var key = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map[key] = (map[key] || 0) + 1;
  }
  var arr = Object.entries(map);
  if (!arr.length) return [];
  var cum = 0;
  return arr.map(function(e) { cum += e[1]; return { date: e[0], count: cum }; });
}

function SevIcon(props) {
  var c = SEV_COLORS[props.sev] || '#94a3b8';
  if (props.sev === 'high') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
  if (props.sev === 'low') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}

function RowIcon(props) {
  var c = SEV_COLORS[props.sev] || '#94a3b8';
  if (props.sev === 'critical') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
  if (props.sev === 'high') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
  if (props.sev === 'medium') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
  if (props.sev === 'low') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
}

var PAGE_SIZES = [10, 25, 50, 100];

export default function Dashboard() {
  var st1 = useState({ total: 0, severities: {}, targets: [] });
  var summary = st1[0]; var setSummary = st1[1];
  var st2 = useState({ total: 0, hits: [] });
  var results = st2[0]; var setResults = st2[1];
  var st3 = useState([]);
  var allHits = st3[0]; var setAllHits = st3[1];
  var st4 = useState('');
  var search = st4[0]; var setSearch = st4[1];
  var st5 = useState(1);
  var page = st5[0]; var setPage = st5[1];
  var st6 = useState('');
  var selectedTarget = st6[0]; var setSelectedTarget = st6[1];
  var st7 = useState([]);
  var allTargets = st7[0]; var setAllTargets = st7[1];
  var st8 = useState(null);
  var selectedResult = st8[0]; var setSelectedResult = st8[1];
  var st9 = useState(true);
  var loading = st9[0]; var setLoading = st9[1];
  var st10 = useState(10);
  var pageSize = st10[0]; var setPageSize = st10[1];

  function fetchData() {
    setLoading(true);
    var tp = selectedTarget || undefined;
    var defSummary = { total: 0, severities: {}, targets: [] };
    var defResults = { total: 0, hits: [] };
    Promise.all([
      getResultsSummary({ target: tp }).catch(function() { return defSummary; }),
      getResults({ q: search || undefined, page: page, size: pageSize, target: tp }).catch(function() { return defResults; }),
      getResults({ target: tp, size: 500 }).catch(function() { return { hits: [] }; }),
    ]).then(function(arr) {
      var s = (arr[0] && typeof arr[0] === 'object' && typeof arr[0].total === 'number') ? arr[0] : defSummary;
      var r = (arr[1] && typeof arr[1] === 'object' && Array.isArray(arr[1].hits)) ? arr[1] : defResults;
      var a = (arr[2] && typeof arr[2] === 'object' && Array.isArray(arr[2].hits)) ? arr[2].hits : [];
      if (!s.severities) s.severities = {};
      if (!s.targets) s.targets = [];
      setSummary(s);
      setResults(r);
      setAllHits(a);
      if (!selectedTarget && s.targets && s.targets.length > 0) setAllTargets(s.targets);
    }).catch(function() {}).finally(function() { setLoading(false); });
  }

  useEffect(function() { fetchData(); }, [page, selectedTarget, pageSize]);

  function handleSearch(e) { e.preventDefault(); setPage(1); fetchData(); }

  function openDetail(id) { getResultById(id).then(function(d) { setSelectedResult(d); }).catch(function() {}); }

  var chartData = useMemo(function() {
    return Object.entries(summary.severities || {}).map(function(e) {
      return { name: e[0].charAt(0).toUpperCase() + e[0].slice(1), value: e[1], color: SEV_COLORS[e[0]] || '#94a3b8' };
    });
  }, [summary.severities]);

  var trendData = useMemo(function() { return buildTrend(allHits); }, [allHits]);
  var totalPages = Math.ceil(results.total / pageSize);
  var pageNumbers = useMemo(function() {
    var p = [];
    if (totalPages <= 7) { for (var i = 1; i <= totalPages; i++) p.push(i); }
    else {
      p.push(1);
      if (page > 3) p.push('...');
      for (var j = Math.max(2, page - 1); j <= Math.min(totalPages - 1, page + 1); j++) p.push(j);
      if (page < totalPages - 2) p.push('...');
      p.push(totalPages);
    }
    return p;
  }, [page, totalPages]);

  var sevList = Object.entries(summary.severities || {}).filter(function(e) { return e[1] > 0; });

  return (
    <div className="page-container animate-fade-in dash-page">
      {allTargets.length > 0 && (
        <div className="target-selector">
          <select className="input-field target-select" value={selectedTarget} onChange={function(e) { setSelectedTarget(e.target.value); setPage(1); }}>
            <option value="">All Targets ({allTargets.reduce(function(s,t){return s+t.count;},0)})</option>
            {allTargets.map(function(t) { return <option key={t.host} value={t.host}>{t.host} ({t.count})</option>; })}
          </select>
        </div>
      )}

      <div className="dash-summary-row">
        <div className="dash-stat-card">
          <div className="dash-stat-header">
            <span className="dash-stat-label">Total Findings</span>
            <span className="dash-stat-icon dash-stat-icon-total">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
          </div>
          <div className="dash-stat-value">{(summary.total||0).toLocaleString()}</div>
        </div>
        {['critical','high','medium','low','info'].map(function(sev) {
          return (
            <div key={sev} className={'dash-stat-card dash-stat-card-'+sev}>
              <div className="dash-stat-header">
                <span className={'dash-stat-label dash-stat-label-'+sev}>{sev.toUpperCase()}</span>
                <span className="dash-stat-icon"><SevIcon sev={sev}/></span>
              </div>
              <div className="dash-stat-value">{((summary.severities||{})[sev]||0).toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      <div className="dash-charts-row">
        <div className="glass-card dash-chart-card">
          <div className="dash-chart-header"><h3 className="dash-chart-title">Severity Distribution</h3></div>
          {chartData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Tooltip
                    cursor={false}
                    contentStyle={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'#f0f4f8',fontSize:'0.8rem'}}
                    formatter={function(value, name) { return [value, name]; }}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    strokeWidth={5}
                    stroke="#0a0e17"
                  >
                    {chartData.map(function(entry, i) { return <Cell key={i} fill={entry.color}/>; })}
                    <Label
                      content={function(props) {
                        var vb = props.viewBox;
                        if (vb && 'cx' in vb && 'cy' in vb) {
                          return (
                            <text x={vb.cx} y={vb.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={vb.cx} y={vb.cy} style={{fill:'#f0f4f8',fontSize:'2rem',fontWeight:700}}>
                                {(summary.total||0).toLocaleString()}
                              </tspan>
                              <tspan x={vb.cx} y={(vb.cy||0)+26} style={{fill:'#64748b',fontSize:'0.75rem',fontWeight:500,letterSpacing:'0.05em'}}>
                                ISSUES
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut-legend">
                {sevList.map(function(e) { return (
                  <div key={e[0]} className="dash-legend-item">
                    <span className="dash-legend-dot" style={{background:SEV_COLORS[e[0]]}}></span>
                    <span className="dash-legend-label">{e[0].charAt(0).toUpperCase()+e[0].slice(1)}</span>
                    <span className="dash-legend-count">{e[1]}</span>
                  </div>
                ); })}
              </div>
            </div>
          ) : (<div className="chart-empty">No data available yet</div>)}
        </div>

        <div className="glass-card dash-chart-card">
          <div className="dash-chart-header">
            <div>
              <h3 className="dash-chart-title">Findings Trend</h3>
              <span className="dash-chart-subtitle">Cumulative findings over time</span>
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{top:10,right:10,left:-20,bottom:0}}>
                <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#64748b'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'#1a1f2e',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'#f0f4f8',fontSize:'0.8rem'}}/>
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fill="url(#trendGrad)" dot={{r:4,fill:'#2563eb',stroke:'#0a0e17',strokeWidth:2}} activeDot={{r:6,fill:'#3b82f6',stroke:'#0a0e17',strokeWidth:2}}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (<div className="chart-empty">Run a scan to see the findings trend</div>)}
        </div>
      </div>

      <div className="glass-card dash-table-card">
        <div className="dash-table-header">
          <h3 className="dash-table-title">Recent Findings</h3>
          <div className="dash-table-actions">
            {allTargets.length > 0 && (
              <select className="input-field table-target-select" value={selectedTarget} onChange={function(e){ setSelectedTarget(e.target.value); setPage(1); }}>
                <option value="">All Targets</option>
                {allTargets.map(function(t){ return <option key={t.host} value={t.host}>{t.host} ({t.count})</option>; })}
              </select>
            )}
            <form onSubmit={handleSearch} className="dash-table-search">
              <input className="input-field search-input" placeholder="Search findings..." value={search} onChange={function(e){setSearch(e.target.value);}}/>
            </form>
            <select className="input-field page-size-select" value={pageSize} onChange={function(e){ setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map(function(s){ return <option key={s} value={s}>{s} / page</option>; })}
            </select>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table dash-data-table">
            <thead><tr><th>Vulnerability Name</th><th>Target Asset</th><th>Severity</th><th>Protocol</th><th>Detected Time</th><th>Actions</th></tr></thead>
            <tbody>
              {results.hits.length === 0 ? (
                <tr><td colSpan="6" className="table-empty">{loading ? 'Loading...' : 'No results found. Run a scan from the Launchpad.'}</td></tr>
              ) : results.hits.map(function(hit) {
                var sev = (hit.info && hit.info.severity) || 'info';
                var proto = hit.type || hit.protocol || '\u2014';
                var port = hit.port || '';
                var pd = port ? proto.toUpperCase()+'/'+port : proto.toUpperCase();
                var nm = (hit.info && hit.info.name) || hit['template-id'] || '\u2014';
                return (
                  <tr key={hit.id} onClick={function(){openDetail(hit.id);}}>
                    <td className="td-vuln-name"><span className="vuln-icon"><RowIcon sev={sev}/></span><span className="vuln-name-text">{nm}</span></td>
                    <td className="td-target">{hit.host||hit.matched||'\u2014'}</td>
                    <td><span className={'severity-badge severity-'+sev}>{sev.charAt(0).toUpperCase()+sev.slice(1)}</span></td>
                    <td className="td-protocol"><span className="protocol-tag">{pd}</span></td>
                    <td className="td-time">{timeAgo(hit.timestamp||hit['@timestamp'])}</td>
                    <td className="td-actions"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 0 && (
          <div className="dash-pagination">
            <span className="dash-pagination-info">Showing <strong>{(page-1)*pageSize+1}</strong> to <strong>{Math.min(page*pageSize,results.total)}</strong> of <strong>{results.total}</strong> findings</span>
            <div className="dash-pagination-controls">
              <button className="dash-page-btn" disabled={page<=1} onClick={function(){setPage(function(p){return p-1;});}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
              {pageNumbers.map(function(pn,i) {
                if (pn==='...') return <span key={'d'+i} className="dash-page-dots">{'\u2026'}</span>;
                return <button key={pn} className={'dash-page-btn'+(pn===page?' active':'')} onClick={function(){setPage(pn);}}>{pn}</button>;
              })}
              <button className="dash-page-btn" disabled={page>=totalPages} onClick={function(){setPage(function(p){return p+1;});}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
            </div>
          </div>
        )}
      </div>

      {selectedResult && (
        <div className="modal-overlay" onClick={function(){setSelectedResult(null);}}>
          <div className="modal-content detail-modal" onClick={function(e){e.stopPropagation();}}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className={'severity-badge severity-'+((selectedResult.info&&selectedResult.info.severity)||'info')}>{(selectedResult.info&&selectedResult.info.severity)||'info'}</span>
                <h2 className="modal-title">{(selectedResult.info&&selectedResult.info.name)||selectedResult['template-id']||'Finding Detail'}</h2>
              </div>
              <button className="btn btn-ghost btn-sm modal-close-btn" onClick={function(){setSelectedResult(null);}}>✕</button>
            </div>
            <div className="detail-body">
              <div className="detail-section">
                <h4 className="detail-section-title">Overview</h4>
                <div className="detail-grid">
                  <div className="detail-item"><span className="detail-label">Template ID</span><span className="detail-value mono">{selectedResult['template-id']||'\u2014'}</span></div>
                  <div className="detail-item"><span className="detail-label">Target</span><span className="detail-value mono">{selectedResult.host||'\u2014'}</span></div>
                  <div className="detail-item"><span className="detail-label">Matched At</span><span className="detail-value mono">{selectedResult['matched-at']||selectedResult.matched||'\u2014'}</span></div>
                  <div className="detail-item"><span className="detail-label">Protocol</span><span className="detail-value">{selectedResult.type||selectedResult.protocol||'\u2014'}</span></div>
                  <div className="detail-item"><span className="detail-label">IP</span><span className="detail-value mono">{selectedResult.ip||'\u2014'}</span></div>
                  <div className="detail-item"><span className="detail-label">Port</span><span className="detail-value mono">{selectedResult.port||'\u2014'}</span></div>
                </div>
              </div>
              {selectedResult.info && selectedResult.info.tags && (
                <div className="detail-section">
                  <h4 className="detail-section-title">Tags</h4>
                  <div className="detail-tags">
                    {(Array.isArray(selectedResult.info.tags)?selectedResult.info.tags:String(selectedResult.info.tags).split(',')).map(function(t,i){return <span key={i} className="detail-tag">{String(t).trim()}</span>;})}
                  </div>
                </div>
              )}
              {selectedResult.info && selectedResult.info.description && (
                <div className="detail-section">
                  <h4 className="detail-section-title">Description</h4>
                  <p className="detail-description">{selectedResult.info.description}</p>
                </div>
              )}
              {(function() {
                var er = selectedResult['extracted-results']
                  || selectedResult['extractedResults']
                  || (selectedResult._raw && selectedResult._raw.event && selectedResult._raw.event['extracted-results'])
                  || (selectedResult._raw && selectedResult._raw['extracted-results'])
                  || selectedResult['matcher-name'] && null;
                if (!er) return null;
                var items = Array.isArray(er) ? er : [er];
                if (items.length === 0) return null;
                return (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Extracted Results</h4>
                    <div className="detail-extracted-results">
                      {items.map(function(r, i) { return <div key={i} className="detail-extracted-item"><span className="detail-extracted-index">{i + 1}</span><span className="detail-value mono">{String(r)}</span></div>; })}
                    </div>
                  </div>
                );
              })()}
              {selectedResult.request && (<div className="detail-section"><h4 className="detail-section-title">HTTP Request</h4><pre className="detail-code">{selectedResult.request}</pre></div>)}
              {selectedResult.response && (<div className="detail-section"><h4 className="detail-section-title">HTTP Response</h4><pre className="detail-code">{selectedResult.response}</pre></div>)}
              {selectedResult['curl-command'] && (<div className="detail-section"><h4 className="detail-section-title">cURL Command</h4><pre className="detail-code detail-code-curl">{selectedResult['curl-command']}</pre></div>)}
              {selectedResult._raw && (<details className="detail-section detail-raw-section"><summary className="detail-section-title detail-raw-toggle">Raw JSON</summary><pre className="detail-code detail-code-raw">{JSON.stringify(selectedResult._raw,null,2)}</pre></details>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

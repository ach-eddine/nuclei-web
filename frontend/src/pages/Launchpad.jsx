import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startScan } from '../services/api';
import { connectWebSocket } from '../services/websocket';
import './Launchpad.css';

const TAG_CATEGORIES = {
  'Vulnerability Types': [
    'vuln', 'xss', 'sqli', 'rce', 'lfi', 'ssrf', 'ssti', 'xxe', 'deserialization',
    'traversal', 'injection', 'redirect', 'file-upload', 'fileupload', 'stored-xss',
    'time-based-sqli', 'auth-bypass', 'privesc', 'backdoor', 'bypass', 'oob', 'oast',
    'log4j', 'jndi', 'csp-bypass', 'info-leak', 'lfr',
  ],
  'CVEs & Exploits': [
    'cve', 'cve2025', 'cve2024', 'cve2023', 'cve2022', 'cve2021', 'cve2020', 'cve2019',
    'cve2018', 'cve2017', 'cve2016', 'cve2015', 'cve2014', 'cve2012', 'cve2011', 'cve2010',
    'edb', 'packetstorm', 'huntr', 'tenable', 'hackerone', 'cnvd', 'vulhub', 'kev', 'kisa',
  ],
  'Scan Types': [
    'discovery', 'exposure', 'misconfig', 'detect', 'detection', 'panel', 'login',
    'default-login', 'unauth', 'authenticated', 'intrusive', 'config', 'audit',
    'compliance', 'enum', 'fuzz', 'dast', 'passive', 'debug', 'listing',
    'disclosure', 'fpd', 'install', 'installer', 'generic', 'miscellaneous',
    'top-100', 'top-200', 'security', 'phishing', 'malware', 'c2', 'cti', 'ir',
  ],
  'Cloud & DevOps': [
    'cloud', 'aws', 'aws-cloud-config', 'gcp', 'gcp-cloud-config', 'gcloud',
    'azure', 'azure-cloud-config', 'alibaba', 'alibaba-cloud-config', 'aliyun', 'amazon',
    'google-cloud-sql', 'devops', 'devsecops', 'kubernetes', 'k8s', 'k8s-cluster-security',
    'cicd', 'ec2', 'rds', 's3', 'iam', 'vpc', 'compute', 'gke', 'resourcemanager',
  ],
  'Technologies': [
    'tech', 'wordpress', 'wp', 'wp-plugin', 'wp-theme', 'wpscan', 'woocommerce',
    'joomla', 'prestashop', 'magento', 'cms', 'apache', 'nginx', 'tomcat',
    'weblogic', 'springboot', 'jenkins', 'gitlab', 'github', 'grafana',
    'confluence', 'jira', 'xwiki', 'graphql', 'aem', 'sap', 'oracle',
    'microsoft', 'adobe', 'vmware', 'citrix', 'atlassian', 'zoho', 'zohocorp',
    'ibm', 'manageengine', 'fortinet', 'ivanti', 'bestwebsoft', 'yonyou',
    'weaver', 'dlink', 'netgear', 'wavlink', 'hp',
  ],
  'Network & Protocols': [
    'network', 'tcp', 'dns', 'ssl', 'tls', 'ftp', 'ssh', 'vpn',
    'proxy', 'firewall', 'router', 'iot', 'ics', 'camera', 'printer',
  ],
  'OSINT': [
    'osint', 'osint-social', 'osint-gaming', 'osint-porn', 'osint-hobby',
    'osint-coding', 'osint-misc', 'osint-tech', 'osint-shopping',
    'osint-business', 'osint-finance', 'osint-images',
    'token-spray', 'token', 'tokens', 'keys',
  ],
  'Platforms & OS': [
    'linux', 'windows', 'windows-audit', 'ubuntu', 'android',
    'php', 'js', 'api', 'code',
  ],
  'Other': [
    'vkev', 'file', 'files', 'local', 'logs', 'log', 'seclists',
    'oss', 'headless', 'takeover', 'backup', 'admin', 'dashboard',
    'ecommerce', 'bank', 'ai', 'networking', 'postgresql', 'misc',
    'plugin', 'oa',
  ],
};

const SEVERITY_TAGS = ['critical', 'high', 'medium', 'low', 'info'];
const INITIAL_VISIBLE_CATEGORIES = 3;

export default function Launchpad() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [target, setTarget] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSeverities, setSelectedSeverities] = useState([]);
  const [silent, setSilent] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleSeverity = (sev) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    );
  };

  const toggleCategory = (cat) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : '');
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.txt')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
      setFileName(file.name);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targets = target.split('\n').map(t => t.trim()).filter(Boolean);
    if (!targets.length && !fileRef.current?.files?.[0]) {
      setError('Please enter a target URL/IP or upload a file.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      if (targets.length) formData.append('targets', JSON.stringify(targets));
      if (fileRef.current?.files?.[0]) formData.append('targetFile', fileRef.current.files[0]);

      const allTags = [...selectedTags, ...selectedSeverities];
      if (allTags.length) formData.append('tags', JSON.stringify(allTags));
      formData.append('silent', silent);
      formData.append('verbose', verbose);

      connectWebSocket();
      await startScan(formData);
      navigate('/monitor');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchLower = tagSearch.toLowerCase();
  const categoryEntries = Object.entries(TAG_CATEGORIES);
  const filteredCategories = categoryEntries.filter(([, tags]) => {
    if (!searchLower) return true;
    return tags.some((t) => t.includes(searchLower));
  });
  const visibleCategories = showAllCategories || searchLower
    ? filteredCategories
    : filteredCategories.slice(0, INITIAL_VISIBLE_CATEGORIES);
  const hiddenCount = filteredCategories.length - INITIAL_VISIBLE_CATEGORIES;

  return (
    <div className="page-container animate-fade-in">
      <div className="launchpad-header">
        <h1 className="page-title launchpad-title">Scan Launchpad</h1>
        <p className="page-subtitle">
          Configure your vulnerability scan targets, templates, and execution parameters.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="launchpad-form">
        {/* ─── Section 1: Targets ─── */}
        <div className="form-section-wrapper">
          <div className="section-number-row">
            <span className="section-number">1</span>
            <h2 className="section-heading">Targets</h2>
          </div>
          <div className="glass-card form-section">
            <label className="field-label">Target URLs / IPs</label>
            <textarea
              className="input-field target-textarea"
              placeholder="Enter URLs (e.g., https://example.com) or IP ranges (e.g., 192.168.1.0/24), one per line..."
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              rows={4}
            />
            <div
              className={`drop-zone ${isDragOver ? 'drop-zone-active' : ''} ${fileName ? 'drop-zone-has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div className="drop-zone-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <span className="drop-zone-title">
                {fileName || 'Upload Target List'}
              </span>
              <span className="drop-zone-hint">
                {fileName ? 'Click or drop to replace' : 'Drag and drop your .txt file here or browse'}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Section 2: Template Tags ─── */}
        <div className="form-section-wrapper">
          <div className="section-number-row">
            <span className="section-number">2</span>
            <h2 className="section-heading">Template Tags</h2>
          </div>
          <div className="glass-card form-section">
            {/* Selected Tags Summary */}
            {selectedTags.length > 0 && (
              <div className="selected-tags-summary">
                <span className="selected-label">SELECTED:</span>
                <div className="selected-tags-list">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="tag-chip active tag-removable"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag} <span className="tag-remove-x">×</span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="clear-tags-btn"
                  onClick={() => setSelectedTags([])}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Search */}
            <div className="tag-search-wrapper">
              <svg className="tag-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="input-field tag-search-input"
                placeholder="Search templates..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
              />
            </div>

            {/* Category Dropdowns */}
            <div className="tag-categories">
              {visibleCategories.map(([category, tags]) => {
                const filteredTags = searchLower
                  ? tags.filter((t) => t.includes(searchLower))
                  : tags;

                if (filteredTags.length === 0) return null;

                const isExpanded = expandedCategories[category];

                return (
                  <div key={category} className={`tag-category ${isExpanded ? 'tag-category-open' : ''}`}>
                    <button
                      type="button"
                      className="tag-category-header"
                      onClick={() => toggleCategory(category)}
                    >
                      <span className="tag-category-name">{category}</span>
                      <svg className={`tag-category-chevron ${isExpanded ? 'rotated' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="tags-grid animate-fade-in">
                        {filteredTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show more / less */}
            {!searchLower && hiddenCount > 0 && (
              <button
                type="button"
                className="show-more-btn"
                onClick={() => setShowAllCategories(!showAllCategories)}
              >
                {showAllCategories
                  ? 'Show fewer categories'
                  : `Show ${hiddenCount} more categories`}
              </button>
            )}
          </div>
        </div>

        {/* ─── Section 3: Severity ─── */}
        <div className="form-section-wrapper">
          <div className="section-number-row">
            <span className="section-number">3</span>
            <h2 className="section-heading">Severity</h2>
          </div>
          <div className="glass-card form-section">
            <p className="section-description">Select the severity levels to include in the scan.</p>
            <div className="severity-row">
              {SEVERITY_TAGS.map((sev) => (
                <button
                  key={sev}
                  type="button"
                  className={`severity-chip severity-chip-${sev} ${selectedSeverities.includes(sev) ? 'active' : ''}`}
                  onClick={() => toggleSeverity(sev)}
                >
                  <span className={`severity-dot severity-dot-${sev}`}></span>
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Section 4: Scan Options ─── */}
        <div className="form-section-wrapper">
          <div className="section-number-row">
            <span className="section-number">4</span>
            <h2 className="section-heading">Scan Options</h2>
          </div>
          <div className="glass-card form-section">
            <div className="options-grid">
              <label className="option-card">
                <div className="option-card-header">
                  <input type="checkbox" checked={silent} onChange={() => setSilent(!silent)} />
                  <span className="toggle-slider"></span>
                  <span className="option-title">Silent Mode</span>
                </div>
                <p className="option-description">Only display found vulnerabilities, suppress errors and progress bars.</p>
              </label>
              <label className="option-card">
                <div className="option-card-header">
                  <input type="checkbox" checked={verbose} onChange={() => setVerbose(!verbose)} />
                  <span className="toggle-slider"></span>
                  <span className="option-title">Verbose Output</span>
                </div>
                <p className="option-description">Show detailed request/response pairs for every finding.</p>
              </label>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button type="submit" className="btn launch-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span> Starting...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
              Start Security Scan
            </>
          )}
        </button>
      </form>
    </div>
  );
}

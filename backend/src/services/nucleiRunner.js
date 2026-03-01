import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

let currentProcess = null;
let scanState = { status: 'idle', startedAt: null, findings: 0 };

const REPORTING_CONFIG_PATH = '/tmp/nuclei-reporting.yaml';

/**
 * Generate Nuclei reporting config YAML for Elasticsearch.
 * Uses the official format: https://docs.projectdiscovery.io/tools/nuclei/running#reporting
 */
function generateReportingConfig() {
    const esHost = process.env.ES_HOST || '127.0.0.1';
    const esPort = process.env.ES_PORT || '9200';
    const esIndex = process.env.ES_INDEX || 'nuclei';

    const yaml = `# Nuclei Elasticsearch reporting config
elasticsearch:
  # IP for elasticsearch instance
  ip: ${esHost}
  # Port is the port of elasticsearch instance
  port: ${esPort}
  # IndexName is the name of the elasticsearch index
  index-name: ${esIndex}
  # Username and password (required by nuclei, even if ES security is disabled)
  username: elastic
  password: changeme
`;
    writeFileSync(REPORTING_CONFIG_PATH, yaml, 'utf-8');
    console.log(`[Nuclei] Reporting config written to ${REPORTING_CONFIG_PATH}`);
}

export function getScanState() {
    return { ...scanState };
}

export function startScan({ targets, tags, silent, verbose }, onLog) {
    if (currentProcess) {
        throw new Error('A scan is already running.');
    }

    // Generate the reporting config for Elasticsearch
    generateReportingConfig();

    const args = ['-jsonl'];

    // Targets
    if (Array.isArray(targets)) {
        targets.forEach((t) => args.push('-u', t));
    } else if (targets) {
        args.push('-u', targets);
    }

    // Tags
    if (tags && tags.length > 0) {
        args.push('-tags', tags.join(','));
    }

    // Modes
    if (silent) args.push('-silent');
    if (verbose) args.push('-v');

    // Official Nuclei reporting config flag
    args.push('-rc', REPORTING_CONFIG_PATH);

    console.log(`[Nuclei] Spawning: nuclei ${args.join(' ')}`);

    scanState = { status: 'running', startedAt: new Date().toISOString(), findings: 0 };

    currentProcess = spawn('nuclei', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    currentProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        lines.forEach((line) => {
            onLog?.(`[stdout] ${line}`);
            try {
                JSON.parse(line);
                scanState.findings++;
            } catch {
                // Non-JSON line, just log it
            }
        });
    });

    currentProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        lines.forEach((line) => onLog?.(`[stderr] ${line}`));
    });

    currentProcess.on('close', (code) => {
        scanState.status = code === 0 ? 'complete' : 'error';
        onLog?.(`[system] Scan finished with exit code ${code}`);
        currentProcess = null;
    });

    currentProcess.on('error', (err) => {
        scanState.status = 'error';
        onLog?.(`[system] Scan error: ${err.message}`);
        currentProcess = null;
    });
}

export function stopScan() {
    if (!currentProcess) {
        return false;
    }
    currentProcess.kill('SIGTERM');
    scanState.status = 'stopped';
    currentProcess = null;
    return true;
}

import { Router } from 'express';
import multer from 'multer';
import { readFileSync } from 'fs';
import { startScan, stopScan, getScanState } from '../services/nucleiRunner.js';
import { getWss } from '../index.js';

const router = Router();
const upload = multer({ dest: '/tmp/nuclei-uploads/' });

// Start a new scan
router.post('/start', upload.single('targetFile'), (req, res) => {
    try {
        let { targets, tags, silent, verbose } = req.body;

        // Parse targets from JSON if needed
        if (typeof targets === 'string') {
            try { targets = JSON.parse(targets); } catch { targets = [targets]; }
        }

        // If a file was uploaded, add its targets
        if (req.file) {
            const fileContent = readFileSync(req.file.path, 'utf-8');
            const fileTargets = fileContent.split('\n').map((l) => l.trim()).filter(Boolean);
            targets = [...(targets || []), ...fileTargets];
        }

        // Parse tags
        if (typeof tags === 'string') {
            try { tags = JSON.parse(tags); } catch { tags = tags.split(',').map((t) => t.trim()); }
        }

        // Broadcast logs to all WebSocket clients
        const onLog = (line) => {
            const wss = getWss();
            wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({ type: 'log', data: line }));
                }
            });
        };

        startScan({ targets, tags, silent: silent === 'true' || silent === true, verbose: verbose === 'true' || verbose === true }, onLog);

        res.json({ success: true, message: 'Scan started.' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Stop the running scan
router.post('/stop', (req, res) => {
    const stopped = stopScan();
    res.json({ success: stopped, message: stopped ? 'Scan stopped.' : 'No scan running.' });
});

// Get scan status
router.get('/status', (req, res) => {
    res.json(getScanState());
});

export default router;

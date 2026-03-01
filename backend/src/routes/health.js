import { Router } from 'express';
import { checkHealth } from '../services/elasticsearch.js';

const router = Router();

router.get('/', async (req, res) => {
    const esHealth = await checkHealth();
    // Check if nuclei binary is available
    let nucleiAvailable = false;
    try {
        const { execSync } = await import('child_process');
        execSync('nuclei -version', { stdio: 'pipe' });
        nucleiAvailable = true;
    } catch {
        nucleiAvailable = false;
    }

    res.json({
        elasticsearch: esHealth,
        nuclei: nucleiAvailable,
        uptime: process.uptime(),
    });
});

export default router;

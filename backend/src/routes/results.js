import { Router } from 'express';
import { searchResults, getSummary, getResultById } from '../services/elasticsearch.js';

const router = Router();

// Get paginated results
router.get('/', async (req, res) => {
    try {
        const { q, page = 1, size = 50, severity, target } = req.query;
        const data = await searchResults({ query: q, page: Number(page), size: Number(size), severity, target });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get severity summary / aggregation
router.get('/summary', async (req, res) => {
    try {
        const { target } = req.query;
        const data = await getSummary(target);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single result by ID
router.get('/:id', async (req, res) => {
    try {
        const data = await getResultById(req.params.id);
        res.json(data);
    } catch (err) {
        res.status(404).json({ error: 'Result not found.' });
    }
});

export default router;

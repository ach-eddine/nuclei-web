import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

import healthRouter from './routes/health.js';
import scanRouter from './routes/scan.js';
import resultsRouter from './routes/results.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/scan', scanRouter);
app.use('/api/results', resultsRouter);

// HTTP + WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.on('close', () => console.log('[WS] Client disconnected'));
});

export function getWss() {
    return wss;
}

// Start
async function boot() {

    server.listen(PORT, () => {
        console.log(`[Server] Nuclei Dashboard backend running on http://localhost:${PORT}`);
    });
}

boot();

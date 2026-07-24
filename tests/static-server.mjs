// Tiny zero-dependency static file server for the test harness.
//
// The Playwright suites used to assume something was already serving the repo
// on :8000 and failed cryptically when it wasn't. Now each suite calls
// ensureServer(), which spins up an ephemeral-port static server rooted at the
// repo. Set WHIST_URL to point the suites at an external server instead.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

/**
 * Start a static server rooted at the repo. Resolves to { url, close }.
 * The server is unref'd so it never keeps the process alive on its own.
 */
export function ensureServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            try {
                let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
                if (urlPath === '/' || urlPath.endsWith('/')) urlPath += 'index.html';
                // Resolve within ROOT and reject any traversal outside it.
                const filePath = path.join(ROOT, urlPath);
                if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
                const body = await readFile(filePath);
                res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
                res.end(body);
            } catch {
                res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
            }
        });
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.unref();
            resolve({ url: `http://127.0.0.1:${port}/`, close: () => new Promise(r => server.close(r)) });
        });
    });
}

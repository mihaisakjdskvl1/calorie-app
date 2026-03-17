import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const N8N_WEBHOOK_URL =
  'https://moshnoi2000.app.n8n.cloud/webhook/539ed024-e9d2-4fd7-a928-ae14b53f4c0c';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function withCors(headers = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  };
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return send(res, 400, 'Bad Request');
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      return send(res, 204, '', withCors());
    }

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      const body = await readRequestBody(req);
      const contentType =
        typeof req.headers['content-type'] === 'string'
          ? req.headers['content-type']
          : 'application/octet-stream';

      const upstream = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body,
      });

      const text = await upstream.text();
      return send(
        res,
        upstream.status,
        text,
        withCors({
          'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        }),
      );
    }

    // Static file serving
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';

    const filePath = path.join(__dirname, pathname);
    const st = await stat(filePath);
    if (!st.isFile()) return send(res, 404, 'Not Found', withCors({ 'Content-Type': 'text/plain; charset=utf-8' }));

    const ext = path.extname(filePath).toLowerCase();
    const data = await readFile(filePath);
    return send(res, 200, data, withCors({ 'Content-Type': MIME[ext] || 'application/octet-stream' }));
  } catch (e) {
    return send(res, 500, `Server error: ${e?.message || e}`, withCors({ 'Content-Type': 'text/plain; charset=utf-8' }));
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Dev server running on http://localhost:${PORT}`);
});


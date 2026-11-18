import express from 'express';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

function getFreePort(preferredPort) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', () => {
      const fallback = net.createServer();
      fallback.unref();
      fallback.on('error', reject);
      fallback.listen(0, '127.0.0.1', () => {
        const addr = fallback.address();
        const port = typeof addr === 'object' && addr ? addr.port : 9002;
        fallback.close(() => resolve(port));
      });
    });
    srv.listen(preferredPort, '127.0.0.1', () => {
      srv.close(() => resolve(preferredPort));
    });
  });
}

async function waitForPythonBackend(baseUrl, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {
      // Backend still starting
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Python backend failed to respond within timeout.');
}

async function startServer() {
  const pythonPort = await getFreePort(9001);
  const pythonUrl = `http://127.0.0.1:${pythonPort}`;
  const backendScript = path.resolve(process.cwd(), 'backend', 'app.py');

  const pythonProc = spawn('python', [backendScript], {
    env: {
      ...process.env,
      PYTHON_BACKEND_HOST: '127.0.0.1',
      PYTHON_BACKEND_PORT: String(pythonPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pythonProc.stdout?.on('data', (chunk) => {
    process.stdout.write(`[python] ${chunk.toString()}`);
  });

  pythonProc.stderr?.on('data', (chunk) => {
    process.stderr.write(`[python] ${chunk.toString()}`);
  });

  const cleanup = () => {
    if (!pythonProc.killed) {
      pythonProc.kill('SIGTERM');
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  await waitForPythonBackend(pythonUrl);

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.use('/api', async (req, res) => {
    try {
      const targetUrl = `${pythonUrl}/api${req.url}`;
      const headers = {};
      if (req.headers['content-type']) {
        headers['content-type'] = String(req.headers['content-type']);
      }

      const init = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = JSON.stringify(req.body ?? {});
      }

      const upstream = await fetch(targetUrl, init);
      const bodyText = await upstream.text();

      res.status(upstream.status);
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') || 'application/json'
      );
      res.send(bodyText);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to reach Python backend.';
      res.status(502).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `ResumeLens gateway listening on http://localhost:${PORT} -> Python API at ${pythonUrl}`
    );
  });
}

startServer();

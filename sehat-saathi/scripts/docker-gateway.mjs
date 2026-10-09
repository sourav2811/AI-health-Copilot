import http from 'node:http';

// Single-user local demo identity. This gateway is not production authentication.
export function createGateway(upstreamPort = 8787) {
  return http.createServer((req, res) => {
    const host = req.headers.host;
    if (!['localhost:3000', '127.0.0.1:3000'].includes(host)) {
      res.writeHead(403).end('Use http://localhost:3000'); return;
    }
    if (req.headers.origin && req.headers.origin !== `http://${host}`) {
      res.writeHead(403).end('Origin not allowed'); return;
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403).end('Cross-site requests are not allowed'); return;
    }
    const headers = { ...req.headers };
    for (const name of Object.keys(headers)) {
      if (name.startsWith('oai-') || name.startsWith('x-forwarded-') || ['forwarded', 'authorization', 'cookie'].includes(name)) delete headers[name];
    }
    headers['oai-authenticated-user-id'] = 'docker-local-demo';
    headers['oai-authenticated-user-email'] = 'local-demo@example.test';
    headers['oai-authenticated-user-full-name'] = 'Local%20Docker%20Demo';
    headers['oai-authenticated-user-full-name-encoding'] = 'percent-encoded-utf-8';
    headers.host = `127.0.0.1:${upstreamPort}`;
    if (headers.origin) headers.origin = `http://${headers.host}`;
    const health = req.url === '/healthz';
    const proxy = http.request({ hostname: '127.0.0.1', port: upstreamPort, path: health ? '/api/health/status' : req.url, method: health ? 'GET' : req.method, headers }, upstream => {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
    });
    proxy.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end('Server is starting. Please retry shortly.'); });
    req.on('aborted', () => proxy.destroy());
    req.pipe(proxy);
  });
}

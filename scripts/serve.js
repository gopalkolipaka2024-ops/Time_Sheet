#!/usr/bin/env node
// Minimal static file server for local preview and the test suite.
// Usage: node scripts/serve.js [port]
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8'
};

function start(port = 0) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) file = path.join(file, 'index.html');
      fs.readFile(file, (readErr, data) => {
        if (readErr) {
          res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
          return;
        }
        res.writeHead(200, {
          'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
          'cache-control': 'no-store'
        });
        res.end(data);
      });
    });
  });
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${server.address().port}/`;
      resolve({ url, close: () => new Promise(r => server.close(r)) });
    });
  });
}

module.exports = { start };

if (require.main === module) {
  start(Number(process.argv[2]) || 8080).then(({ url }) => console.log(`Timesheet running at ${url}`));
}

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  // 自动同步游戏状态接口
  if (req.method === 'POST' && req.url === '/api/sync-game-state') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      fs.writeFile(path.join(__dirname, '.active_game.json'), body, err => {
        if (err) console.error('[AutoSync Error]', err);
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  filePath = path.normalize(filePath);

  // 防止路径穿越
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 关键：禁用所有 HTTP 缓存，防止浏览器强缓存旧版本的 app.js / style.css
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

let currentPort = parseInt(PORT, 10);

function startServer(port) {
  server.listen(port, () => {
    console.log(`====================================================`);
    console.log(` Gomoku Dev Server is running live with No-Cache!   `);
    console.log(` Access URL: http://localhost:${port}             `);
    console.log(` Local Path: ${__dirname}                          `);
    console.log(`====================================================`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Server Notice] 端口 ${currentPort} 已被后台服务占用，正在自动切换至下一个空闲端口 http://localhost:${currentPort + 1}...`);
    currentPort++;
    setTimeout(() => {
      startServer(currentPort);
    }, 200);
  } else {
    console.error('[Server Error]', err);
  }
});

startServer(currentPort);

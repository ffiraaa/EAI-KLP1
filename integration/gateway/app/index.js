const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ── Service URLs ─────────────────────────────────
const services = {
  pos:         process.env.POS_URL         || 'http://pos:3001',
  inventory:   process.env.INVENTORY_URL   || 'http://inventory:3002',
  accounting:  process.env.ACCOUNTING_URL  || 'http://accounting:3003',
  ecommerce:   process.env.ECOMMERCE_URL   || 'http://ecommerce:3004',
  crm:         process.env.CRM_URL         || 'http://crm:3005',
  transformer: process.env.TRANSFORMER_URL || 'http://transformer:3006'
};

// ── Proxy Options ─────────────────────────────────
const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  proxyTimeout: 30000,
  timeout: 30000,
  on: {
    error: (err, req, res) => {
      console.error(`[Gateway] Proxy error: ${err.message}`);
      res.status(502).json({ success: false, message: 'Service tidak tersedia' });
    }
  }
});

// ── Logging Middleware ───────────────────────────
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path}`);
  next();
});

// ── Proxy Routes ─────────────────────────────────
app.use('/api/pos', createProxyMiddleware({
  ...proxyOptions(services.pos),
  pathRewrite: { '^/api/pos': '' }
}));

app.use('/api/inventory', createProxyMiddleware({
  ...proxyOptions(services.inventory),
  pathRewrite: { '^/api/inventory': '' }
}));

app.use('/api/accounting', createProxyMiddleware({
  ...proxyOptions(services.accounting),
  pathRewrite: { '^/api/accounting': '' }
}));

app.use('/api/ecommerce', createProxyMiddleware({
  ...proxyOptions(services.ecommerce),
  pathRewrite: { '^/api/ecommerce': '' }
}));

app.use('/api/crm', createProxyMiddleware({
  ...proxyOptions(services.crm),
  pathRewrite: { '^/api/crm': '' }
}));

// ── Info Route ───────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'API Gateway',
    version: '1.0.0',
    endpoints: {
      pos:        '/api/pos',
      inventory:  '/api/inventory',
      accounting: '/api/accounting',
      ecommerce:  '/api/ecommerce',
      crm:        '/api/crm'
    }
  });
});

// ── Health Check semua service ───────────────────
app.get('/health', async (req, res) => {
  const http = require('http');

  function checkService(url) {
    return new Promise((resolve) => {
      http.get(`${url}/health`, (r) => {
        resolve(r.statusCode === 200 ? 'ok' : 'error');
      }).on('error', () => resolve('unreachable'));
    });
  }

  const results = await Promise.all([
    checkService(services.pos),
    checkService(services.inventory),
    checkService(services.accounting),
    checkService(services.ecommerce),
    checkService(services.crm)
  ]);

  res.json({
    gateway: 'ok',
    services: {
      pos:        results[0],
      inventory:  results[1],
      accounting: results[2],
      ecommerce:  results[3],
      crm:        results[4]
    }
  });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway berjalan di port ${PORT}`);
  console.log(`📋 Routes tersedia:`);
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   /api/${name} → ${url}`);
  });
});
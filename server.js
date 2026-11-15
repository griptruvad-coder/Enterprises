'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./src/config');
const sec = require('./src/security');
const { router: api, webhook } = require('./src/api');
const admin = require('./src/admin');
const { ValidationError } = require('./src/validate');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Render / any single reverse proxy: real client IP for rate limits

/* ---------- Security headers ---------- */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*.razorpay.com'],
      mediaSrc: ["'self'", 'https://prakharenterprises.in', 'https://www.prakharenterprises.in'],
      connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
      frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,                       // Razorpay checkout iframe
  hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
}));
app.use((_req, res, next) => {
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")');
  next();
});

/* ---------- Webhook needs the raw body for signature checks ---------- */
app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json', limit: '100kb' }), webhook);

/* ---------- API ---------- */
app.use('/api', express.json({ limit: '32kb', strict: true }));
app.use('/api', cookieParser());
app.use('/api', sec.loadUser);
app.use('/api', sec.sameOriginJson);
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/admin', admin);
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* ---------- Static site ---------- */
const pub = path.join(__dirname, 'public');
app.use(express.static(pub, {
  index: false,
  dotfiles: 'deny',
  setHeaders(res, file) {
    if (/\.(jpg|png|mp4|woff2?)$/.test(file)) res.set('Cache-Control', 'public, max-age=604800');
    else res.set('Cache-Control', 'no-cache');
  },
}));
app.get('/admin', (_req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(pub, 'admin.html')); });
app.get('/', (_req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(pub, 'index.html')); });
app.use((_req, res) => res.status(404).sendFile(path.join(pub, 'index.html')));

/* ---------- Errors: never leak internals ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message, field: err.field });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  const status = err.status && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 && !err.expose && status !== 502 ? 'Something went wrong. Please try again.' : err.message });
});

const server = app.listen(config.port, () => {
  console.log(`SBS 2026 running on :${config.port} (${config.isProd ? 'production' : 'development'}) — payments ${config.paymentsEnabled ? 'ON' : 'OFF'}`);
});
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { server.close(() => { require('./src/db').close(); process.exit(0); }); });
}

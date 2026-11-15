'use strict';
// All runtime settings come from environment variables. See .env.example.
const path = require('path');

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function list(v) {
  return String(v || '').split(',').map(s => s.trim()).filter(Boolean);
}

// Prices live on the server only. The browser never decides what a pass costs.
// Amounts are in rupees; edit here (or via TIER_PRICES env) before going live.
const TIERS = {
  delegate: { name: 'Delegate Pass', price: 1499 },
  founder: { name: 'Founder Pass', price: 2999 },
  vip: { name: 'VIP Pass', price: 9999 },
};
// Optional override, e.g. TIER_PRICES="delegate:1499,founder:2999,vip:9999"
for (const pair of list(env.TIER_PRICES)) {
  const [k, v] = pair.split(':');
  const n = Number(v);
  if (TIERS[k] && Number.isInteger(n) && n > 0) TIERS[k].price = n;
}

// Promo codes, e.g. PROMO_CODES="SBS10:10,FOUNDER20:20" (percent off)
const PROMOS = {};
for (const pair of list(env.PROMO_CODES)) {
  const [k, v] = pair.split(':');
  const n = Number(v);
  if (k && Number.isInteger(n) && n > 0 && n <= 90) PROMOS[k.toUpperCase()] = n;
}

const config = {
  isProd,
  port: Number(env.PORT) || 3000,
  dbPath: env.DB_PATH || path.join(__dirname, '..', 'data', 'sbs.db'),
  // Public URL of the site, used to reject cross-site requests. e.g. https://sbs2026.in
  appOrigins: list(env.APP_ORIGIN || (isProd ? '' : 'http://localhost:3000')),
  adminEmails: list(env.ADMIN_EMAILS).map(e => e.toLowerCase()),
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID || '',
    keySecret: env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
    // Test hook only: lets local tests point at a mock. Ignored in production.
    apiBase: (!isProd && env.RAZORPAY_API_BASE) || 'https://api.razorpay.com/v1',
  },
  sessionDays: 30,
  gstPct: 18,
  maxQty: 10,
  maxPitchesPerUser: 3,
  TIERS,
  PROMOS,
};

config.paymentsEnabled = Boolean(config.razorpay.keyId && config.razorpay.keySecret);

if (isProd && config.appOrigins.length === 0) {
  console.error('FATAL: APP_ORIGIN must be set in production (e.g. https://your-site.onrender.com).');
  process.exit(1);
}

module.exports = config;

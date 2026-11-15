'use strict';
const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const config = require('./config');
const v = require('./validate');
const sec = require('./security');

const router = express.Router();
const now = () => Date.now();

/* ---------- Rate limits (per IP; Render's proxy is trusted in server.js) ---------- */
const limiter = (windowMin, max, message) => rateLimit({
  windowMs: windowMin * 60 * 1000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: message || 'Too many requests. Please wait a few minutes and try again.' },
});
const authLimit = limiter(15, 20, 'Too many sign-in attempts. Try again in 15 minutes.');
const signupLimit = limiter(60, 10, 'Too many accounts created from this network. Try again later.');
const writeLimit = limiter(10, 30);
const promoLimit = limiter(10, 20, 'Too many promo attempts. Try again later.');

/* ---------- Helpers ---------- */
const publicUser = u => u && ({ name: u.name, email: u.email, phone: u.phone, role: u.role, since: u.created_at });

function handle(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/* =================== CONFIG =================== */
router.get('/config', (_req, res) => {
  const tiers = Object.entries(config.TIERS).map(([id, t]) => ({ id, name: t.name, price: t.price }));
  res.json({ tiers, gstPct: config.gstPct, maxQty: config.maxQty, paymentsEnabled: config.paymentsEnabled, razorpayKeyId: config.razorpay.keyId || null });
});

/* =================== AUTH =================== */
const qUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const qInsertUser = db.prepare('INSERT INTO users (email, name, phone, pw_hash, role, created_at) VALUES (?,?,?,?,?,?)');
const qLoginFail = db.prepare('UPDATE users SET failed_logins = failed_logins + 1, locked_until = CASE WHEN failed_logins + 1 >= 8 THEN ? ELSE locked_until END WHERE id = ?');
const qLoginOk = db.prepare('UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?');
const qPromote = db.prepare("UPDATE users SET role = 'admin' WHERE id = ?");
const qDelUserSessions = db.prepare('DELETE FROM sessions WHERE user_id = ?');

router.post('/auth/signup', signupLimit, handle(async (req, res) => {
  const b = req.body || {};
  const name = v.str(b, 'name', { min: 2, max: 80 });
  const email = v.email(b);
  const phone = v.phone(b);
  const pw = v.password(b);
  if (sec.isWeak(pw, email, name)) throw new v.ValidationError('password', 'This password is too easy to guess. Try a longer phrase.');
  if (qUserByEmail.get(email)) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', field: 'email' });
  const role = config.adminEmails.includes(email) ? 'admin' : 'user';
  const info = qInsertUser.run(email, name, phone, await sec.hashPassword(pw), role, now());
  sec.startSession(res, info.lastInsertRowid);
  res.status(201).json({ user: publicUser({ name, email, phone, role, created_at: now() }) });
}));

router.post('/auth/login', authLimit, handle(async (req, res) => {
  const b = req.body || {};
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 254) : '';
  const pw = typeof b.password === 'string' ? b.password.slice(0, 128) : '';
  const generic = { error: 'Email or password is incorrect.' };
  const user = email ? qUserByEmail.get(email) : null;
  if (!user) { await sec.burnTime(pw || 'x'); return res.status(401).json(generic); }
  if (user.locked_until > now()) {
    return res.status(429).json({ error: 'Too many wrong passwords. This account is locked for 15 minutes.' });
  }
  if (!pw || !(await sec.verifyPassword(pw, user.pw_hash))) {
    qLoginFail.run(now() + 15 * 60 * 1000, user.id);
    return res.status(401).json(generic);
  }
  qLoginOk.run(user.id);
  if (user.role !== 'admin' && config.adminEmails.includes(user.email)) { qPromote.run(user.id); user.role = 'admin'; }
  // Fresh session on every login (prevents session fixation)
  sec.endSession(req, res);
  sec.startSession(res, user.id);
  res.json({ user: publicUser(user) });
}));

router.post('/auth/logout', (req, res) => {
  sec.endSession(req, res);
  res.json({ ok: true });
});

router.post('/auth/logout-all', sec.requireAuth, (req, res) => {
  qDelUserSessions.run(req.user.id);
  sec.endSession(req, res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ user: publicUser(req.user) });
});

/* =================== NEWSLETTER =================== */
const qSub = db.prepare('INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)');
router.post('/notify', writeLimit, (req, res) => {
  const email = v.email(req.body || {});
  qSub.run(email, now());
  res.json({ ok: true });
});

/* =================== PITCHES =================== */
const SECTORS = ['AI & Deep Tech', 'Fintech', 'D2C & Consumer', 'Health & Biotech', 'EdTech', 'Agritech', 'Climate & Energy', 'SaaS & B2B', 'Manufacturing', 'Other'];
const STAGES = ['Idea', 'Prototype / MVP', 'Early revenue', 'Growth'];
const SOURCES = ['', 'Incubator / college', 'Instagram', 'LinkedIn', 'WhatsApp', 'A friend', 'Other'];
const qCountPitches = db.prepare('SELECT COUNT(*) AS n FROM pitches WHERE user_id = ?');
const qInsertPitch = db.prepare(`INSERT INTO pitches (id,user_id,name,role,email,phone,city,linkedin,startup,sector,stage,oneliner,problem,team,ask_lakh,deck,video,why,source,created_at)
  VALUES (@id,@user_id,@name,@role,@email,@phone,@city,@linkedin,@startup,@sector,@stage,@oneliner,@problem,@team,@ask_lakh,@deck,@video,@why,@source,@created_at)`);
const qMyPitches = db.prepare('SELECT id, startup, sector, stage, status, created_at FROM pitches WHERE user_id = ? ORDER BY created_at DESC');

router.post('/pitches', sec.requireAuth, writeLimit, (req, res) => {
  const b = req.body || {};
  if (qCountPitches.get(req.user.id).n >= config.maxPitchesPerUser) {
    return res.status(409).json({ error: `You can submit up to ${config.maxPitchesPerUser} applications per account.` });
  }
  if (b.consent !== true) throw new v.ValidationError('consent', 'Please confirm to continue.');
  const p = {
    id: sec.randomId('SBS26-P-', 6),
    user_id: req.user.id,
    name: v.str(b, 'name', { min: 2, max: 80 }),
    role: v.str(b, 'role', { min: 2, max: 80 }),
    email: v.email(b),
    phone: v.phone(b),
    city: v.str(b, 'city', { min: 2, max: 60 }),
    linkedin: v.url(b, 'linkedin', { optional: true }),
    startup: v.str(b, 'startup', { min: 2, max: 80 }),
    sector: v.oneOf(b, 'sector', SECTORS),
    stage: v.oneOf(b, 'stage', STAGES),
    oneliner: v.str(b, 'oneliner', { min: 10, max: 140 }),
    problem: v.str(b, 'problem', { min: 30, max: 3000, multiline: true }),
    team: v.int(b, 'team', { min: 1, max: 10000, optional: true }),
    ask_lakh: v.num(b, 'ask', { min: 0, max: 100000, optional: true }),
    deck: v.url(b, 'deck'),
    video: v.url(b, 'video', { optional: true }),
    why: v.str(b, 'why', { min: 20, max: 2000, multiline: true }),
    source: b.source ? v.oneOf(b, 'source', SOURCES) : null,
    created_at: now(),
  };
  qInsertPitch.run(p);
  res.status(201).json({ id: p.id });
});

router.get('/me/pitches', sec.requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ pitches: qMyPitches.all(req.user.id) });
});

/* =================== TICKETS & PAYMENTS (Razorpay) =================== */
function quote(tierId, qty, promoCode) {
  const tier = config.TIERS[tierId];
  if (!tier) throw new v.ValidationError('tier', 'Choose a valid pass.');
  if (!Number.isInteger(qty) || qty < 1 || qty > config.maxQty) throw new v.ValidationError('qty', `Choose 1 to ${config.maxQty} passes.`);
  const code = typeof promoCode === 'string' ? promoCode.trim().toUpperCase().slice(0, 30) : '';
  const pct = code && config.PROMOS[code] ? config.PROMOS[code] : 0;
  if (code && !pct) throw new v.ValidationError('promo', 'That promo code isn’t valid.');
  const unit = tier.price * 100;                       // paise
  const subtotal = unit * qty;
  const discount = Math.round(subtotal * pct / 100);
  const gst = Math.round((subtotal - discount) * config.gstPct / 100);
  return { tier, unit, subtotal, discount, gst, total: subtotal - discount + gst, pct, code: pct ? code : null };
}

router.post('/promo', promoLimit, (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase().slice(0, 30) : '';
  const pct = config.PROMOS[code] || 0;
  if (!pct) return res.status(404).json({ error: 'That code isn’t valid. Check the spelling and try again.' });
  res.json({ code, pct });
});

async function razorpay(method, path, body) {
  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const r = await fetch(config.razorpay.apiBase + path, {
    method, headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('Razorpay error', r.status, data && data.error && data.error.description);
    const e = new Error('Payment service is unavailable. Please try again.'); e.status = 502; throw e;
  }
  return data;
}

const qInsertOrder = db.prepare(`INSERT INTO orders (id,user_id,tier,qty,unit_price,promo,discount_pct,subtotal,discount,gst,total,attendee_name,attendee_email,attendee_phone,created_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const qOrder = db.prepare('SELECT * FROM orders WHERE id = ?');
const qMarkPaid = db.prepare("UPDATE orders SET status='paid', payment_id=?, paid_at=? WHERE id=? AND status <> 'paid'");
const qInsertTicket = db.prepare('INSERT OR IGNORE INTO tickets (id, order_id, user_id, tier, qty, attendee_name, created_at) VALUES (?,?,?,?,?,?,?)');
const qTicketByOrder = db.prepare('SELECT * FROM tickets WHERE order_id = ?');

// Marks an order paid and issues exactly one ticket, no matter how many times it's called.
const fulfil = db.transaction((orderId, paymentId) => {
  const order = qOrder.get(orderId);
  if (!order) return null;
  qMarkPaid.run(paymentId, now(), orderId);
  let t = qTicketByOrder.get(orderId);
  if (!t) {
    qInsertTicket.run(sec.randomId('SBS26-T-', 8), orderId, order.user_id, order.tier, order.qty, order.attendee_name, now());
    t = qTicketByOrder.get(orderId);
  }
  return t;
});

function ticketView(t) {
  const tier = config.TIERS[t.tier];
  return { id: t.id, tier: t.tier, tierName: tier ? tier.name : t.tier, qty: t.qty, name: t.attendee_name, checkedIn: !!t.checked_in_at, created_at: t.created_at };
}

router.post('/orders', sec.requireAuth, writeLimit, handle(async (req, res) => {
  if (!config.paymentsEnabled) return res.status(503).json({ error: 'Online payments open soon. Please call the organisers to book.' });
  const b = req.body || {};
  const q = quote(b.tier, Number(b.qty), b.promo);
  const attendee = { name: v.str(b, 'name', { min: 2, max: 80 }), email: v.email(b), phone: v.phone(b) };
  const rp = await razorpay('POST', '/orders', {
    amount: q.total, currency: 'INR', receipt: sec.randomId('rcpt_', 12),
    notes: { tier: b.tier, qty: String(b.qty), user: String(req.user.id) },
  });
  if (rp.amount !== q.total || rp.currency !== 'INR') { const e = new Error('Payment setup failed.'); e.status = 502; throw e; }
  qInsertOrder.run(rp.id, req.user.id, b.tier, Number(b.qty), q.unit, q.code, q.pct, q.subtotal, q.discount, q.gst, q.total, attendee.name, attendee.email, attendee.phone, now());
  res.status(201).json({
    orderId: rp.id, amount: q.total, currency: 'INR', keyId: config.razorpay.keyId,
    summary: { subtotal: q.subtotal, discount: q.discount, gst: q.gst, total: q.total, pct: q.pct },
    prefill: attendee,
  });
}));

function safeEqualHex(a, b) {
  const A = Buffer.from(String(a), 'utf8'), B = Buffer.from(String(b), 'utf8');
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

router.post('/orders/verify', sec.requireAuth, writeLimit, handle(async (req, res) => {
  const b = req.body || {};
  const orderId = typeof b.razorpay_order_id === 'string' ? b.razorpay_order_id : '';
  const paymentId = typeof b.razorpay_payment_id === 'string' ? b.razorpay_payment_id : '';
  const signature = typeof b.razorpay_signature === 'string' ? b.razorpay_signature : '';
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(orderId) || !/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId) || !/^[a-f0-9]{64}$/.test(signature)) {
    return res.status(400).json({ error: 'Invalid payment details.' });
  }
  const order = qOrder.get(orderId);
  if (!order || order.user_id !== req.user.id) return res.status(404).json({ error: 'Order not found.' });
  const expected = crypto.createHmac('sha256', config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  if (!safeEqualHex(expected, signature)) return res.status(400).json({ error: 'Payment could not be verified.' });
  // Double-check with Razorpay that the money was actually captured for this order and amount.
  const pay = await razorpay('GET', `/payments/${paymentId}`);
  if (pay.order_id !== orderId || pay.amount !== order.total || !['captured', 'authorized'].includes(pay.status)) {
    return res.status(400).json({ error: 'Payment is not complete yet. If money was debited, it will be confirmed automatically.' });
  }
  const t = fulfil(orderId, paymentId);
  res.json({ ticket: ticketView(t) });
}));

// Razorpay webhook (raw body; mounted in server.js before the JSON parser). Backup path when the buyer closes the tab.
const webhook = (req, res) => {
  const secret = config.razorpay.webhookSecret;
  const sig = req.get('x-razorpay-signature') || '';
  if (!secret || !Buffer.isBuffer(req.body)) return res.status(400).end();
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!safeEqualHex(expected, sig)) return res.status(400).end();
  let evt;
  try { evt = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).end(); }
  const p = evt && evt.payload && evt.payload.payment && evt.payload.payment.entity;
  if ((evt.event === 'payment.captured' || evt.event === 'order.paid') && p && p.order_id) {
    const order = qOrder.get(p.order_id);
    if (order && p.amount === order.total) fulfil(p.order_id, p.id);
  }
  res.json({ ok: true });
};

const qMyTickets = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC');
router.get('/me/tickets', sec.requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ tickets: qMyTickets.all(req.user.id).map(ticketView) });
});

module.exports = { router, webhook, ticketView };

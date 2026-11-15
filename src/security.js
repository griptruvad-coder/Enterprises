'use strict';
const crypto = require('crypto');
const { promisify } = require('util');
const db = require('./db');
const config = require('./config');

const scrypt = promisify(crypto.scrypt);

/* ---------- Passwords: scrypt (memory-hard), per-user random salt ---------- */
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw.normalize('NFKC'), salt, KEYLEN, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

async function verifyPassword(pw, stored) {
  const [alg, N, r, p, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(pw.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length,
    { N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return crypto.timingSafeEqual(key, expected);
}

// Used when the email doesn't exist, so login takes the same time either way.
let DUMMY_HASH = null;
hashPassword(crypto.randomBytes(12).toString('hex')).then(h => { DUMMY_HASH = h; });
async function burnTime(pw) { if (DUMMY_HASH) await verifyPassword(pw, DUMMY_HASH).catch(() => {}); }

const COMMON = new Set(['password', 'password1', 'password123', '12345678', '123456789', '1234567890', 'qwerty123',
  'iloveyou', '11111111', '00000000', 'abcd1234', 'admin123', 'welcome1', 'india123', 'qwertyuiop', '87654321']);
function isWeak(pw, email, name) {
  const p = pw.toLowerCase();
  if (COMMON.has(p)) return true;
  if (/^(.)\1+$/.test(p)) return true;
  const local = email.split('@')[0].toLowerCase();
  if (local.length >= 4 && p.includes(local)) return true;
  const first = (name || '').split(/\s+/)[0].toLowerCase();
  if (first.length >= 4 && p.includes(first) && p.length < 12) return true;
  return false;
}

/* ---------- Sessions: random 256-bit token in an HttpOnly cookie; only its hash is stored ---------- */
const COOKIE = config.isProd ? '__Host-sbs_sid' : 'sbs_sid';
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

const qInsertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)');
const qGetSession = db.prepare(`SELECT u.id, u.email, u.name, u.phone, u.role, u.created_at, s.expires_at
  FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`);
const qDelSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');

function cookieOpts(maxAgeMs) {
  return { httpOnly: true, secure: config.isProd, sameSite: 'lax', path: '/', maxAge: maxAgeMs };
}

function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const ttl = config.sessionDays * 864e5;
  qInsertSession.run(sha256(token), userId, now, now + ttl);
  res.cookie(COOKIE, token, cookieOpts(ttl));
}

function endSession(req, res) {
  const token = req.cookies && req.cookies[COOKIE];
  if (token) qDelSession.run(sha256(token));
  res.clearCookie(COOKIE, { ...cookieOpts(0), maxAge: undefined });
}

function loadUser(req, _res, next) {
  req.user = null;
  const token = req.cookies && req.cookies[COOKIE];
  if (typeof token === 'string' && token.length >= 40 && token.length <= 64) {
    const hash = sha256(token);
    const row = qGetSession.get(hash);
    if (row && row.expires_at > Date.now()) {
      delete row.expires_at;
      req.user = row;
    } else if (row) {
      qDelSession.run(hash);
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  next();
}

/* ---------- CSRF defence: state-changing requests must be same-origin JSON ---------- */
function sameOriginJson(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  let source = origin;
  if (!source) {
    const ref = req.get('referer');
    try { source = ref ? new URL(ref).origin : null; } catch { source = null; }
  }
  if (!source || !config.appOrigins.includes(source)) {
    return res.status(403).json({ error: 'Request blocked (cross-site).' });
  }
  if (req.method !== 'DELETE' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Send JSON.' });
  }
  next();
}

function randomId(prefix, len = 10) {
  // Crockford-style alphabet: no 0/O/1/I confusion on printed passes
  const A = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(len);
  let s = '';
  for (const b of bytes) s += A[b % A.length];
  return prefix + s;
}

module.exports = {
  hashPassword, verifyPassword, burnTime, isWeak,
  startSession, endSession, loadUser, requireAuth, requireAdmin, sameOriginJson, randomId, COOKIE,
};

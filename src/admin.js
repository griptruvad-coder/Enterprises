'use strict';
const express = require('express');
const db = require('./db');
const config = require('./config');
const sec = require('./security');
const { ticketView } = require('./api');

const router = express.Router();
router.use(sec.requireAdmin);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/stats', (_req, res) => {
  const one = sql => db.prepare(sql).get();
  res.json({
    users: one('SELECT COUNT(*) n FROM users').n,
    pitches: one('SELECT COUNT(*) n FROM pitches').n,
    shortlisted: one("SELECT COUNT(*) n FROM pitches WHERE status='shortlisted'").n,
    ticketsSold: one("SELECT COALESCE(SUM(qty),0) n FROM orders WHERE status='paid'").n,
    revenue: one("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status='paid'").n, // paise
    checkedIn: one('SELECT COALESCE(SUM(qty),0) n FROM tickets WHERE checked_in_at IS NOT NULL').n,
    subscribers: one('SELECT COUNT(*) n FROM subscribers').n,
    byTier: db.prepare("SELECT tier, SUM(qty) qty, SUM(total) total FROM orders WHERE status='paid' GROUP BY tier").all(),
  });
});

const PITCH_COLS = 'id,name,role,email,phone,city,linkedin,startup,sector,stage,oneliner,problem,team,ask_lakh,deck,video,why,source,status,created_at';
router.get('/pitches', (req, res) => {
  const status = ['review', 'shortlisted', 'rejected'].includes(req.query.status) ? req.query.status : null;
  const rows = status
    ? db.prepare(`SELECT ${PITCH_COLS} FROM pitches WHERE status=? ORDER BY created_at DESC LIMIT 2000`).all(status)
    : db.prepare(`SELECT ${PITCH_COLS} FROM pitches ORDER BY created_at DESC LIMIT 2000`).all();
  res.json({ pitches: rows });
});

const qSetStatus = db.prepare('UPDATE pitches SET status=? WHERE id=?');
router.patch('/pitches/:id', (req, res) => {
  const status = req.body && req.body.status;
  if (!['review', 'shortlisted', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const r = qSetStatus.run(status, String(req.params.id).slice(0, 40));
  if (!r.changes) return res.status(404).json({ error: 'Application not found.' });
  res.json({ ok: true });
});

const TICKET_SQL = `SELECT t.*, o.attendee_email, o.attendee_phone, o.total, o.payment_id, o.promo
  FROM tickets t JOIN orders o ON o.id = t.order_id`;
router.get('/tickets', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  const rows = q
    ? db.prepare(`${TICKET_SQL} WHERE t.id LIKE ? ESCAPE '\\' OR t.attendee_name LIKE ? ESCAPE '\\' OR o.attendee_email LIKE ? ESCAPE '\\' OR o.attendee_phone LIKE ? ESCAPE '\\' ORDER BY t.created_at DESC LIMIT 500`)
        .all(...Array(4).fill('%' + q.replace(/[%_\\]/g, '\\$&') + '%'))
    : db.prepare(`${TICKET_SQL} ORDER BY t.created_at DESC LIMIT 2000`).all();
  res.json({ tickets: rows.map(t => ({ ...ticketView(t), email: t.attendee_email, phone: t.attendee_phone, total: t.total, paymentId: t.payment_id, promo: t.promo, checkedInAt: t.checked_in_at })) });
});

const qTicket = db.prepare('SELECT * FROM tickets WHERE id = ?');
const qCheckIn = db.prepare('UPDATE tickets SET checked_in_at = ? WHERE id = ? AND checked_in_at IS NULL');
router.post('/tickets/:id/checkin', (req, res) => {
  const id = String(req.params.id).trim().toUpperCase().slice(0, 40);
  const t = qTicket.get(id);
  if (!t) return res.status(404).json({ error: 'No pass with this ID.' });
  if (t.checked_in_at) return res.status(409).json({ error: 'Already checked in.', checkedInAt: t.checked_in_at, ticket: ticketView(t) });
  qCheckIn.run(Date.now(), id);
  res.json({ ok: true, ticket: ticketView(qTicket.get(id)) });
});

router.get('/subscribers', (_req, res) => {
  res.json({ subscribers: db.prepare('SELECT email, created_at FROM subscribers ORDER BY created_at DESC').all() });
});

/* ---------- Password reset by organiser (user calls in, organiser verifies identity, shares temp password) ---------- */
const crypto = require('crypto');
const qUser = db.prepare('SELECT id, name, phone FROM users WHERE email = ?');
const qSetPw = db.prepare('UPDATE users SET pw_hash = ?, failed_logins = 0, locked_until = 0 WHERE id = ?');
const qKill = db.prepare('DELETE FROM sessions WHERE user_id = ?');
router.post('/users/reset-password', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
    const u = email && qUser.get(email);
    if (!u) return res.status(404).json({ error: 'No account with this email.' });
    const words = ['Lotus', 'Copper', 'Mandapam', 'Summit', 'Delhi', 'Saffron', 'Pitch', 'Banyan', 'Monsoon', 'Diya'];
    const temp = words[crypto.randomInt(words.length)] + '-' + words[crypto.randomInt(words.length)] + '-' + crypto.randomInt(1000, 9999);
    qSetPw.run(await sec.hashPassword(temp), u.id);
    qKill.run(u.id);
    res.json({ name: u.name, phone: u.phone, tempPassword: temp });
  } catch (e) { next(e); }
});

/* ---------- CSV export (with spreadsheet formula-injection protection) ---------- */
function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function sendCsv(res, name, rows) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const body = [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\r\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + body);
}
const iso = ms => (ms ? new Date(ms).toISOString() : '');

router.get('/export/pitches.csv', (_req, res) => {
  sendCsv(res, 'pitches', db.prepare(`SELECT ${PITCH_COLS} FROM pitches ORDER BY created_at`).all().map(r => ({ ...r, created_at: iso(r.created_at) })));
});
router.get('/export/tickets.csv', (_req, res) => {
  sendCsv(res, 'tickets', db.prepare(`${TICKET_SQL} ORDER BY t.created_at`).all().map(t => ({
    ticket_id: t.id, pass: config.TIERS[t.tier] ? config.TIERS[t.tier].name : t.tier, qty: t.qty, name: t.attendee_name,
    email: t.attendee_email, phone: t.attendee_phone, amount_rupees: (t.total / 100).toFixed(2), promo: t.promo || '',
    payment_id: t.payment_id, booked_at: iso(t.created_at), checked_in_at: iso(t.checked_in_at),
  })));
});
router.get('/export/subscribers.csv', (_req, res) => {
  sendCsv(res, 'subscribers', db.prepare('SELECT email, created_at FROM subscribers ORDER BY created_at').all().map(r => ({ ...r, created_at: iso(r.created_at) })));
});

module.exports = router;

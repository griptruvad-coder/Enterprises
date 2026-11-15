'use strict';
// Small, strict validators. Every field has a type, a length cap and a format.

class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
    this.status = 400;
  }
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;
const PHONE = /^[6-9]\d{9}$/;
const URL_RE = /^https:\/\/[^\s<>"']{4,500}$/;

// Remove control characters (keeps newlines/tabs for long text).
function clean(s, multiline) {
  const re = multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return s.replace(re, '').trim();
}

function str(body, field, { min = 1, max = 200, optional = false, multiline = false } = {}) {
  let v = body[field];
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    throw new ValidationError(field, 'This field is required.');
  }
  if (typeof v !== 'string') throw new ValidationError(field, 'Invalid value.');
  v = clean(v, multiline);
  if (!v && optional) return null;
  if (v.length < min) throw new ValidationError(field, `Must be at least ${min} characters.`);
  if (v.length > max) throw new ValidationError(field, `Must be at most ${max} characters.`);
  return v;
}

function email(body, field = 'email') {
  const v = str(body, field, { max: 254 }).toLowerCase();
  if (!EMAIL.test(v)) throw new ValidationError(field, 'Enter a valid email address.');
  return v;
}

function phone(body, field = 'phone') {
  let v = str(body, field, { max: 20 }).replace(/[\s-]/g, '');
  if (v.startsWith('+91')) v = v.slice(3);
  else if (v.length === 11 && v.startsWith('0')) v = v.slice(1);
  if (!PHONE.test(v)) throw new ValidationError(field, 'Enter a 10-digit Indian mobile number.');
  return v;
}

function url(body, field, opts = {}) {
  const v = str(body, field, { max: 500, ...opts });
  if (v === null) return null;
  if (!URL_RE.test(v)) throw new ValidationError(field, 'Enter a full link starting with https://');
  return v;
}

function oneOf(body, field, allowed) {
  const v = body[field];
  if (typeof v !== 'string' || !allowed.includes(v)) throw new ValidationError(field, 'Choose a valid option.');
  return v;
}

function int(body, field, { min, max, optional = false }) {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') {
    if (optional) return null;
    throw new ValidationError(field, 'This field is required.');
  }
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) throw new ValidationError(field, `Enter a whole number from ${min} to ${max}.`);
  return n;
}

function num(body, field, { min, max, optional = false }) {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') {
    if (optional) return null;
    throw new ValidationError(field, 'This field is required.');
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(field, `Enter a number from ${min} to ${max}.`);
  return Math.round(n * 100) / 100;
}

function password(body, field = 'password') {
  const v = body[field];
  if (typeof v !== 'string') throw new ValidationError(field, 'Enter a password.');
  if (v.length < 8) throw new ValidationError(field, 'Use at least 8 characters.');
  if (v.length > 128) throw new ValidationError(field, 'Use at most 128 characters.');
  return v;
}

module.exports = { ValidationError, str, email, phone, url, oneOf, int, num, password };

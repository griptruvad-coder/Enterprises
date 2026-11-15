'use strict';
/* Startup Business Summit 2026 — front-end. All data goes through /api; nothing sensitive lives in the browser. */

const img = k => `/img/${k}.jpg`;
const CHIEF = { id: 'rekha', name: 'Ms. Rekha Gupta', role: 'Chief Minister, Government of Delhi' };
const CONFIRMED = [
  { id: 'pratham', name: 'Mr. Pratham Mittal', role: 'Founder, Masters’ Union · Shark Tank India Judge', badge: 'Shark Tank Judge' },
  { id: 'shaily', name: 'Ms. Shaily Mehrotra', role: 'Founder, Fixderma · Shark Tank India Judge', badge: 'Shark Tank Judge' },
  { id: 'sahil', name: 'Mr. Sahil Jindal', role: 'Managing Director, D.S. Jindal Group · Co-Founder, Trevel' },
  { id: 'jeet', name: 'Mr. Jeet Chandan', role: 'Founder & CEO, Chandan Group' }];
const GUESTS = [
  { id: 'ankita', name: 'Ms. Ankita Singh', role: 'Founder, MooRopan India · Vande Bharatam Featured', cat: ['founder'] },
  { id: 'abhit', name: 'Mr. Abhit Sinha', role: 'Founder, Orbo AI · Shark Tank S2', cat: ['founder', 'shark'] },
  { id: 'rajat', name: 'Mr. Rajat', role: 'Founder, Grandmaa’s Secret · Shark Tank Featured', cat: ['founder', 'shark'] },
  { id: 'sudeep', name: 'Mr. Sudeep', role: 'Founder, Store My Goods · Shark Tank Featured', cat: ['founder', 'shark'] },
  { id: 'shrijan', name: 'Mr. Shrijan Tayde', role: 'Founder, Amlaan River Corp · Vande Bharatam Featured', cat: ['founder'] },
  { id: 'ranu', name: 'Ms. Ranu', role: 'Founder, Flawsome · Vande Bharatam Featured', cat: ['founder'] },
  { id: 'alok', name: 'Mr. Alok Ranjan', role: 'Founder, GAON · Shark Tank Season 4', cat: ['founder', 'shark'] },
  { id: 'anil', name: 'Mr. Anil Taneja', role: 'Partner, Spotlight Ventures', cat: ['investor'] },
  { id: 'sushil', name: 'Mr. Sushil Sharma', role: 'Chairman, Marwari Catalysts Group', cat: ['investor'] },
  { id: 'shubham', name: 'Mr. Shubham Goel', role: 'Primrose Overseas · Investor', cat: ['investor'] },
  { id: 'shweta', name: 'Ms. Shweta Singla', role: 'Partner, WEIN Capital', cat: ['investor'] },
  { id: 'dinesh', name: 'Mr. Dinesh Agrawal', role: 'Founder, IndiaMART', cat: ['founder'] },
  { id: 'akshay', name: 'Mr. Akshay Mahendru', role: 'Founder, Nootie · Shark Tank Featured', cat: ['founder', 'shark'] },
  { id: 'malvica', name: 'Ms. Malvica', role: 'Founder, The Quirky Naari · Shark Tank Featured', cat: ['founder', 'shark'] }];
const INCUB = [
  ['sharda', 'Sharda Launchpad'], ['snu', 'Shiv Nadar University – Atal Incubation Centre'], ['aicjklu', 'AIC-JKLU, Kasliwal Startup Incubation Foundation'], ['mhciie', 'Mahatma Hansraj Centre for Innovation, Incubation & Entrepreneurship (MHCIIE)'],
  ['riidl', 'riidl'], ['jss', 'JSSATE STEP Noida'], ['magic', 'MAGIC Business Incubator SME Accelerator'], ['galgotias', 'Galgotias Incubation Centre for Research Innovation Startup & Entrepreneurs'],
  ['rtih', 'Ratan Tata Innovation Hub (RTIH) AP'], ['niet', 'NIET Technology Business Incubator'], ['pdeu', 'PDEU Innovation and Incubation Centre'], ['venturenest', 'VentureNest – CGC Jhanjeri TBI Association'],
  ['nsut', 'NSUT Incubation and Innovation Foundation'], ['kiif', 'Karnavati Innovation and Incubation Foundation']];
const PERKS = {
  delegate: { kind: 'For professionals', perks: ['Full-day access to all sessions', 'Live startup pitches', 'Networking areas access', 'Delegate kit'] },
  founder: { kind: 'For startups', feat: true, perks: ['Everything in Delegate', 'Founder–investor networking zone', 'Startup showcase eligibility', 'Priority review of your pitch application'] },
  vip: { kind: 'Limited seats', perks: ['Everything in Founder', 'Front-row auditorium seating', 'VIP lounge access', 'Meet-and-greet with leaders', 'Lunch included'] },
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = rupees => '₹' + Math.round(rupees).toLocaleString('en-IN');
const paise = p => '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const local = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } } };
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2400) }
async function copy(t) { try { await navigator.clipboard.writeText(t); toast('Copied ' + t) } catch { toast(t) } }

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw Object.assign(new Error('You seem to be offline. Check your connection and try again.'), { status: 0 }) }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status, field: data.field });
  return data;
}

/* ---------- static content ---------- */
function chiefHTML() { return `<article class="chief"><div class="ph"><img src="${img('l_' + CHIEF.id)}" alt="${CHIEF.name}"></div><div class="tx"><span class="tag">Chief guest</span><h3>${CHIEF.name}</h3><div class="role">${CHIEF.role}</div><blockquote>Gracing Startup Business Summit 2026 at Bharat Mandapam as chief guest, alongside founders, investors and industry leaders.</blockquote></div></article>` }
function cardHTML(p) { return `<article class="lc"><div class="ph">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}<img src="${img('l_' + p.id)}" alt="${esc(p.name)}" loading="lazy"></div><div class="tx"><h4>${esc(p.name)}</h4><p>${esc(p.role)}</p></div></article>` }
$('#chief-home').innerHTML = chiefHTML(); $('#chief-full').innerHTML = chiefHTML();
$('#confirmed-home').innerHTML = CONFIRMED.map(cardHTML).join('');
$('#confirmed-full').innerHTML = CONFIRMED.map(cardHTML).join('');
const FILTERS = [['all', 'All'], ['shark', 'Shark Tank India'], ['investor', 'Investors'], ['founder', 'Founders']];
$('#chips').innerHTML = FILTERS.map(([k, l]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${k === 'all'}">${l}<i>${k === 'all' ? GUESTS.length : GUESTS.filter(g => g.cat.includes(k)).length}</i></button>`).join('');
const renderGuests = f => { $('#guests').innerHTML = GUESTS.filter(g => f === 'all' || g.cat.includes(f)).map(cardHTML).join('') };
renderGuests('all');
$('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip').forEach(c => c.setAttribute('aria-pressed', c === b)); renderGuests(b.dataset.f) });
$('#logos').innerHTML = INCUB.map(([k, n]) => `<article class="logo-card"><div class="lg"><img src="${img('i_' + k)}" alt="${esc(n)} logo" loading="lazy"></div><p>${esc(n)}</p></article>`).join('');
const strip = INCUB.map(([k, n]) => `<div class="lg"><img src="${img('i_' + k)}" alt="${esc(n)}"></div>`).join('');
$('#logo-track').innerHTML = strip + strip;
const AUD = ['600+ business delegates', 'Investors & VCs', 'Founders', 'CXOs', 'Industry leaders', 'Government representatives', 'Incubators', 'Corporate professionals'];
const audS = AUD.map(a => `<span>${a}</span>`).join(''); $('#aud-track').innerHTML = audS + audS;

/* ---------- video bites (collaborator videos) ---------- */
// Files are served from /videos if present on this server, otherwise from the old site.
const VIDEOS = [
  { id: 'sahil', file: 'sahil-jindal-guest.mp4', name: 'Mr. Sahil Jindal', role: 'Managing Director, D.S. Jindal Group', tag: 'Special guest' },
  { id: 'shaily', file: 'shaily-mehrotra-guest.mp4', name: 'Ms. Shaily Mehrotra', role: 'Founder, Fixderma · Shark Tank India Judge', tag: 'Shark Tank India' },
];
const vsrc = f => [`/videos/${f}`, `https://prakharenterprises.in/assets/videos/${f}`];
const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
function vcardHTML(v, i) {
  return `<button type="button" class="vcard" data-vid="${i}" aria-label="Play video message from ${esc(v.name)}">
    <video muted playsinline loop preload="metadata" aria-hidden="true" tabindex="-1">${vsrc(v.file).map(s => `<source src="${s}" type="video/mp4">`).join('')}</video>
    <img src="${img('l_' + v.id)}" alt="" aria-hidden="true">
    <span class="vtag">${esc(v.tag)}</span><span class="vdur" hidden></span>
    <span class="vplay">${playIcon}</span>
    <span class="vtx"><b>${esc(v.name)}</b><span>${esc(v.role)}</span></span>
  </button>`;
}
['#vids-home', '#vids-leaders'].forEach(sel => { $(sel).innerHTML = VIDEOS.map(vcardHTML).join('') });
const fmtDur = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
$$('.vcard').forEach(card => {
  const v = card.querySelector('video');
  v.addEventListener('loadedmetadata', () => { if (isFinite(v.duration)) { const d = card.querySelector('.vdur'); d.textContent = fmtDur(v.duration); d.hidden = false } });
  // Hide the card if neither source can be played
  v.querySelector('source:last-child').addEventListener('error', () => { card.hidden = true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, hover = matchMedia('(hover: hover)').matches;
  if (hover && !reduce) {
    card.addEventListener('mouseenter', () => { v.currentTime = 0; v.play().then(() => card.classList.add('playing')).catch(() => { }) });
    card.addEventListener('mouseleave', () => { v.pause(); card.classList.remove('playing') });
  }
  card.addEventListener('click', () => openVideo(VIDEOS[+card.dataset.vid]));
});
function openVideo(vd) {
  const m = $('#vmodal'), v = $('#vm-video');
  v.innerHTML = vsrc(vd.file).map(s => `<source src="${s}" type="video/mp4">`).join('');
  v.poster = img('l_' + vd.id); $('#vm-title').textContent = vd.name; $('#vm-role').textContent = vd.role;
  v.load(); m.classList.add('open'); v.play().catch(() => { });
  $('#vm-close').focus();
}
function closeVideo() { const v = $('#vm-video'); v.pause(); v.removeAttribute('src'); v.innerHTML = ''; v.load(); $('#vmodal').classList.remove('open') }
$('#vm-close').addEventListener('click', closeVideo);
$('#vmodal').addEventListener('click', e => { if (e.target.id === 'vmodal') closeVideo() });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#vmodal').classList.contains('open')) closeVideo() });

/* ---------- invitation pass ---------- */
const T = new Date('2026-12-22T09:00:00+05:30').getTime();
(function daysLine() { const d = Math.ceil((T - Date.now()) / 864e5); $('#inv-days').textContent = d > 1 ? `T–${d} days · Admit one` : d === 1 ? 'Tomorrow · Admit one' : 'Today · Admit one' })();
(() => {
  const card = $('#inv-card'); if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const area = card.closest('.invite');
  area.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.setProperty('--ry', ((x - .5) * 16).toFixed(2) + 'deg'); card.style.setProperty('--rx', ((.5 - y) * 12).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (x * 100) + '%'); card.style.setProperty('--my', (y * 100) + '%'); card.style.setProperty('--hx', ((x - .5) * 30).toFixed(1));
  });
  area.addEventListener('pointerleave', () => { ['--rx', '--ry'].forEach(p => card.style.setProperty(p, '0deg')); card.style.setProperty('--hx', 0) });
})();

/* ---------- auth ---------- */
let USER = null, CONFIG = null;
const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'U';
const firstName = () => USER ? USER.name.split(' ')[0] : '';

function paintUser() {
  $('#signin-btn').hidden = !!USER; $('#acct').hidden = !USER;
  if (USER) {
    $('#av-init').textContent = initials(USER.name); $('#av-name').textContent = firstName();
    $('#menu-name').textContent = USER.name; $('#menu-email').textContent = USER.email;
    let adm = $('#menu-admin');
    if (USER.role === 'admin' && !adm) $('#signout').insertAdjacentHTML('beforebegin', '<a href="/admin" id="menu-admin">Admin dashboard</a>');
    if (USER.role !== 'admin' && adm) adm.remove();
  }
  $('#inv-name').textContent = USER ? USER.name : 'Reserved for you';
  $('#inv-cta').firstChild.textContent = USER ? `Claim your pass, ${firstName()} ` : 'Claim your pass ';
  $('#pitch-signbar').innerHTML = USER
    ? `<span>Applying as <b>${esc(USER.name)}</b> · ${esc(USER.email)}</span><a class="btn btn-ghost" href="#account" data-scroll="my-pitches">My applications</a>`
    : `<span><b>Sign in</b> to submit and track your application.</span><button type="button" class="btn btn-ghost" data-open-auth>Sign in</button>`;
  if (USER) { const f = $('#pitch-form');[['name', USER.name], ['email', USER.email], ['phone', USER.phone]].forEach(([k, v]) => { const el = f.elements[k]; if (el && !el.value && v) el.value = v }) }
  if (location.hash === '#account') renderAccount();
}

let authMode = 'in', afterAuth = null;
function setMode(m) {
  authMode = m; $$('.authtabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
  $$('#auth [data-up]').forEach(el => el.hidden = m !== 'up');
  $('#auth-forgot').hidden = m === 'up';
  $('#auth-title').textContent = m === 'up' ? 'Create your account' : 'Welcome back';
  $('#auth-submit').textContent = m === 'up' ? 'Create account' : 'Sign in';
  $('#a-pass').autocomplete = m === 'up' ? 'new-password' : 'current-password'; $('#auth-err').textContent = '';
}
function openAuth(why, cb, mode) {
  afterAuth = cb || null; $('#auth-why').hidden = !why; $('#auth-why').textContent = why || '';
  setMode(mode || (local.get('sbs-has-account', false) ? 'in' : 'up'));
  $('#auth').classList.add('open'); setTimeout(() => $(authMode === 'up' ? '#a-name' : '#a-email').focus(), 50);
}
function closeAuth() { $('#auth').classList.remove('open') }
$('#signin-btn').addEventListener('click', () => openAuth(null, null, 'in'));
document.addEventListener('click', e => { if (e.target.closest('[data-open-auth]')) openAuth() });
$('#auth-close').addEventListener('click', closeAuth);
$('#auth').addEventListener('click', e => { if (e.target.id === 'auth') closeAuth() });
$$('.authtabs button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('#pw-toggle').addEventListener('click', () => { const i = $('#a-pass'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; $('#pw-toggle').textContent = show ? 'Hide' : 'Show' });
$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault(); const err = $('#auth-err'), btn = $('#auth-submit'); err.textContent = '';
  const body = { email: $('#a-email').value.trim(), password: $('#a-pass').value };
  if (authMode === 'up') Object.assign(body, { name: $('#a-name').value.trim(), phone: $('#a-phone').value.trim() });
  btn.disabled = true;
  try {
    const r = await api(authMode === 'up' ? '/auth/signup' : '/auth/login', { method: 'POST', body });
    USER = r.user; local.set('sbs-has-account', true); paintUser(); closeAuth(); $('#a-pass').value = '';
    toast(`Welcome, ${firstName()}`);
    if (afterAuth) { const f = afterAuth; afterAuth = null; f() }
  } catch (x) { err.textContent = x.message; if (x.status === 409) setMode('in') }
  finally { btn.disabled = false }
});
$('#avatar').addEventListener('click', e => { e.stopPropagation(); const o = $('#menu').classList.toggle('open'); $('#avatar').setAttribute('aria-expanded', o) });
document.addEventListener('click', e => { if (!e.target.closest('#acct')) $('#menu').classList.remove('open') });
$('#menu').addEventListener('click', e => { if (e.target.closest('a')) $('#menu').classList.remove('open') });
$('#signout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST', body: {} }) } catch { }
  USER = null; $('#menu').classList.remove('open'); paintUser(); toast('Signed out'); if (location.hash === '#account') location.hash = 'home';
});

/* ---------- account ---------- */
const icTicket = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>';
const icPitch = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>';
const fmtDate = ms => { try { return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '' } };
const STATUS = { review: ['wait', 'Under review'], shortlisted: ['ok', 'Shortlisted'], rejected: ['no', 'Not selected'] };
let MY_TICKETS = [];
async function renderAccount() {
  const box = $('#acc-body');
  if (!USER) {
    $('#acc-hello').innerHTML = 'Your <span class="it">summit desk.</span>';
    box.innerHTML = `<div style="padding:60px 0 110px"><div class="empty"><span>Sign in to see your passes and pitch applications.</span><button class="btn btn-red" type="button" data-open-auth>Sign in</button></div></div>`; return;
  }
  $('#acc-hello').innerHTML = `Namaste, <span class="it">${esc(firstName())}.</span>`;
  box.innerHTML = `<div style="padding:60px 0 110px;color:var(--muted)">Loading your account…</div>`;
  let tickets = [], pitches = [];
  try { [tickets, pitches] = await Promise.all([api('/me/tickets').then(r => r.tickets), api('/me/pitches').then(r => r.pitches)]) }
  catch (x) { if (x.status === 401) { USER = null; paintUser(); return } box.innerHTML = `<div style="padding:60px 0"><div class="empty">${esc(x.message)}</div></div>`; return }
  MY_TICKETS = tickets;
  box.innerHTML = `<div class="acc-grid">
  <aside class="profile"><div class="big">${esc(initials(USER.name))}</div><h3>${esc(USER.name)}</h3>
   <dl><div><dt>Email</dt><dd>${esc(USER.email)}</dd></div><div><dt>Mobile</dt><dd>${esc(USER.phone || '—')}</dd></div><div><dt>Member since</dt><dd>${fmtDate(USER.since)}</dd></div></dl>
   <button class="btn btn-ghost" type="button" style="width:100%;justify-content:center" id="acc-signout">Sign out</button>
   <button class="btn btn-ghost" type="button" style="width:100%;justify-content:center;margin-top:10px" id="acc-signout-all">Sign out of all devices</button></aside>
  <div>
   <section class="acc-sec" id="my-passes"><h3>My passes <small>${tickets.length}</small></h3>
    ${tickets.length ? tickets.map((t, i) => `<div class="rowcard"><div class="ic">${icTicket}</div><div><h4>${esc(t.tierName)} × ${t.qty}</h4><p><code>${esc(t.id)}</code> · ${esc(t.name)}</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill ${t.checkedIn ? 'wait' : 'ok'}">${t.checkedIn ? 'Checked in' : 'Confirmed'}</span><button class="btn btn-ghost" type="button" data-show-pass="${i}">Show pass</button></div></div>`).join('')
      : `<div class="empty"><span>No passes yet. Book one for 22 December.</span><a class="btn btn-red" href="#tickets">Buy tickets</a></div>`}
   </section>
   <section class="acc-sec" id="my-pitches"><h3>My pitch applications <small>${pitches.length}</small></h3>
    ${pitches.length ? pitches.map(p => { const [c, l] = STATUS[p.status] || STATUS.review; return `<div class="rowcard"><div class="ic">${icPitch}</div><div><h4>${esc(p.startup)}</h4><p><code>${esc(p.id)}</code> · ${esc(p.sector)} · ${esc(p.stage)} · ${fmtDate(p.created_at)}</p></div><span class="pill ${c}">${l}</span></div>` }).join('')
      : `<div class="empty"><span>No applications yet. Pitch your startup at Bharat Mandapam.</span><a class="btn btn-red" href="#pitch">Pitch your idea</a></div>`}
   </section>
  </div></div>`;
  $('#acc-signout').addEventListener('click', () => $('#signout').click());
  $('#acc-signout-all').addEventListener('click', async () => { try { await api('/auth/logout-all', { method: 'POST', body: {} }) } catch { } USER = null; paintUser(); toast('Signed out everywhere'); location.hash = 'home' });
  if (pendingScroll) { const t = document.getElementById(pendingScroll); pendingScroll = null; if (t) t.scrollIntoView({ behavior: 'smooth' }) }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-show-pass]'); if (b) showPass(MY_TICKETS[+b.dataset.showPass], true) });

/* ---------- router ---------- */
const VIEWS = ['home', 'leaders', 'partners', 'pitch', 'tickets', 'account'];
let pendingScroll = null;
function route() {
  let v = location.hash.slice(1); if (!VIEWS.includes(v)) v = 'home';
  $$('[data-view]').forEach(el => el.hidden = el.dataset.view !== v);
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === v));
  $('#links').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
  if (v === 'account') { window.scrollTo(0, 0); renderAccount(); return }
  if (pendingScroll) { const t = document.getElementById(pendingScroll); pendingScroll = null; if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth' }), 30) } else window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
document.addEventListener('click', e => {
  const a = e.target.closest('[data-scroll]'); if (!a) return; e.preventDefault(); pendingScroll = a.dataset.scroll;
  const tv = (a.getAttribute('href') || '#home').slice(1) || 'home';
  if (location.hash.slice(1) === tv || (tv === 'home' && location.hash === '')) route(); else location.hash = tv;
});
$('#burger').addEventListener('click', () => { const o = $('#links').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o) });

/* ---------- newsletter ---------- */
$('#notify-form').addEventListener('submit', async e => {
  e.preventDefault(); const el = $('#notify-email'), msg = $('#notify-msg'); const v = el.value.trim();
  if (!/^\S+@\S+\.\S+$/.test(v)) { msg.textContent = 'Enter a valid email address, like name@company.com'; return }
  try { await api('/notify', { method: 'POST', body: { email: v } }); msg.textContent = `Done. We’ll email ${v} when the next event opens.`; el.value = '' }
  catch (x) { msg.textContent = x.message }
});

/* ---------- pitch form ---------- */
const form = $('#pitch-form'); let step = 0; const LAST = 3;
const DRAFT_KEYS = ['role', 'city', 'linkedin', 'startup', 'sector', 'stage', 'oneliner', 'problem', 'team', 'ask', 'deck', 'video', 'why', 'source'];
Object.entries(local.get('sbs-pitch-draft', {})).forEach(([k, v]) => { if (!DRAFT_KEYS.includes(k)) return; const el = form.elements[k]; if (!el) return; if (el instanceof RadioNodeList) [...el].forEach(r => r.checked = r.value === v); else el.value = v });
const olc = () => $('#ol-count').textContent = $('#p-oneliner').value.length; olc(); $('#p-oneliner').addEventListener('input', olc);
form.addEventListener('input', () => { const d = {}; new FormData(form).forEach((v, k) => { if (DRAFT_KEYS.includes(k)) d[k] = v }); local.set('sbs-pitch-draft', d) });
function setErr(el, msg) { const f = el.closest('.field'); const e = f && f.querySelector('.err'); if (e) e.textContent = msg || ''; el.classList.toggle('invalid', !!msg) }
const MINS = { oneliner: 10, problem: 30, why: 20 };
function validate(s) {
  let ok = true; const box = form.querySelector(`[data-step="${s}"]`);
  box.querySelectorAll('input:not([type=radio]):not([type=checkbox]),select,textarea').forEach(el => {
    let m = ''; const v = el.value.trim();
    if (el.required && !v) m = 'This field is required.';
    else if (v && MINS[el.name] && v.length < MINS[el.name]) m = `Write at least ${MINS[el.name]} characters.`;
    else if (v && el.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) m = 'Enter a valid email, like name@startup.com';
    else if (v && el.type === 'tel' && !/^(\+91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ''))) m = 'Enter a 10-digit Indian mobile number.';
    else if (v && el.type === 'url' && !/^https:\/\/\S+\.\S+/.test(v)) m = 'Enter a full link starting with https://';
    setErr(el, m); if (m && ok) { ok = false; el.focus() }
  });
  if (s === 1) { const r = form.querySelector('input[name=stage]:checked'); $('#stage-err').textContent = r ? '' : 'Choose your stage.'; if (!r) ok = false }
  if (s === 2) { const c = $('#p-consent').checked; $('#consent-err').textContent = c ? '' : 'Please confirm to continue.'; if (!c) ok = false }
  return ok;
}
const LABELS = [['name', 'Name'], ['role', 'Role'], ['email', 'Email'], ['phone', 'Phone'], ['city', 'City'], ['linkedin', 'LinkedIn'], ['startup', 'Startup'], ['sector', 'Sector'], ['stage', 'Stage'], ['oneliner', 'One-line pitch'], ['problem', 'Problem & solution'], ['team', 'Team size'], ['ask', 'Funding ask'], ['deck', 'Deck'], ['video', 'Video'], ['why', 'Why SBS 2026'], ['source', 'Heard via']];
const STEP_OF = { name: 0, role: 0, email: 0, phone: 0, city: 0, linkedin: 0, startup: 1, sector: 1, stage: 1, oneliner: 1, problem: 1, team: 1, ask: 1, deck: 2, video: 2, why: 2, source: 2, consent: 2 };
function showStep(s, scroll = true) {
  step = s; $$('.fstep').forEach(b => b.hidden = +b.dataset.step !== s);
  $$('#progress > div').forEach((d, i) => { d.className = i < s ? 'done' : i === s ? 'cur' : '' });
  $('#back').hidden = s === 0 || s > LAST; $('#fnav').hidden = s > LAST; $('#next').textContent = s === LAST ? 'Submit application' : 'Continue';
  if (s === LAST) { const fd = new FormData(form); $('#review').innerHTML = LABELS.filter(([k]) => fd.get(k)).map(([k, l]) => `<div><dt>${l}</dt><dd>${esc(k === 'ask' ? fd.get(k) + ' lakh' : fd.get(k))}</dd></div>`).join('') }
  if (scroll) $('.formcard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function submitPitch() {
  const btn = $('#next'); const fd = new FormData(form); const body = {};
  fd.forEach((v, k) => { body[k] = typeof v === 'string' ? v.trim() : v });
  body.consent = $('#p-consent').checked;
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    const r = await api('/pitches', { method: 'POST', body });
    local.set('sbs-pitch-draft', {}); $('#app-id').textContent = r.id;
    $$('#progress > div').forEach(x => x.className = 'done'); showStep(4);
  } catch (x) {
    if (x.status === 401) { USER = null; paintUser(); openAuth('Your session ended. Sign in again to submit.', submitPitch, 'in'); return }
    if (x.field && STEP_OF[x.field] !== undefined) { showStep(STEP_OF[x.field]); const el = form.elements[x.field]; if (el && el.focus) { setErr(el, x.message); el.focus() } else toast(x.message) }
    else toast(x.message);
  } finally { btn.disabled = false; if (step === LAST) btn.textContent = 'Submit application' }
}
$('#next').addEventListener('click', () => {
  if (step < LAST) { if (validate(step)) showStep(step + 1); return }
  if (!USER) { openAuth('Sign in to submit your application. You can track it from your account.', submitPitch); return }
  submitPitch();
});
$('#back').addEventListener('click', () => showStep(step - 1));
$('#copy-id').addEventListener('click', () => copy($('#app-id').textContent));
form.addEventListener('submit', e => e.preventDefault());
showStep(0, false);

/* ---------- tickets ---------- */
const tick18 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function renderTiers() {
  $('#tiers').innerHTML = CONFIG.tiers.map(t => {
    const p = PERKS[t.id] || { kind: '', perks: [] };
    return `<article class="tier${p.feat ? ' feat' : ''}"><div class="kind">${esc(p.kind)}</div><h3>${esc(t.name)}</h3><div class="price">${inr(t.price)} <small>+ GST</small></div><ul>${p.perks.map(x => `<li>${tick18}${esc(x)}</li>`).join('')}</ul><button class="btn ${p.feat ? 'btn-red' : 'btn-ghost'}" type="button" data-buy="${esc(t.id)}">Buy ${esc(t.name)}</button></article>`;
  }).join('');
}
let cart = null;
function totals() {
  const sub = cart.tier.price * 100 * cart.qty, disc = Math.round(sub * cart.pct / 100), gst = Math.round((sub - disc) * CONFIG.gstPct / 100);
  return { sub, disc, gst, total: sub - disc + gst };
}
function renderSum() {
  const t = totals(); $('#q-val').textContent = cart.qty;
  $('#sum').innerHTML = `<div><span>${esc(cart.tier.name)} × ${cart.qty}</span><span>${paise(t.sub)}</span></div>${t.disc ? `<div class="disc"><span>Promo ${esc(cart.code)} (${cart.pct}% off)</span><span>−${paise(t.disc)}</span></div>` : ''}<div><span>GST ${CONFIG.gstPct}%</span><span>${paise(t.gst)}</span></div><div class="tot"><span>Total</span><span>${paise(t.total)}</span></div>`;
  $('#to-pay').textContent = CONFIG.paymentsEnabled ? `Pay ${paise(t.total)} securely` : 'Online payments open soon';
  $('#to-pay').disabled = !CONFIG.paymentsEnabled;
  $('#pay-err').textContent = CONFIG.paymentsEnabled ? '' : 'Online booking isn’t live yet. Call +91 72777 75111 to book your pass.';
}
function mstep(n) { [1, 3].forEach(i => $('#m-step-' + i).hidden = i !== n) }
function openModal(id) {
  const tier = CONFIG.tiers.find(t => t.id === id); if (!tier) return;
  cart = { tier, qty: 1, pct: 0, code: null };
  $('#m-title').textContent = tier.name; $('#promo-msg').textContent = ''; $('#t-promo').value = '';
  if (USER) { if (!$('#t-name').value) $('#t-name').value = USER.name; if (!$('#t-email').value) $('#t-email').value = USER.email; if (!$('#t-phone').value) $('#t-phone').value = USER.phone || '' }
  mstep(1); renderSum(); $('#modal').classList.add('open'); setTimeout(() => $('#t-name').focus(), 50);
}
function closeModal() { $('#modal').classList.remove('open') }
$('#tiers').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b) return; const id = b.dataset.buy;
  if (!USER) { openAuth('Sign in to book your pass. It will appear in your account.', () => openModal(id)); return }
  openModal(id);
});
$('#m-close').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal() });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeAuth(); $('#menu').classList.remove('open') } });
$('#q-minus').addEventListener('click', () => { cart.qty = Math.max(1, cart.qty - 1); renderSum() });
$('#q-plus').addEventListener('click', () => { cart.qty = Math.min(CONFIG.maxQty, cart.qty + 1); renderSum(); if (cart.qty === CONFIG.maxQty) toast(`For more than ${CONFIG.maxQty} passes, call the organisers`) });
$('#t-apply').addEventListener('click', async () => {
  const c = $('#t-promo').value.trim(); if (!c) return;
  try { const r = await api('/promo', { method: 'POST', body: { code: c } }); cart.pct = r.pct; cart.code = r.code; $('#promo-msg').textContent = `${r.code} applied: ${r.pct}% off.` }
  catch (x) { cart.pct = 0; cart.code = null; $('#promo-msg').textContent = x.message }
  renderSum();
});
$('#to-pay').addEventListener('click', async () => {
  let ok = true;
  [['#t-name', v => v.length >= 2 ? '' : 'Enter the attendee’s name.'], ['#t-email', v => /^\S+@\S+\.\S+$/.test(v) ? '' : 'Enter a valid email.'], ['#t-phone', v => /^(\+91)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a 10-digit mobile number.']]
    .forEach(([s, f]) => { const el = $(s), m = f(el.value.trim()); setErr(el, m); if (m) ok = false });
  if (!ok) return;
  if (typeof window.Razorpay !== 'function') { $('#pay-err').textContent = 'Payment window could not load. Check your connection and refresh.'; return }
  const btn = $('#to-pay'); btn.disabled = true; btn.textContent = 'Opening secure payment…'; $('#pay-err').textContent = '';
  try {
    const o = await api('/orders', { method: 'POST', body: { tier: cart.tier.id, qty: cart.qty, promo: cart.code || '', name: $('#t-name').value.trim(), email: $('#t-email').value.trim(), phone: $('#t-phone').value.trim() } });
    const rzp = new window.Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency,
      name: 'Startup Business Summit 2026', description: `${cart.tier.name} × ${cart.qty}`, image: '/img/logo.png',
      prefill: { name: o.prefill.name, email: o.prefill.email, contact: o.prefill.phone },
      theme: { color: '#c8432b' },
      handler: async resp => {
        btn.textContent = 'Confirming payment…';
        try { const r = await api('/orders/verify', { method: 'POST', body: resp }); showPass(r.ticket) }
        catch (x) { $('#pay-err').textContent = x.message + ' Your pass will also appear in My account once confirmed.' }
        finally { btn.disabled = false; renderSum() }
      },
      modal: { ondismiss: () => { btn.disabled = false; renderSum() } },
    });
    rzp.on('payment.failed', r => { $('#pay-err').textContent = (r.error && r.error.description) || 'Payment failed. No money was taken; please try again.' });
    rzp.open();
  } catch (x) {
    btn.disabled = false; renderSum();
    if (x.status === 401) { USER = null; paintUser(); closeModal(); openAuth('Your session ended. Sign in again to book.', () => openModal(cart.tier.id), 'in'); return }
    $('#pay-err').textContent = x.message;
  }
});
function showPass(t, fromAccount) {
  $('#pass-h').textContent = fromAccount ? 'Your pass' : 'You’re in.';
  $('#pass-type').textContent = t.tierName; $('#pass-name').textContent = t.name; $('#pass-qty').textContent = t.qty; $('#pass-id').textContent = t.id;
  try { const q = window.qrcode(0, 'M'); q.addData(t.id); q.make(); $('#qr').innerHTML = q.createImgTag(4, 0, 'Pass QR code') } catch { $('#qr').textContent = '' }
  mstep(3); $('#modal').classList.add('open');
}
$('#copy-tid').addEventListener('click', () => copy($('#pass-id').textContent));

/* ---------- boot ---------- */
(async function boot() {
  route();
  try { CONFIG = await api('/config') } catch { CONFIG = { tiers: [], gstPct: 18, maxQty: 10, paymentsEnabled: false } }
  renderTiers();
  try { USER = (await api('/me')).user } catch { USER = null }
  paintUser();
})();

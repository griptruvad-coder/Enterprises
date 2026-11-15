'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paise = p => '₹' + (p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const when = ms => ms ? new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const safeLink = u => /^https:\/\//.test(u || '') ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer nofollow">${esc(u)}</a>` : '—';
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2400) }

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { status: res.status, data });
  return data;
}

function showGate(msg) { $('#gate').hidden = false; $('#dash').hidden = true; $('#logout').hidden = true; $('#g-err').textContent = msg || '' }
async function showDash() { $('#gate').hidden = true; $('#dash').hidden = false; $('#logout').hidden = false; await loadStats(); $('#ci-id').focus() }

$('#gate-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await api('/auth/login', { method: 'POST', body: { email: $('#g-email').value.trim(), password: $('#g-pass').value } });
    $('#g-pass').value = '';
    if (r.user.role !== 'admin') return showGate('This account is not an organiser account.');
    showDash();
  } catch (x) { $('#g-err').textContent = x.message }
});
$('#logout').addEventListener('click', async () => { try { await api('/auth/logout', { method: 'POST', body: {} }) } catch { } showGate() });

async function loadStats() {
  const s = await api('/admin/stats');
  $('#tiles').innerHTML = [
    ['hot', paise(s.revenue), 'Revenue (incl. GST)'], ['', s.ticketsSold, 'Passes sold'], ['', `${s.checkedIn}/${s.ticketsSold}`, 'Checked in'],
    ['', s.pitches, 'Pitch applications'], ['', s.shortlisted, 'Shortlisted'], ['', s.users, 'Accounts'], ['', s.subscribers, 'Subscribers'],
  ].map(([c, b, l]) => `<div class="tile ${c}"><b>${esc(b)}</b><span>${l}</span></div>`).join('');
}

/* tabs */
const loaders = { users: () => $('#rs-email').focus(), pitches: loadPitches, tickets: () => loadTickets(''), subs: loadSubs, checkin: () => $('#ci-id').focus() };
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  $$('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== b.dataset.tab);
  loaders[b.dataset.tab]();
}));

/* check-in */
$('#ci-form').addEventListener('submit', async e => {
  e.preventDefault(); const id = $('#ci-id').value.trim().toUpperCase(); if (!id) return;
  const out = $('#ci-result');
  try {
    const r = await api(`/admin/tickets/${encodeURIComponent(id)}/checkin`, { method: 'POST', body: {} });
    out.innerHTML = `<div class="ci-card ok"><h4>Welcome, ${esc(r.ticket.name)}</h4><p>${esc(r.ticket.tierName)} × ${r.ticket.qty} · <code>${esc(r.ticket.id)}</code> · checked in now</p></div>`;
    $('#ci-id').value = ''; loadStats();
  } catch (x) {
    const t = x.data && x.data.ticket;
    out.innerHTML = `<div class="ci-card bad"><h4>${esc(x.message)}</h4><p>${t ? `${esc(t.name)} · ${esc(t.tierName)} × ${t.qty} · entered ${when(x.data.checkedInAt)}` : 'Check the ID and try again.'}</p></div>`;
  }
  $('#ci-id').select();
});

/* pitches */
const ST = { review: 'Under review', shortlisted: 'Shortlisted', rejected: 'Not selected' };
async function loadPitches() {
  const f = $('#p-filter').value;
  const { pitches } = await api('/admin/pitches' + (f ? `?status=${f}` : ''));
  $('#p-count').textContent = `${pitches.length} application${pitches.length === 1 ? '' : 's'}`;
  $('#p-list').innerHTML = pitches.length ? pitches.map(p => `<article class="pc">
    <header><div><h4>${esc(p.startup)}</h4><div class="meta2"><code>${esc(p.id)}</code> · ${esc(p.sector)} · ${esc(p.stage)} · ${esc(p.city)} · ${when(p.created_at)}</div></div>
    <select data-id="${esc(p.id)}" aria-label="Status for ${esc(p.startup)}">${Object.entries(ST).map(([k, l]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${l}</option>`).join('')}</select></header>
    <p class="one">${esc(p.oneliner)}</p>
    <details><summary>Full application</summary><dl>
      <dt>Founder</dt><dd>${esc(p.name)} · ${esc(p.role)}</dd><dt>Email</dt><dd>${esc(p.email)}</dd><dt>Phone</dt><dd>${esc(p.phone)}</dd>
      <dt>LinkedIn</dt><dd>${safeLink(p.linkedin)}</dd><dt>Problem &amp; solution</dt><dd>${esc(p.problem)}</dd>
      <dt>Team size</dt><dd>${esc(p.team ?? '—')}</dd><dt>Funding ask</dt><dd>${p.ask_lakh != null ? esc(p.ask_lakh) + ' lakh' : '—'}</dd>
      <dt>Deck</dt><dd>${safeLink(p.deck)}</dd><dt>Video</dt><dd>${safeLink(p.video)}</dd><dt>Why SBS</dt><dd>${esc(p.why)}</dd><dt>Heard via</dt><dd>${esc(p.source || '—')}</dd>
    </dl></details></article>`).join('') : '<p class="hint">No applications yet.</p>';
}
$('#p-filter').addEventListener('change', loadPitches);
$('#p-list').addEventListener('change', async e => {
  const s = e.target.closest('select[data-id]'); if (!s) return;
  try { await api(`/admin/pitches/${encodeURIComponent(s.dataset.id)}`, { method: 'PATCH', body: { status: s.value } }); toast('Status updated'); loadStats() }
  catch (x) { toast(x.message) }
});

/* tickets */
let tTimer;
async function loadTickets(q) {
  const { tickets } = await api('/admin/tickets' + (q ? `?q=${encodeURIComponent(q)}` : ''));
  $('#t-count').textContent = `${tickets.length} pass${tickets.length === 1 ? '' : 'es'}`;
  $('#t-body').innerHTML = tickets.map(t => `<tr><td><code>${esc(t.id)}</code></td><td>${esc(t.tierName)}</td><td>${t.qty}</td><td>${esc(t.name)}</td>
    <td>${esc(t.email)}<small>${esc(t.phone)}</small></td><td>${paise(t.total)}${t.promo ? `<small>${esc(t.promo)}</small>` : ''}</td><td>${when(t.created_at)}</td><td>${t.checkedInAt ? when(t.checkedInAt) : '—'}</td></tr>`).join('')
    || '<tr><td colspan="8" class="hint">No passes found.</td></tr>';
}
$('#t-search').addEventListener('input', e => { clearTimeout(tTimer); tTimer = setTimeout(() => loadTickets(e.target.value.trim()), 250) });

async function loadSubs() {
  const { subscribers } = await api('/admin/subscribers');
  $('#s-body').innerHTML = subscribers.map(s => `<tr><td>${esc(s.email)}</td><td>${when(s.created_at)}</td></tr>`).join('') || '<tr><td colspan="2" class="hint">No subscribers yet.</td></tr>';
}

$('#rs-form').addEventListener('submit', async e => {
  e.preventDefault(); const email = $('#rs-email').value.trim(); if (!email) return;
  const out = $('#rs-result');
  try {
    const r = await api('/admin/users/reset-password', { method: 'POST', body: { email } });
    out.innerHTML = `<div class="ci-card ok"><h4>${esc(r.tempPassword)}</h4><p>Temporary password for ${esc(r.name)} (registered phone ${esc(r.phone)}). Share it only on that number. They are signed out everywhere.</p></div>`;
    $('#rs-email').value = '';
  } catch (x) { out.innerHTML = `<div class="ci-card bad"><h4>${esc(x.message)}</h4></div>` }
});

(async () => {
  try { const { user } = await api('/me'); if (user && user.role === 'admin') return showDash(); showGate(user ? 'This account is not an organiser account.' : '') }
  catch { showGate() }
})();

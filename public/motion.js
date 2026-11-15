'use strict';
/* SBS 2026 — motion: preloader, scroll reveals, counters, parallax, embers, nav behaviour, hover polish. */
(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  /* ---------- preloader ---------- */
  const seen = html.classList.contains('seen');
  const minTime = reduce ? 0 : seen ? 250 : 1900;
  const t0 = performance.now();
  let done = false;
  function finishLoad() {
    if (done) return; done = true;
    const wait = Math.max(0, minTime - (performance.now() - t0));
    setTimeout(() => { html.classList.add('loaded'); setTimeout(() => { const p = $('#preloader'); if (p) p.remove(); }, 1100); }, wait);
  }
  if (document.readyState === 'complete') finishLoad(); else window.addEventListener('load', finishLoad);
  setTimeout(finishLoad, 3500); // never block longer than this on slow networks

  /* ---------- scroll reveals (also for content rendered later) ---------- */
  const REVEAL = ['.sec-head', '.step', '.pitch-band', '.chief', '.lc', '.stat', '.ai', '.donut', '.ev', '.bf', '.netimg',
    '.faq details', '.person', '.vcard', '.vintro', '.logo-card', '.org', '.tier', '.tinfo > div', '.phead .crumb', '.phead h1', '.phead p',
    '.formcard', '.acard', '.rowcard', '.profile', '.cgrid > div:first-child', '.light h2', '.light .eyebrow', '.subhead', '.chips', '.empty'];
  const io = reduce ? null : new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  function tag(root = document) {
    if (reduce) return;
    REVEAL.forEach(sel => {
      root.querySelectorAll(sel).forEach(el => {
        if (el.classList.contains('rv') || el.closest('#modal,#auth,#vmodal,.preloader')) return;
        const sibs = [...el.parentElement.children].filter(c => c.matches(sel));
        const i = Math.max(0, sibs.indexOf(el));
        el.style.setProperty('--d', `${Math.min(i, 8) * 0.08}s`);
        el.classList.add('rv');
        if (el.matches('.donut,.chief,.netimg,.ev')) el.classList.add('rv-scale');
        io.observe(el);
      });
    });
  }
  tag();
  // Views and lists rendered by app.js after load
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) tag(n.parentElement || document);
  }).observe($('main'), { childList: true, subtree: true });
  // Hidden views: elements inside them only intersect once shown
  window.addEventListener('hashchange', () => setTimeout(() => {
    $$('[data-view]:not([hidden]) .rv:not(.in)').forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.95) el.classList.add('in'); });
  }, 60));

  /* ---------- counters ---------- */
  const countIO = reduce ? null : new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue; countIO.unobserve(e.target);
      const node = e.target.firstChild, end = Number(e.target.dataset.count), t1 = performance.now(), dur = 1600;
      const step = now => { const p = Math.min(1, (now - t1) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3))); node.nodeValue = String(v); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  }, { threshold: 0.6 });
  if (countIO) $$('.stat b[data-count]').forEach(b => { b.firstChild.nodeValue = '0'; countIO.observe(b); });

  /* ---------- nav: hide on scroll down, progress line, solid background ---------- */
  const nav = $('.nav'), bar = $('#progress-i'), links = $('#links'), burger = $('#burger'), wa = $('.wa-float');
  const heroBg = $('.hero-bg'), pageImg = $('.page-bg .pb-img'), mark = $('.watermark'), oval = $('.oval');
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 30);
    if (!document.body.classList.contains('menu-open')) nav.classList.toggle('hide', y > lastY && y > 260);
    lastY = y;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (wa) wa.classList.toggle('show', y > 500);
    if (!reduce) {
      if (heroBg && y < innerHeight * 1.2) heroBg.style.transform = `translate3d(0,${y * 0.28}px,0) scale(1.08)`;
      if (mark && y < innerHeight) mark.style.transform = `translate3d(${-y * 0.25}px,${y * 0.1}px,0)`;
      if (oval && y < innerHeight) oval.style.transform = `translate(-50%,-50%) translateY(${y * 0.15}px) rotate(${y * 0.01}deg)`;
      if (pageImg) pageImg.style.transform = `translate3d(0,${-y * 0.04}px,0) scale(1.06)`;
    }
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- mobile menu: lock page scroll while open ---------- */
  function syncMenu() {
    const open = links.classList.contains('open');
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) nav.classList.remove('hide');
  }
  new MutationObserver(syncMenu).observe(links, { attributes: true, attributeFilter: ['class'] });
  links.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && links.classList.contains('open')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); } });
  addEventListener('resize', () => { if (innerWidth > 960 && links.classList.contains('open')) { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });

  /* ---------- hero embers (copper sparks rising) ---------- */
  const cv = $('#embers');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d'); let W = 0, H = 0, parts = [], visible = true, raf = 0;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const N = innerWidth < 760 ? 28 : 60;
    const spawn = (anyY) => ({ x: Math.random() * W, y: anyY ? Math.random() * H : H + 10, r: 0.6 + Math.random() * 2.2, vy: 0.25 + Math.random() * 0.7, vx: (Math.random() - 0.5) * 0.25, a: 0.25 + Math.random() * 0.6, t: Math.random() * 6.28, hue: Math.random() < 0.7 ? '240,122,82' : '226,181,108' });
    size(); parts = Array.from({ length: N }, () => spawn(true));
    addEventListener('resize', size);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) loop(); }).observe(cv);
    function loop() {
      if (!visible) { raf = 0; return; }
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.t += 0.02; p.y -= p.vy; p.x += p.vx + Math.sin(p.t) * 0.25;
        if (p.y < -10) Object.assign(p, spawn(false));
        const fade = Math.min(1, p.y / (H * 0.6));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = `rgba(${p.hue},${p.a * fade})`; ctx.shadowColor = `rgba(${p.hue},.9)`; ctx.shadowBlur = 8;
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------- pointer-only polish: cursor glow, magnetic buttons, card tilt ---------- */
  if (finePointer && !reduce) {
    html.classList.add('has-pointer');
    const glow = $('.cursor-glow');
    addEventListener('pointermove', e => { glow.style.setProperty('--cx', e.clientX + 'px'); glow.style.setProperty('--cy', e.clientY + 'px'); }, { passive: true });

    document.addEventListener('pointermove', e => {
      const b = e.target.closest('.btn-red');
      if (b && !b.closest('.links') && !b.disabled) {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
      }
      const c = e.target.closest('.lc,.tier,.step');
      if (c) {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-6px)`;
        c.style.setProperty('--gx', x * 100 + '%'); c.style.setProperty('--gy', y * 100 + '%');
      }
    }, { passive: true });
    document.addEventListener('pointerout', e => {
      const b = e.target.closest('.btn-red'); if (b && !b.contains(e.relatedTarget)) b.style.transform = '';
      const c = e.target.closest('.lc,.tier,.step'); if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
    });
  }

  /* ---------- scroll cue in hero ---------- */
  const hero = $('.hero');
  if (hero && innerWidth > 760) { hero.insertAdjacentHTML('beforeend', '<div class="scroll-cue" aria-hidden="true">Scroll<i></i></div>'); }
})();

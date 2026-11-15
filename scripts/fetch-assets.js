'use strict';
// Runs on `npm install` (postinstall). Downloads the high-resolution Bharat Mandapam photo once.
// Photo: "Bharat Mandapam Evening View", Ministry of Culture / PIB, licence GODL-India (credit shown in the site footer).
// Never fails the build: if the download doesn't work, the site falls back to the brochure photo.
const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT = path.join(__dirname, '..', 'public', 'img', 'bg', 'mandapam-evening.jpg');
const SOURCES = [
  'https://upload.wikimedia.org/wikipedia/commons/b/bd/Bharat_Mandapam_Evening_View.jpg',
  'https://static.pib.gov.in/WriteReadData/Gallery/PhotoGallery/2023/Sep/H20230906138100.JPG',
];

function get(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'SBS2026-site-build/1.0 (founder@prakharenterprises.in)' }, timeout: 20000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume(); return resolve(get(new URL(res.headers.location, url).toString(), redirects - 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = []; let size = 0;
      res.on('data', c => { size += c.length; if (size > 15e6) req.destroy(new Error('too large')); else chunks.push(c); });
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

(async () => {
  if (fs.existsSync(OUT) && fs.statSync(OUT).size > 50000) return console.log('[assets] photo already present');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  for (const url of SOURCES) {
    try {
      const buf = await get(url);
      if (buf.length < 50000 || buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not a JPEG');
      fs.writeFileSync(OUT, buf);
      return console.log(`[assets] saved ${OUT} (${Math.round(buf.length / 1024)} KB) from ${new URL(url).host}`);
    } catch (e) { console.warn(`[assets] ${new URL(url).host} failed: ${e.message}`); }
  }
  console.warn('[assets] using fallback photo');
})().catch(() => {});

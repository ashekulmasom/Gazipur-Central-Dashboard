/* =====================================================================
   Gazipur Central Dashboard — শেয়ার্ড কোড (Achievers' Club ও Market Service পেজ)
   ===================================================================== */
const GC = (function () {
'use strict';
const OWNER = 'ashekulmasom', REPO = 'Gazipur-Central-Dashboard';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MED = ['🥇', '🥈', '🥉'];

/* ---------- Achievers' Club ওজন ---------- */
/* [key, নাম, MTD/TTL, ওজন] — MTD: MTD টার্গেটের বিপরীতে, TTL: মোট মাসিক টার্গেটের বিপরীতে */
const LV = {
  dso: { lab: 'ডিএসও', ps: [['t', 'TRX', 'MTD', 30], ['r', 'REG', 'MTD', 30], ['vo', 'SAV-VOL', 'TTL', 10], ['c', 'SAV-CNT', 'TTL', 10], ['u', 'UBP', 'MTD', 20]] },
  dss: { lab: 'ডিএসএস', ps: [['t', 'TRX', 'MTD', 30], ['r', 'REG', 'MTD', 20], ['vo', 'SAV-VOL', 'TTL', 10], ['c', 'SAV-CNT', 'TTL', 10], ['u', 'UBP', 'MTD', 25], ['a', 'A2M', 'MTD', 5]] },
  om: { lab: 'অপারেশন ম্যানেজার', ps: [['t', 'TRX', 'MTD', 30], ['r', 'REG', 'MTD', 20], ['vo', 'SAV-VOL', 'TTL', 7.5], ['c', 'SAV-CNT', 'TTL', 7.5], ['u', 'UBP', 'MTD', 20], ['a', 'BZP (A2M+D2C)', 'MTD', 15]] }
};

/* ---------- সহায়ক ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tc = s => String(s == null ? '' : s).trim().toLowerCase().replace(/(^|[\s.\-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const up = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
const norm = w => { w = String(w == null ? '' : w).replace(/[০-৯]/g, c => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/[^\d]/g, ''); if (w.startsWith('880')) w = w.slice(2); if (w.length === 10) w = '0' + w; return w; };
const nf = n => n == null || !isFinite(n) ? '—' : Math.round(n).toLocaleString('en-IN');
const nd = n => n == null || !isFinite(n) ? '—' : (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString('en-IN');
const pcCell = x => { const v = Math.round((x || 0) * 100); return `<td class="${v >= 100 ? 'hi' : v < 50 ? 'lo' : ''}">${v}%</td>`; };
const dt = s => new Date(String(s).slice(0, 10) + 'T00:00:00');
const fmtTill = s => { if (!s) return '—'; const d = dt(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const monLabel = m => { if (!m) return ''; const [y, mo] = m.split('-'); return `${MON[+mo - 1]} ${y}`; };

/* ---------- ডেটা লোড ---------- */
async function getJSON(path) {
  try { const r = await fetch(path + (path.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
}
async function loadIndex() {
  const j = await getJSON('data/index.json');
  return j && Array.isArray(j.months) ? j : { months: [], latest: '' };
}
function pickMonth(IDX) {
  const q = new URLSearchParams(location.search).get('m');
  let m = q || ss('gcd_m') || IDX.latest || IDX.months[0];
  if (!IDX.months.includes(m)) m = IDX.latest || IDX.months[0];
  return m;
}
async function loadMonth(m) {
  const D = await getJSON(`data/${m}.json`);
  if (!D) return null;
  prep(D);
  return D;
}

/* ---------- স্কোর ---------- */
const REPOF = { t: 'dtr', r: 'reg', u: 'ubp', vo: 'sav', c: 'sav', a: 'a2m' };
function tillOf(D, p, lv) {
  const T = D.tills || {}, base = D.tillDate || D.updated;
  const ok = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && s.slice(0, 7) === D.month;
  if (p === 'a' && lv === 'om') { const c = ['a2m', 'd2c'].map(k => T[k]).filter(ok).sort(); return c[0] || base; }
  const t = T[REPOF[p]];
  return ok(t) ? t : base;
}
function dayInfo(D, p, lv) {
  const tl = dt(tillOf(D, p, lv)), dim = new Date(tl.getFullYear(), tl.getMonth() + 1, 0).getDate(), day = tl.getDate();
  return { day, dim, left: dim - day, till: tillOf(D, p, lv) };
}
/* রেকর্ড থেকে প্যারামিটারের অর্জন, টার্গেট, গত মাস */
function vv(rec, p, lv) {
  const v = rec.v || {}, g = k => v[k] || {};
  const n = x => x == null ? null : x;
  if (p === 'a') {
    if (lv !== 'om') return { ach: n(g('a2m').ach), trg: n(g('a2m').trg), lm: null };
    const a = g('a2m'), d = g('d2c');
    return {
      ach: (a.ach == null && d.ach == null) ? null : (a.ach || 0) + (d.ach || 0),
      trg: (a.trg == null && d.trg == null) ? null : (a.trg || 0) + (d.trg || 0),
      lm: null, a2m: a.ach, d2c: d.ach, a2mT: a.trg, d2cT: d.trg
    };
  }
  return { ach: n(g(p).ach), trg: n(g(p).trg), lm: n(g(p).lm) };
}
function frac(D, rec, lv, p, basis) {
  const { ach, trg } = vv(rec, p, lv);
  if (!(trg > 0)) return 0;
  const { day, dim } = dayInfo(D, p, lv);
  return (ach || 0) / (basis === 'MTD' ? trg * day / dim : trg);
}
/* স্কোর = Σ ওজন × min(অর্জন %, ১০০%) */
function compute(D) {
  const run = (rec, lv) => { let s = 0; LV[lv].ps.forEach(([p, , b, w]) => { const f = frac(D, rec, lv, p, b); rec[p] = f; s += w * Math.min(f, 1); }); rec.score = s; };
  const rankIn = (arr, key, set) => [...new Set(arr.map(key))].forEach(g => arr.filter(x => key(x) === g).sort((a, b) => b.score - a.score).forEach((x, i) => x[set] = i + 1));
  D.ra.forEach(x => run(x, 'dso'));
  D.teams.forEach(x => run(x, 'dss'));
  D.dh.forEach(x => run(x, 'om'));
  run(D.territory, 'om');
  rankIn(D.ra, x => x.dh, 'dhRank');
  rankIn(D.ra, x => x.dh + '\u0001' + x.dss, 'teamRank');
  [...D.ra].sort((a, b) => b.score - a.score).forEach((x, i) => x.allRank = i + 1);
  [...D.teams].sort((a, b) => b.score - a.score).forEach((x, i) => x.rank = i + 1);   // ডিএসএস: পুরো টেরিটরিতে এক র‍্যাঙ্ক
  [...D.dh].sort((a, b) => b.score - a.score).forEach((x, i) => x.rank = i + 1);
}
function prep(D) {
  D.ra = D.ra || []; D.teams = D.teams || []; D.dh = D.dh || []; D.tills = D.tills || {};
  D.ra.forEach(x => { x.dh = up(x.dh); x.dss = String(x.dss).replace(/\s+/g, ' ').trim(); });
  D.teams.forEach(x => { x.dh = up(x.dh); x.dss = String(x.dss).replace(/\s+/g, ' ').trim(); });
  D.dh.forEach(x => x.name = up(x.name));
  D.territory = D.territory || { v: {} };
  compute(D);
}

/* ---------- সেশন ও লগইন ---------- */
function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { } return null; }
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } return null; }
function session() { try { return JSON.parse(ss('gcd_s') || 'null'); } catch (e) { return null; } }
function setSession(s) { ss('gcd_s', s ? JSON.stringify(s) : null); }
/* অ্যাডমিন: অ্যাডমিন পেজে টোকেন দিয়ে সাইন ইন করলে, অথবা এই কম্পিউটারে মনে রাখা টোকেন বৈধ হলে */
async function adminCheck() {
  if (ss('gcd_admin') === '1') return true;
  const t = ls('gt'); if (!t) return false;
  try {
    const r = await fetch(API, { headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' } });
    const j = await r.json();
    if (r.ok && j.permissions && j.permissions.push) { ss('gcd_admin', '1'); return true; }
  } catch (e) { }
  return false;
}
/* ওয়ালেট → ভূমিকা: ডিএসও (আরএ ওয়ালেট) বা ওএম (ডিস্ট্রিবিউটরের MA ওয়ালেট) */
function identify(D, w) {
  const n = norm(w); if (n.length !== 11) return null;
  const ra = D.ra.find(r => norm(r.wallet) === n); if (ra) return { role: 'dso', w: n };
  const dh = D.dh.find(d => d.ma && norm(d.ma) === n); if (dh) return { role: 'om', w: n };
  return null;
}
function resolve(D, s, isAdmin) {
  if (isAdmin) return { role: 'admin', me: null, myDH: null };
  if (!s) return null;
  const n = norm(s.w);
  const me = D.ra.find(r => norm(r.wallet) === n) || null;
  const myDH = D.dh.find(d => d.ma && norm(d.ma) === n) || null;
  if (me) return { role: 'dso', me, myDH: null };
  if (myDH) return { role: 'om', me: null, myDH };
  if (s.role) return { role: s.role, me: null, myDH: null, missing: true };
  return null;
}
function signOut() { setSession(null); ss('gcd_admin', null); location.href = 'index.html'; }

/* ---------- হেডার ও নেভিগেশন ---------- */
function header(o) {
  const months = (o.IDX.months || []).slice().sort().reverse();
  const roleLab = { dso: 'ডিএসও', om: 'অপারেশন ম্যানেজার', admin: 'অ্যাডমিন' }[o.who.role] || '';
  const name = o.who.me ? tc(o.who.me.name) : o.who.myDH ? o.who.myDH.name : '';
  $('#hdr').innerHTML = `
  <header class="hero">
    <span class="sp" style="top:10px;left:46%">✦</span><span class="sp" style="top:54px;left:58%;animation-delay:.7s;font-size:14px">★</span><span class="sp" style="bottom:12px;left:40%;animation-delay:1.3s">✦</span>
    <div class="badge"><img src="logo.jpg" alt="Achievers’ Club"></div>
    <div><h1>${esc(o.title)}</h1><span class="till">${esc(monLabel(o.D.month))} · Till ${esc(fmtTill(o.till || o.D.tillDate))}</span></div>
    <div class="side">
      ${months.length > 1 ? `<label class="mut" for="msel" style="color:#fff;margin:0">মাস</label><select id="msel" aria-label="মাস বেছে নিন">${months.map(m => `<option value="${m}" ${m === o.D.month ? 'selected' : ''}>${monLabel(m)}</option>`).join('')}</select>` : ''}
      <button class="ghost" id="out" type="button">সাইন আউট</button>
    </div>
  </header>
  <nav class="tabs" aria-label="পেজ">
    <a href="index.html" class="${o.page === 'ac' ? 'on' : ''}">🏆 Achievers’ Club</a>
    ${o.who.role === 'om' || o.who.role === 'admin' ? `<a href="service.html" class="${o.page === 'ms' ? 'on' : ''}">🛠️ Market Service</a>` : ''}
    ${o.who.role === 'admin' ? `<a href="admin.html">⚙️ অ্যাডমিন</a>` : ''}
    <span class="who">${esc(roleLab)}${name ? ' · ' + esc(name) : ''}</span>
  </nav>`;
  $('#out').onclick = signOut;
  const ms = $('#msel'); if (ms) ms.onchange = () => { ss('gcd_m', ms.value); o.onMonth(ms.value); };
}
function head(a, n = 1) { return '<tr>' + a.map((h, i) => `<th class="${i < n ? 'l' : ''}">${h}</th>`).join('') + '</tr>'; }
function confetti(n) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const cols = ['#E2136E', '#FFB300', '#0B9C8F', '#FF6FA8', '#7C4DFF'];
  for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.className = 'cf'; s.style.left = Math.random() * 100 + 'vw'; s.style.background = cols[i % 5]; s.style.animationDelay = Math.random() * .8 + 's'; s.style.animationDuration = 2.4 + Math.random() * 1.6 + 's'; document.body.appendChild(s); setTimeout(() => s.remove(), 5000); }
}

return { OWNER, REPO, API, MON, MED, LV, REPOF, $, esc, tc, up, norm, nf, nd, pcCell, dt, fmtTill, monLabel, getJSON, loadIndex, pickMonth, loadMonth, prep, compute, vv, frac, dayInfo, tillOf, ss, ls, session, setSession, adminCheck, identify, resolve, signOut, header, head, confetti };
})();

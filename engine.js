/* =====================================================================
   Gazipur Central Dashboard — রিপোর্ট ইঞ্জিন (শুধু অ্যাডমিন পেজে চলে)
   - রিপোর্ট ফাইল চেনা, কলামের নাম দেখে ডেটা নেওয়া (কলাম জায়গা বদলালেও চলবে)
   - নির্বাচিত মাস অনুযায়ী ফাইল বাছাই (চলতি মাস / গত মাস)
   - ডিএসও → ডিএসএস → ডিএইচ → টেরিটরি যোগফল
   - মার্কেট সার্ভিস ক্রাইটেরিয়া হিসাব
   ===================================================================== */
(function (root) {
'use strict';
const X = () => root.XLSX;
const MONS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/* ---------- ছোট সহায়ক ---------- */
const N = s => String(s == null ? '' : s).replace(/\.0+$/, '').replace(/[^\d]/g, '').replace(/^880/, '').replace(/^0+/, '');
const w11 = s => { const n = N(s); return n.length === 10 ? '0' + n : ''; };
const up = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
const hc = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
const toNum = v => { if (typeof v === 'number' && isFinite(v)) return v; if (typeof v === 'string' && v.trim() !== '') { const n = Number(v.replace(/[,\s]/g, '')); return isFinite(n) ? n : null; } return null; };
const num0 = v => toNum(v) || 0;
const pad = n => String(n).padStart(2, '0');
const iso = d => new Date(d.getTime() + 12 * 3600e3).toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ym = s => String(s || '').slice(0, 7);
const prevMonth = m => { let [y, mo] = m.split('-').map(Number); mo--; if (!mo) { mo = 12; y--; } return `${y}-${pad(mo)}`; };
const endOfMonth = m => { const [y, mo] = m.split('-').map(Number); return `${m}-${pad(new Date(Date.UTC(y, mo, 0)).getUTCDate())}`; };
const today = () => iso(new Date());
const fmt = n => Math.round(n || 0).toLocaleString('en-IN');
const L = (c, t) => [c, t];             // c: ok | warn | bad | n

function parseDate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v)) return iso(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) return iso(new Date(Math.round((v - 25569) * 864e5)));
  const s = String(v).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/))) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  if ((m = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-](\d{2,4})/)) && MONS.indexOf(m[2].toLowerCase()) >= 0) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${pad(MONS.indexOf(m[2].toLowerCase()) + 1)}-${pad(m[1])}`; }
  return '';
}
/* "Oct 2026" / "October-26" / "2026-10" → "2026-10" */
function parseMonth(v) {
  if (v instanceof Date) return ym(iso(v));
  const s = String(v == null ? '' : v).trim();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})/))) return `${m[1]}-${pad(m[2])}`;
  if ((m = s.match(/([A-Za-z]{3})[a-z]*[\s'_-]*(\d{2,4})/)) && MONS.indexOf(m[1].toLowerCase()) >= 0) { let y = +m[2]; if (y < 100) y += 2000; return `${y}-${pad(MONS.indexOf(m[1].toLowerCase()) + 1)}`; }
  return '';
}
/* ফাইলের নাম থেকে "ডেটা কোন তারিখ পর্যন্ত" */
function dateFromName(n) {
  n = String(n || '').replace(/^[0-9a-f]{8}-/i, '');
  let m;
  const mon = s => MONS.indexOf(s.slice(0, 3).toLowerCase());
  const mk = (y, mo, d) => { y = +y; if (y < 100) y += 2000; return `${y}-${pad(mo + 1)}-${pad(d)}`; };
  if ((m = n.match(/(\d{1,2})(?:st|nd|rd|th)[_\s-]*([A-Za-z]{3})[a-z]*[\s'_-]*(\d{2,4})/i)) && mon(m[2]) >= 0) return mk(m[3], mon(m[2]), m[1]);
  if ((m = n.match(/([A-Za-z]{3})[a-z]*[\s'_-]*(\d{2,4})[_\s-]+(\d{1,2})(?:st|nd|rd|th)/i)) && mon(m[1]) >= 0) return mk(m[2], mon(m[1]), m[3]);
  if ((m = n.match(/Download[_\s]*Date[_\s]*(\d{1,2})-([A-Za-z]{3})-(\d{4})/i)) && mon(m[2]) >= 0) return addDays(mk(m[3], mon(m[2]), m[1]), -1); // ডাউনলোডের আগের দিন
  if ((m = n.match(/(\d{4})-(\d{2})-(\d{2})/))) return m[0];
  return '';
}
function monthFromName(n) {
  n = String(n || '').replace(/^[0-9a-f]{8}-/i, '');
  const re = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s'_-]*(\d{2,4})(?!\d)/ig;
  let m, last = '';
  while ((m = re.exec(n))) { let y = +m[2]; if (y < 100) y += 2000; if (y > 2000 && y < 2100) last = `${y}-${pad(MONS.indexOf(m[1].toLowerCase()) + 1)}`; }
  return last;
}

/* ---------- শিট পড়া ---------- */
const aoaOf = (wb, sn) => X().utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null, raw: true });
function findHdr(aoa, names, max = 15) {
  const want = names.map(hc);
  for (let i = 0; i < Math.min(aoa.length, max); i++) {
    const row = (aoa[i] || []).map(hc);
    if (want.every(w => row.includes(w))) return mkHdr(aoa, i);
  }
  return null;
}
function mkHdr(aoa, i) {
  const raw = (aoa[i] || []).map(c => String(c == null ? '' : c).replace(/\s+/g, ' ').trim());
  const row = raw.map(c => c.toLowerCase());
  const ix = n => row.indexOf(hc(n));
  const ixAny = list => { for (const n of list) { const k = ix(n); if (k >= 0) return k; } return -1; };
  return { hi: i, row, raw, ix, ixAny };
}
/* একই নামের কলাম থাকলে ওপরের সারির গ্রুপ নাম জুড়ে আলাদা করা */
function fieldNames(aoa, h) {
  const above = h.hi > 0 ? (aoa[h.hi - 1] || []).map(c => String(c == null ? '' : c).replace(/\s+/g, ' ').trim()) : [];
  const seen = {}, out = [];
  let grp = '';
  h.raw.forEach((c, i) => {
    if (above[i]) grp = above[i];
    if (!c) { out.push(''); return; }
    const dup = h.raw.filter(x => x === c).length > 1;
    let name = dup && grp ? `${grp} › ${c}` : c;
    if (seen[name]) name += ' #' + (++seen[name]); else seen[name] = 1;
    out.push(name);
  });
  return out;
}
const dataRows = (aoa, h) => aoa.slice(h.hi + 1).filter(r => r && r.some(c => c != null && c !== ''));

/* ---------- রিপোর্টের ধরন ---------- */
const SLOTS = [
  { id: 'target', label: 'RA-DSS টার্গেট ফাইল', freq: 'মাসে একবার' },
  { id: 'dtr', label: 'TRX — Daily Transaction Report (সর্বশেষ দিন)', freq: 'প্রতিদিন' },
  { id: 'lmdtr', label: 'LMTD TRX — গত মাসের একই তারিখের TRX রিপোর্ট', freq: 'মাসে একবার (গ্রোথের জন্য)' },
  { id: 'reg', label: 'REG — Daily Acquisition Report', freq: 'প্রতিদিন' },
  { id: 'ubp', label: 'UBP — Assisted Bill Pay (Agent Wise)', freq: 'প্রতিদিন' },
  { id: 'sav', label: 'SAVINGS — Savings Ref. Report', freq: 'HQ থেকে পেলে' },
  { id: 'a2m', label: 'A2M রিপোর্ট', freq: 'HQ থেকে পেলে' },
  { id: 'd2c', label: 'D2C রিপোর্ট', freq: 'HQ থেকে পেলে' },
  { id: 'r78', label: 'REPORT 78 (Agent Wise) — মার্কেট সার্ভিস', freq: 'ঐচ্ছিক', svc: true },
  { id: 'b2bid', label: 'B2B TRX ID Wise — মার্কেট সার্ভিস', freq: 'ঐচ্ছিক', svc: true },
  { id: 'agentx', label: 'অন্য যেকোনো এজেন্ট-ভিত্তিক রিপোর্ট — মার্কেট সার্ভিস', freq: 'ঐচ্ছিক', svc: true }
];
const SIG = [
  ['dtr', ['trx date', 'ra wallet', 'agent wallet', 'mtd ci amt', 'mtd co amt']],
  ['reg', ['ra wallet', 'agent wallet', 'd0 pin change & ci count (both)']],
  ['reg', ['ra wallet', 'agent wallet', 'mtd registration']],
  ['ubp', ['agent wallet', 'mtd', 'lmtd']],
  ['a2m', ['ag_wlt', 'trx_amt']],
  ['d2c', ['d2c_trx_amount']],
  ['sav', ['assist_ag_wlt', 'new_customer_status']],
  ['b2bid', ['trx type', 'ag wlt', 'ra wlt', 'trx amt']],
  ['r78', ['dso supervisor name', 'agent wallet', 'mtd trx amt']]
];
const AGENT_COLS = ['agent wallet', 'agent_wallet', 'ag wlt', 'ag_wlt', 'agent wlt', 'agent', 'assist_ag_wlt'];
const RA_COLS = ['ra wallet', 'ra wlt', 'ra', 'ra_wallet', 'ra_wlt'];

function detectAs(wb, type) {
  if (type === 'target') {
    const k = wb.SheetNames.find(n => n.trim().toUpperCase() === 'RA');
    if (k && findHdr(aoaOf(wb, k), ['distributor', 'dss name', 'ra'])) return { type };
    return null;
  }
  if (type === 'agentx') {
    for (const sn of wb.SheetNames) {
      const a = aoaOf(wb, sn);
      for (let i = 0; i < Math.min(a.length, 15); i++) {
        const h = mkHdr(a, i);
        if (h.ixAny(AGENT_COLS) >= 0) return { type, aoa: a, h, sheet: sn };
      }
    }
    return null;
  }
  for (const [t, sig] of SIG) {
    if (t !== type) continue;
    for (const sn of wb.SheetNames) { const a = aoaOf(wb, sn); const h = findHdr(a, sig); if (h) return { type: t, aoa: a, h, sheet: sn }; }
  }
  return null;
}
function detect(wb) {
  const t = detectAs(wb, 'target'); if (t) return t;
  for (const [type] of SIG) { const d = detectAs(wb, type); if (d) return d; }
  return { type: 'unknown' };
}
function read(data, name, type) {
  const wb = X().read(data, { type: type || 'array', cellDates: true });
  const det = detect(wb);
  return { name, wb, det, type: det.type, slot: null, lines: [], till: '' };
}

/* ---------- অবস্থা (একটি মাসের) ---------- */
function emptyW(month) {
  return { v: 2, month, updated: '', tillDate: '', tills: {}, cfg: { savCnt: 10, d2c: {} }, ra: [], teams: [], dh: [], territory: { v: {} } };
}
function newState(month) {
  return { month, W: emptyW(month), AM: new Map(), amDate: '', src: {}, crit: defaultCrit(), svc: null, fields: [], dirty: { data: false, am: false, svc: false } };
}
function fixW(W, month) {
  W = Object.assign(emptyW(month), W || {});
  W.tills = W.tills || {}; W.cfg = Object.assign({ savCnt: 10, d2c: {} }, W.cfg || {}); W.cfg.d2c = W.cfg.d2c || {};
  W.territory = W.territory || { v: {} };
  return W;
}

/* ---------- হ্যাশ (এজেন্ট → আরএ ম্যাপ প্রকাশ্যে সরাসরি নম্বর রাখে না) ---------- */
async function hs(s) {
  const t = 'gcd:' + s;
  const c = root.crypto;
  if (c && c.subtle) { const b = await c.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join(''); }
  let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0') + String(t.length);
}
async function hashAll(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 500) out.push(...await Promise.all(list.slice(i, i + 500).map(x => hs(N(x)))));
  return out;
}
/* এজেন্ট ওয়ালেট ধরে আরএ-ভিত্তিক যোগফল; না মিললে ডিস্ট্রিবিউটর অনুযায়ী আলাদা */
async function byAgent(S, rows, ai, vals, opt = {}) {
  const keep = rows.filter(r => N(r[ai]) && (!opt.filter || opt.filter(r)));
  const hh = await hashAll(keep.map(r => r[ai]));
  const m = {}, x = {}; let un = 0, unV = 0;
  for (const k in vals) { m[k] = new Map(); x[k] = new Map(); }
  keep.forEach((r, i) => {
    let ra = S.AM.get(hh[i]);
    if (!ra && opt.raCol >= 0) ra = N(r[opt.raCol]);
    if (ra) { for (const k in vals) m[k].set(ra, (m[k].get(ra) || 0) + vals[k](r)); return; }
    un++;
    const dh = opt.dhOf ? opt.dhOf(r) : '';
    for (const k in vals) { const v = vals[k](r); unV += v; if (dh) x[k].set(dh, (x[k].get(dh) || 0) + v); }
  });
  return { m, x, un, n: keep.length };
}

/* ---------- ডিএসও/ডিএইচ ঘরে বসানো ---------- */
function setAll(S, p, f, m) {
  let hit = 0, sum = 0;
  const ours = new Set(S.W.ra.map(r => N(r.wallet)));
  S.W.ra.forEach(x => { x.v = x.v || {}; x.v[p] = x.v[p] || {}; const v = m.get(N(x.wallet)) || 0; x.v[p][f] = v; if (v > 0) hit++; sum += v; });
  let outside = 0, outV = 0; m.forEach((v, k) => { if (!ours.has(k)) { outside++; outV += v; } });
  return { hit, sum, outside, outV };
}
function setX(S, key, xm) {          // আরএ-তে না মেলা এজেন্টের মান সরাসরি ডিএইচ-এ যোগ
  let s = 0;
  S.W.dh.forEach(d => { d.x = d.x || {}; const v = xm ? (xm.get(d.name) || 0) : 0; d.x[key] = v; s += v; });
  return s;
}
const need = S => { if (!S.W.ra.length) throw new Error('আগে এই মাসের RA-DSS টার্গেট ফাইল দিন, নইলে ডিএসও মেলানো যাবে না।'); };
const dhOfCol = i => r => up(r[i]);

function aggregate(S) {
  const W = S.W;
  W.cfg = W.cfg || { savCnt: 10, d2c: {} }; W.cfg.d2c = W.cfg.d2c || {};
  const P = ['t', 'r', 'vo', 'c', 'u', 'a2m'], F = ['trg', 'ach', 'lm'];
  W.ra.forEach(x => { x.v = x.v || {}; x.v.c = x.v.c || {}; x.v.c.trg = +W.cfg.savCnt || 0; });
  const sum = (arr, p, f) => { let s = 0, any = false; arr.forEach(x => { const v = x.v && x.v[p] && x.v[p][f]; if (v != null) { s += v; any = true; } }); return any ? s : null; };
  const set = (o, p, f, val) => { o.v = o.v || {}; o.v[p] = o.v[p] || {}; if (val == null) delete o.v[p][f]; else o.v[p][f] = val; };
  W.teams.forEach(t => {
    const rs = W.ra.filter(x => x.dh === t.dh && x.dss === t.dss);
    P.forEach(p => F.forEach(f => set(t, p, f, f === 'trg' && t.tt && t.tt[p] != null ? t.tt[p] : sum(rs, p, f))));
  });
  W.dh.forEach(d => {
    const ts = W.teams.filter(x => x.dh === d.name);
    d.x = d.x || {};
    P.forEach(p => F.forEach(f => {
      let v = f === 'trg' && d.tt && d.tt[p] != null ? d.tt[p] : sum(ts, p, f);
      const ex = f === 'trg' ? 0 : (d.x[p + '.' + f] || 0);
      if (ex) v = (v || 0) + ex;
      set(d, p, f, v);
    }));
    const t = +W.cfg.d2c[d.name];
    set(d, 'd2c', 'trg', t > 0 ? t : null);
    set(d, 'd2c', 'ach', d.d2cAch == null ? null : d.d2cAch);
  });
  W.territory = { v: {} };
  [...P, 'd2c'].forEach(p => F.forEach(f => set(W.territory, p, f, sum(W.dh, p, f))));
}

/* ---------- মাস যাচাই ---------- */
function clipTill(S, t, lines, label) {
  const M = S.month;
  if (!t) { t = addDays(today(), -1); if (t > endOfMonth(M)) t = endOfMonth(M); lines.push(L('n', `${label}: ফাইলের নামে তারিখ নেই, ${t} ধরা হয়েছে — ভুল হলে নিচে ঠিক করুন`)); return t; }
  if (ym(t) !== M) {
    const nt = t > endOfMonth(M) ? endOfMonth(M) : t;
    lines.push(L('warn', `ফাইলের তারিখ ${t}, কিন্তু নির্বাচিত মাস ${M}। ${nt !== t ? `Till ${nt} (মাসের শেষ দিন) ধরা হয়েছে।` : ''} রিপোর্টটি সত্যিই ${M}-এর কিনা দেখে নিন, দরকারে তারিখ ঠিক করুন।`));
    return nt;
  }
  lines.push(L('n', `ডেটা Till ${t} ধরা হয়েছে — ভুল হলে নিচে ঠিক করুন`));
  return t;
}

/* ---------- হ্যান্ডলার ---------- */
const H = {};
const COL = { t: 'transaction', r: 'registration', vo: 'savings new customer', u: 'bill pay', a2m: 'a2m' };
function sheetBy(wb, name) {
  const k = wb.SheetNames.find(n => n.trim().toUpperCase() === name); if (!k) return null;
  const aoa = aoaOf(wb, k); const h = findHdr(aoa, ['distributor']); if (!h) return null;
  return { rows: dataRows(aoa, h), ix: h.ix };
}
H.target = async (S, j) => {
  const RAs = sheetBy(j.wb, 'RA'), DSSs = sheetBy(j.wb, 'DSS');
  if (!RAs) throw new Error('"RA" শিট পাওয়া যায়নি।');
  const lines = [];
  const fm = monthFromName(j.name);
  if (fm && fm !== S.month) lines.push(L('warn', `ফাইলের নাম অনুযায়ী এটি ${fm}-এর টার্গেট, কিন্তু নির্বাচিত মাস ${S.month}। ভুল হলে ওপরে মাস বদলে আবার দিন।`));
  const canon = new Map(); const cn = n => { const t = String(n == null ? '' : n).replace(/\s+/g, ' ').trim(); const k = up(t); if (!canon.has(k)) canon.set(k, t); return canon.get(k); };
  const tg = (sh, row) => { const v = {}; for (const p in COL) { const i = sh.ix(COL[p]); if (i < 0) continue; const n = toNum(row[i]); if (n != null) v[p] = n; } return v; };
  const teams = new Map(), dhMA = new Map();
  if (DSSs) DSSs.rows.forEach(r => {
    const dh = up(r[DSSs.ix('distributor')]), ds = cn(r[DSSs.ix('dss name')]); if (!dh || !ds) return;
    teams.set(dh + '\u0001' + up(ds), { dh, dss: ds, tt: tg(DSSs, r), v: {} });
    const ma = w11(r[DSSs.ix('ma')]); if (ma && !dhMA.has(dh)) dhMA.set(dh, ma);
  });
  const old = new Map(S.W.ra.map(x => [x.wallet, x.v]));
  const ra = []; let skip = 0; const seen = new Set();
  RAs.rows.forEach(r => {
    const dh = up(r[RAs.ix('distributor')]), ds = cn(r[RAs.ix('dss name')]), w = w11(r[RAs.ix('ra')]);
    if (!dh || !ds || !w || seen.has(w)) { if (dh || ds) skip++; return; }
    seen.add(w);
    const ma = w11(r[RAs.ix('ma')]); if (ma && !dhMA.has(dh)) dhMA.set(dh, ma);
    const nm = r[RAs.ix('dso name')];
    const v = {}; const t = tg(RAs, r); for (const p in t) v[p] = { trg: t[p] };
    const ov = old.get(w);
    if (ov) for (const p in ov) for (const f of ['ach', 'lm']) if (ov[p] && ov[p][f] != null) { v[p] = v[p] || {}; v[p][f] = ov[p][f]; }
    ra.push({ dh, dss: ds, name: String(nm == null ? '' : nm).replace(/\s+/g, ' ').trim(), wallet: w, v });
    const k = dh + '\u0001' + up(ds); if (!teams.has(k)) teams.set(k, { dh, dss: ds, v: {} });
  });
  if (!ra.length) throw new Error('কোনো ডিএসও সারি পাওয়া যায়নি।');
  const oldD = new Map((S.W.dh || []).map(x => [x.name, x]));
  const dmap = new Map();
  [...ra.map(x => x.dh), ...[...teams.values()].map(t => t.dh)].forEach(n => {
    if (dmap.has(n)) return;
    const o = oldD.get(n) || {};
    dmap.set(n, { name: n, ma: dhMA.get(n) || o.ma || '', x: o.x || {}, tt: o.tt || {}, d2cAch: o.d2cAch == null ? null : o.d2cAch, v: {} });
  });
  S.W.ra = ra; S.W.teams = [...teams.values()]; S.W.dh = [...dmap.values()];
  S.W.tills.target = S.month;
  aggregate(S);
  lines.unshift(L('ok', `${ra.length} জন ডিএসও, ${S.W.teams.length}টি ডিএসএস টিম, ${S.W.dh.length}টি ডিএইচ (${S.W.dh.map(d => d.ma ? d.name + ' — MA ' + d.ma : d.name).join('; ')})`));
  lines.push(DSSs ? L('ok', 'ডিএসএস টার্গেট "DSS" শিট থেকে, ওএম টার্গেট ডিএসএস-দের যোগফল') : L('warn', '"DSS" শিট নেই — ডিএসএস টার্গেট ডিএসও-দের যোগফল ধরা হয়েছে'));
  if (skip) lines.push(L('warn', `${skip}টি সারি বাদ গেছে (ওয়ালেট নেই বা ডুপ্লিকেট)`));
  return { lines, till: S.month };
};

function dtrDate(det) {
  const h = det.h, i = h.ix('trx date');
  for (const r of dataRows(det.aoa, h)) { const d = parseDate(r[i]); if (d) return d; }
  return '';
}
function keepSrc(S, key, det, extra) {
  const names = fieldNames(det.aoa, det.h);
  S.src[key] = Object.assign({ names, rows: dataRows(det.aoa, det.h) }, extra || {});
}
/* TRX (সর্বশেষ দিন): MTD TRX = MTD CI AMT + MTD CO AMT; এজেন্ট→আরএ ম্যাপ এখান থেকেই */
H.dtr = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ri = h.ix('ra wallet'), ci = h.ix('mtd ci amt'), oi = h.ix('mtd co amt'), ai = h.ix('agent wallet');
  const date = dtrDate(j.det);
  const m = new Map();
  rows.forEach(r => { const k = N(r[ri]); if (!k) return; m.set(k, (m.get(k) || 0) + num0(r[ci]) + num0(r[oi])); });
  const s = setAll(S, 't', 'ach', m);
  aggregate(S);
  const lines = [L('ok', `TRX ${date}: ${rows.length}টি এজেন্ট · ${s.hit}/${S.W.ra.length} জন ডিএসও-র MTD TRX (CI+CO) বসেছে · মোট ${fmt(s.sum)}`)];
  if (s.outside) lines.push(L('warn', `${s.outside}টি আরএ ওয়ালেট টার্গেট ফাইলে নেই (মোট ${fmt(s.outV)}) — বাদ দেওয়া হয়েছে`));
  // নতুন এজেন্ট-আরএ ম্যাপ (সর্বশেষ TRX রিপোর্ট থেকে, পুরোনোটা বাদ)
  const pr = rows.filter(r => N(r[ai]) && N(r[ri]));
  const hh = await hashAll(pr.map(r => r[ai]));
  S.AM = new Map(); pr.forEach((r, i) => S.AM.set(hh[i], N(r[ri])));
  S.amDate = date; S.dirty.am = true;
  lines.push(L('ok', `এজেন্ট-আরএ ম্যাপ এই রিপোর্ট থেকে নতুন করে নেওয়া হলো (${S.AM.size}টি এজেন্ট) — UBP, A2M, SAVINGS, LMTD এই ম্যাপ দিয়ে মেলানো হবে`));
  keepSrc(S, 'dtr', j.det, { date });
  return { lines, till: date };
};
/* গত মাসের একই সময়ের TRX — সর্বশেষ ম্যাপ দিয়ে মেলানো (না মিললে রিপোর্টের আরএ) */
H.lmdtr = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ri = h.ix('ra wallet'), ci = h.ix('mtd ci amt'), oi = h.ix('mtd co amt'), ai = h.ix('agent wallet'), di = h.ix('distributor name');
  const date = dtrDate(j.det);
  const r = await byAgent(S, rows, ai, { v: x => num0(x[ci]) + num0(x[oi]) }, { raCol: ri, dhOf: di >= 0 ? dhOfCol(di) : null });
  const s = setAll(S, 't', 'lm', r.m.v);
  setX(S, 't.lm', r.x.v);
  aggregate(S);
  const lines = [L('ok', `LMTD TRX ${date}: ${rows.length}টি এজেন্ট · মোট ${fmt(s.sum)} (সর্বশেষ এজেন্ট-আরএ ম্যাপ অনুযায়ী)`)];
  if (!S.AM.size) lines.push(L('warn', 'এজেন্ট-আরএ ম্যাপ নেই — গত মাসের রিপোর্টের আরএ ধরা হয়েছে। আগে সর্বশেষ TRX রিপোর্ট দিন।'));
  const main = S.W.tills.dtr;
  if (main && main.slice(8) !== date.slice(8)) lines.push(L('warn', `সর্বশেষ TRX ${main}, কিন্তু এই LMTD ফাইল ${date} — একই তারিখের (দিন) হলে তুলনা সঠিক হয়`));
  return { lines, till: date };
};
/* REG: D0 Pin Change & CI Count (Both) */
H.reg = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ri = h.ix('ra wallet');
  let vi = h.ix('d0 pin change & ci count (both)');
  const lines = [];
  if (vi < 0) { vi = h.ix('mtd registration'); lines.push(L('warn', '"D0 Pin Change & CI Count (Both)" কলাম নেই — MTD Registration ধরা হয়েছে')); }
  const m = new Map(); rows.forEach(r => { const k = N(r[ri]); if (!k) return; m.set(k, (m.get(k) || 0) + num0(r[vi])); });
  const s = setAll(S, 'r', 'ach', m);
  aggregate(S);
  lines.unshift(L('ok', `${rows.length}টি এজেন্ট সারি · ${s.hit}/${S.W.ra.length} জন ডিএসও-র REG (D0 Pin Change & CI Both) বসেছে · মোট ${fmt(s.sum)}`));
  if (s.outside) lines.push(L('warn', `${s.outside}টি আরএ ওয়ালেট টার্গেট ফাইলে নেই — বাদ দেওয়া হয়েছে`));
  keepSrc(S, 'reg', j.det);
  return { lines, till: clipTill(S, dateFromName(j.name), lines, 'REG') };
};
/* UBP: MTD (বিল পে কাউন্ট), LMTD — এজেন্ট→আরএ সর্বশেষ TRX ম্যাপ থেকে */
H.ubp = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ai = h.ix('agent wallet'), mi = h.ix('mtd'), li = h.ix('lmtd'), di = h.ix('distributor');
  const r = await byAgent(S, rows, ai, { a: x => num0(x[mi]), l: x => li >= 0 ? num0(x[li]) : 0 }, { dhOf: di >= 0 ? dhOfCol(di) : null });
  const s = setAll(S, 'u', 'ach', r.m.a); setAll(S, 'u', 'lm', r.m.l);
  const xa = setX(S, 'u.ach', r.x.a); setX(S, 'u.lm', r.x.l);
  aggregate(S);
  const lines = [L('ok', `${r.n}টি এজেন্ট · ${s.hit}/${S.W.ra.length} জন ডিএসও-র UBP (MTD বিল পে কাউন্ট) বসেছে · মোট ${fmt(s.sum)}`)];
  if (!S.AM.size) lines.push(L('bad', 'এজেন্ট-আরএ ম্যাপ নেই — আগে সর্বশেষ TRX রিপোর্ট দিন, তারপর UBP আবার দিন'));
  if (r.un) lines.push(L('warn', `${r.un}টি এজেন্ট কোনো আরএ-র সাথে মেলেনি — তাদের ${fmt(xa)} সরাসরি ডিএইচ-এ যোগ হয়েছে`));
  if (s.outside) lines.push(L('warn', `${s.outside}টি এজেন্ট টার্গেট ফাইলের বাইরের আরএ-র (মোট ${fmt(s.outV)}) — বাদ`));
  keepSrc(S, 'ubp', j.det);
  return { lines, till: clipTill(S, dateFromName(j.name), lines, 'UBP'), warn: !!r.un };
};
/* SAVINGS: শুধু নতুন কাস্টমার (Y) — VOL = Instalment Volume, CNT = সংখ্যা */
H.sav = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ai = h.ix('assist_ag_wlt'), st = h.ix('new_customer_status');
  let vi = h.ix('instalment volume');
  const lines = [];
  if (vi < 0) { vi = h.ixAny(['installment volume', 'instalment_volume']); }
  if (vi < 0) throw new Error('"Instalment Volume" কলাম পাওয়া যায়নি।');
  const odi = h.ix('saving_opn_date'), di = h.ixAny(['ma name', 'distributor']);
  let other = 0;
  const inMonth = r => { if (odi < 0) return true; const d = parseDate(r[odi]); if (d && ym(d) !== S.month) { other++; return false; } return true; };
  const yes = r => up(r[st]) === 'Y' && inMonth(r);
  const r = await byAgent(S, rows, ai, { v: x => num0(x[vi]), c: () => 1 }, { filter: yes, dhOf: di >= 0 ? dhOfCol(di) : null });
  const s1 = setAll(S, 'vo', 'ach', r.m.v), s2 = setAll(S, 'c', 'ach', r.m.c);
  setX(S, 'vo.ach', r.x.v); setX(S, 'c.ach', r.x.c);
  aggregate(S);
  // HQ-র ডিএইচ টার্গেট (MA Wise শিট): Total New Customer Count Target
  const mw = j.wb.SheetNames.find(n => hc(n) === 'ma wise');
  if (mw) {
    const a = aoaOf(j.wb, mw), mh = findHdr(a, ['distributor', 'total new customer count target']);
    if (mh) {
      const got = [];
      dataRows(a, mh).forEach(x => { const d = S.W.dh.find(y => y.name === up(x[mh.ix('distributor')])); const t = toNum(x[mh.ix('total new customer count target')]); if (d && t != null) { d.tt = d.tt || {}; d.tt.c = t; got.push(`${d.name}: ${t}`); } });
      if (got.length) { aggregate(S); lines.push(L('ok', `ওএম-এর SAV-CNT টার্গেট HQ-র MA Wise শিট থেকে: ${got.join('; ')} (ডিএসও/ডিএসএস টার্গেট = সেটিংসের সংখ্যা × ডিএসও)`)); }
    }
  }
  lines.unshift(L('ok', `${r.n}টি নতুন সেভিংস (NEW_CUSTOMER_STATUS = Y) · SAV-VOL মোট ${fmt(s1.sum)} · SAV-CNT মোট ${fmt(s2.sum)}`));
  if (other) lines.push(L('n', `${other}টি অন্য মাসের সেভিংস বাদ দেওয়া হয়েছে`));
  if (r.un) lines.push(L('warn', `${r.un}টি এজেন্ট কোনো আরএ-র সাথে মেলেনি — সরাসরি ডিএইচ-এ যোগ হয়েছে`));
  let t = dateFromName(j.name);
  if (!t && odi >= 0) { let mx = ''; rows.forEach(x => { const d = parseDate(x[odi]); if (d && ym(d) === S.month && d > mx) mx = d; }); t = mx; }
  return { lines, till: clipTill(S, t, lines, 'SAVINGS'), warn: !!r.un };
};
/* A2M: TRX_AMT */
H.a2m = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ai = h.ix('ag_wlt'), vi = h.ix('trx_amt'), mi = h.ixAny(['month_of', 'month']), di = h.ix('distributor');
  let other = 0;
  const inMonth = r => { if (mi < 0) return true; const m = parseMonth(r[mi]); if (m && m !== S.month) { other++; return false; } return true; };
  const r = await byAgent(S, rows, ai, { v: x => num0(x[vi]) }, { filter: inMonth, dhOf: di >= 0 ? dhOfCol(di) : null });
  const s = setAll(S, 'a2m', 'ach', r.m.v); const xs = setX(S, 'a2m.ach', r.x.v);
  aggregate(S);
  const lines = [L('ok', `${r.n}টি সারি · A2M (TRX_AMT) মোট ${fmt(s.sum + xs)} · ${s.hit} জন ডিএসও`)];
  if (other) lines.push(L('n', `${other}টি অন্য মাসের সারি বাদ`));
  if (r.un) lines.push(L('warn', `${r.un}টি সারির এজেন্ট কোনো আরএ-র সাথে মেলেনি — সরাসরি ডিএইচ-এ যোগ হয়েছে`));
  return { lines, till: clipTill(S, dateFromName(j.name), lines, 'A2M'), warn: !!r.un };
};
/* D2C: D2C_TRX_AMOUNT — ডিএইচ পর্যায়ে, শুধু ওএম-এর BZP-তে */
H.d2c = async (S, j) => {
  need(S);
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const vi = h.ix('d2c_trx_amount'), di = h.ix('distributor'), mai = h.ixAny(['ma', 'bkash_ma_wallet']), dti = h.ixAny(['dates', 'date', 'trx date']);
  const byMA = new Map(S.W.dh.filter(d => d.ma).map(d => [N(d.ma), d.name]));
  const m = new Map(); let other = 0, mx = '';
  rows.forEach(r => {
    if (dti >= 0) { const d = parseDate(r[dti]); if (d && ym(d) !== S.month) { other++; return; } if (d > mx) mx = d; }
    let k = di >= 0 ? up(r[di]) : '';
    if ((!k || !S.W.dh.some(d => d.name === k)) && mai >= 0) k = byMA.get(N(r[mai])) || k;
    if (!k) return;
    m.set(k, (m.get(k) || 0) + num0(r[vi]));
  });
  let hit = 0, sum = 0;
  S.W.dh.forEach(d => { const v = m.get(d.name) || 0; d.d2cAch = v; if (v > 0) hit++; sum += v; });
  aggregate(S);
  const lines = [L('ok', `${rows.length}টি সারি · D2C মোট ${fmt(sum)} (${hit}টি ডিএইচ) — শুধু ওএম-এর BZP (A2M+D2C)-তে যোগ হয়`)];
  if (other) lines.push(L('n', `${other}টি অন্য মাসের সারি বাদ`));
  const nm = [...m.keys()].filter(k => !S.W.dh.some(d => d.name === k)); if (nm.length) lines.push(L('warn', `ডিএইচ মেলেনি: ${nm.join(', ')}`));
  if (!S.W.dh.some(d => +S.W.cfg.d2c[d.name] > 0)) lines.push(L('warn', 'D2C টার্গেট দেওয়া নেই — "টার্গেট সেটিংস"-এ ডিএইচ অনুযায়ী দিন, নইলে BZP টার্গেটে শুধু A2M টার্গেট ধরা হবে'));
  return { lines, till: clipTill(S, dateFromName(j.name) || mx, lines, 'D2C') };
};
/* মার্কেট সার্ভিস সোর্স */
H.r78 = async (S, j) => {
  keepSrc(S, 'r78', j.det);
  const lines = [L('ok', `${S.src.r78.rows.length}টি এজেন্ট — "R78:" নামে সব কলাম ক্রাইটেরিয়াতে ব্যবহার করা যাবে`)];
  return { lines, till: clipTill(S, dateFromName(j.name), lines, 'R78') };
};
H.b2bid = async (S, j) => {
  const { aoa, h } = j.det, rows = dataRows(aoa, h);
  const ti = h.ix('trx type'), ai = h.ix('ag wlt'), ri = h.ix('ra wlt'), vi = h.ix('trx amt'), di = h.ix('distributor'), dti = h.ix('trx date');
  const m = new Map(), types = new Set(); let mx = '';
  rows.forEach(r => {
    const a = w11(r[ai]); if (!a) return;
    const t = up(r[ti]).replace(/^B2B\s*/, '') || 'OTHER'; types.add(t);
    const o = m.get(a) || { a, ra: r[ri], dh: r[di], f: {} };
    o.f[t + ' CNT'] = (o.f[t + ' CNT'] || 0) + 1; o.f[t + ' AMT'] = (o.f[t + ' AMT'] || 0) + num0(r[vi]);
    m.set(a, o);
    const d = parseDate(r[dti]); if (d > mx) mx = d;
  });
  const cols = [...types].sort().flatMap(t => [t + ' CNT', t + ' AMT']);
  const names = ['AG WLT', 'RA WLT', 'Distributor', ...cols];
  S.src.b2bid = { names, rows: [...m.values()].map(o => [o.a, o.ra, o.dh, ...cols.map(c => o.f[c] || 0)]) };
  const lines = [L('ok', `${rows.length}টি B2B ট্রানজেকশন, ${m.size}টি এজেন্ট — "B2BID:" নামে (${cols.join(', ')}) ক্রাইটেরিয়াতে ব্যবহার করা যাবে`)];
  return { lines, till: clipTill(S, dateFromName(j.name) || mx, lines, 'B2B') };
};
H.agentx = async (S, j) => {
  keepSrc(S, 'agentx', j.det, { file: j.name });
  const lines = [L('ok', `${S.src.agentx.rows.length}টি সারি — "X:" নামে সব কলাম ক্রাইটেরিয়াতে ব্যবহার করা যাবে`)];
  return { lines, till: clipTill(S, dateFromName(j.name), lines, 'ফাইল') };
};

/* ---------- একসাথে দেওয়া ফাইল বাছাই ---------- */
const ORDER = ['target', 'dtr', 'lmdtr', 'reg', 'ubp', 'sav', 'a2m', 'd2c', 'r78', 'b2bid', 'agentx', 'dtrold', 'badmonth', 'unknown'];
function classify(S, jobs) {
  const M = S.month, PM = prevMonth(M);
  jobs.forEach(j => { if (j.type === 'dtr' && !j.forced) j.date = dtrDate(j.det); });
  const mainDates = jobs.filter(j => j.type === 'dtr' && !j.forced && ym(j.date) === M).map(j => j.date);
  if (S.W.tills.dtr) mainDates.push(S.W.tills.dtr);
  const latest = mainDates.sort().pop() || '';
  jobs.forEach(j => {
    if (j.forced) { j.slot = j.forced; return; }
    if (j.type === 'dtr') {
      if (ym(j.date) === M) j.slot = j.date < latest ? 'dtrold' : 'dtr';
      else if (ym(j.date) === PM) j.slot = 'lmdtr';
      else j.slot = 'badmonth';
    } else j.slot = SLOTS.some(s => s.id === j.type) ? j.type : 'unknown';
  });
  jobs.sort((a, b) => ORDER.indexOf(a.slot) - ORDER.indexOf(b.slot) || String(a.date || '').localeCompare(String(b.date || '')));
  return jobs;
}
async function run(S, j) {
  j.lines = []; j.state = '';
  try {
    if (j.forced) {
      const base = j.forced === 'lmdtr' ? 'dtr' : j.forced;
      const d = detectAs(j.wb, base);
      if (!d) throw new Error('এই ফাইলে ওই রিপোর্টের প্রয়োজনীয় কলাম পাওয়া যায়নি।');
      j.det = d; j.slot = j.forced;
      if (base === 'dtr') j.date = dtrDate(d);
    }
    if (j.slot === 'dtrold') { j.lines = [L('n', `এটি ${j.date}-এর TRX রিপোর্ট; এই মাসের আরও নতুন রিপোর্ট (${S.W.tills.dtr || 'এই ব্যাচে'}) আছে, তাই এটি লাগবে না।`)]; j.state = 'done'; return j; }
    if (j.slot === 'badmonth') { j.lines = [L('bad', `এই TRX রিপোর্ট ${j.date}-এর। নির্বাচিত মাস ${S.month} — শুধু এই মাসের রিপোর্ট বা গত মাসের (${prevMonth(S.month)}) LMTD রিপোর্ট নেওয়া হয়। মাস ঠিক করুন।`)]; j.state = 'err'; return j; }
    if (!H[j.slot]) { j.lines = [L('bad', 'এই ফাইলটি চেনা যায়নি। ধরন বেছে দিন।')]; j.state = 'err'; return j; }
    if (j.slot === 'lmdtr' && ym(j.date) !== prevMonth(S.month)) j.lines.push(L('warn', `এই ফাইল ${j.date}-এর, গত মাস (${prevMonth(S.month)})-এর নয়`));
    const r = await H[j.slot](S, j);
    j.lines = j.lines.concat(r.lines);
    if (r.till) { j.till = r.till; S.W.tills[j.slot] = r.till; }
    j.state = r.warn ? 'warn' : 'done';
    S.dirty.data = true;
    if (['dtr', 'reg', 'ubp', 'r78', 'b2bid', 'agentx'].includes(j.slot)) computeService(S);
  } catch (e) { j.lines = j.lines.concat([L('bad', e.message)]); j.state = 'err'; }
  return j;
}
function finalize(S) {
  const W = S.W;
  const ds = Object.entries(W.tills).filter(([k, v]) => k !== 'target' && /^\d{4}-\d{2}-\d{2}$/.test(v || '') && ym(v) === S.month && k !== 'lmdtr').map(([, v]) => v).sort();
  W.tillDate = W.tills.dtr || ds[ds.length - 1] || W.tillDate || endOfMonth(S.month);
  W.updated = new Date().toISOString();
  W.month = S.month; W.v = 2;
  return W;
}

/* =====================================================================
   মার্কেট সার্ভিস ক্রাইটেরিয়া
   কাঠামো: {id, name, kind:'count'|'sum'|'pct', conds:[{f,op,v}], sumField, num, den, show}
   ===================================================================== */
const CALC = {
  'CALC:LD TRX AMT (CI+CO)': f => num0(f['DTR:CI AMT']) + num0(f['DTR:CO AMT']),
  'CALC:MTD TRX AMT (CI+CO)': f => num0(f['DTR:MTD CI AMT']) + num0(f['DTR:MTD CO AMT']),
  'CALC:LD NET B2B AMT (RECV-SEND)': f => num0(f['DTR:B2B RECV AMT']) - num0(f['DTR:B2B SEND AMT']),
  'CALC:MTD NET B2B AMT (RECV-SEND)': f => num0(f['DTR:MTD B2B RECV AMT']) - num0(f['DTR:MTD B2B SEND AMT']),
  'CALC:LD B2B CNT (RECV+SEND)': f => num0(f['DTR:B2B RECV CNT']) + num0(f['DTR:B2B SEND CNT']),
  'CALC:MTD B2B CNT (RECV+SEND)': f => num0(f['DTR:MTD B2B RECV CNT']) + num0(f['DTR:MTD B2B SEND CNT'])
};
const ACT = [{ f: 'DTR:CATEGORY CODE', op: 'in', v: '1,17' }, { f: 'DTR:AGENT STATUS', op: '=', v: 'ACTIVE' }];
function defaultCrit() {
  return [
    { id: 'act', name: 'Active Agent (Category 1, 17)', kind: 'count', conds: ACT.slice(), show: true },
    { id: 'b2b', name: 'B2B Active Agent', kind: 'count', conds: [...ACT, { f: 'CALC:LD B2B CNT (RECV+SEND)', op: '>', v: '0' }], show: true },
    { id: 'b2bp', name: '% B2B Active / Active Agent', kind: 'pct', num: 'b2b', den: 'act', show: true },
    { id: 'ldz', name: 'LD Zero B2B Agent', kind: 'count', conds: [...ACT, { f: 'CALC:LD NET B2B AMT (RECV-SEND)', op: '=', v: '0' }], show: true },
    { id: 'trz', name: 'TRX Agent but Zero B2B', kind: 'count', conds: [{ f: 'DTR:CATEGORY CODE', op: 'in', v: '1,17' }, { f: 'CALC:LD TRX AMT (CI+CO)', op: '>=', v: '20000' }, { f: 'CALC:LD NET B2B AMT (RECV-SEND)', op: '=', v: '0' }], show: true }
  ];
}
const OPS = [['=', '='], ['!=', '≠'], ['>', '>'], ['>=', '≥'], ['<', '<'], ['<=', '≤'], ['in', 'এর যেকোনো একটি (কমা দিয়ে)'], ['notin', 'এর কোনোটিই নয়'], ['contains', 'ধারণ করে'], ['empty', 'খালি'], ['notempty', 'খালি নয়']];
function test(f, c) {
  const raw = c.f in CALC ? CALC[c.f](f) : f[c.f];
  const sv = up(raw), cv = up(c.v);
  const a = toNum(raw), b = toNum(c.v);
  switch (c.op) {
    case '=': return a != null && b != null ? a === b : (b != null && raw == null ? b === 0 : sv === cv);
    case '!=': return a != null && b != null ? a !== b : (b != null && raw == null ? b !== 0 : sv !== cv);
    case '>': return (a || 0) > (b || 0);
    case '>=': return (a || 0) >= (b || 0);
    case '<': return (a || 0) < (b || 0);
    case '<=': return (a || 0) <= (b || 0);
    case 'in': return cv.split(',').map(s => s.trim()).filter(Boolean).some(x => x === sv || (toNum(x) != null && a != null && toNum(x) === a));
    case 'notin': return !cv.split(',').map(s => s.trim()).filter(Boolean).some(x => x === sv || (toNum(x) != null && a != null && toNum(x) === a));
    case 'contains': return sv.includes(cv);
    case 'empty': return sv === '';
    case 'notempty': return sv !== '';
  }
  return false;
}
function describe(c, all) {
  if (c.kind === 'pct') { const n = (all || []).find(x => x.id === c.num), d = (all || []).find(x => x.id === c.den); return `${n ? n.name : c.num} ÷ ${d ? d.name : c.den} × 100`; }
  const op = o => (OPS.find(x => x[0] === o) || [o, o])[1];
  const cs = (c.conds || []).map(x => `${x.f} ${op(x.op)}${['empty', 'notempty'].includes(x.op) ? '' : ' ' + x.v}`).join(' এবং ');
  return (c.kind === 'sum' ? `যোগফল: ${c.sumField}` : 'এজেন্ট সংখ্যা') + (cs ? ` — যেখানে ${cs}` : ' — সব এজেন্ট');
}
/* সব সোর্স জুড়ে এজেন্ট-ভিত্তিক রেকর্ড */
function agents(S) {
  const A = new Map(), fieldSet = new Map();
  const add = (pre, src, agentIdx, raIdx, dhIdx) => {
    if (!src) return;
    src.rows.forEach(r => {
      const w = w11(r[agentIdx]); if (!w) return;
      let o = A.get(w); if (!o) { o = { ra: '', dh: '', f: {} }; A.set(w, o); }
      if (!o.ra && raIdx >= 0) o.ra = N(r[raIdx]);
      if (!o.dh && dhIdx >= 0) o.dh = up(r[dhIdx]);
      src.names.forEach((n, i) => { if (!n || i === agentIdx) return; let v = r[i]; if (v instanceof Date) v = iso(v); o.f[pre + n] = v; });
    });
    src.names.forEach((n, i) => { if (!n || i === agentIdx) return; const k = pre + n; if (!fieldSet.has(k)) fieldSet.set(k, new Set()); const set = fieldSet.get(k); if (set.size < 15) src.rows.slice(0, 400).forEach(r => { const v = r[i]; if (v != null && v !== '' && toNum(v) == null && set.size < 15) set.add(String(v).trim()); }); });
  };
  const idx = (src, list) => { if (!src) return -1; const low = src.names.map(hc); for (const n of list) { const k = low.indexOf(hc(n)); if (k >= 0) return k; } return -1; };
  const s = S.src;
  add('DTR:', s.dtr, idx(s.dtr, ['agent wallet']), idx(s.dtr, ['ra wallet']), idx(s.dtr, ['distributor name']));
  add('REG:', s.reg, idx(s.reg, ['agent wallet']), idx(s.reg, ['ra wallet']), idx(s.reg, ['distributor name']));
  add('UBP:', s.ubp, idx(s.ubp, ['agent wallet']), -1, idx(s.ubp, ['distributor']));
  add('R78:', s.r78, idx(s.r78, ['agent wallet']), idx(s.r78, ['ra']), idx(s.r78, ['distributor']));
  add('B2BID:', s.b2bid, 0, 1, 2);
  if (s.agentx) add('X:', s.agentx, idx(s.agentx, AGENT_COLS), idx(s.agentx, RA_COLS), idx(s.agentx, ['distributor', 'distributor name']));
  const fields = [];
  if (s.dtr) Object.keys(CALC).forEach(k => fields.push({ f: k, vals: [] }));
  fieldSet.forEach((v, k) => fields.push({ f: k, vals: [...v] }));
  return { A, fields };
}
function computeService(S) {
  const { A, fields } = agents(S);
  S.fields = fields;
  if (!A.size) { S.svc = null; return null; }
  const ours = new Set(S.W.ra.map(r => N(r.wallet)));
  const raDH = new Map(S.W.ra.map(r => [N(r.wallet), r.dh]));
  const rows = {}, un = {}, tot = {};
  const crit = S.crit.filter(c => c.kind !== 'pct');
  A.forEach(o => {
    crit.forEach(c => {
      if (!(c.conds || []).every(x => test(o.f, x))) return;
      const v = c.kind === 'sum' ? num0(c.sumField in CALC ? CALC[c.sumField](o.f) : o.f[c.sumField]) : 1;
      if (!v) return;
      tot[c.id] = (tot[c.id] || 0) + v;
      if (o.ra && ours.has(o.ra)) { const w = '0' + o.ra; rows[w] = rows[w] || {}; rows[w][c.id] = (rows[w][c.id] || 0) + v; }
      else { const dh = (o.ra && raDH.get(o.ra)) || o.dh || '—'; un[dh] = un[dh] || {}; un[dh][c.id] = (un[dh][c.id] || 0) + v; }
    });
  });
  const tills = {}; ['dtr', 'reg', 'ubp', 'r78', 'b2bid', 'agentx'].forEach(k => { if (S.src[k] && S.W.tills[k]) tills[k] = S.W.tills[k]; });
  S.svc = { v: 1, month: S.month, till: S.W.tills.dtr || '', tills, updated: new Date().toISOString(), agents: A.size, crit: JSON.parse(JSON.stringify(S.crit)), rows, un, tot };
  S.dirty.svc = true;
  return S.svc;
}

root.Engine = {
  SLOTS, OPS, CALC, N, w11, up, toNum, parseDate, dateFromName, monthFromName, prevMonth, endOfMonth, ym, today, addDays, fmt,
  read, detect, detectAs, newState, fixW, classify, run, aggregate, finalize, computeService, defaultCrit, describe, test, agents
};
})(typeof window !== 'undefined' ? window : globalThis);

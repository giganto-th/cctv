// ดึงข้อมูลตำแหน่งกล้อง CCTV จริงจากแหล่งข้อมูลเปิด แล้วรวมเป็น JSON เดียว
//   node tools/fetch-real-data.mjs
// ผลลัพธ์:
//   prototype/data/cameras.json   กล้องที่มีพิกัด (ใช้ในแอป)
//   prototype/data/sources.json   ที่มา สัญญาอนุญาต จำนวน และข้อผิดพลาดของแต่ละแหล่ง
//   data/raw/*                     ไฟล์ดิบที่ดาวน์โหลด (ไว้ตรวจสอบย้อนหลัง)
// ใช้ Node 20+ (fetch ในตัว) ไม่ต้องติดตั้งแพ็กเกจเพิ่ม
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'prototype/data');
const RAW = path.join(root, 'data/raw');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });
const UA = 'tathip-cctv-prototype/0.1 (+https://github.com/giganto-th/cctv)';
const log = (...a) => console.log('[fetch]', ...a);

// ---------- ขอบเขตจังหวัด (ใช้ไฟล์เดียวกับต้นแบบ) ----------
const geoCtx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'prototype/js/geo-data.js'), 'utf8'), geoCtx);
const PROVS = geoCtx.window.TT_GEO.provinces;
function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const distM = (a, b) => {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(s));
};
function provinceOf(p) {
  for (const pr of PROVS) {
    const b = pr.bbox;
    if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) continue;
    if (pr.polygons.some(poly => inRing(p, poly[0]))) return pr.id;
  }
  // ขอบจังหวัดในต้นแบบเป็นเส้นหยาบ จุดริมชายฝั่ง/ชายแดนจึงใช้จังหวัดที่ศูนย์กลางใกล้ที่สุด (ไม่เกิน 60 กม.)
  let best = null, bd = Infinity;
  for (const pr of PROVS) { const d = distM(p, pr.center); if (d < bd) { bd = d; best = pr.id; } }
  return bd < 60000 ? best : null;
}
const TH_BBOX = [97.3, 5.6, 105.7, 20.5];
const inTH = (lon, lat) => lon >= TH_BBOX[0] && lon <= TH_BBOX[2] && lat >= TH_BBOX[1] && lat <= TH_BBOX[3];

// ---------- เครื่องมือ ----------
async function get(url, { timeout = 120000, method = 'GET', body, headers = {} } = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { method, body, headers: { 'User-Agent': UA, ...headers }, signal: ctl.signal, redirect: 'follow' });
    if (!res.ok) { const t = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300); throw new Error(`HTTP ${res.status} ${url.slice(0, 120)} :: ${t}`); }
    return Buffer.from(await res.arrayBuffer());
  } finally { clearTimeout(t); }
}
// ไฟล์ราชการไทยบางไฟล์เป็น TIS-620/Windows-874
function decodeText(buf) {
  const utf = new TextDecoder('utf-8').decode(buf);
  const bad = (utf.match(/�/g) || []).length;
  if (bad > 2) { try { return new TextDecoder('windows-874').decode(buf); } catch { /* ใช้ utf-8 ต่อ */ } }
  return utf.replace(/^﻿/, '');
}
// CSV ตาม RFC 4180 (รองรับเครื่องหมายคำพูดและขึ้นบรรทัดใหม่ในช่อง)
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const head = (rows.shift() || []).map(h => h.trim());
  return { head, rows: rows.filter(r => r.some(v => v.trim() !== '')).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()]))) };
}
const num = v => { if (v == null) return NaN; const s = String(v).trim().replace(/[^\d.\-]/g, ''); return (s.match(/\./g) || []).length > 1 ? NaN : parseFloat(s); };
// หาคอลัมน์ละติจูด/ลองจิจูดจากชื่อหัวตาราง (ไทย/อังกฤษ)
function findLatLon(head) {
  const norm = h => h.toLowerCase().replace(/[\s_\-().]/g, '');
  const lat = head.find(h => /^(lat|latitude|ละติจูด|ลติจูด|พิกัดlat|y|coordy|gpslat)$/.test(norm(h))) || head.find(h => /lat|ละติจูด|ลติจูด/.test(norm(h)));
  const lon = head.find(h => /^(lon|lng|long|longitude|ลองจิจูด|ลองติจูด|พิกัดlong|x|coordx|gpslon|gpslng)$/.test(norm(h))) || head.find(h => /lon|lng|ลองจิ|ลองติ/.test(norm(h)));
  const both = head.find(h => /latlon|latlong|latlng|พิกัด|coordinate|location/.test(norm(h)));
  return { lat, lon, both };
}
function pointFromRow(r, cols) {
  let lat = cols.lat ? num(r[cols.lat]) : NaN, lon = cols.lon ? num(r[cols.lon]) : NaN;
  if ((isNaN(lat) || isNaN(lon)) && cols.both) {
    const m = String(r[cols.both]).match(/(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)/);
    if (m) { lat = parseFloat(m[1]); lon = parseFloat(m[2]); }
  }
  if (isNaN(lat) || isNaN(lon)) return null;
  if (!inTH(lon, lat) && inTH(lat, lon)) [lat, lon] = [lon, lat]; // สลับคอลัมน์กัน
  return inTH(lon, lat) ? [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6] : null;
}
const pickName = (r, head) => {
  const k = head.find(h => /ชื่อ|สถานที่|จุดติดตั้ง|ตำแหน่ง|location|name|place|ที่ตั้ง|บริเวณ/i.test(h) && !/lat|lon|พิกัด/i.test(h));
  return k ? r[k] : '';
};
const dirDeg = v => {
  if (v == null || v === '') return null;
  const n = parseFloat(v); if (!isNaN(n)) return ((Math.round(n) % 360) + 360) % 360;
  const map = { N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157, S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337 };
  return map[String(v).trim().toUpperCase()] ?? null;
};

// ---------- แหล่งที่ 1: OpenStreetMap ----------
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const OSM_QUERY = `[out:json][timeout:240];
area["ISO3166-1"="TH"][admin_level=2]->.th;
(nwr["man_made"="surveillance"](area.th););
out center meta;`;
function osmType(t) {
  const zone = (t['surveillance:zone'] || '').toLowerCase(), txt = `${t.name || ''} ${t.description || ''} ${t.operator || ''}`.toLowerCase();
  if (t['surveillance:type'] === 'ALPR' || zone === 'traffic' || /traffic|จราจร|ทางหลวง|highway/.test(txt)) return 'traffic';
  if (/flood|น้ำท่วม|ระดับน้ำ|คลอง|ระบายน้ำ/.test(txt)) return 'flood';
  if (/beach|หาด|tourist|ท่องเที่ยว|viewpoint|จุดชมวิว/.test(txt)) return 'tourism';
  if (/fire|ไฟป่า|หมอกควัน|smoke/.test(txt)) return 'haze';
  if (t.surveillance === 'public' || zone === 'town' || zone === 'street' || /police|ตำรวจ|เทศบาล|อบต|อบจ|กทม|municipal/.test(txt)) return 'safety';
  return 'community';
}
async function fetchOSM() {
  let lastErr;
  for (const ep of OVERPASS) {
    try {
      log('OSM ←', ep);
      const buf = await get(`${ep}?data=${encodeURIComponent(OSM_QUERY)}`, { timeout: 300000, headers: { Accept: 'application/json' } });
      const j = JSON.parse(buf.toString('utf8'));
      const out = [];
      for (const e of j.elements || []) {
        const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
        if (lat == null || !inTH(lon, lat)) continue;
        const t = e.tags || {};
        out.push({
          id: `osm-${e.type[0]}${e.id}`, src: 'osm', name: t['name:th'] || t.name || t.description || t.ref || '',
          lon: Math.round(lon * 1e6) / 1e6, lat: Math.round(lat * 1e6) / 1e6, type: osmType(t),
          operator: t.operator || null, dir: dirDeg(t['camera:direction'] ?? t.direction),
          mount: t['camera:mount'] || null, cam: t['camera:type'] || null, zone: t['surveillance:zone'] || null,
          access: t.surveillance || null, kind: t['surveillance:type'] || null, updated: e.timestamp ? e.timestamp.slice(0, 10) : null,
          url: `https://www.openstreetmap.org/${e.type}/${e.id}`,
        });
      }
      return { ok: true, items: out, endpoint: ep, total: (j.elements || []).length };
    } catch (err) { lastErr = err; log('OSM ✗', ep, err.message); }
  }
  return { ok: false, items: [], error: String(lastErr) };
}

// ---------- CKAN (data.bangkok.go.th, data.go.th, gdcc.data.go.th) ----------
async function ckan(base, action, params) {
  const url = `${base}/api/3/action/${action}?${new URLSearchParams(params)}`;
  const j = JSON.parse((await get(url, { timeout: 60000 })).toString('utf8'));
  if (!j.success) throw new Error(`CKAN ${action} failed at ${base}`);
  return j.result;
}
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
// ดาวน์โหลดทรัพยากร CSV/JSON ของชุดข้อมูล แล้วดึงแถวที่มีพิกัด
async function harvestPackage(base, pkg, src, typeHint) {
  const found = [], report = { dataset: pkg.name, title: pkg.title, org: pkg.organization?.title || null, license: pkg.license_title || pkg.license_id || 'ไม่ระบุ', url: `${base}/dataset/${pkg.name}`, resources: [] };
  for (const res of pkg.resources || []) {
    const fmt = (res.format || path.extname(res.url || '').slice(1)).toLowerCase();
    const info = { name: res.name || res.id, format: fmt, url: res.url, rows: 0, withCoords: 0, headers: null, note: null };
    report.resources.push(info);
    if (!['csv', 'json', 'geojson'].includes(fmt)) { info.note = 'ข้ามรูปแบบไฟล์นี้ (ยังไม่รองรับ)'; continue; }
    try {
      const buf = await get(res.url, { timeout: 90000 });
      if (buf.length > 20e6) { info.note = 'ไฟล์ใหญ่เกิน 20 MB'; continue; }
      const file = `${src}-${slug(pkg.name)}-${slug(res.id || res.name)}.${fmt === 'geojson' ? 'geojson' : fmt}`;
      fs.writeFileSync(path.join(RAW, file), buf);
      let rows = [], head = [];
      if (fmt === 'csv') ({ rows, head } = parseCSV(decodeText(buf)));
      else {
        const j = JSON.parse(decodeText(buf));
        if (j.type === 'FeatureCollection') {
          rows = j.features.filter(f => f.geometry?.type === 'Point').map(f => ({ ...f.properties, __lon: f.geometry.coordinates[0], __lat: f.geometry.coordinates[1] }));
          head = ['__lat', '__lon', ...Object.keys(rows[0] || {}).filter(k => !k.startsWith('__'))];
        } else {
          rows = Array.isArray(j) ? j : (j.records || j.data || j.result?.records || []);
          head = Object.keys(rows[0] || {});
        }
      }
      info.headers = head; info.rows = rows.length; info.raw = `data/raw/${file}`;
      const cols = head.includes('__lat') ? { lat: '__lat', lon: '__lon' } : findLatLon(head);
      if (!cols.lat && !cols.lon && !cols.both) { info.note = 'ไม่พบคอลัมน์พิกัด'; continue; }
      let i = 0;
      for (const r of rows) {
        i++;
        const p = pointFromRow(r, cols); if (!p) continue;
        const idKey = head.find(h => /^\s*id\s*camera\s*$|^รหัส|^id$/i.test(h));
        found.push({
          id: `${src}-${slug(pkg.name).slice(0, 16)}-${idKey && r[idKey] ? slug(r[idKey]) : i}`, src, name: pickName(r, head) || '',
          lon: p[0], lat: p[1], type: typeHint || 'safety', operator: report.org, dir: null, mount: null, cam: null, zone: null,
          access: 'public', kind: 'camera', updated: (pkg.metadata_modified || '').slice(0, 10) || null, url: report.url,
        });
        info.withCoords++;
      }
    } catch (err) { info.note = `ดาวน์โหลดไม่สำเร็จ: ${err.message}`; }
  }
  return { items: found, report };
}

async function fetchBMA() {
  const base = 'https://data.bangkok.go.th';
  try {
    const pkg = await ckan(base, 'package_show', { id: 'bma-cctv' });
    const { items, report } = await harvestPackage(base, pkg, 'bma', 'traffic');
    for (const c of items) { c.operator = 'กรุงเทพมหานคร'; c.url = 'https://cpudapp.bangkok.go.th/bmatraffic/'; }
    return { ok: true, items, reports: [report] };
  } catch (err) { return { ok: false, items: [], error: String(err), reports: [] }; }
}

async function fetchDataGoTh() {
  const bases = ['https://data.go.th', 'https://gdcc.data.go.th'];
  const queries = ['CCTV', 'กล้องวงจรปิด', 'กล้อง CCTV'];
  const items = [], reports = [], errors = [];
  for (const base of bases) {
    const seen = new Set();
    for (const q of queries) {
      try {
        const r = await ckan(base, 'package_search', { q, rows: 100 });
        for (const pkg of r.results || []) {
          if (seen.has(pkg.name)) continue; seen.add(pkg.name);
          const text = `${pkg.title} ${pkg.notes || ''}`;
          const hint = /จราจร|traffic|ทางหลวง/.test(text) ? 'traffic' : /ท่องเที่ยว|tourist/.test(text) ? 'tourism' : /น้ำท่วม|flood/.test(text) ? 'flood' : 'safety';
          const h = await harvestPackage(base, pkg, base.includes('gdcc') ? 'gdcc' : 'dgt', hint);
          items.push(...h.items); reports.push(h.report);
        }
      } catch (err) { errors.push(`${base} q="${q}": ${err.message}`); }
    }
  }
  return { ok: errors.length < bases.length * queries.length, items, reports, error: errors.join(' | ') || null };
}

// ---------- รวม ----------
const t0 = Date.now();
const [osm, bma, dgt] = await Promise.all([fetchOSM(), fetchBMA(), fetchDataGoTh()]);
log(`OSM ${osm.items.length} · BMA ${bma.items.length} · data.go.th ${dgt.items.length}`);
for (const [k, r] of Object.entries({ osm, bma, dgt })) if (r.error) log(`${k} error:`, r.error);
for (const rep of [...(bma.reports || []), ...(dgt.reports || [])]) for (const x of rep.resources) log(`  ${rep.dataset} / ${x.name} [${x.format}] rows=${x.rows} coords=${x.withCoords} ${x.note || ''} ${x.headers ? 'headers=' + JSON.stringify(x.headers).slice(0, 200) : ''}`);

// ลำดับความน่าเชื่อถือ: หน่วยงานรัฐ > OSM; ตัดจุดซ้ำที่ห่างกันไม่เกิน 15 ม. ข้ามแหล่ง
const all = [...bma.items, ...dgt.items, ...osm.items];
const kept = [];
const grid = new Map(); const cell = p => `${Math.round(p[0] * 2000)}:${Math.round(p[1] * 2000)}`;
let dupes = 0;
for (const c of all) {
  const p = [c.lon, c.lat], k = cell(p);
  const [gx, gy] = k.split(':').map(Number);
  let dup = false;
  for (let dx = -1; dx <= 1 && !dup; dx++) for (let dy = -1; dy <= 1 && !dup; dy++) {
    for (const o of grid.get(`${gx + dx}:${gy + dy}`) || []) if (o.src !== c.src && distM(p, [o.lon, o.lat]) < 15) { dup = true; (o.alsoIn ||= []).push(c.id); break; }
  }
  if (dup) { dupes++; continue; }
  c.prov = provinceOf(p);
  kept.push(c);
  if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
}
// ตัดคีย์ที่เป็น null ออกเพื่อลดขนาดไฟล์
const cameras = kept.map(c => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== null && v !== '')));
const byProv = {}; for (const c of cameras) byProv[c.prov || 'unknown'] = (byProv[c.prov || 'unknown'] || 0) + 1;
const fetchedAt = new Date().toISOString();

const sources = {
  fetchedAt, durationSec: Math.round((Date.now() - t0) / 1000),
  totals: { cameras: cameras.length, duplicatesRemoved: dupes, bySource: Object.fromEntries(['osm', 'bma', 'dgt', 'gdcc'].map(s => [s, cameras.filter(c => c.src === s).length])), byProvince: byProv },
  sources: [
    { key: 'osm', name: 'OpenStreetMap (man_made=surveillance)', url: 'https://www.openstreetmap.org', license: 'ODbL 1.0', attribution: '© OpenStreetMap contributors', ok: osm.ok, count: osm.items.length, endpoint: osm.endpoint || null, error: osm.error || null,
      notes: 'ตำแหน่งกล้องที่อาสาสมัคร OSM บันทึกไว้ ครอบคลุมทั้งกล้องรัฐและเอกชน ไม่มีสถานะออนไลน์หรือภาพสด' },
    { key: 'bma', name: 'กรุงเทพมหานคร: กล้อง CCTV จราจร (bma-cctv)', url: 'https://data.bangkok.go.th/dataset/bma-cctv', license: bma.reports[0]?.license || 'ไม่ระบุ', attribution: 'กรุงเทพมหานคร', ok: bma.ok, count: bma.items.length, error: bma.error || null, datasets: bma.reports,
      notes: 'ภาพสดดูได้ที่ BMA Traffic (cpudapp.bangkok.go.th/bmatraffic) ชุดข้อมูลไม่มีลิงก์ภาพรายกล้อง' },
    { key: 'dgt', name: 'ศูนย์กลางข้อมูลเปิดภาครัฐ (data.go.th / gdcc.data.go.th)', url: 'https://data.go.th', license: 'ตามแต่ละชุดข้อมูล (ส่วนใหญ่ Open Data Common)', attribution: 'หน่วยงานเจ้าของชุดข้อมูล', ok: dgt.ok, count: dgt.items.length, error: dgt.error || null, datasets: dgt.reports,
      notes: 'ชุดข้อมูลกล้องส่วนใหญ่เป็นจำนวนกล้องรายพื้นที่ มีเพียงบางชุดที่มีพิกัด' },
  ],
};

fs.writeFileSync(path.join(OUT, 'cameras.json'), JSON.stringify({ fetchedAt, count: cameras.length, cameras }));
fs.writeFileSync(path.join(OUT, 'sources.json'), JSON.stringify(sources, null, 2));
log(`เขียน ${cameras.length} กล้อง (ตัดซ้ำ ${dupes}) → prototype/data/cameras.json`);
if (!osm.ok && !bma.ok && !dgt.ok) { console.error('ดึงข้อมูลไม่สำเร็จทุกแหล่ง'); process.exit(1); }

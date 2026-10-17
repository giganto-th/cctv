/* ตาทิพย์ — ฟังก์ชันพื้นฐานที่ใช้ร่วมกัน */
window.TT = window.TT || {};
(function (TT) {
  'use strict';

  // สุ่มแบบกำหนด seed เพื่อให้ข้อมูลจำลองเหมือนกันทุกครั้งที่เปิด
  TT.rng = function (seed) {
    let a = seed >>> 0;
    const next = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (lo, hi) => lo + next() * (hi - lo);
    next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
    next.pick = arr => arr[Math.floor(next() * arr.length)];
    next.gauss = () => { let u = 0, v = 0; while (!u) u = next(); while (!v) v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    next.weighted = obj => { const tot = Object.values(obj).reduce((s, w) => s + w, 0); let r = next() * tot; for (const k in obj) { r -= obj[k]; if (r <= 0) return k; } return Object.keys(obj)[0]; };
    return next;
  };

  const R = 6371008.8;
  TT.distance = (a, b) => { // เมตร
    const toR = Math.PI / 180, dLat = (b[1] - a[1]) * toR, dLon = (b[0] - a[0]) * toR;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * toR) * Math.cos(b[1] * toR) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  TT.bearing = (a, b) => {
    const toR = Math.PI / 180, y = Math.sin((b[0] - a[0]) * toR) * Math.cos(b[1] * toR);
    const x = Math.cos(a[1] * toR) * Math.sin(b[1] * toR) - Math.sin(a[1] * toR) * Math.cos(b[1] * toR) * Math.cos((b[0] - a[0]) * toR);
    return (Math.atan2(y, x) / toR + 360) % 360;
  };
  // เลื่อนพิกัดตามระยะ (เมตร) และทิศ (องศาจากทิศเหนือ)
  TT.offset = (p, meters, headingDeg) => {
    const h = headingDeg * Math.PI / 180;
    const dLat = (meters * Math.cos(h)) / 111320;
    const dLon = (meters * Math.sin(h)) / (111320 * Math.cos(p[1] * Math.PI / 180));
    return [p[0] + dLon, p[1] + dLat];
  };
  TT.angleDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; };
  TT.sector = (p, heading, fov, range, steps = 10) => {
    const pts = [p];
    for (let i = 0; i <= steps; i++) pts.push(TT.offset(p, range, heading - fov / 2 + (fov * i) / steps));
    pts.push(p);
    return pts;
  };
  TT.circle = (p, r, steps = 36) => { const out = []; for (let i = 0; i <= steps; i++) out.push(TT.offset(p, r, (360 * i) / steps)); return out; };

  TT.pointInRing = (pt, ring) => {
    let inside = false; const x = pt[0], y = pt[1];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  TT.provinceAt = pt => {
    const list = TT_GEO.provinces;
    for (const p of list) {
      const b = p.bbox;
      if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
      for (const poly of p.polygons) if (TT.pointInRing(pt, poly[0])) return p;
    }
    return null;
  };

  // จุดชายฝั่งที่เส้นขอบหยาบอาจตกทะเล ให้ใช้จังหวัดที่ศูนย์กลางใกล้ที่สุด
  TT.nearestProvince = pt => TT_GEO.provinces.reduce((a, p) => (TT.distance(pt, p.center) < TT.distance(pt, a.center) ? p : a));

  TT.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  TT.lerp = (a, b, t) => a + (b - a) * t;
  TT.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TT.fmt = n => Number(n).toLocaleString('th-TH');
  TT.fmt1 = n => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  TT.dist = m => (m < 1000 ? `${Math.round(m)} ม.` : `${TT.fmt1(m / 1000)} กม.`);
  TT.coord = p => `${p[1].toFixed(5)}°N ${p[0].toFixed(5)}°E`;

  // เวลาประเทศไทย (UTC+7) และปี พ.ศ.
  TT.bangkokNow = () => { const d = new Date(); return new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 60000); };
  TT.hourNow = () => { const d = TT.bangkokNow(); return d.getHours() + d.getMinutes() / 60; };
  TT.hhmm = h => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  TT.thDate = d => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  TT.beYear = () => TT.bangkokNow().getFullYear() + 543;
  TT.ago = days => (days < 1 ? 'วันนี้' : days < 2 ? 'เมื่อวาน' : days < 30 ? `${Math.floor(days)} วันก่อน` : `${Math.floor(days / 30)} เดือนก่อน`);

  // ความหนาแน่นจราจรตามชั่วโมง (ชั่วโมงเร่งด่วนเช้า-เย็นแบบกรุงเทพฯ)
  TT.activity = h => TT.clamp(0.18 + 0.62 * Math.exp(-(((h - 8) / 1.5) ** 2)) + 0.7 * Math.exp(-(((h - 18) / 1.9) ** 2)) + 0.2 * Math.exp(-(((h - 12.5) / 2.2) ** 2)) - 0.12 * Math.exp(-(((h - 3) / 2) ** 2)), 0.05, 1);
  TT.daylight = h => TT.clamp(Math.sin(((h - 6) / 12.4) * Math.PI) * 1.4, 0, 1);

  // localStorage แบบปลอดภัย (เปิดไม่ได้ก็ทำงานต่อ)
  TT.store = {
    get(k, fallback) { try { const v = localStorage.getItem('tt.' + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem('tt.' + k, JSON.stringify(v)); } catch (e) { /* ไม่มีที่เก็บก็ข้าม */ } },
  };

  let toastTimer;
  TT.toast = msg => {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };
  TT.copy = (text, okMsg) => {
    const done = () => TT.toast(okMsg || 'คัดลอกแล้ว');
    try {
      navigator.clipboard.writeText(text).then(done, () => TT.toast('คัดลอกไม่สำเร็จ: ' + text));
    } catch (e) { TT.toast('คัดลอกไม่สำเร็จ: ' + text); }
  };
  TT.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  TT.isMobile = () => window.matchMedia('(max-width: 899px)').matches;
  TT.icon = (id, cls = '') => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;

  TT.hexToRgb = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  TT.sparkPath = (vals, w, h, pad = 2) => {
    const max = Math.max(...vals), min = Math.min(...vals), span = max - min || 1;
    return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * w).toFixed(1)},${(h - pad - ((v - min) / span) * (h - pad * 2)).toFixed(1)}`).join('');
  };
})(window.TT);

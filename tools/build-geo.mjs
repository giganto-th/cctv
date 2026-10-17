// สร้าง prototype/js/geo-data.js จากข้อมูลเปิด:
//  - ขอบเขต 77 จังหวัด: @svg-maps/thailand (CC BY 4.0) แปลงพิกัด SVG → lon/lat (Mercator fit กับ bbox ประเทศ)
//  - ประเทศเพื่อนบ้าน + bbox อ้างอิง: world-atlas (Natural Earth, public domain)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as topo from 'topojson-client';
import * as turf from '@turf/turf';
import svgMap from '@svg-maps/thailand';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const world = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/world-atlas/countries-10m.json')));
const world50 = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/world-atlas/countries-50m.json')));

const PROVINCES = {
  bkk: ['กรุงเทพมหานคร', 'กลาง'], spk: ['สมุทรปราการ', 'กลาง'], nbi: ['นนทบุรี', 'กลาง'], pte: ['ปทุมธานี', 'กลาง'],
  aya: ['พระนครศรีอยุธยา', 'กลาง'], atg: ['อ่างทอง', 'กลาง'], lri: ['ลพบุรี', 'กลาง'], sbr: ['สิงห์บุรี', 'กลาง'],
  cnt: ['ชัยนาท', 'กลาง'], sri: ['สระบุรี', 'กลาง'], cbi: ['ชลบุรี', 'ตะวันออก'], ryg: ['ระยอง', 'ตะวันออก'],
  cti: ['จันทบุรี', 'ตะวันออก'], trt: ['ตราด', 'ตะวันออก'], cco: ['ฉะเชิงเทรา', 'ตะวันออก'], pri: ['ปราจีนบุรี', 'ตะวันออก'],
  nyk: ['นครนายก', 'กลาง'], skw: ['สระแก้ว', 'ตะวันออก'], nma: ['นครราชสีมา', 'อีสาน'], brm: ['บุรีรัมย์', 'อีสาน'],
  srn: ['สุรินทร์', 'อีสาน'], ssk: ['ศรีสะเกษ', 'อีสาน'], ubn: ['อุบลราชธานี', 'อีสาน'], yst: ['ยโสธร', 'อีสาน'],
  cpm: ['ชัยภูมิ', 'อีสาน'], acr: ['อำนาจเจริญ', 'อีสาน'], bkn: ['บึงกาฬ', 'อีสาน'], nbp: ['หนองบัวลำภู', 'อีสาน'],
  kkn: ['ขอนแก่น', 'อีสาน'], udn: ['อุดรธานี', 'อีสาน'], lei: ['เลย', 'อีสาน'], nki: ['หนองคาย', 'อีสาน'],
  mkm: ['มหาสารคาม', 'อีสาน'], ret: ['ร้อยเอ็ด', 'อีสาน'], ksn: ['กาฬสินธุ์', 'อีสาน'], snk: ['สกลนคร', 'อีสาน'],
  npm: ['นครพนม', 'อีสาน'], mdh: ['มุกดาหาร', 'อีสาน'], cmi: ['เชียงใหม่', 'เหนือ'], lpn: ['ลำพูน', 'เหนือ'],
  lpg: ['ลำปาง', 'เหนือ'], utd: ['อุตรดิตถ์', 'เหนือ'], pre: ['แพร่', 'เหนือ'], nan: ['น่าน', 'เหนือ'],
  pyo: ['พะเยา', 'เหนือ'], cri: ['เชียงราย', 'เหนือ'], msn: ['แม่ฮ่องสอน', 'เหนือ'], nsn: ['นครสวรรค์', 'เหนือ'],
  uti: ['อุทัยธานี', 'เหนือ'], kpt: ['กำแพงเพชร', 'เหนือ'], tak: ['ตาก', 'ตะวันตก'], sti: ['สุโขทัย', 'เหนือ'],
  plk: ['พิษณุโลก', 'เหนือ'], pct: ['พิจิตร', 'เหนือ'], pnb: ['เพชรบูรณ์', 'เหนือ'], rbr: ['ราชบุรี', 'ตะวันตก'],
  kri: ['กาญจนบุรี', 'ตะวันตก'], spb: ['สุพรรณบุรี', 'กลาง'], npt: ['นครปฐม', 'กลาง'], skn: ['สมุทรสาคร', 'กลาง'],
  skm: ['สมุทรสงคราม', 'กลาง'], pbi: ['เพชรบุรี', 'ตะวันตก'], pkn: ['ประจวบคีรีขันธ์', 'ตะวันตก'], nrt: ['นครศรีธรรมราช', 'ใต้'],
  kbi: ['กระบี่', 'ใต้'], pna: ['พังงา', 'ใต้'], pkt: ['ภูเก็ต', 'ใต้'], sni: ['สุราษฎร์ธานี', 'ใต้'],
  rng: ['ระนอง', 'ใต้'], cpn: ['ชุมพร', 'ใต้'], ska: ['สงขลา', 'ใต้'], stn: ['สตูล', 'ใต้'],
  trg: ['ตรัง', 'ใต้'], plg: ['พัทลุง', 'ใต้'], ptn: ['ปัตตานี', 'ใต้'], yla: ['ยะลา', 'ใต้'], nwt: ['นราธิวาส', 'ใต้'],
};
const NEIGHBORS = { Myanmar: 'เมียนมา', Laos: 'ลาว', Cambodia: 'กัมพูชา', Malaysia: 'มาเลเซีย', Vietnam: 'เวียดนาม', China: 'จีน' };

// --- SVG path (คำสั่ง m/z แบบ relative) → rings
function parseSvgPath(d) {
  const rings = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0, mode = null;
  const toks = d.match(/[mz]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    if (t === 'm') { mode = 'm'; i++; continue; }
    if (t === 'z' || t === 'Z') { if (cur) rings.push(cur); cur = null; x = sx; y = sy; i++; continue; }
    x += +toks[i]; y += +toks[i + 1]; i += 2;
    if (mode === 'm') { sx = x; sy = y; cur = [[x, y]]; mode = 'l'; } else cur.push([x, y]);
  }
  if (cur) rings.push(cur);
  return rings;
}

const thailand = topo.feature(world, world.objects.countries).features.find(f => f.properties.name === 'Thailand');
const [gx0, gy0, gx1, gy1] = turf.bbox(thailand);
const parsed = svgMap.locations.map(l => ({ ...l, rings: parseSvgPath(l.path) }));
let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
for (const p of parsed) for (const r of p.rings) for (const [x, y] of r) {
  sx0 = Math.min(sx0, x); sx1 = Math.max(sx1, x); sy0 = Math.min(sy0, y); sy1 = Math.max(sy1, y);
}
const merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
const unmerc = m => (2 * Math.atan(Math.exp(m)) - Math.PI / 2) * 180 / Math.PI;
const toLonLat = ([x, y]) => [
  gx0 + (x - sx0) / (sx1 - sx0) * (gx1 - gx0),
  unmerc(merc(gy1) - (y - sy0) / (sy1 - sy0) * (merc(gy1) - merc(gy0))),
];
const round = c => [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4];

function ringsToPolygons(rings) {
  // SVG ไม่บอกว่า ring ไหนเป็นรู ใช้ ring เดี่ยวเป็น polygon ทั้งหมด (จังหวัดไม่มีรูที่สำคัญ)
  return rings.map(r => {
    const ll = r.map(toLonLat); ll.push(ll[0]);
    return [ll];
  }).filter(p => p[0].length >= 4);
}
function simplifyPolys(polys, tol) {
  const mp = turf.multiPolygon(polys);
  const s = turf.simplify(mp, { tolerance: tol, highQuality: true });
  return s.geometry.coordinates
    .map(poly => poly.map(ring => ring.map(round)))
    .filter(poly => turf.area(turf.polygon(poly)) > 2e6); // ตัดเกาะเล็กกว่า 2 ตร.กม.
}

const provinces = []; let lake = null;
for (const p of parsed) {
  const polys = simplifyPolys(ringsToPolygons(p.rings), 0.003);
  if (p.id === 'lksg') { lake = polys; continue; }
  const meta = PROVINCES[p.id];
  if (!meta) throw new Error('unknown province ' + p.id);
  const mp = turf.multiPolygon(polys);
  const biggest = polys.reduce((a, b) => (turf.area(turf.polygon(b)) > turf.area(turf.polygon(a)) ? b : a));
  const c = turf.centerOfMass(turf.polygon(biggest)).geometry.coordinates;
  provinces.push({
    id: p.id, th: meta[0], en: p.name, region: meta[1],
    area: Math.round(turf.area(mp) / 1e6),
    center: round(c), bbox: turf.bbox(mp).map(v => Math.round(v * 1e3) / 1e3), polygons: polys,
  });
}

let union = turf.union(turf.featureCollection(provinces.map(p => turf.multiPolygon(p.polygons))));
union = turf.simplify(union, { tolerance: 0.004 });
const outline = (union.geometry.type === 'Polygon' ? [union.geometry.coordinates] : union.geometry.coordinates)
  .map(poly => poly[0].map(round)).filter(r => r.length > 8);

const clipBox = turf.bboxPolygon([90, -1, 112, 26]);
const neighbors = topo.feature(world50, world50.objects.countries).features
  .filter(f => NEIGHBORS[f.properties.name])
  .map(f => {
    const clipped = turf.bboxClip(f, [90, -1, 112, 26]);
    const s = turf.simplify(clipped, { tolerance: 0.02, highQuality: true });
    const g = s.geometry;
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
      .map(poly => poly.map(ring => ring.map(round))).filter(poly => poly[0] && poly[0].length >= 4);
    const c = turf.centerOfMass(turf.intersect(turf.featureCollection([clipBox, f])) || f).geometry.coordinates;
    return { th: NEIGHBORS[f.properties.name], en: f.properties.name, center: round(c), polygons: polys };
  });

const out = { provinces, lake, outline, neighbors,
  attribution: 'ขอบเขตจังหวัด: @svg-maps/thailand (CC BY 4.0) · ประเทศเพื่อนบ้าน: Natural Earth' };
const js = `// ไฟล์นี้สร้างอัตโนมัติด้วย tools/build-geo.mjs — ห้ามแก้ไขด้วยมือ\nwindow.TT_GEO = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(root, 'prototype/js/geo-data.js'), js);
console.log(`provinces=${provinces.length} neighbors=${neighbors.length} outlineRings=${outline.length} size=${(js.length / 1024).toFixed(0)}KB`);

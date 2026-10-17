/* ตาทิพย์ — ข้อมูลจำลองสำหรับต้นแบบ UX/UI (ไม่ใช่ข้อมูลจริง)
   สร้างแบบกำหนด seed: เปิดกี่ครั้งก็ได้ชุดเดิม */
(function (TT) {
  'use strict';

  TT.TYPES = [
    { key: 'traffic', th: 'จราจร', code: 'TRF', dark: [255, 178, 56], light: [199, 119, 0], css: 'var(--t-traffic)', agencies: ['กรมทางหลวง', 'กองบังคับการตำรวจจราจร', 'สำนักการจราจรและขนส่ง กทม.'] },
    { key: 'safety', th: 'ความปลอดภัย', code: 'SAF', dark: [92, 156, 255], light: [43, 104, 214], css: 'var(--t-safety)', agencies: ['สำนักงานเขต กทม.', 'เทศบาลนคร', 'สถานีตำรวจภูธร'] },
    { key: 'flood', th: 'เฝ้าระวังน้ำท่วม', code: 'FLD', dark: [56, 214, 207], light: [0, 138, 138], css: 'var(--t-flood)', agencies: ['สำนักการระบายน้ำ กทม.', 'สถาบันสารสนเทศทรัพยากรน้ำ', 'กรมชลประทาน'] },
    { key: 'tourism', th: 'ท่องเที่ยว', code: 'TOU', dark: [255, 111, 168], light: [207, 51, 120], css: 'var(--t-tourism)', agencies: ['การท่องเที่ยวแห่งประเทศไทย', 'องค์การบริหารส่วนจังหวัด', 'เทศบาลเมือง'] },
    { key: 'community', th: 'ชุมชนแชร์', code: 'COM', dark: [140, 214, 90], light: [63, 143, 34], css: 'var(--t-community)', agencies: ['ประชาชนร่วมแชร์', 'นิติบุคคลหมู่บ้าน', 'ร้านค้าในชุมชน'] },
    { key: 'haze', th: 'หมอกควัน/ไฟป่า', code: 'HAZ', dark: [170, 140, 255], light: [118, 80, 214], css: 'var(--t-haze)', agencies: ['กรมอุทยานแห่งชาติฯ', 'กรมควบคุมมลพิษ', 'องค์การบริหารส่วนตำบล'] },
  ];
  TT.TYPE = Object.fromEntries(TT.TYPES.map(t => [t.key, t]));
  TT.STATUS = {
    online: { th: 'ออนไลน์', cls: 'ok' },
    offline: { th: 'ออฟไลน์', cls: 'bad' },
    maintenance: { th: 'ซ่อมบำรุง', cls: 'warn' },
  };
  TT.REGIONS = {
    'เหนือ': [97.3, 15.2, 101.4, 20.5], 'อีสาน': [101.3, 14.1, 105.7, 18.5], 'กลาง': [99.3, 13.4, 101.4, 15.6],
    'ตะวันออก': [100.8, 11.6, 103.0, 14.3], 'ตะวันตก': [98.2, 11.0, 100.1, 17.8], 'ใต้': [97.5, 5.6, 102.1, 11.0],
  };

  const MIX = {
    base: { traffic: 38, safety: 30, flood: 10, community: 14, tourism: 5, haze: 3 },
    metro: { traffic: 36, safety: 30, flood: 18, community: 14, tourism: 2 },
    tourist: { tourism: 35, traffic: 24, safety: 25, community: 10, flood: 6 },
    north: { traffic: 32, safety: 26, haze: 16, community: 12, tourism: 10, flood: 4 },
    deepsouth: { safety: 46, traffic: 30, community: 12, flood: 8, tourism: 4 },
  };

  // เมืองหลัก: ตำแหน่ง, จำนวนกล้องจำลอง, การกระจายตัว (กม.)
  TT.CITIES = [
    { id: 'bkk', th: 'กรุงเทพฯ', lon: 100.5180, lat: 13.7460, tier: 1, n: 900, spread: 9, mix: 'metro' },
    { id: 'cmi', th: 'เชียงใหม่', lon: 98.9853, lat: 18.7883, tier: 1, n: 220, spread: 4, mix: 'north' },
    { id: 'pkt', th: 'ภูเก็ต', lon: 98.3923, lat: 7.8804, tier: 1, n: 150, spread: 6, mix: 'tourist' },
    { id: 'pty', th: 'พัทยา', lon: 100.8825, lat: 12.9236, tier: 1, n: 160, spread: 3, mix: 'tourist' },
    { id: 'kkn', th: 'ขอนแก่น', lon: 102.8359, lat: 16.4419, tier: 1, n: 150, spread: 4, mix: 'base' },
    { id: 'hdy', th: 'หาดใหญ่', lon: 100.4747, lat: 7.0086, tier: 1, n: 140, spread: 3.5, mix: 'deepsouth' },
    { id: 'nma', th: 'นครราชสีมา', lon: 102.0977, lat: 14.9799, tier: 2, n: 120, spread: 4, mix: 'base' },
    { id: 'udn', th: 'อุดรธานี', lon: 102.7859, lat: 17.4138, tier: 2, n: 90, spread: 3.5, mix: 'base' },
    { id: 'cri', th: 'เชียงราย', lon: 99.8325, lat: 19.9105, tier: 2, n: 80, spread: 3.5, mix: 'north' },
    { id: 'plk', th: 'พิษณุโลก', lon: 100.2659, lat: 16.8211, tier: 2, n: 70, spread: 3, mix: 'base' },
    { id: 'sni', th: 'สุราษฎร์ธานี', lon: 99.3215, lat: 9.1382, tier: 2, n: 70, spread: 3, mix: 'base' },
    { id: 'ubn', th: 'อุบลราชธานี', lon: 104.8473, lat: 15.2287, tier: 2, n: 80, spread: 3.5, mix: 'base' },
    { id: 'nsn', th: 'นครสวรรค์', lon: 100.1225, lat: 15.7047, tier: 2, n: 60, spread: 3, mix: 'base' },
    { id: 'hhn', th: 'หัวหิน', lon: 99.9576, lat: 12.5684, tier: 2, n: 70, spread: 3, mix: 'tourist' },
    { id: 'ryg', th: 'ระยอง', lon: 101.2816, lat: 12.6814, tier: 2, n: 70, spread: 3.5, mix: 'base' },
    { id: 'aya', th: 'อยุธยา', lon: 100.5877, lat: 14.3532, tier: 2, n: 70, spread: 3, mix: 'tourist' },
    { id: 'nrt', th: 'นครศรีธรรมราช', lon: 99.9631, lat: 8.4304, tier: 2, n: 60, spread: 3, mix: 'base' },
    { id: 'kbi', th: 'กระบี่', lon: 98.8270, lat: 8.0360, tier: 2, n: 60, spread: 4, mix: 'tourist' },
    { id: 'cbi', th: 'ชลบุรี', lon: 100.9847, lat: 13.3611, tier: 2, n: 80, spread: 3.5, mix: 'base' },
    { id: 'nbi', th: 'นนทบุรี', lon: 100.5144, lat: 13.8621, tier: 3, n: 120, spread: 4, mix: 'metro' },
    { id: 'spk', th: 'สมุทรปราการ', lon: 100.5998, lat: 13.5991, tier: 3, n: 100, spread: 4, mix: 'metro' },
    { id: 'lpg', th: 'ลำปาง', lon: 99.4990, lat: 18.2888, tier: 3, n: 40, spread: 3, mix: 'north' },
    { id: 'mst', th: 'แม่สอด', lon: 98.5770, lat: 16.7130, tier: 3, n: 40, spread: 3, mix: 'north' },
    { id: 'nki', th: 'หนองคาย', lon: 102.7413, lat: 17.8783, tier: 3, n: 40, spread: 3, mix: 'base' },
    { id: 'yla', th: 'ยะลา', lon: 101.2802, lat: 6.5411, tier: 3, n: 50, spread: 3, mix: 'deepsouth' },
    { id: 'snk', th: 'สกลนคร', lon: 104.1486, lat: 17.1545, tier: 3, n: 40, spread: 3, mix: 'base' },
    { id: 'kri', th: 'กาญจนบุรี', lon: 99.5328, lat: 14.0227, tier: 3, n: 40, spread: 3, mix: 'tourist' },
    { id: 'trt', th: 'ตราด', lon: 102.5156, lat: 12.2428, tier: 3, n: 30, spread: 3, mix: 'base' },
    { id: 'cpn', th: 'ชุมพร', lon: 99.1800, lat: 10.4930, tier: 3, n: 30, spread: 3, mix: 'base' },
    { id: 'nan', th: 'น่าน', lon: 100.7730, lat: 18.7830, tier: 3, n: 30, spread: 3, mix: 'north' },
    { id: 'msn', th: 'แม่ฮ่องสอน', lon: 97.9690, lat: 19.3020, tier: 3, n: 25, spread: 3, mix: 'north' },
    { id: 'pai', th: 'ปาย', lon: 98.4400, lat: 19.3580, tier: 3, n: 20, spread: 2, mix: 'north' },
  ];

  // จุดสำคัญที่ตั้งชื่อ (พิกัดโดยประมาณ ใช้เพื่อการออกแบบเท่านั้น)
  TT.LANDMARKS = [
    ['แยกอโศกมนตรี', 100.5603, 13.7372, 'traffic', 1], ['แยกราชประสงค์', 100.5402, 13.7470, 'traffic', 0],
    ['แยกปทุมวัน', 100.5299, 13.7466, 'safety', 0], ['อนุสาวรีย์ชัยสมรภูมิ', 100.5386, 13.7650, 'traffic', 1],
    ['ห้าแยกลาดพร้าว', 100.5616, 13.8162, 'traffic', 0], ['ถนนข้าวสาร', 100.4974, 13.7589, 'tourism', 0],
    ['สนามหลวง', 100.4924, 13.7550, 'safety', 1], ['ถนนเยาวราช', 100.5098, 13.7405, 'tourism', 0],
    ['แยกสาทร-นราธิวาสราชนครินทร์', 100.5329, 13.7210, 'traffic', 0], ['แยกศาลาแดง', 100.5339, 13.7290, 'traffic', 1],
    ['แยกนานา', 100.5555, 13.7405, 'traffic', 0], ['สวนจตุจักร', 100.5530, 13.8020, 'safety', 0],
    ['จุดเฝ้าระวังน้ำท่วม สุขุมวิท 71', 100.5970, 13.7210, 'flood', 0], ['จุดวัดระดับน้ำ คลองแสนแสบ ประตูน้ำ', 100.5425, 13.7505, 'flood', 0],
    ['ทางเข้าท่าอากาศยานสุวรรณภูมิ', 100.7300, 13.6950, 'traffic', 1], ['หน้าท่าอากาศยานดอนเมือง', 100.6010, 13.9130, 'traffic', 0],
    ['ริมเจ้าพระยา ไอคอนสยาม', 100.5103, 13.7267, 'tourism', 1],
    ['ประตูท่าแพ', 98.9934, 18.7877, 'tourism', 1], ['ถนนนิมมานเหมินท์', 98.9675, 18.7975, 'tourism', 0],
    ['แยกรินคำ', 98.9680, 18.8040, 'traffic', 0], ['จุดเฝ้าระวังไฟป่า ดอยสุเทพ', 98.9200, 18.8050, 'haze', 1],
    ['แยกข่วงสิงห์', 98.9830, 18.8150, 'traffic', 0],
    ['หาดป่าตอง', 98.2955, 7.8965, 'tourism', 1], ['สะพานสารสิน', 98.2860, 8.1960, 'traffic', 0],
    ['วงเวียนหอนาฬิกา เมืองภูเก็ต', 98.3880, 7.8860, 'safety', 0], ['หาดกะตะ', 98.2980, 7.8200, 'tourism', 0],
    ['ถนนวอล์คกิ้งสตรีท', 100.8710, 12.9270, 'tourism', 1], ['หาดจอมเทียน', 100.8710, 12.8790, 'tourism', 0],
    ['แยกพัทยากลาง', 100.8890, 12.9350, 'traffic', 0], ['ตลาดกิมหยง', 100.4710, 7.0060, 'safety', 0],
    ['แยกคอหงส์', 100.4990, 7.0130, 'traffic', 0], ['บึงแก่นนคร', 102.8320, 16.4130, 'safety', 0],
    ['แยกประตูเมือง ขอนแก่น', 102.8350, 16.4300, 'traffic', 0], ['อนุสาวรีย์ท้าวสุรนารี', 102.1000, 14.9750, 'safety', 1],
    ['วัดมหาธาตุ อยุธยา', 100.5675, 14.3570, 'tourism', 0], ['สถานีรถไฟหัวหิน', 99.9530, 12.5690, 'tourism', 0],
    ['หาดอ่าวนาง', 98.8230, 8.0330, 'tourism', 1], ['จุดเฝ้าระวังหมอกควัน ดอยภูคา', 101.0700, 19.2050, 'haze', 1],
    ['จุดเฝ้าระวังไฟป่า ปางอุ๋ง', 97.8150, 19.4950, 'haze', 0],
  ];

  // ทางหลวงสายหลัก (ประมาณแนว) — ใช้วางกล้องตามแนวถนน
  TT.HIGHWAYS = [
    { no: 1, th: 'พหลโยธิน', pts: [[100.56, 13.86], [100.60, 14.05], [100.58, 14.35], [100.40, 14.88], [100.13, 15.18], [100.12, 15.70], [99.95, 16.05], [99.52, 16.48], [99.12, 16.88], [99.05, 17.30], [99.30, 17.80], [99.50, 18.29], [99.90, 19.17], [99.83, 19.91]] },
    { no: 11, th: 'ลำปาง-เชียงใหม่', pts: [[99.50, 18.29], [99.25, 18.45], [99.01, 18.58], [98.98, 18.79]] },
    { no: 2, th: 'มิตรภาพ', pts: [[100.60, 14.05], [100.91, 14.53], [101.30, 14.65], [101.75, 14.80], [102.10, 14.98], [102.30, 15.40], [102.60, 15.90], [102.84, 16.44], [102.80, 16.90], [102.79, 17.41], [102.74, 17.88]] },
    { no: 4, th: 'เพชรเกษม', pts: [[100.45, 13.72], [100.25, 13.78], [100.06, 13.82], [99.82, 13.54], [99.95, 13.11], [99.96, 12.57], [99.80, 11.81], [99.55, 11.20], [99.18, 10.49], [99.20, 9.90], [99.32, 9.14], [99.50, 8.60], [99.68, 8.16], [100.07, 7.62], [100.30, 7.25], [100.47, 7.01]] },
    { no: 4, th: 'เพชรเกษม (อันดามัน)', pts: [[99.18, 10.49], [98.95, 10.25], [98.63, 9.96], [98.45, 9.45], [98.34, 8.86], [98.53, 8.45], [98.40, 8.10], [98.39, 7.88]] },
    { no: 3, th: 'สุขุมวิท', pts: [[100.62, 13.65], [100.80, 13.50], [100.98, 13.36], [100.92, 13.10], [100.88, 12.92], [100.95, 12.72], [101.28, 12.68], [101.70, 12.66], [102.10, 12.61], [102.52, 12.24]] },
    { no: 24, th: 'โชคชัย-เดชอุดม', pts: [[102.10, 14.98], [102.60, 14.80], [103.10, 14.85], [103.49, 14.88], [104.00, 15.00], [104.33, 15.12], [104.85, 15.23]] },
    { no: 117, th: 'นครสวรรค์-พิษณุโลก', pts: [[100.12, 15.70], [100.35, 16.10], [100.35, 16.44], [100.26, 16.82]] },
    { no: 12, th: 'พิษณุโลก-ขอนแก่น', pts: [[100.26, 16.82], [100.75, 16.75], [101.24, 16.78], [101.70, 16.70], [102.10, 16.54], [102.84, 16.44]] },
    { no: 22, th: 'อุดรธานี-นครพนม', pts: [[102.79, 17.41], [103.30, 17.45], [103.70, 17.30], [104.15, 17.16], [104.78, 17.40]] },
  ];

  const PREFIX = {
    traffic: ['แยก', 'ทางแยก', 'สะพาน', 'ถนน', 'วงเวียน', 'ทางลอด', 'จุดกลับรถ'],
    safety: ['ซอย', 'ป้ายรถเมล์', 'ตลาด', 'หน้าโรงเรียน', 'สวนสาธารณะ', 'ลานจอดรถ', 'ทางเดินลอยฟ้า'],
    flood: ['จุดวัดระดับน้ำ คลอง', 'อุโมงค์', 'จุดเสี่ยงน้ำท่วม ถนน', 'ประตูระบายน้ำ'],
    tourism: ['ถนนคนเดิน', 'จุดชมวิว', 'ท่าเรือ', 'ตลาดน้ำ', 'ลานวัฒนธรรม'],
    community: ['หมู่บ้าน', 'ซอย', 'หน้าร้าน ', 'ชุมชน', 'ทางเข้าหมู่บ้าน'],
    haze: ['จุดเฝ้าระวังไฟป่า ดอย', 'สถานีวัดหมอกควัน ', 'หอดูไฟป่า '],
  };
  const NAMES = ['ประชาราษฎร์', 'เจริญสุข', 'สุขสวัสดิ์', 'มิตรภาพ', 'ศรีสมาน', 'ประชาอุทิศ', 'ร่วมใจ', 'สามัคคี', 'เทศบาล 3', 'ราษฎร์บำรุง',
    'พัฒนาการ', 'รัตนาธิเบศร์', 'บรมราชชนนี', 'วิภาวดี', 'ศรีนครินทร์', 'กาญจนาภิเษก', 'เพชรเกษม', 'สุขาภิบาล 2', 'นวมินทร์', 'แจ้งวัฒนะ',
    'ประดิษฐ์มนูธรรม', 'ลาดกระบัง', 'ประชาชื่น', 'เอกชัย', 'บางนา-ตราด', 'ห้วยแก้ว', 'โชตนา', 'มหิดล', 'หน้าเมือง', 'กลางเมือง', 'ศรีจันทร์',
    'ราชดำเนิน', 'นิพัทธ์อุทิศ', 'ทุ่งโฮเต็ล', 'นาเกลือ', 'สุดบรรทัด', 'ศรีภูวนารถ', 'สันติสุข', 'ทรัพย์สมบูรณ์', 'ศรีวิชัย', 'เมืองใหม่'];

  const rnd = TT.rng(20690517);
  const BKK = [100.5018, 13.7563];

  function makeName(type, r) {
    const p = r.pick(PREFIX[type]);
    const n = r.pick(NAMES);
    const num = r() < 0.45 ? ` ${r.int(1, 48)}` : '';
    return `${p}${n}${num}`.replace(/\s+/g, ' ').trim();
  }

  // ---------- กล้อง ----------
  function baseCamera(seq, type, pos, opts, r) {
    const prov = opts.prov || TT.provinceAt(pos) || TT.nearestProvince(pos);
    const t = TT.TYPE[type];
    const st = r();
    return {
      id: `${(prov ? prov.id : 'thx').toUpperCase()}-${t.code}-${String(seq).padStart(4, '0')}`,
      name: opts.name || makeName(type, r), type, pos,
      prov: prov ? prov.id : null, provTh: prov ? prov.th : 'ไม่ระบุ', city: opts.city || (prov ? prov.th : ''),
      region: prov ? prov.region : '', agency: opts.agency || r.pick(t.agencies),
      status: st < 0.935 ? 'online' : st < 0.97 ? 'offline' : 'maintenance',
      heading: Math.round(((opts.heading ?? r.range(0, 360)) + 360) % 360), fov: Math.round(r.range(52, 96)),
      range: Math.round(type === 'haze' ? r.range(600, 1400) : r.range(55, 150)),
      ptz: opts.ptz ?? (r() < 0.22), res: r.pick(['1080p', '1080p', '4K', '720p', '1080p']), fps: r.pick([25, 30, 25, 15]),
      codec: r.pick(['H.265', 'H.264', 'H.265']), installed: r.int(2560, 2569), uptime: TT.clamp(99.9 - Math.abs(r.gauss()) * 2.5, 88, 99.9),
      seed: r(), seed2: r(), landmark: !!opts.landmark, highway: opts.highway || null,
      offlineHours: r.int(1, 30), distBkk: TT.distance(pos, BKK) / 1000,
    };
  }

  TT.buildCameras = function () {
    const cams = []; let seq = 1;
    const r = rnd;
    const push = c => { cams.push(c); };
    // จุดสำคัญ
    for (const [name, lon, lat, type, ptz] of TT.LANDMARKS) {
      const city = TT.CITIES.reduce((a, c) => (TT.distance([lon, lat], [c.lon, c.lat]) < TT.distance([lon, lat], [a.lon, a.lat]) ? c : a));
      push(baseCamera(seq++, type, [lon, lat], { name, ptz: !!ptz, landmark: true, city: city.th }, r));
    }
    // กลุ่มเมือง
    for (const city of TT.CITIES) {
      const mix = MIX[city.mix];
      let made = 0, tries = 0;
      while (made < city.n && tries < city.n * 6) {
        tries++;
        const k = r() < 0.75 ? 0.45 : 1;
        const pos = [city.lon + (r.gauss() * city.spread * k) / 111, city.lat + (r.gauss() * city.spread * k) / 111];
        const p = TT.provinceAt(pos); if (!p) continue;
        const type = r.weighted(mix);
        push(baseCamera(seq++, type, pos, { city: city.th, prov: p }, r));
        made++;
      }
    }
    // ทางหลวง
    for (const hw of TT.HIGHWAYS) {
      let km = 0;
      for (let i = 1; i < hw.pts.length; i++) {
        const a = hw.pts[i - 1], b = hw.pts[i], seg = TT.distance(a, b) / 1000;
        for (let d = r.range(2, 8); d < seg; d += r.range(6, 13)) {
          const t = d / seg, pos = [TT.lerp(a[0], b[0], t), TT.lerp(a[1], b[1], t)];
          const p = TT.provinceAt(pos); if (!p) continue;
          const kmMark = Math.round(km + d), meter = r.int(0, 9) * 100;
          const heading = TT.bearing(a, b) + (r() < 0.5 ? 0 : 180);
          push(baseCamera(seq++, r() < 0.88 ? 'traffic' : 'safety', pos, { name: `ทล.${hw.no} ${hw.th} กม. ${kmMark}+${String(meter).padStart(3, '0')}`, agency: 'กรมทางหลวง', heading, prov: p, highway: hw.no, city: p.th }, r));
        }
        km += seg;
      }
    }
    // กระจายทั่วจังหวัด
    for (const p of TT_GEO.provinces) {
      const n = r.int(5, 14) + Math.round(p.area / 2500);
      const mix = p.region === 'เหนือ' ? MIX.north : ['ยะลา', 'ปัตตานี', 'นราธิวาส'].includes(p.th) ? MIX.deepsouth : MIX.base;
      let made = 0, tries = 0;
      while (made < n && tries < n * 30) {
        tries++;
        const pos = [r.range(p.bbox[0], p.bbox[2]), r.range(p.bbox[1], p.bbox[3])];
        if (!p.polygons.some(poly => TT.pointInRing(pos, poly[0]))) continue;
        push(baseCamera(seq++, r.weighted(mix), pos, { prov: p, city: p.th }, r));
        made++;
      }
    }
    return cams;
  };

  // ค่าจำลองสำหรับขับฉากในภาพกล้อง (จำนวนรถ ระดับน้ำ หมอกควัน) เปลี่ยนตามชั่วโมง
  TT.metrics = function (c, h) {
    const act = TT.activity(h), wob = Math.sin(h * 1.7 + c.seed * 20) * 0.08;
    const m = {};
    m.congestion = TT.clamp((0.35 + c.seed * 0.75) * act + wob, 0.03, 0.98);
    m.vehicles = Math.round((260 + c.seed2 * 2600) * (0.25 + act));
    m.people = Math.round((20 + c.seed * 600) * (0.2 + act));
    m.rain = TT.clamp(0.15 + Math.sin(h / 3 + c.seed * 8) * 0.35 + (c.region === 'ใต้' ? 0.25 : 0), 0, 0.95);
    m.water = c.type === 'flood' ? Math.max(0, Math.round((c.seed - 0.55) * 90 + Math.sin(h / 2 + c.seed2 * 6) * 10 + m.rain * 20)) : 0;
    m.pm25 = Math.round((c.region === 'เหนือ' ? 38 : 16) + c.seed * (c.type === 'haze' ? 120 : 40) + Math.cos(h / 4) * 6);
    m.crowd = TT.clamp((0.2 + c.seed2 * 0.7) * (0.35 + TT.daylight(h)), 0, 1);
    return m;
  };

  // ---------- คำขอจากประชาชน ----------
  const REASONS = {
    traffic: ['จุดเกิดอุบัติเหตุบ่อย ทางโค้งอันตราย', 'แยกไม่มีสัญญาณไฟ รถเฉี่ยวชนบ่อย', 'ทางม้าลายหน้าโรงเรียน รถไม่ค่อยหยุด'],
    safety: ['ซอยเปลี่ยว ไฟสลัว มีเหตุวิ่งราวทรัพย์', 'ป้ายรถเมล์ช่วงกลางคืนไม่ปลอดภัย', 'ลานจอดรถมีรถจักรยานยนต์หายบ่อย'],
    flood: ['ถนนน้ำท่วมขังทุกครั้งที่ฝนตกหนัก', 'อุโมงค์ทางลอดน้ำท่วมสูง รถเล็กผ่านไม่ได้', 'คลองล้นตลิ่งช่วงหน้าฝน'],
    tourism: ['จุดชมวิวคนพลุกพล่าน อยากเช็กก่อนเดินทาง', 'ชายหาดคลื่นแรงช่วงมรสุม ควรมีกล้องเฝ้าดู'],
    community: ['บ้านมีกล้องอยู่แล้ว ยินดีแชร์ให้ชุมชนดู', 'ร้านค้าหน้าตลาดยินดีเปิดกล้องเป็นสาธารณะ'],
    haze: ['พื้นที่ไฟป่าลุกลามทุกปี ควรมีกล้องเฝ้าระวัง', 'อยากเห็นสภาพหมอกควันจริงก่อนออกจากบ้าน'],
  };
  const ALIASES = ['คุณนก', 'พี่ต้น', 'ผู้ใช้ #2381', 'คุณแพร', 'อาสาเขตบางกะปิ', 'คุณบอย', 'น้องมายด์', 'ผู้ใช้ #0912', 'ลุงชาญ', 'คุณฝน', 'ชมรมจักรยานเชียงใหม่', 'คุณโอ๊ต'];
  TT.REQ_TARGET = 30;
  TT.REQ_STEPS = [
    ['submitted', 'ส่งคำขอแล้ว', 'ระบบตรวจตำแหน่งซ้ำและความครบถ้วนอัตโนมัติ'],
    ['voting', 'รอชุมชนยืนยัน', `ต้องการเสียงสนับสนุน ${30} เสียง`],
    ['review', 'หน่วยงานพิจารณา', 'ส่งต่อเจ้าของพื้นที่หรือหน่วยงานที่รับผิดชอบ'],
    ['approved', 'อนุมัติ รอติดตั้ง', 'กำหนดการติดตั้งและเชื่อมต่อสัญญาณ'],
    ['live', 'เผยแพร่บนแผนที่', 'กล้องพร้อมให้ทุกคนดูแล้ว'],
  ];
  TT.REQ_STATUS = {
    voting: ['รอชุมชนยืนยัน', 'accent'], review: ['หน่วยงานพิจารณา', 'info'], approved: ['อนุมัติ รอติดตั้ง', 'ok'],
    live: ['เผยแพร่แล้ว', 'ok'], rejected: ['ไม่ผ่านการพิจารณา', 'bad'], submitted: ['ส่งคำขอแล้ว', 'accent'],
  };

  TT.buildRequests = function () {
    const r = TT.rng(4242); const out = [];
    const pool = TT.CITIES.flatMap(c => Array(c.tier === 1 ? 5 : c.tier === 2 ? 2 : 1).fill(c));
    let i = 0;
    while (out.length < 52 && i < 400) {
      i++;
      const c = r.pick(pool);
      const pos = [c.lon + (r.gauss() * c.spread * 0.6) / 111, c.lat + (r.gauss() * c.spread * 0.6) / 111];
      const p = TT.provinceAt(pos); if (!p) continue;
      const type = r.weighted(c.mix === 'north' ? { traffic: 3, safety: 3, haze: 3, flood: 1, community: 1 } : c.mix === 'tourist' ? { tourism: 4, safety: 3, traffic: 2, community: 1 } : { traffic: 4, safety: 4, flood: 2, community: 2 });
      const votes = Math.round(Math.pow(r(), 1.6) * 74);
      const s = r();
      const status = votes >= TT.REQ_TARGET ? (s < 0.5 ? 'review' : s < 0.8 ? 'approved' : s < 0.92 ? 'live' : 'rejected') : 'voting';
      out.push({
        id: `REQ-${TT.beYear()}-${String(10231 + out.length * 37).padStart(5, '0')}`,
        title: makeName(type, r), type, pos, prov: p.id, provTh: p.th, city: c.th, reason: r.pick(REASONS[type]),
        votes, status, days: r.range(0.2, 58), by: r.pick(ALIASES), heading: Math.round(r.range(0, 360)), fov: 70, range: 90, mine: false,
      });
    }
    return out;
  };
  TT.QUICK_REASONS = ['จุดเกิดอุบัติเหตุบ่อย', 'น้ำท่วมขังเป็นประจำ', 'ทางม้าลายหน้าโรงเรียน', 'พื้นที่เปลี่ยว ไฟสลัว', 'แหล่งท่องเที่ยวคนพลุกพล่าน', 'มีกล้องอยู่แล้ว ยินดีแชร์'];

  // ---------- อัปเดตของเครือข่ายกล้อง (สถานะ/ติดตั้งใหม่/คำขอ) ----------
  TT.makeUpdate = function (cams, requests, r) {
    const k = r();
    if (k < 0.35) { const c = r.pick(cams.filter(x => x.status === 'offline')); return { cam: c, msg: 'สัญญาณขาดหาย แจ้งหน่วยงานเจ้าของแล้ว', icon: 'alert', type: c.type }; }
    if (k < 0.6) { const c = r.pick(cams.filter(x => x.status === 'online')); return { cam: c, msg: 'กลับมาออนไลน์แล้ว', icon: 'check', type: c.type }; }
    if (k < 0.8) { const c = r.pick(cams.filter(x => x.installed === 2569)); return { cam: c, msg: 'เปิดให้ดูภาพบนแผนที่แล้ว (ติดตั้งใหม่)', icon: 'camera', type: c.type }; }
    const c = r.pick(cams.filter(x => x.status === 'maintenance'));
    return { cam: c, msg: 'อยู่ระหว่างซ่อมบำรุงตามแผน', icon: 'clock', type: c.type };
  };
})(window.TT);

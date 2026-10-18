/* ตาทิพย์ — แปลงข้อมูลกล้องจริง (window.TT_REAL จาก tools/fetch-real-data.mjs) เป็นรูปแบบเดียวกับกล้องในแอป */
(function (TT) {
  'use strict';
  const SRC = {
    osm: { th: 'OpenStreetMap', license: 'ODbL 1.0', credit: '© ผู้ร่วมพัฒนา OpenStreetMap' },
    bma: { th: 'กรุงเทพมหานคร (data.bangkok.go.th)', license: 'ตามชุดข้อมูล', credit: 'กรุงเทพมหานคร' },
    dgt: { th: 'data.go.th', license: 'ตามชุดข้อมูล', credit: 'หน่วยงานเจ้าของชุดข้อมูล' },
    gdcc: { th: 'gdcc.data.go.th', license: 'ตามชุดข้อมูล', credit: 'หน่วยงานเจ้าของชุดข้อมูล' },
  };
  TT.SRC = SRC;
  const ACCESS = { public: 'พื้นที่สาธารณะ', outdoor: 'ภายนอกอาคาร (เอกชน)', indoor: 'ภายในอาคาร', traffic: 'ถนน/จราจร' };
  const MOUNT = { pole: 'เสา', wall: 'ผนัง', ceiling: 'เพดาน', street_lamp: 'เสาไฟถนน' };
  const CAM = { fixed: 'มุมคงที่', dome: 'โดม', panning: 'หมุนได้ (PTZ)' };
  TT.realMeta = () => (window.TT_REAL ? window.TT_REAL.meta : null);

  TT.buildRealCameras = function () {
    if (!window.TT_REAL) return [];
    const byId = Object.fromEntries(TT_GEO.provinces.map(p => [p.id, p]));
    return window.TT_REAL.cameras.map((r, i) => {
      const prov = byId[r.prov] || null, pos = [r.lon, r.lat];
      const typeTh = TT.TYPE[r.type] ? TT.TYPE[r.type].th : 'กล้องวงจรปิด';
      const hasDir = typeof r.dir === 'number';
      return {
        id: r.id, real: true, src: r.src, srcTh: (SRC[r.src] || {}).th || r.src, url: r.url, updatedSrc: r.updated || null,
        name: r.name || `กล้อง${r.type === 'other' ? 'วงจรปิด' : typeTh} ${prov ? 'จ.' + prov.th : ''}`.trim(), named: !!r.name,
        type: TT.TYPE[r.type] ? r.type : 'other', pos, prov: prov ? prov.id : null, provTh: prov ? prov.th : 'ไม่ระบุ', city: prov ? prov.th : '',
        region: prov ? prov.region : '', agency: r.operator || 'ไม่ระบุ', operator: r.operator || null, status: 'unknown',
        heading: hasDir ? r.dir : 0, hasDir, fov: hasDir ? 70 : 360, range: hasDir ? 60 : 30, ptz: r.cam === 'panning',
        access: ACCESS[r.access] || r.access || null, mount: MOUNT[r.mount] || r.mount || null, camType: CAM[r.cam] || r.cam || null,
        zone: r.zone || null, seed: (i * 0.6180339887) % 1, landmark: false, distBkk: TT.distance(pos, [100.5018, 13.7563]) / 1000,
      };
    });
  };
})(window.TT);

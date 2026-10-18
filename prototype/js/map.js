/* ตาทิพย์ — แผนที่ (Leaflet + แผนที่ฐาน OpenStreetMap)
   S.vs เก็บศูนย์กลางและระดับซูมของ Leaflet ร่วมกับส่วนอื่นของแอป */
(function (TT) {
  'use strict';
  const M = (TT.map = {});
  let S, H, lmap, el, camLayer, coneLayer, reqLayer, provLayer, selLayer, placeLayer;
  let camKey = '', reqKey = '', provKey = '';

  const RAMP = {
    light: [[226, 236, 240], [168, 209, 216], [86, 170, 178], [240, 182, 80], [222, 120, 20], [150, 62, 0]],
    dark: [[24, 52, 64], [28, 96, 112], [56, 160, 160], [255, 190, 92], [255, 138, 48], [255, 226, 180]],
  };
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const col = type => (S.dark ? TT.TYPE[type].dark : TT.TYPE[type].light);
  const ll = p => [p[1], p[0]];
  const ring = pts => pts.map(ll);
  const camRadius = z => (z < 8 ? 2.6 : z < 11 ? 3.4 : z < 14 ? 4.5 : z < 16 ? 6 : 7.5);
  const hover = () => window.matchMedia('(hover: hover)').matches;
  M.ramp = () => (S.dark ? RAMP.dark : RAMP.light);
  M.rampCss = () => `linear-gradient(90deg, ${M.ramp().map(c => rgba(c)).join(',')})`;
  function rampColor(t) {
    const r = M.ramp(), x = TT.clamp(t, 0, 1) * (r.length - 1), i = Math.min(Math.floor(x), r.length - 2), k = x - i;
    return [0, 1, 2].map(j => Math.round(TT.lerp(r[i][j], r[i + 1][j], k)));
  }

  M.init = function (state, handlers) {
    S = state; H = handlers; el = document.getElementById('map');
    lmap = L.map(el, {
      zoomControl: false, preferCanvas: true, renderer: L.canvas({ padding: 0.4, tolerance: 6 }),
      minZoom: 5, maxZoom: 19, zoomSnap: 0.5, wheelPxPerZoomLevel: 100,
      maxBounds: [[-2, 88], [28, 114]], maxBoundsViscosity: 0.8,
    });
    lmap.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(lmap);
    provLayer = L.layerGroup().addTo(lmap);
    coneLayer = L.layerGroup().addTo(lmap);
    reqLayer = L.layerGroup().addTo(lmap);
    camLayer = L.layerGroup().addTo(lmap);
    selLayer = L.layerGroup().addTo(lmap);
    placeLayer = L.layerGroup().addTo(lmap);
    lmap.setView([S.vs.latitude, S.vs.longitude], S.vs.zoom, { animate: false });

    lmap.on('move', () => { syncVs({}); if (S.placing) drawPlacing(); });
    lmap.on('dragstart', () => H.onView(S.vs, { isDragging: true }));
    lmap.on('moveend', () => { syncVs({}); refreshCones(); });
    lmap.on('zoomend', () => { restyleCams(); buildRequests(); });
    lmap.on('click', e => H.onClick({ coordinate: [e.latlng.lng, e.latlng.lat] }));
    M.render();
  };
  function syncVs(inter) {
    const c = lmap.getCenter();
    S.vs = { longitude: c.lng, latitude: c.lat, zoom: lmap.getZoom() };
    H.onView(S.vs, inter);
  }

  // ---------- การเคลื่อนมุมมอง ----------
  M.flyTo = function (target, duration = 1200) {
    const lat = target.latitude ?? S.vs.latitude, lon = target.longitude ?? S.vs.longitude;
    const z = TT.clamp(target.zoom ?? S.vs.zoom, 5, 19);
    if (!duration || TT.reducedMotion()) lmap.setView([lat, lon], z, { animate: false });
    else lmap.flyTo([lat, lon], z, { duration: Math.min(duration, 1800) / 1000 });
  };
  M.fitBounds = function (bbox, opts = {}) {
    const w = el.clientWidth, h = el.clientHeight, mobile = TT.isMobile();
    const p = opts.padding || (mobile ? { top: 120, bottom: 150, left: 24, right: 24 } : { top: 90, bottom: 60, left: S.panelOpen ? 360 : 60, right: S.sideOpen ? 450 : 70 });
    const pad = { paddingTopLeft: [Math.min(p.left, w * 0.4), Math.min(p.top, h * 0.4)], paddingBottomRight: [Math.min(p.right, w * 0.4), Math.min(p.bottom, h * 0.4)], maxZoom: opts.maxZoom || 17 };
    const b = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];
    if (TT.reducedMotion() || opts.duration === 0) lmap.fitBounds(b, pad); else lmap.flyToBounds(b, { ...pad, duration: 1.2 });
  };
  // ย้ายแผนที่ให้ pos ไปอยู่ที่ (w/2 - dx, h/2 - dy) ของจอ เพื่อไม่ให้แผงข้อมูลบัง
  M.centerOn = function (pos, zoom, offset = [0, 0], duration = 1200) {
    const z = TT.clamp(zoom ?? S.vs.zoom, 5, 19);
    const c = lmap.unproject(lmap.project(ll(pos), z).add(L.point(offset[0], offset[1])), z);
    M.flyTo({ longitude: c.lng, latitude: c.lat, zoom: z }, duration);
  };
  // หมุดปักตำแหน่งอยู่กลางจอบนเดสก์ท็อป แต่ยกขึ้นไปช่วงบนบนมือถือเพื่อไม่ให้ bottom sheet บัง
  M.pinScreen = () => [el.clientWidth / 2, TT.isMobile() ? el.clientHeight * 0.3 : el.clientHeight / 2];
  M.pinCoord = () => { const [x, y] = M.pinScreen(); const p = lmap.containerPointToLatLng(L.point(x, y)); return [p.lng, p.lat]; };
  M.bounds = () => { const b = lmap.getBounds().pad(0.15); return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]; };
  M.invalidate = () => lmap.invalidateSize();

  // ---------- ชั้นข้อมูล ----------
  function camStyle(c, z) {
    const dim = S.mode === 'requests';
    const base = c.status === 'offline' ? [140, 150, 160] : col(c.type);
    return {
      radius: dim ? Math.max(2, camRadius(z) - 1.5) : camRadius(z),
      fillColor: rgba(base), fillOpacity: dim ? 0.35 : c.status === 'maintenance' ? 0.55 : 0.95,
      color: '#ffffff', weight: dim ? 0 : z >= 11 ? 1.4 : 0.8, opacity: 1,
    };
  }
  function buildCams() {
    camLayer.clearLayers();
    if (S.mode === 'province') return;
    const z = lmap.getZoom(), tip = hover();
    for (const c of S.filtered) {
      const m = L.circleMarker(ll(c.pos), { ...camStyle(c, z), bubblingMouseEvents: false, interactive: S.mode === 'points' });
      m._cam = c;
      m.on('click', () => H.onClick({ object: c, layer: { id: 'cam' } }));
      if (tip) m.bindTooltip(`<b>${TT.esc(c.name)}</b><br><small>${TT.TYPE[c.type].th} · ${TT.STATUS[c.status].th}</small>`, { direction: 'top', offset: [0, -6], className: 'tt-leaflet' });
      camLayer.addLayer(m);
    }
  }
  function restyleCams() { const z = lmap.getZoom(); camLayer.eachLayer(m => m.setStyle(camStyle(m._cam, z))); refreshCones(); }
  function buildRequests() {
    reqLayer.clearLayers();
    if (S.mode === 'province') return;
    // หมุดคำขอแสดงเมื่อซูมระดับจังหวัดขึ้นไป (ยกเว้นมุมมองคำขอ) เพื่อไม่ให้ภาพรวมประเทศรก
    if (!((S.toggles.requests && lmap.getZoom() >= 10) || S.mode === 'requests')) return;
    const acc = S.dark ? [255, 178, 56] : [199, 119, 0], ink = S.dark ? [236, 244, 250] : [13, 26, 36];
    const big = S.mode === 'requests';
    for (const r of S.requests) {
      const m = L.circleMarker(ll(r.pos), {
        radius: (r.mine ? 8 : 6.5) + (big ? 1.5 : 0), color: rgba(r.mine ? acc : ink, 0.95), weight: 2, dashArray: r.mine ? null : '3 3',
        fillColor: rgba(r.mine || big ? acc : ink, r.mine ? 0.75 : big ? 0.35 : 0.12), fillOpacity: 1, bubblingMouseEvents: false,
      });
      m.on('click', () => H.onClick({ object: r, layer: { id: 'requests' } }));
      if (hover()) m.bindTooltip(`<b>คำขอ: ${TT.esc(r.title)}</b><br><small>${r.votes} เสียง · ${TT.REQ_STATUS[r.status][0]}</small>`, { direction: 'top', offset: [0, -6], className: 'tt-leaflet' });
      reqLayer.addLayer(m);
    }
  }
  function buildProvinces() {
    provLayer.clearLayers();
    if (S.mode !== 'province') return;
    for (const p of TT_GEO.provinces) {
      const s = S.provStats[p.id], c = rampColor(s.norm);
      const poly = L.polygon(p.polygons.map(pg => ring(pg[0])), { color: S.dark ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.9)', weight: 1, fillColor: rgba(c), fillOpacity: 0.72, bubblingMouseEvents: false });
      poly.on('click', () => H.onClick({ object: { prov: p }, layer: { id: 'provinces' } }));
      poly.on('mouseover', () => poly.setStyle({ weight: 2.5, fillOpacity: 0.88 }));
      poly.on('mouseout', () => poly.setStyle({ weight: 1, fillOpacity: 0.72 }));
      poly.bindTooltip(`<b>${p.th}</b><br><small>${TT.fmt(s.count)} กล้อง · ${TT.fmt1(s.density)} ต่อ 100 ตร.กม.</small>`, { sticky: true, className: 'tt-leaflet' });
      provLayer.addLayer(poly);
    }
  }
  function refreshCones() {
    coneLayer.clearLayers();
    if (!S.toggles.cones || S.mode !== 'points' || lmap.getZoom() < 16) return;
    const b = M.bounds(); let n = 0;
    for (const c of S.filtered) {
      if (c.pos[0] < b[0] || c.pos[0] > b[2] || c.pos[1] < b[1] || c.pos[1] > b[3]) continue;
      if ((S.selected && c.id === S.selected.id) || c.hasDir === false) continue;
      const k = col(c.type);
      coneLayer.addLayer(L.polygon(ring(TT.sector(c.pos, c.heading, c.fov, Math.min(c.range, 260), 8)), { color: rgba(k, 0.75), weight: 1, fillColor: rgba(k), fillOpacity: c.status === 'online' ? 0.18 : 0.06, interactive: false }));
      if (++n > 400) break;
    }
  }
  M.refreshCones = () => refreshCones();
  function drawSelection() {
    selLayer.clearLayers();
    const c = S.selected; if (!c) return;
    const k = col(c.type), head = c.headingLive ?? c.heading;
    if (c.hasDir !== false) selLayer.addLayer(L.polygon(ring(TT.sector(c.pos, head, c.fov, c.range, 18)), { color: rgba(k), weight: 2, fillColor: rgba(k), fillOpacity: 0.3, interactive: false }));
    selLayer.addLayer(L.circleMarker(ll(c.pos), { radius: 18, color: rgba(k), weight: 2, fill: false, className: 'sel-pulse', interactive: false }));
    selLayer.addLayer(L.circleMarker(ll(c.pos), { radius: 8, color: '#fff', weight: 3, fillColor: rgba(k), fillOpacity: 1, interactive: false }));
  }
  function drawPlacing() {
    placeLayer.clearLayers();
    const P = S.placing; if (!P) return;
    const c = M.pinCoord(), acc = S.dark ? [255, 178, 56] : [199, 119, 0], red = [229, 72, 77];
    placeLayer.addLayer(L.polyline(ring(TT.circle(c, TT.DUP_RADIUS, 72)), { color: rgba(acc, 0.9), weight: 1.6, dashArray: '5 5', interactive: false }));
    for (const n of P.nearby || []) {
      placeLayer.addLayer(L.polyline([ll(c), ll(n.cam.pos)], { color: rgba(n.covers ? red : acc, 0.9), weight: 1.6, interactive: false }));
      placeLayer.addLayer(L.polygon(ring(TT.sector(n.cam.pos, n.cam.heading, n.cam.fov, n.cam.range, 10)), { color: rgba(n.covers ? red : col(n.cam.type), 0.85), weight: 1, fillOpacity: n.covers ? 0.25 : 0.14, fillColor: rgba(n.covers ? red : col(n.cam.type)), interactive: false }));
    }
    if (P.step >= 2) placeLayer.addLayer(L.polygon(ring(TT.sector(c, P.heading, P.fov, P.range, 20)), { color: rgba(acc), weight: 2.5, fillColor: rgba(acc), fillOpacity: 0.35, interactive: false }));
  }

  // สร้างใหม่เฉพาะชั้นที่ข้อมูลเปลี่ยน แล้ววาดส่วนที่เลือก/ปักหมุดทุกครั้ง
  M.render = function () {
    if (!lmap) return;
    const ck = `${S.dark}|${S.filterVersion}|${S.mode}`;
    if (ck !== camKey) { camKey = ck; buildCams(); refreshCones(); }
    const rk = `${S.reqVersion}|${S.toggles.requests}|${S.mode}|${S.dark}`;
    if (rk !== reqKey) { reqKey = rk; buildRequests(); }
    const pk = `${S.mode}|${S.statsVersion}|${S.dark}`;
    if (pk !== provKey) { provKey = pk; buildProvinces(); }
    drawSelection(); drawPlacing();
  };
  M.setTheme = function () { camKey = reqKey = provKey = ''; M.render(); };
})(window.TT);

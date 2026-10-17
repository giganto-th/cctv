/* ตาทิพย์ — โหมดแผนที่ถนน 2 มิติ (Leaflet + แผนที่ฐาน OpenStreetMap ผ่าน CARTO)
   ใช้สถานะและการโต้ตอบชุดเดียวกับโหมด 3 มิติ: S.vs เก็บศูนย์กลาง/ซูมร่วมกัน (ซูม Leaflet = ซูม deck.gl + 1) */
(function (TT) {
  'use strict';
  const ST = (TT.street = { active: false });
  let S, H, lmap, el, tiles, camLayer, coneLayer, reqLayer, selLayer, placeLayer;
  let camVer = -1, reqVer = -1, styleKey = '';

  const TILE = dark => `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`;
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const col = type => (S.dark ? TT.TYPE[type].dark : TT.TYPE[type].light);
  const ll = p => [p[1], p[0]];
  const ring = pts => pts.map(ll);
  const camRadius = z => (z < 9 ? 2.5 : z < 13 ? 3.5 : z < 16 ? 5 : 6.5);

  ST.init = function (state, handlers) {
    S = state; H = handlers; el = document.getElementById('street');
    lmap = L.map(el, {
      zoomControl: false, preferCanvas: true, renderer: L.canvas({ padding: 0.4, tolerance: 6 }),
      minZoom: 5, maxZoom: 19, zoomSnap: 0.25, zoomDelta: 1, wheelPxPerZoomLevel: 90, keyboard: true,
      maxBounds: [[-2, 88], [28, 114]], maxBoundsViscosity: 0.8,
    });
    lmap.attributionControl.setPrefix(false);
    tiles = L.tileLayer(TILE(S.dark), {
      subdomains: 'abcd', maxZoom: 19, detectRetina: false,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    }).addTo(lmap);
    coneLayer = L.layerGroup().addTo(lmap);
    reqLayer = L.layerGroup().addTo(lmap);
    camLayer = L.layerGroup().addTo(lmap);
    selLayer = L.layerGroup().addTo(lmap);
    placeLayer = L.layerGroup().addTo(lmap);

    lmap.on('move', () => { if (!ST.active) return; syncVs({}); if (S.placing) drawPlacing(); });
    lmap.on('dragstart', () => ST.active && H.onView(S.vs, { isDragging: true }));
    lmap.on('moveend', () => { if (!ST.active) return; syncVs({}); refreshCones(); });
    lmap.on('zoomend', () => { if (ST.active) restyleCams(); });
    lmap.on('click', e => ST.active && H.onClick({ coordinate: [e.latlng.lng, e.latlng.lat] }));
  };

  function syncVs(inter) {
    const c = lmap.getCenter();
    S.vs = { ...S.vs, longitude: c.lng, latitude: c.lat, zoom: lmap.getZoom() - 1 };
    H.onView(S.vs, inter);
  }

  ST.show = function () {
    ST.active = true; el.hidden = false;
    lmap.invalidateSize();
    lmap.setView([S.vs.latitude, S.vs.longitude], TT.clamp(S.vs.zoom + 1, 5, 19), { animate: false });
    ST.sync(true);
  };
  ST.hide = function () { ST.active = false; el.hidden = true; };
  ST.setTheme = function () { tiles.setUrl(TILE(S.dark)); styleKey = ''; ST.sync(true); };

  // ---------- การเคลื่อนมุมมอง (เรียกผ่าน TT.map เมื่ออยู่ในโหมดถนน) ----------
  ST.flyTo = function (target, duration) {
    const lat = target.latitude ?? S.vs.latitude, lon = target.longitude ?? S.vs.longitude;
    const z = TT.clamp((target.zoom ?? S.vs.zoom) + 1, 5, 19);
    if (!duration || TT.reducedMotion()) lmap.setView([lat, lon], z, { animate: false });
    else lmap.flyTo([lat, lon], z, { duration: Math.min(duration, 2200) / 1000 });
  };
  ST.fitBounds = function (bbox, pad, maxZoom, duration) {
    const opts = { paddingTopLeft: [pad.left, pad.top], paddingBottomRight: [pad.right, pad.bottom], maxZoom: Math.min((maxZoom || 16) + 1, 19) };
    if (TT.reducedMotion() || duration === 0) lmap.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], opts);
    else lmap.flyToBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { ...opts, duration: 1.4 });
  };
  ST.centerOn = function (pos, zoom, offset, duration) {
    const z = TT.clamp((zoom ?? S.vs.zoom) + 1, 5, 19);
    const pt = lmap.project(ll(pos), z).add(L.point(offset[0], offset[1]));
    const c = lmap.unproject(pt, z);
    ST.flyTo({ longitude: c.lng, latitude: c.lat, zoom: z - 1 }, duration);
  };
  ST.pinCoord = function () { const [x, y] = TT.map.pinScreen(); const p = lmap.containerPointToLatLng(L.point(x, y)); return [p.lng, p.lat]; };
  ST.bounds = function () { const b = lmap.getBounds().pad(0.15); return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]; };

  // ---------- ชั้นข้อมูล ----------
  function camStyle(c, z) {
    const off = c.status === 'offline', base = off ? [140, 150, 160] : col(c.type);
    return {
      radius: camRadius(z), fillColor: rgba(base), fillOpacity: c.status === 'maintenance' ? 0.55 : 0.95,
      color: S.dark ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.95)', weight: z >= 12 ? 1.2 : 0.6, opacity: 1,
    };
  }
  function buildCams() {
    camLayer.clearLayers();
    const z = lmap.getZoom();
    for (const c of S.filtered) {
      const m = L.circleMarker(ll(c.pos), { ...camStyle(c, z), bubblingMouseEvents: false });
      m._cam = c;
      m.on('click', () => H.onClick({ object: c, layer: { id: 'cam-core' }, coordinate: c.pos }));
      if (window.matchMedia('(hover: hover)').matches) m.bindTooltip(`<b>${TT.esc(c.name)}</b><br><small>${TT.TYPE[c.type].th} · ${TT.STATUS[c.status].th}</small>`, { direction: 'top', offset: [0, -6], className: 'tt-leaflet' });
      camLayer.addLayer(m);
    }
  }
  function restyleCams() {
    const z = lmap.getZoom();
    camLayer.eachLayer(m => m.setStyle(camStyle(m._cam, z)));
    buildRequests(); refreshCones();
  }
  function buildRequests() {
    reqLayer.clearLayers();
    // หมุดคำขอแสดงเมื่อซูมระดับจังหวัดขึ้นไป (ยกเว้นมุมมองคำขอ) เพื่อไม่ให้ภาพรวมประเทศรก
    if (!((S.toggles.requests && lmap.getZoom() >= 9) || S.mode === 'requests')) return;
    const acc = S.dark ? [255, 178, 56] : [199, 119, 0], ink = S.dark ? [236, 244, 250] : [13, 26, 36];
    for (const r of S.requests) {
      const m = L.circleMarker(ll(r.pos), { radius: r.mine ? 7 : 6, color: rgba(r.mine ? acc : ink, 0.95), weight: 2, dashArray: r.mine ? null : '3 3', fillColor: rgba(r.mine ? acc : ink, r.mine ? 0.7 : 0.12), fillOpacity: 1, bubblingMouseEvents: false });
      m.on('click', () => H.onClick({ object: r, layer: { id: 'requests' }, coordinate: r.pos }));
      m.bindTooltip(`<b>คำขอ: ${TT.esc(r.title)}</b><br><small>${r.votes} เสียง · ${TT.REQ_STATUS[r.status][0]}</small>`, { direction: 'top', offset: [0, -6], className: 'tt-leaflet' });
      reqLayer.addLayer(m);
    }
  }
  function refreshCones() {
    coneLayer.clearLayers();
    if (!S.toggles.cones || lmap.getZoom() < 16) return;
    const b = ST.bounds(); let n = 0;
    for (const c of S.filtered) {
      if (c.pos[0] < b[0] || c.pos[0] > b[2] || c.pos[1] < b[1] || c.pos[1] > b[3]) continue;
      if (S.selected && c.id === S.selected.id) continue;
      const k = col(c.type);
      coneLayer.addLayer(L.polygon(ring(TT.sector(c.pos, c.heading, c.fov, Math.min(c.range, 260), 8)), { color: rgba(k, 0.7), weight: 1, fillColor: rgba(k), fillOpacity: c.status === 'online' ? 0.16 : 0.06, interactive: false }));
      if (++n > 400) break;
    }
  }
  function drawSelection() {
    selLayer.clearLayers();
    const c = S.selected; if (!c) return;
    const k = col(c.type), head = c.headingLive ?? c.heading;
    selLayer.addLayer(L.polygon(ring(TT.sector(c.pos, head, c.fov, c.range, 18)), { color: rgba(k), weight: 2, fillColor: rgba(k), fillOpacity: 0.3, interactive: false }));
    selLayer.addLayer(L.circleMarker(ll(c.pos), { radius: 16, color: rgba(k), weight: 2, fill: false, className: 'sel-pulse', interactive: false }));
    selLayer.addLayer(L.circleMarker(ll(c.pos), { radius: 7.5, color: '#fff', weight: 2.5, fillColor: rgba(k), fillOpacity: 1, interactive: false }));
  }
  function drawPlacing() {
    placeLayer.clearLayers();
    const P = S.placing; if (!P) return;
    const c = ST.pinCoord(), acc = S.dark ? [255, 178, 56] : [199, 119, 0];
    placeLayer.addLayer(L.polyline(ring(TT.circle(c, TT.DUP_RADIUS, 72)), { color: rgba(acc, 0.8), weight: 1.4, dashArray: '4 4', interactive: false }));
    for (const n of P.nearby || []) {
      const red = [255, 92, 92];
      placeLayer.addLayer(L.polyline([ll(c), ll(n.cam.pos)], { color: rgba(n.covers ? red : acc, 0.85), weight: 1.4, interactive: false }));
      placeLayer.addLayer(L.polygon(ring(TT.sector(n.cam.pos, n.cam.heading, n.cam.fov, n.cam.range, 10)), { color: rgba(n.covers ? red : col(n.cam.type), 0.8), weight: 1, fillOpacity: n.covers ? 0.22 : 0.12, fillColor: rgba(n.covers ? red : col(n.cam.type)), interactive: false }));
    }
    if (P.step >= 2) placeLayer.addLayer(L.polygon(ring(TT.sector(c, P.heading, P.fov, P.range, 20)), { color: rgba(acc), weight: 2, fillColor: rgba(acc), fillOpacity: 0.32, interactive: false }));
  }

  // เรียกทุกครั้งที่ TT.map.render() ถูกเรียกขณะอยู่ในโหมดถนน — สร้างใหม่เฉพาะส่วนที่ข้อมูลเปลี่ยน
  ST.sync = function (force) {
    if (!ST.active) return;
    const key = `${S.dark}|${S.filterVersion}`;
    if (force || key !== styleKey) { styleKey = key; buildCams(); refreshCones(); }
    const rk = `${S.reqVersion}|${S.toggles.requests}|${S.mode}|${S.dark}`;
    if (force || rk !== reqVer) { reqVer = rk; buildRequests(); }
    if (force || camVer !== S.toggles.cones) { camVer = S.toggles.cones; refreshCones(); }
    drawSelection(); drawPlacing();
  };
})(window.TT);

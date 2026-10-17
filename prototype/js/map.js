/* ตาทิพย์ — แผนที่ 3 มิติ (deck.gl) ไม่ต้องใช้ tile ภายนอก: ประเทศไทยเป็น "แผ่นโฮโลแกรม" ยกตัวเหนือประเทศเพื่อนบ้าน */
(function (TT) {
  'use strict';
  const D = window.deck;
  const M = (TT.map = {});
  let deckgl, S, H, el;
  let C; // สีตามธีม
  let anim = { t: 0, hwy: 0, city: 0, wave: 1e6, introStart: 0 };
  let hexRadius = 12000, coneData = [], coneTimer = null;

  const PALETTE = {
    dark: {
      land: [17, 29, 41], neighbor: [10, 17, 25], neighborLine: [52, 70, 86, 150], provLine: [130, 160, 182, 64], lake: [6, 28, 42],
      outline: [255, 178, 56], grid: [70, 100, 125, 26], building: [24, 36, 50], buildingLit: [66, 58, 46], req: [236, 244, 250],
      trip: [255, 206, 140], tripCity: [255, 226, 180], highlight: [255, 178, 56, 70], offline: [96, 108, 120], ring: [255, 255, 255],
      ramp: [[16, 60, 78], [24, 104, 122], [56, 168, 168], [255, 190, 92], [255, 138, 48], [255, 236, 200]],
      heat: [[255, 178, 56, 0], [255, 178, 56, 90], [255, 140, 90, 160], [255, 111, 168, 210], [255, 220, 240, 255]],
      additive: true,
    },
    light: {
      land: [248, 250, 251], neighbor: [214, 222, 229], neighborLine: [168, 182, 194, 170], provLine: [100, 122, 138, 80], lake: [178, 210, 228],
      outline: [199, 119, 0], grid: [80, 110, 130, 34], building: [240, 243, 246], buildingLit: [252, 238, 214], req: [13, 26, 36],
      trip: [199, 119, 0], tripCity: [214, 128, 0], highlight: [199, 119, 0, 60], offline: [150, 160, 170], ring: [13, 26, 36],
      ramp: [[214, 230, 236], [160, 205, 214], [86, 170, 178], [240, 182, 80], [222, 120, 20], [150, 62, 0]],
      heat: [[199, 119, 0, 0], [240, 160, 32, 90], [230, 110, 60, 150], [207, 51, 120, 200], [120, 20, 70, 240]],
      additive: false,
    },
  };

  const MATERIAL = { ambient: 0.42, diffuse: 0.62, shininess: 36, specularColor: [50, 56, 64] };
  const mpp = (z, lat) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * Math.pow(2, z));
  const lift = m => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, m, 1];
  const slabFactor = z => TT.lerp(1, 0.06, TT.clamp((z - 5.5) / 8, 0, 1));
  M.typeColor = (type, a = 255) => { const t = TT.TYPE[type]; const c = S.dark ? t.dark : t.light; return [c[0], c[1], c[2], a]; };

  // ---------- ข้อมูลคงที่ ----------
  let provPolys, provRings, outlineRings, neighborPolys, neighborRings, gridLines, lakePolys;
  function prepStatic() {
    provPolys = []; provRings = [];
    for (const p of TT_GEO.provinces) for (const poly of p.polygons) { provPolys.push({ polygon: poly, prov: p }); provRings.push({ path: poly[0], prov: p }); }
    outlineRings = TT_GEO.outline.map(r => ({ path: r }));
    neighborPolys = []; neighborRings = [];
    for (const n of TT_GEO.neighbors) for (const poly of n.polygons) { neighborPolys.push({ polygon: poly }); neighborRings.push({ path: poly[0] }); }
    lakePolys = (TT_GEO.lake || []).map(p => ({ polygon: p }));
    gridLines = [];
    for (let x = 90; x <= 112; x += 1) gridLines.push({ path: [[x, -1], [x, 26]] });
    for (let y = -1; y <= 26; y += 1) gridLines.push({ path: [[90, y], [112, y]] });
  }

  // ---------- แสง: ตามชั่วโมง (ดวงอาทิตย์/ดวงจันทร์) ----------
  function lighting(h) {
    const day = TT.daylight(h), t = ((h - 6) / 12) * Math.PI;
    const sun = day > 0.02 ? [-Math.cos(t), 0.45, -Math.max(Math.sin(t), 0.25)] : [-0.4, 0.7, -1];
    const ambient = new D.AmbientLight({ color: [255, 255, 255], intensity: S.dark ? 0.5 + day * 0.25 : 0.82 + day * 0.15 });
    const key = new D.DirectionalLight({ color: S.dark ? [255, 214, 170] : [255, 252, 245], intensity: S.dark ? 0.9 + day * 0.9 : 1.1, direction: sun });
    const fill = new D.DirectionalLight({ color: [130, 170, 255], intensity: S.dark ? 0.55 : 0.25, direction: [0.8, -0.6, -0.6] });
    return new D.LightingEffect({ ambient, key, fill });
  }

  M.init = function (state, handlers) {
    S = state; H = handlers; el = document.getElementById('map');
    prepStatic();
    C = S.dark ? PALETTE.dark : PALETTE.light;
    const hover = window.matchMedia('(hover: hover)').matches;
    deckgl = new D.Deck({
      parent: el,
      viewState: S.vs,
      controller: { inertia: 280, touchRotate: true, dragRotate: true, keyboard: true },
      useDevicePixels: Math.min(window.devicePixelRatio || 1, 2),
      pickingRadius: 8,
      effects: [lighting(S.hourView())],
      onViewStateChange: ({ viewState, interactionState }) => {
        S.vs = viewState; deckgl.setProps({ viewState });
        H.onView(viewState, interactionState);
        scheduleCones();
        return viewState;
      },
      onClick: (info) => H.onClick(info),
      onHover: (info) => { el.style.cursor = info.object ? 'pointer' : ''; },
      getCursor: ({ isDragging }) => (isDragging ? 'grabbing' : 'grab'),
      getTooltip: hover ? tooltip : null,
      layers: [],
    });
    M.deck = deckgl;
    loop();
  };

  function tooltip({ object, layer }) {
    if (!object || !layer) return null;
    let html = null;
    const id = layer.id;
    if (id === 'cam-core') {
      const st = TT.STATUS[object.status];
      html = `<div class="tt"><b>${TT.esc(object.name)}</b><small>${TT.TYPE[object.type].th} · ${st.th} · ${TT.esc(object.provTh)}</small></div>`;
    } else if (id === 'provinces') {
      const s = S.provStats[object.prov.id];
      html = `<div class="tt"><b>${object.prov.th}</b><small>${TT.fmt(s.count)} กล้อง · ${TT.fmt1(s.density)} ต่อ 100 ตร.กม. · ภาค${object.prov.region}</small></div>`;
    } else if (id === 'hex') {
      html = `<div class="tt"><b>${TT.fmt(object.count)} กล้องในพื้นที่นี้</b><small>แตะเพื่อซูมเข้า</small></div>`;
    } else if (id === 'requests') {
      html = `<div class="tt"><b>คำขอ: ${TT.esc(object.title)}</b><small>${object.votes} เสียงสนับสนุน · ${TT.REQ_STATUS[object.status][0]}</small></div>`;
    }
    if (!html) return null;
    const cs = getComputedStyle(document.documentElement);
    return { html, style: { background: cs.getPropertyValue('--glass-strong'), color: cs.getPropertyValue('--fg'), border: `1px solid ${cs.getPropertyValue('--line-2')}`, borderRadius: '10px', padding: '8px 10px', fontSize: '13px', boxShadow: '0 10px 30px -12px rgba(0,0,0,.5)' } };
  }

  M.setTheme = function () {
    C = S.dark ? PALETTE.dark : PALETTE.light;
    deckgl && deckgl.setProps({ effects: [lighting(S.hourView())] });
    M.render();
  };
  M.setHour = function () { deckgl.setProps({ effects: [lighting(S.hourView())] }); M.render(); };

  // ---------- กรวยมุมมองของกล้องในจอ (ซูมใกล้เท่านั้น) ----------
  function scheduleCones() {
    if (coneTimer) return;
    coneTimer = setTimeout(() => { coneTimer = null; M.refreshCones(); }, 160);
  }
  M.refreshCones = function () {
    if (S.vs.zoom < 13.2 || !S.toggles.cones) { if (coneData.length) { coneData = []; M.render(); } return; }
    const b = M.bounds();
    const list = [];
    for (const c of S.filtered) {
      if (c.pos[0] < b[0] || c.pos[0] > b[2] || c.pos[1] < b[1] || c.pos[1] > b[3]) continue;
      if (S.selected && c.id === S.selected.id) continue;
      list.push({ cam: c, polygon: TT.sector(c.pos, c.heading, c.fov, Math.min(c.range, 260), 8) });
      if (list.length > 700) break;
    }
    coneData = list; M.render();
  };

  M.viewport = (vs = S.vs) => new D.WebMercatorViewport({ ...vs, width: el.clientWidth || 1, height: el.clientHeight || 1 });
  M.bounds = () => { const vp = M.viewport(); const pad = 0.15; const [w, s, e, n] = vp.getBounds(); const dx = (e - w) * pad, dy = (n - s) * pad; return [w - dx, s - dy, e + dx, n + dy]; };
  M.project = (p, z = 0) => M.viewport().project([p[0], p[1], z]);
  M.mpp = () => mpp(S.vs.zoom, S.vs.latitude);
  // หมุดปักตำแหน่งอยู่กลางจอบนเดสก์ท็อป แต่ยกขึ้นไปช่วงบนบนมือถือเพื่อไม่ให้ bottom sheet บัง
  M.pinScreen = () => [el.clientWidth / 2, TT.isMobile() ? el.clientHeight * 0.3 : el.clientHeight / 2];
  M.pinCoord = () => { const p = M.viewport().unproject(M.pinScreen()); return [p[0], p[1]]; };

  M.flyTo = function (target, duration = 1800) {
    if (TT.reducedMotion()) duration = 0;
    const vs = { ...S.vs, ...target };
    if (!duration) { S.vs = vs; deckgl.setProps({ viewState: vs }); H.onView(vs, {}); scheduleCones(); return; }
    deckgl.setProps({ viewState: { ...vs, transitionDuration: duration, transitionInterpolator: duration ? new D.FlyToInterpolator({ speed: 1.3 }) : undefined, transitionEasing: t => 1 - Math.pow(1 - t, 3) } });
  };
  M.fitBounds = function (bbox, opts = {}) {
    const w = el.clientWidth, h = el.clientHeight;
    const mobile = TT.isMobile();
    const pad = opts.padding || (mobile ? { top: 120, bottom: h * 0.5, left: 30, right: 30 } : { top: 110, bottom: 110, left: S.panelOpen ? 380 : 60, right: S.sideOpen ? 460 : 80 });
    const safe = { top: Math.min(pad.top, h * 0.4), bottom: Math.min(pad.bottom, h * 0.45), left: Math.min(pad.left, w * 0.4), right: Math.min(pad.right, w * 0.4) };
    const vp = new D.WebMercatorViewport({ width: w, height: h });
    const { longitude, latitude, zoom } = vp.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: safe, maxZoom: opts.maxZoom || 16 });
    M.flyTo({ longitude, latitude, zoom, pitch: opts.pitch ?? S.vs.pitch, bearing: opts.bearing ?? S.vs.bearing }, opts.duration);
  };

  M.startIntro = function () {
    if (TT.reducedMotion()) { anim.wave = 1e6; S.introDone = true; M.render(); return; }
    anim.wave = 0; anim.introStart = performance.now(); S.introDone = false; M.render();
    requestAnimationFrame(() => { S.introDone = true; M.render(); });
  };

  // ---------- วนลูปภาพเคลื่อนไหว ----------
  let last = performance.now();
  function loop() {
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.1); last = now;
    const reduce = TT.reducedMotion();
    anim.t += dt;
    if (!reduce) {
      const z = S.vs.zoom;
      const act = 0.35 + TT.activity(S.hourView()) * 0.9;
      anim.hwy = (anim.hwy + dt * 60 * Math.pow(2, 5.5 - Math.min(z, 12)) * act) % TT.HWY_PERIOD;
      anim.city = (anim.city + dt * 0.16 * Math.pow(2, 14 - TT.clamp(z, 11, 16)) * act) % TT.CITY_PERIOD;
      if (anim.wave < 1e6) { anim.wave = ((now - anim.introStart) / 1000) * 900; if (anim.wave > 1600) anim.wave = 1e6; }
    } else { anim.hwy = 600; anim.city = 9; }
    M.render();
    requestAnimationFrame(loop);
  }

  // ---------- เลเยอร์ ----------
  M.render = function () {
    if (!deckgl) return;
    const z = S.vs.zoom, lat = S.vs.latitude, m = mpp(z, lat), f = slabFactor(z);
    const slab = 6 * m * f; // ความหนาของแผ่นประเทศ (เมตร) ให้คงที่บนจอ
    const mode = S.mode, dark = S.dark;
    const blend = C.additive ? { blend: true, blendColorSrcFactor: 'src-alpha', blendColorDstFactor: 'one', blendAlphaSrcFactor: 'one', blendAlphaDstFactor: 'one-minus-src-alpha', depthWriteEnabled: false } : { depthWriteEnabled: false };
    const below = lift(-slab);
    const L = [];

    L.push(new D.PathLayer({ id: 'grid', data: gridLines, getPath: d => d.path, getColor: C.grid, widthUnits: 'pixels', getWidth: 1, modelMatrix: below, visible: z < 9, parameters: { depthWriteEnabled: false } }));
    L.push(new D.SolidPolygonLayer({ id: 'neighbors', data: neighborPolys, getPolygon: d => d.polygon, getFillColor: C.neighbor, modelMatrix: below, updateTriggers: { getFillColor: dark } }));
    L.push(new D.PathLayer({ id: 'neighbor-lines', data: neighborRings, getPath: d => d.path, getColor: C.neighborLine, widthUnits: 'pixels', getWidth: 1, modelMatrix: below, updateTriggers: { getColor: dark } }));

    // แผ่นจังหวัด / แท่งจังหวัด
    const provMode = mode === 'province';
    L.push(new D.SolidPolygonLayer({
      id: 'provinces', data: provPolys, getPolygon: d => d.polygon, extruded: true,
      getElevation: d => (!S.introDone ? 0.01 : provMode ? 6 + S.provStats[d.prov.id].hNorm * 120 : 6),
      elevationScale: m * f, modelMatrix: below,
      getFillColor: d => (provMode ? rampColor(S.provStats[d.prov.id].norm) : C.land),
      material: MATERIAL, pickable: provMode || mode === 'points', autoHighlight: true, highlightColor: C.highlight,
      transitions: { getElevation: { duration: 1100, easing: t => 1 - Math.pow(1 - t, 3) }, getFillColor: 500 },
      updateTriggers: { getElevation: [provMode, S.introDone, S.statsVersion], getFillColor: [provMode, dark, S.statsVersion] },
    }));
    L.push(new D.SolidPolygonLayer({ id: 'lake', data: lakePolys, getPolygon: d => d.polygon, getFillColor: C.lake, updateTriggers: { getFillColor: dark }, visible: !provMode }));
    L.push(new D.PathLayer({ id: 'prov-lines', data: provRings, getPath: d => d.path, getColor: C.provLine, widthUnits: 'pixels', getWidth: 1, widthMinPixels: 0.8, visible: !provMode && z < 13, updateTriggers: { getColor: dark }, parameters: { depthWriteEnabled: false } }));
    L.push(new D.PathLayer({ id: 'outline-glow', data: outlineRings, getPath: d => d.path, getColor: [...C.outline, dark ? 60 : 40], widthUnits: 'pixels', getWidth: 7, visible: !provMode && z < 11, parameters: blend, updateTriggers: { getColor: dark } }));
    L.push(new D.PathLayer({ id: 'outline', data: outlineRings, getPath: d => d.path, getColor: [...C.outline, 230], widthUnits: 'pixels', getWidth: 1.3, visible: !provMode && z < 13, updateTriggers: { getColor: dark } }));

    // เมืองจำลอง 3D
    if (S.toggles.buildings) {
      L.push(new D.SolidPolygonLayer({
        id: 'buildings', data: S.buildings, getPolygon: d => d.polygon, extruded: true, getElevation: d => d.height,
        getFillColor: d => (dark && d.lit ? C.buildingLit : C.building), material: MATERIAL, visible: z >= 11.2 && !provMode,
        opacity: TT.clamp((z - 11.2) / 1.2, 0, 1), updateTriggers: { getFillColor: dark },
      }));
    }

    // กระแสจราจร
    if (S.toggles.traffic && mode !== 'province') {
      L.push(new D.TripsLayer({
        id: 'trips-hwy', data: S.hwyTrips, getPath: d => d.path, getTimestamps: d => d.timestamps, getColor: C.trip,
        widthUnits: 'pixels', getWidth: 2.2, widthMinPixels: 1.5, capRounded: true, jointRounded: true, fadeTrail: true,
        trailLength: 26 * Math.pow(2, 5.5 - Math.min(z, 12)), currentTime: anim.hwy, visible: z < 12.5, opacity: 0.9, parameters: blend, updateTriggers: { getColor: dark },
      }));
      L.push(new D.TripsLayer({
        id: 'trips-city', data: S.cityTrips, getPath: d => d.path, getTimestamps: d => d.timestamps, getColor: C.tripCity,
        widthUnits: 'pixels', getWidth: 2.5, capRounded: true, jointRounded: true, fadeTrail: true,
        trailLength: 0.45, currentTime: anim.city, visible: z >= 11.4, opacity: TT.clamp((z - 11.4) / 1, 0, 1) * (0.4 + TT.activity(S.hourView()) * 0.6), parameters: blend, updateTriggers: { getColor: dark },
      }));
    }

    // ความหนาแน่น 3D (hexagon)
    if (mode === 'hex') {
      const r = z < 6.4 ? 14000 : z < 8 ? 6000 : z < 10 ? 2200 : z < 12 ? 700 : 260;
      if (r !== hexRadius) hexRadius = r;
      L.push(new D.HexagonLayer({
        id: 'hex', data: S.filtered, getPosition: d => d.pos, radius: hexRadius, coverage: 0.84, extruded: true,
        elevationRange: [0, 150], elevationScale: m * f * (0.35 + TT.activity(S.hourView()) * 0.9), upperPercentile: 99,
        getElevationValue: pts => Math.sqrt(pts.length), getColorValue: pts => Math.sqrt(pts.length),
        colorRange: C.ramp.map(c => [...c]), material: MATERIAL, pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 90],
        transitions: { elevationScale: 600 }, updateTriggers: { getPosition: S.filterVersion },
      }));
    }

    // คำขอจากประชาชน (heatmap)
    if (mode === 'requests') {
      L.push(new D.HeatmapLayer({ id: 'req-heat', data: S.requests, getPosition: d => d.pos, getWeight: d => 4 + d.votes, radiusPixels: 46, intensity: 1.2, threshold: 0.04, colorRange: C.heat, updateTriggers: { getWeight: S.reqVersion }, aggregation: 'SUM' }));
    }

    // กรวยมุมมอง
    if (mode === 'points' && coneData.length) {
      L.push(new D.PolygonLayer({
        id: 'cones', data: coneData, getPolygon: d => d.polygon, filled: true, stroked: true,
        getFillColor: d => M.typeColor(d.cam.type, d.cam.status === 'online' ? 34 : 14), getLineColor: d => M.typeColor(d.cam.type, 120),
        lineWidthUnits: 'pixels', getLineWidth: 1, parameters: { depthWriteEnabled: false }, updateTriggers: { getFillColor: dark, getLineColor: dark },
      }));
    }

    // จุดกล้อง
    const showCams = mode === 'points' || mode === 'requests';
    if (showCams) {
      const dim = mode === 'requests' ? 0.35 : 1;
      const hl = S.highlight;
      const filterExt = [new D.DataFilterExtension({ filterSize: 1 })];
      L.push(new D.ScatterplotLayer({
        id: 'cam-halo', data: S.filtered, getPosition: d => d.pos, radiusUnits: 'meters', getRadius: 110, radiusMinPixels: 3.5, radiusMaxPixels: 16,
        getFillColor: d => (d.status === 'online' && (!hl || hl.has(d.id)) ? M.typeColor(d.type, dark ? 46 : 34) : [0, 0, 0, 0]), opacity: dim,
        parameters: blend, extensions: filterExt, getFilterValue: d => d.distBkk, filterRange: [0, anim.wave], filterSoftRange: [0, Math.max(0, anim.wave - 220)],
        updateTriggers: { getFillColor: [dark, S.highlightVersion] }, visible: z < 15.5,
      }));
      L.push(new D.ScatterplotLayer({
        id: 'cam-core', data: S.filtered, getPosition: d => d.pos, radiusUnits: 'meters', getRadius: 26, radiusMinPixels: 1.7, radiusMaxPixels: 7,
        stroked: z > 11, lineWidthUnits: 'pixels', getLineWidth: 1, getLineColor: d => (d.status === 'online' ? [255, 255, 255, dark ? 150 : 230] : [...C.offline, 255]),
        getFillColor: d => {
          if (hl && !hl.has(d.id)) return [...C.offline, 50];
          if (d.status === 'offline') return [...C.offline, 200];
          return M.typeColor(d.type, d.status === 'maintenance' ? 130 : 255);
        },
        opacity: dim, pickable: mode === 'points', autoHighlight: true, highlightColor: [255, 255, 255, 220],
        extensions: filterExt, getFilterValue: d => d.distBkk, filterRange: [0, anim.wave], filterSoftRange: [0, Math.max(0, anim.wave - 220)],
        updateTriggers: { getFillColor: [dark, S.highlightVersion], getLineColor: dark },
      }));
      if (hl && hl.size && hl.size < 400) {
        const ph = (anim.t * 0.8) % 1;
        L.push(new D.ScatterplotLayer({ id: 'hl-rings', data: S.highlightList, getPosition: d => d.pos, radiusUnits: 'pixels', getRadius: 9, radiusScale: 1 + ph * 0.8, stroked: true, filled: false, lineWidthUnits: 'pixels', getLineWidth: 1.6, getLineColor: [...C.outline, Math.round(255 * (1 - ph))], updateTriggers: { getLineColor: dark } }));
      }
    }

    // หมุดคำขอ
    if ((mode === 'points' && z >= 7.5 && S.toggles.requests) || mode === 'requests') {
      const ph = (anim.t * 0.6) % 1;
      L.push(new D.ScatterplotLayer({
        id: 'requests', data: S.requests, getPosition: d => d.pos, radiusUnits: 'pixels', getRadius: d => (d.mine ? 7 : 5.5), stroked: true, filled: true,
        getFillColor: d => (d.mine ? [...C.outline, 200] : [...C.req, 40]), getLineColor: d => (d.mine ? [...C.outline, 255] : [...C.req, 230]), lineWidthUnits: 'pixels', getLineWidth: 1.6,
        pickable: true, autoHighlight: true, highlightColor: [...C.outline, 160], updateTriggers: { getFillColor: [dark, S.reqVersion], getLineColor: [dark, S.reqVersion], getRadius: S.reqVersion },
      }));
      L.push(new D.ScatterplotLayer({ id: 'req-pulse', data: S.requests.filter(r => r.mine || r.status === 'voting'), getPosition: d => d.pos, radiusUnits: 'pixels', getRadius: 6, radiusScale: 1 + ph * 2.4, stroked: true, filled: false, lineWidthUnits: 'pixels', getLineWidth: 1.2, getLineColor: d => (d.mine ? [...C.outline, 255] : [...C.req, 160]), opacity: 1 - ph, updateTriggers: { getLineColor: [dark, S.reqVersion] }, parameters: { depthWriteEnabled: false } }));
    }

    // กล้องที่เลือก: กรวยกวาด + ลำแสง + วงคลื่น
    const sel = S.selected;
    if (sel && mode !== 'province') {
      const ph = (anim.t * 0.7) % 1;
      const sweep = sel.ptz && S.ptzAuto && !TT.reducedMotion() ? Math.sin(anim.t * 0.8) * sel.fov * 0.35 : 0;
      const head = (sel.headingLive ?? sel.heading) + sweep, fov = sel.fovLive ?? sel.fov;
      const rng = Math.max(sel.range, m * 70);
      const cone = TT.sector(sel.pos, head, fov, rng, 18);
      L.push(new D.PolygonLayer({ id: 'sel-cone', data: [{ polygon: cone }], getPolygon: d => d.polygon, getFillColor: M.typeColor(sel.type, 90), getLineColor: M.typeColor(sel.type, 240), lineWidthUnits: 'pixels', getLineWidth: 2, parameters: { depthWriteEnabled: false, depthCompare: 'always' } }));
      L.push(new D.ColumnLayer({ id: 'sel-glow', data: [sel], getPosition: d => d.pos, diskResolution: 24, radius: m * 9, extruded: true, getElevation: 1, elevationScale: m * 170, getFillColor: M.typeColor(sel.type, dark ? 46 : 60), parameters: { ...blend, depthCompare: 'always' }, material: false }));
      L.push(new D.ColumnLayer({ id: 'sel-beam', data: [sel], getPosition: d => d.pos, diskResolution: 24, radius: m * 2.6, extruded: true, getElevation: 1, elevationScale: m * 170, getFillColor: M.typeColor(sel.type, 210), parameters: { ...blend, depthCompare: 'always' }, material: false }));
      L.push(new D.ScatterplotLayer({ id: 'sel-ring', data: [sel], getPosition: d => d.pos, radiusUnits: 'pixels', getRadius: 10, radiusScale: 1 + ph * 3.2, stroked: true, filled: false, lineWidthUnits: 'pixels', getLineWidth: 2, getLineColor: M.typeColor(sel.type, 255), opacity: 1 - ph }));
      L.push(new D.ScatterplotLayer({ id: 'sel-dot', data: [sel], getPosition: d => d.pos, radiusUnits: 'pixels', getRadius: 7, stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2.5, getFillColor: M.typeColor(sel.type), getLineColor: [255, 255, 255, 255] }));
    }

    // โหมดปักหมุด: ตัวอย่างกรวยมุมมองและรัศมีตรวจซ้ำ
    const P = S.placing;
    if (P) {
      const c = M.pinCoord();
      if (P.step >= 2) L.push(new D.PolygonLayer({ id: 'place-cone', data: [{ polygon: TT.sector(c, P.heading, P.fov, P.range, 20) }], getPolygon: d => d.polygon, getFillColor: [...C.outline, 90], getLineColor: [...C.outline, 255], lineWidthUnits: 'pixels', getLineWidth: 2, parameters: { depthWriteEnabled: false, depthCompare: 'always' } }));
      L.push(new D.PathLayer({ id: 'place-radius', data: [{ path: TT.circle(c, TT.DUP_RADIUS, 72) }], getPath: d => d.path, getColor: [...C.outline, 160], widthUnits: 'pixels', getWidth: 1.2, getDashArray: [4, 4], extensions: [new D.PathStyleExtension({ dash: true })], parameters: { depthWriteEnabled: false, depthCompare: 'always' } }));
      if (P.nearby && P.nearby.length) {
        L.push(new D.LineLayer({ id: 'place-links', parameters: { depthCompare: 'always' }, data: P.nearby, getSourcePosition: () => c, getTargetPosition: d => d.cam.pos, getColor: d => (d.covers ? [255, 92, 92, 220] : [...C.outline, 150]), getWidth: 1.4, widthUnits: 'pixels' }));
        L.push(new D.PolygonLayer({ id: 'place-near-cones', data: P.nearby, getPolygon: d => TT.sector(d.cam.pos, d.cam.heading, d.cam.fov, d.cam.range, 10), getFillColor: d => (d.covers ? [255, 92, 92, 60] : M.typeColor(d.cam.type, 40)), getLineColor: d => (d.covers ? [255, 92, 92, 200] : M.typeColor(d.cam.type, 140)), lineWidthUnits: 'pixels', getLineWidth: 1, parameters: { depthWriteEnabled: false } }));
      }
    }

    deckgl.setProps({ layers: L });
    H.afterRender && H.afterRender(m, f);
  };

  function rampColor(t) {
    const r = C.ramp, x = TT.clamp(t, 0, 1) * (r.length - 1), i = Math.min(Math.floor(x), r.length - 2), k = x - i;
    return [0, 1, 2].map(j => Math.round(TT.lerp(r[i][j], r[i + 1][j], k))).concat(255);
  }
  M.rampCss = () => `linear-gradient(90deg, ${C.ramp.map(c => `rgb(${c.join(',')})`).join(',')})`;
  M.heatCss = () => `linear-gradient(90deg, ${C.heat.slice(1).map(c => `rgba(${c[0]},${c[1]},${c[2]},${(c[3] / 255).toFixed(2)})`).join(',')})`;
  M.slabTop = (z, lat) => 0 * mpp(z, lat);
  M.provHeight = (hNorm) => { const z = S.vs.zoom; const m = mpp(z, S.vs.latitude) * slabFactor(z); return hNorm * 120 * m; };
})(window.TT);

/* ตาทิพย์ — สถานะแอปและการโต้ตอบ */
(function (TT) {
  'use strict';
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const M = TT.map, U = TT.ui;
  TT.DUP_RADIUS = 150;

  // ---------- สถานะ ----------
  const root = document.documentElement;
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = TT.store.get('theme', null);
  if (savedTheme) root.setAttribute('data-theme', savedTheme);
  const resolveDark = () => (root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : sysDark.matches);

  const S = (TT.S = {
    vs: { longitude: 101, latitude: 13, zoom: 4.6, pitch: 0, bearing: 0, minZoom: 3.8, maxZoom: 17.6, maxPitch: 72 },
    dark: resolveDark(), mode: 'points', types: new Set(TT.TYPES.map(t => t.key)), statuses: new Set(Object.keys(TT.STATUS)),
    toggles: { traffic: true, buildings: true, cones: true, requests: true },
    hour: null, playing: false, hourView() { return this.hour ?? TT.hourNow(); },
    selected: null, selectedProv: null, ptzAuto: true, reportOpen: false, placing: null,
    panelOpen: !TT.isMobile(), sideOpen: false, introDone: false, reqTab: 'near', activeReq: null,
    highlight: null, highlightList: [], highlightVersion: 0, filterVersion: 0, statsVersion: 0, reqVersion: 0,
    view: TT.store.get('view', '3d') === 'street' ? 'street' : '3d',
    favs: new Set(TT.store.get('favs', [])), votes: new Set(TT.store.get('votes', [])), recent: TT.store.get('recent', []),
  });

  // ---------- ข้อมูล ----------
  S.cams = TT.buildCameras();
  S.camById = new Map(S.cams.map(c => [c.id, c]));
  S.buildings = TT.buildBuildings();
  S.hwyTrips = TT.buildHighwayTrips();
  S.cityTrips = TT.buildCityTrips();
  const mine = TT.store.get('myRequests', []).map(r => ({ ...r, days: (Date.now() - r.created) / 864e5, mine: true }));
  S.requests = [...mine, ...TT.buildRequests()];

  function applyFilters() {
    S.filtered = S.cams.filter(c => S.types.has(c.type) && S.statuses.has(c.status));
    S.filterVersion++;
    computeStats();
  }
  function computeStats() {
    const ps = {};
    for (const p of TT_GEO.provinces) ps[p.id] = { count: 0, online: 0, byType: {}, density: 0, norm: 0, onlinePct: 0 };
    const nat = { total: 0, online: 0, byType: {}, byStatus: {} };
    for (const c of S.cams) { nat.byType[c.type] = (nat.byType[c.type] || 0) + 1; nat.byStatus[c.status] = (nat.byStatus[c.status] || 0) + 1; }
    for (const c of S.filtered) {
      nat.total++; if (c.status === 'online') nat.online++;
      const s = ps[c.prov]; if (!s) continue;
      s.count++; if (c.status === 'online') s.online++; s.byType[c.type] = (s.byType[c.type] || 0) + 1;
    }
    let maxD = 0; const ds = [];
    for (const p of TT_GEO.provinces) { const s = ps[p.id]; s.density = (s.count / p.area) * 100; s.onlinePct = s.count ? (s.online / s.count) * 100 : 0; maxD = Math.max(maxD, s.density); ds.push(s.density); }
    // สีใช้สเกล log ให้เห็นความต่างของจังหวัดเล็ก ความสูงใช้กำลัง 0.6 ให้ กทม. โดดเด่น
    for (const p of TT_GEO.provinces) { const s = ps[p.id]; s.norm = maxD ? Math.log1p(s.density * 4) / Math.log1p(maxD * 4) : 0; s.hNorm = maxD ? Math.pow(s.density / maxD, 0.6) : 0; }
    ds.sort((a, b) => a - b);
    nat.onlinePct = nat.total ? (nat.online / nat.total) * 100 : 0; nat.maxDensity = maxD; nat.medianDensity = ds[38];
    nat.provinces = Object.values(ps).filter(s => s.count).length;
    nat.voting = S.requests.filter(r => r.status === 'voting').length;
    S.provStats = ps; S.national = nat; S.statsVersion++;
  }
  S.nearestOf = (c, n) => S.cams.filter(o => o !== c && Math.abs(o.pos[0] - c.pos[0]) < 0.08 && Math.abs(o.pos[1] - c.pos[1]) < 0.08)
    .map(o => ({ cam: o, d: TT.distance(o.pos, c.pos) })).sort((a, b) => a.d - b.d).slice(0, n);
  applyFilters();

  // ---------- มุมมองเริ่มต้น ----------
  const TH_BBOX = [97.4, 5.7, 105.6, 20.4];
  function overviewView() {
    const w = innerWidth, h = innerHeight, mob = TT.isMobile();
    const vp = new deck.WebMercatorViewport({ width: w, height: h });
    const pad = mob ? { top: 110, bottom: 150, left: 20, right: 20 } : { top: 80, bottom: 90, left: S.panelOpen ? 360 : 40, right: 60 };
    const v = vp.fitBounds([[TH_BBOX[0], TH_BBOX[1]], [TH_BBOX[2], TH_BBOX[3]]], { padding: pad });
    return { longitude: v.longitude, latitude: v.latitude - (mob ? 0.6 : 0.9), zoom: v.zoom + (mob ? 0.05 : 0.2), pitch: mob ? 34 : 44, bearing: mob ? -6 : -12 };
  }
  const ov = overviewView();
  Object.assign(S.vs, { ...ov, zoom: ov.zoom - 1.1, pitch: 0, bearing: -32 });

  // ---------- render หลัก ----------
  function renderLayersPanel() {
    $('#panel-layers').innerHTML = U.layers(S);
    $('#panel-layers').classList.toggle('collapsed', !S.panelOpen);
    $('#btn-layers').setAttribute('aria-pressed', S.panelOpen);
    $('#stat-strip').innerHTML = U.statStrip(S);
    $('#req-badge').textContent = S.requests.filter(r => r.mine).length || S.national.voting;
    $('#req-dot').hidden = !S.requests.some(r => r.mine);
  }
  function setSide(which) {
    // which: 'detail' | 'requests' | null
    $('#panel-detail').hidden = which !== 'detail';
    $('#panel-requests').hidden = which !== 'requests';
    S.sideOpen = !!which;
    app.classList.toggle('side-open', S.sideOpen && !TT.isMobile());
    if (which !== 'detail') stopFeed();
    if (TT.isMobile() && which) { S.panelOpen = false; renderLayersPanel(); }
    navActive(which === 'requests' ? 'requests' : 'map');
  }
  function navActive(k) { document.querySelectorAll('#bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === k)); }

  // ---------- เลือกกล้อง ----------
  let feedTimer = null;
  function stopFeed() { if (S.feed) S.feed.stop(); S.feed = null; clearInterval(feedTimer); }
  function selectCamera(c, fly = true) {
    if (!c) return;
    if (S.placing) exitPlacing();
    stopTour();
    S.selected = c; S.selectedProv = null; c.headingLive = c.heading; S.reportOpen = false;
    if (S.mode === 'province' || S.mode === 'hex') setMode('points');
    renderDetail();
    setSide('detail');
    const pd = $('#panel-detail'); pd.classList.toggle('peek', TT.isMobile());
    if (fly) {
      const mob = TT.isMobile();
      centerOn(c.pos, { zoom: Math.max(S.vs.zoom, c.type === 'haze' ? 13.6 : 15.8), pitch: 60, bearing: S.vs.zoom > 12 ? S.vs.bearing : (c.heading + 180) % 360 - 180 }, mob ? [0, innerHeight * 0.26] : [TT.isMobile() ? 0 : 200, 0]);
    }
    try { history.replaceState(null, '', '#cam-' + c.id); } catch (e) { /* บาง sandbox ห้ามแก้ URL */ }
    M.render();
  }
  const centerOn = (pos, target, offset, duration) => M.centerOn(pos, target, offset, duration);
  function renderDetail() {
    const c = S.selected, pd = $('#panel-detail');
    stopFeed();
    if (!c) { pd.innerHTML = S.selectedProv ? U.province(S, S.selectedProv) : ''; return; }
    pd.innerHTML = U.detail(S, c);
    const cv = $('#feed-canvas');
    if (cv) {
      S.feed = new TT.Feed(cv, c, () => S.hourView());
      S.feed.pan = ((c.headingLive - c.heading) / 90);
      S.feed.start();
      const tick = () => { const el = $('#osd-time'); if (!el) return; const d = TT.bangkokNow(); const hh = S.hour == null ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}` : TT.hhmm(S.hour) + ':00'; el.textContent = `${TT.thDate(d)} ${hh}`; };
      tick(); feedTimer = setInterval(tick, 1000);
    }
  }
  function closeDetail() {
    S.selected = null; S.selectedProv = null; setSide(null); M.render();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ข้าม */ }
  }
  function selectProvince(p) {
    S.selected = null; S.selectedProv = p; renderDetail(); setSide('detail');
    $('#panel-detail').classList.toggle('peek', TT.isMobile());
    M.fitBounds(p.bbox, { maxZoom: 9.5, pitch: 50 });
  }

  // ---------- โหมด / ตัวกรอง ----------
  function setMode(m) {
    if (S.view === 'street' && (m === 'hex' || m === 'province')) setView('3d');
    S.mode = m; app.dataset.mode = m;
    if (m === 'province' && S.vs.zoom > 8) M.flyTo(overviewView(), 1600);
    if (m === 'requests' && S.vs.zoom > 11) M.flyTo({ zoom: 10.5 }, 900);
    renderLayersPanel(); M.render(); labelsDirty = true;
  }

  // ---------- สลับแผนที่ 3 มิติ / แผนที่ถนน ----------
  function setView(v, quiet) {
    if (v === S.view && !quiet) return;
    S.view = v; TT.store.set('view', v);
    app.classList.toggle('street', v === 'street');
    if (v === 'street') {
      if (S.mode === 'hex' || S.mode === 'province') { S.mode = 'points'; app.dataset.mode = 'points'; }
      TT.street.show();
    } else { TT.street.hide(); M.syncView(); }
    document.querySelectorAll('[data-act="view"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
    renderLayersPanel(); labelsDirty = true;
    if (!quiet) TT.toast(v === 'street' ? 'แผนที่ถนน: แผนที่ฐาน OpenStreetMap' : 'แผนที่ 3 มิติ');
  }

  // ---------- palette ----------
  let palMode = 'search', palSel = 0;
  function openPalette(mode = 'search', q = '') {
    palMode = mode; $('#palette').hidden = false;
    const inp = $('#palette-q'); inp.value = q; inp.placeholder = mode === 'jump' ? 'ค้นหาจังหวัด เมือง หรือสถานที่เพื่อย้ายหมุด' : 'ค้นหาจังหวัด เมือง ชื่อจุด หรือรหัสกล้อง';
    renderPalette(); setTimeout(() => inp.focus(), 30);
  }
  function closePalette() { $('#palette').hidden = true; if (palMode !== 'jump') navActive(S.sideOpen ? 'map' : 'map'); }
  function renderPalette() {
    const q = $('#palette-q').value.trim(), box = $('#palette-results');
    palSel = 0;
    if (!q) { box.innerHTML = U.paletteEmpty(S); return; }
    const s = q.toLowerCase();
    const provs = TT_GEO.provinces.filter(p => p.th.includes(q) || p.en.toLowerCase().includes(s)).slice(0, 5);
    const cities = TT.CITIES.filter(c => c.th.includes(q) && !provs.some(p => p.th === c.th)).slice(0, 4);
    const cams = palMode === 'search' ? S.cams.filter(c => c.name.includes(q) || c.id.toLowerCase().includes(s)).sort((a, b) => b.landmark - a.landmark).slice(0, 8) : [];
    box.innerHTML = U.paletteResults(S, q, { provs, cities, cams });
    markPal();
  }
  function palItems() { return [...document.querySelectorAll('#palette-results [data-act="pal-prov"], #palette-results [data-act="pal-city"], #palette-results .pal-item[data-act="cam"]')]; }
  function markPal() { palItems().forEach((el, i) => el.setAttribute('aria-selected', i === palSel)); const el = palItems()[palSel]; el && el.scrollIntoView({ block: 'nearest' }); }
  function pushRecent(q) { if (!q) return; S.recent = [q, ...S.recent.filter(x => x !== q)].slice(0, 6); TT.store.set('recent', S.recent); }
  function goProvince(id) {
    const p = TT_GEO.provinces.find(x => x.id === id);
    closePalette(); pushRecent(p.th);
    if (S.placing) { M.fitBounds(p.bbox, { maxZoom: 13.5 }); return; }
    if (S.mode === 'province') selectProvince(p); else M.fitBounds(p.bbox, { maxZoom: 11, pitch: 50 });
  }
  function goCity(id) {
    const c = TT.CITIES.find(x => x.id === id); closePalette(); pushRecent(c.th);
    M.flyTo({ longitude: c.lon, latitude: c.lat, zoom: S.placing ? 15.5 : 13.6, pitch: 58 }, 2200);
  }

  // ---------- ขั้นตอนปักหมุด ----------
  function startPlacing() {
    stopTour(); closePalette();
    if (S.selected || S.selectedProv) { S.selected = null; S.selectedProv = null; }
    setSide(null);
    if (S.mode !== 'points') setMode('points');
    S.placing = { step: 1, heading: 45, fov: 75, range: 90, type: 'traffic', kind: 'new', title: '', reason: '', reasonTags: [], contact: '', stream: '', photo: null, consent: false, nearby: [], nearReqs: [] };
    app.classList.add('placing');
    $('#placer').hidden = false;
    if (S.vs.zoom < 12) M.flyTo({ longitude: 100.5345, latitude: 13.7435, zoom: 15.6, pitch: 45, bearing: 0 }, 2200);
    else if (S.vs.zoom < 14.5) M.flyTo({ zoom: 15.4, pitch: Math.min(S.vs.pitch, 45) }, 900);
    renderPlacer(); updatePlacingNear();
    navActive('request');
  }
  function exitPlacing() { S.placing = null; app.classList.remove('placing'); $('#placer').hidden = true; navActive('map'); M.render(); }
  function renderPlacer() {
    const P = S.placing; if (!P) return;
    $('#placer-panel').innerHTML = U.placer(S);
    $('#placer-panel').classList.toggle('peek', false);
    const hint = $('#placer-hint');
    hint.hidden = P.step > 2;
    hint.className = 'placer-hint' + (P.step === 1 && S.vs.zoom < 13 ? ' warn' : '');
    hint.textContent = P.step === 1 ? (S.vs.zoom < 13 ? 'ซูมเข้าใกล้ระดับถนนก่อนปักหมุด' : 'เลื่อนแผนที่ให้หมุดตรงจุดที่ควรมีกล้อง') : 'ลากวงทิศทางเพื่อหันกล้อง ดูกรวยมุมมองบนแผนที่';
    $('.placer-target').style.display = P.step === 4 ? 'none' : '';
    if (P.step === 2) bindDial();
    if (P.step === 3) bindForm();
  }
  let nearTimer = null;
  function updatePlacingNear() {
    const P = S.placing; if (!P) return;
    const c = M.pinCoord();
    P.nearby = S.cams.filter(o => Math.abs(o.pos[0] - c[0]) < 0.004 && Math.abs(o.pos[1] - c[1]) < 0.004).map(o => {
      const d = TT.distance(o.pos, c);
      return { cam: o, d, covers: d <= o.range && TT.angleDiff(TT.bearing(o.pos, c), o.heading) <= o.fov / 2 };
    }).filter(n => n.d <= TT.DUP_RADIUS).sort((a, b) => b.covers - a.covers || a.d - b.d);
    if (M.isStreet()) setTimeout(() => M.render(), 0);
    P.nearReqs = S.requests.filter(r => !r.mine && r.status === 'voting').map(r => ({ ...r, d: TT.distance(r.pos, c) })).filter(r => r.d < 250).sort((a, b) => a.d - b.d);
    if (P.step === 1) {
      const el = $('#pl-dup'); if (el) el.innerHTML = U.dup(S);
      const co = $('#pl-coord'); if (co) co.textContent = TT.coord(c);
      const prov = TT.provinceAt(c), pv = $('#pl-prov'); if (pv) pv.textContent = prov ? `จ.${prov.th} · ภาค${prov.region}` : 'อยู่นอกเขตประเทศไทย';
      const nx = $('#pl-next'); if (nx) nx.disabled = S.vs.zoom < 13 || !prov;
      const hint = $('#placer-hint'); hint.className = 'placer-hint' + (S.vs.zoom < 13 ? ' warn' : ''); hint.textContent = S.vs.zoom < 13 ? 'ซูมเข้าใกล้ระดับถนนก่อนปักหมุด' : 'เลื่อนแผนที่ให้หมุดตรงจุดที่ควรมีกล้อง';
    }
  }
  function bindDial() {
    const d = $('#pl-dial'); if (!d) return;
    const set = (h) => {
      const P = S.placing; P.heading = Math.round(((h % 360) + 360) % 360 / 5) * 5 % 360;
      d.innerHTML = U.dialSvg(P); d.setAttribute('aria-valuenow', P.heading);
      $('#pl-head').textContent = P.heading + '°'; $('#pl-dir').textContent = 'ทิศ' + U.dirName(P.heading);
      M.render();
    };
    const fromEvent = e => { const r = d.getBoundingClientRect(); const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; return (Math.atan2(x, -y) * 180) / Math.PI; };
    d.addEventListener('pointerdown', e => { d.setPointerCapture(e.pointerId); set(fromEvent(e)); d.style.cursor = 'grabbing'; });
    d.addEventListener('pointermove', e => { if (d.hasPointerCapture(e.pointerId)) set(fromEvent(e)); });
    d.addEventListener('pointerup', () => { d.style.cursor = ''; });
    d.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { set(S.placing.heading + 5); e.preventDefault(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { set(S.placing.heading - 5); e.preventDefault(); } });
  }
  function bindForm() {
    const P = S.placing;
    const file = $('#pl-file'), up = $('#pl-upload');
    const take = f => { if (!f || !f.type.startsWith('image/')) return; const fr = new FileReader(); fr.onload = () => { P.photo = fr.result; syncForm(); renderPlacer(); }; fr.readAsDataURL(f); };
    file.addEventListener('change', () => take(file.files[0]));
    up.addEventListener('dragover', e => { e.preventDefault(); up.classList.add('drag'); });
    up.addEventListener('dragleave', () => up.classList.remove('drag'));
    up.addEventListener('drop', e => { e.preventDefault(); up.classList.remove('drag'); take(e.dataTransfer.files[0]); });
  }
  function syncForm() {
    const P = S.placing; if (!P || P.step !== 3) return;
    P.title = $('#pl-title').value; P.reason = $('#pl-reason').value; P.contact = $('#pl-contact').value; P.consent = $('#pl-consent').checked;
    const st = $('#pl-stream'); if (st) P.stream = st.value;
  }
  function placeNext() {
    const P = S.placing;
    if (P.step === 1) {
      const c = M.pinCoord();
      P.pos = c; P.prov = TT.provinceAt(c);
      const lm = S.cams.filter(o => o.landmark).map(o => ({ o, d: TT.distance(o.pos, c) })).sort((a, b) => a.d - b.d)[0];
      if (!P.title) P.title = lm && lm.d < 1500 ? `ใกล้${lm.o.name}` : `จุดใหม่ใน จ.${P.prov.th}`;
      if (P.nearby.length) P.heading = Math.round(TT.bearing(c, P.nearby[0].cam.pos) + 180) % 360;
    }
    P.step++; renderPlacer(); M.render();
  }
  function placeSubmit() {
    syncForm(); const P = S.placing;
    const okReason = P.reasonTags.length || P.reason.trim().length >= 10;
    $('#pl-reason-err').hidden = !!okReason; $('#pl-consent-err').hidden = P.consent;
    if (!okReason || !P.consent) { (okReason ? $('#pl-consent') : $('#pl-reason')).focus(); return; }
    const req = {
      id: `REQ-${TT.beYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`, title: P.title.trim() || 'คำขอกล้องใหม่', type: P.type, pos: P.pos,
      prov: P.prov.id, provTh: P.prov.th, city: P.prov.th, reason: [P.reasonTags.join(', '), P.reason.trim()].filter(Boolean).join(' — '),
      votes: 1, status: 'voting', created: Date.now(), days: 0, by: 'คุณ', heading: P.heading, fov: P.fov, range: P.range, kind: P.kind, mine: true, hasPhoto: !!P.photo,
    };
    S.requests.unshift(req); S.reqVersion++;
    TT.store.set('myRequests', S.requests.filter(r => r.mine).map(({ d, days, ...r }) => r));
    computeStats(); renderLayersPanel();
    P.result = req; P.step = 4; renderPlacer(); M.render();
  }

  // ---------- คำขอ ----------
  function openRequests(tab) {
    if (S.placing) exitPlacing();
    S.selected = null; S.selectedProv = null;
    if (tab) S.reqTab = tab;
    $('#panel-requests').innerHTML = U.requests(S);
    setSide('requests');
    $('#panel-requests').classList.toggle('peek', false);
    M.render();
  }
  function refreshRequests() { if (!$('#panel-requests').hidden) { const sc = $('#panel-requests .detail-body'); const top = sc ? sc.scrollTop : 0; $('#panel-requests').innerHTML = U.requests(S); const s2 = $('#panel-requests .detail-body'); if (s2) s2.scrollTop = top; } }
  function vote(id) {
    const r = S.requests.find(x => x.id === id); if (!r || r.mine) return;
    if (S.votes.has(id)) S.votes.delete(id); else {
      S.votes.add(id);
      if (r.votes + 1 >= TT.REQ_TARGET && r.status === 'voting') TT.toast('ครบเสียงโหวตแล้ว คำขอนี้จะถูกส่งต่อหน่วยงาน'); else TT.toast('ขอบคุณที่ช่วยโหวต +5 แต้ม');
    }
    TT.store.set('votes', [...S.votes]); S.reqVersion++; refreshRequests(); M.render();
  }

  // ---------- ทัวร์ ----------
  const TOUR = [
    { t: 'กรุงเทพมหานคร', d: 'ย่านปทุมวัน–สุขุมวิท กล้องหนาแน่นที่สุดของประเทศ เส้นแสงคือกระแสจราจรจำลอง', v: { longitude: 100.5452, latitude: 13.7330, zoom: 14.7, pitch: 64, bearing: 32 } },
    { t: 'เชียงใหม่', d: 'จุดเฝ้าระวังหมอกควันและไฟป่ารอบดอยสุเทพ', v: { longitude: 98.9700, latitude: 18.7930, zoom: 13.9, pitch: 60, bearing: -24 } },
    { t: 'ขอนแก่น', d: 'ศูนย์กลางภาคอีสาน บนถนนมิตรภาพ', v: { longitude: 102.8359, latitude: 16.4400, zoom: 14.2, pitch: 58, bearing: 12 } },
    { t: 'พัทยา', d: 'เมืองท่องเที่ยวชายฝั่งตะวันออก กล้องชายหาดและถนนคนเดิน', v: { longitude: 100.8800, latitude: 12.9250, zoom: 14.2, pitch: 62, bearing: -38 } },
    { t: 'ภูเก็ต', d: 'ไข่มุกอันดามัน กล้องท่องเที่ยวและสะพานสารสิน', v: { longitude: 98.3700, latitude: 7.9300, zoom: 11.4, pitch: 55, bearing: 20 } },
    { t: 'ทั่วประเทศ', d: 'กล้องจำลองกว่า 4,600 ตัว ใน 77 จังหวัด', v: null },
  ];
  let tourIdx = -1, tourTimer = null;
  function startTour() {
    if (S.placing) exitPlacing(); closeDetail(); setView('3d');
    tourIdx = -1; $('#ctrl-tour').classList.add('on'); nextTour();
  }
  function nextTour() {
    tourIdx++;
    if (tourIdx >= TOUR.length) { stopTour(); return; }
    const s = TOUR[tourIdx];
    M.flyTo(s.v || overviewView(), 3600);
    const cap = $('#tour-caption'); cap.hidden = false;
    cap.innerHTML = `<span class="eyebrow">ทัวร์ 3 มิติ · ${tourIdx + 1}/${TOUR.length}</span><h3>${s.t}</h3><p>${s.d}</p><div class="row"><button class="btn btn-ghost" data-act="tour-stop" style="min-height:32px">หยุดทัวร์</button><button class="btn btn-primary" data-act="tour-next" style="min-height:32px">ถัดไป</button></div>`;
    clearTimeout(tourTimer); tourTimer = setTimeout(nextTour, 7600);
  }
  function stopTour() { if (tourIdx < 0) return; tourIdx = -1; clearTimeout(tourTimer); $('#tour-caption').hidden = true; $('#ctrl-tour').classList.remove('on'); }

  // ---------- แถบเวลา ----------
  function renderTimebar() {
    $('#timebar').innerHTML = U.timebar(S);
    $('#time-label').innerHTML = U.timeLabel(S);
    drawTimeCanvas();
    $('#time-range').addEventListener('input', e => setHour(parseFloat(e.target.value)));
  }
  function drawTimeCanvas() {
    const cv = $('#time-canvas'); if (!cv) return;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr; const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const cs = getComputedStyle(root);
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) { const hr = i / 4, x = (hr / 24) * w, y = h - 2 - TT.activity(hr) * (h - 6); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = cs.getPropertyValue('--accent-soft'); ctx.fill();
    const nx = (TT.hourNow() / 24) * w; ctx.fillStyle = cs.getPropertyValue('--bad'); ctx.fillRect(nx - 1, h - 6, 2, 6);
  }
  let lastHourRender = 0;
  function setHour(h) {
    S.hour = h == null ? null : TT.clamp(h, 0, 23.99);
    const lbl = $('#time-label'); if (lbl) lbl.innerHTML = U.timeLabel(S);
    const rg = $('#time-range'); if (rg && h != null && document.activeElement !== rg) rg.value = S.hour;
    if (h == null && rg) rg.value = TT.hourNow();
    const rec = $('#osd-rec'); if (rec) { rec.textContent = S.hour == null ? 'LIVE' : 'บันทึก'; rec.classList.toggle('past', S.hour != null); }
    const now = performance.now();
    if (now - lastHourRender > 120) { lastHourRender = now; M.setHour(); }
  }
  let playRaf = 0;
  function togglePlay() {
    S.playing = !S.playing;
    if (S.playing) {
      if (S.hour == null) S.hour = 0;
      let last = performance.now();
      const step = t => { const dt = (t - last) / 1000; last = t; setHour((S.hour + dt * 1.2) % 24); if (S.playing) playRaf = requestAnimationFrame(step); };
      playRaf = requestAnimationFrame(step);
    } else cancelAnimationFrame(playRaf);
    const b = $('#timebar .play'); b.innerHTML = TT.icon(S.playing ? 'pause' : 'play'); b.setAttribute('aria-label', S.playing ? 'หยุดเล่น' : 'เล่นย้อนดู 24 ชั่วโมง');
  }

  // ---------- อัปเดตล่าสุดของเครือข่ายกล้อง ----------
  const alertRng = TT.rng(Date.now() % 1e6);
  const alerts = [];
  function pushAlert() {
    const a = TT.makeUpdate(S.cams, S.requests, alertRng); if (!a) return;
    alerts.unshift(a); alerts.length = Math.min(alerts.length, 2);
    $('#alerts').innerHTML = `<div class="alerts-title">${TT.icon('clock')}อัปเดตล่าสุด</div>` + alerts.map(U.alert).join('');
  }

  // ---------- ป้ายชื่อบนแผนที่ ----------
  const COUNTRY_POS = { 'เมียนมา': [96.9, 19.8], 'ลาว': [102.7, 19.9], 'กัมพูชา': [104.8, 12.9], 'มาเลเซีย': [101.7, 4.7], 'เวียดนาม': [107.7, 14.6], 'จีน': [101.0, 22.4] };
  const SEAS = [['อ่าวไทย', [101.3, 10.0]], ['ทะเลอันดามัน', [96.6, 9.3]]];
  const labelEls = new Map();
  let labelsDirty = true, lastKey = '';
  function labelEl(id, cls, html) {
    let el = labelEls.get(id);
    if (!el) { el = document.createElement('div'); el.className = 'lbl ' + cls; $('#labels').appendChild(el); labelEls.set(id, el); el._html = null; }
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
    return el;
  }
  function updateLabels() {
    const v = S.vs, key = [v.longitude.toFixed(5), v.latitude.toFixed(5), v.zoom.toFixed(3), v.pitch.toFixed(1), v.bearing.toFixed(1), innerWidth, innerHeight, S.mode, S.selected && S.selected.id, S.statsVersion, S.dark].join('|');
    if (key === lastKey && !labelsDirty) return; lastKey = key; labelsDirty = false;
    if (S.view === 'street') { for (const el of labelEls.values()) el.style.display = 'none'; return; }
    const vp = M.viewport(), z = v.zoom, W = innerWidth, H = innerHeight;
    const cand = [];
    if (z < 7.6) {
      for (const [n, p] of Object.entries(COUNTRY_POS)) cand.push({ id: 'c-' + n, cls: 'country', html: n, p, pr: 1, w: n.length * 9 });
      for (const [n, p] of SEAS) cand.push({ id: 's-' + n, cls: 'country', html: n, p, pr: 1, w: n.length * 9 });
    }
    if (S.mode === 'province') {
      const list = TT_GEO.provinces.map(p => ({ p, s: S.provStats[p.id] })).sort((a, b) => b.s.norm - a.s.norm);
      list.forEach((o, i) => { if (z < 5.9 && i > 10) return; if (z < 6.6 && i > 26) return; cand.push({ id: 'p-' + o.p.id, cls: 'prov', html: `<b>${o.p.th}</b>${TT.fmt(o.s.count)}`, p: o.p.center, zz: M.provHeight(o.s.hNorm), pr: 3 + o.s.norm, w: o.p.th.length * 8 + 10, h: 34 }); });
    } else if (z < 12.6) {
      for (const c of TT.CITIES) {
        if ((c.tier === 2 && z < 6.2) || (c.tier === 3 && z < 7.6) || ((c.id === 'nbi' || c.id === 'spk') && z < 9)) continue;
        cand.push({ id: 'city-' + c.id, cls: 'city t' + c.tier, html: c.th, p: [c.lon, c.lat], pr: 5 - c.tier, w: c.th.length * 8 + 6 });
      }
    }
    if (z >= 14 && S.mode === 'points') {
      const b = M.bounds();
      for (const c of S.filtered) if (c.landmark && c.pos[0] > b[0] && c.pos[0] < b[2] && c.pos[1] > b[1] && c.pos[1] < b[3] && (!S.selected || S.selected.id !== c.id)) cand.push({ id: 'lm-' + c.id, cls: 'landmark', html: TT.esc(c.name), p: c.pos, pr: 2, w: c.name.length * 7 + 16, dy: -12 });
    }
    if (S.selected) cand.push({ id: 'sel', cls: 'sel', html: TT.esc(S.selected.name), p: S.selected.pos, pr: 99, w: S.selected.name.length * 7 + 24, dy: -22 });
    cand.sort((a, b) => b.pr - a.pr);
    const placed = [], seen = new Set();
    for (const c of cand) {
      const [x, y] = vp.project([c.p[0], c.p[1], c.zz || 0]);
      if (x < -60 || y < -40 || x > W + 60 || y > H + 40) continue;
      const hh = (c.h || 20) / 2, box = [x - c.w / 2, y - hh + (c.dy || 0), x + c.w / 2, y + hh + (c.dy || 0)];
      if (c.pr < 99 && placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box); seen.add(c.id);
      const el = labelEl(c.id, c.cls, c.html);
      const anchor = c.cls === 'sel' ? 'translate(-50%, calc(-100% - 22px))' : c.cls === 'landmark' ? 'translate(-50%, calc(-100% - 12px))' : 'translate(-50%, -50%)';
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) ${anchor}`;
      el.style.opacity = 1; el.style.display = '';
    }
    for (const [id, el] of labelEls) if (!seen.has(id)) el.style.display = 'none';
  }

  // ---------- event: แผนที่ ----------
  let placingMoveTimer;
  const H = {
    onView(vs, inter) {
      labelsDirty = true;
      const needle = $('#compass-needle'); if (needle) needle.style.transform = `rotate(${-vs.bearing}deg)`;
      $('#pitch-label').textContent = vs.pitch > 8 ? '3D' : '2D';
      if (inter && (inter.isDragging || inter.isPanning || inter.isRotating || inter.isZooming)) stopTour();
      if (S.placing && S.placing.step <= 2) {
        const pl = $('#placer'); pl.classList.add('moving'); clearTimeout(placingMoveTimer);
        placingMoveTimer = setTimeout(() => pl.classList.remove('moving'), 180);
        clearTimeout(nearTimer); nearTimer = setTimeout(updatePlacingNear, 120);
      }
    },
    onClick(info) {
      const o = info.object, id = info.layer && info.layer.id;
      if (S.placing) { if (info.coordinate && S.placing.step === 1) { const py = M.pinScreen()[1]; centerOn(info.coordinate, {}, [0, innerHeight / 2 - py], 600); } return; }
      if (o && id === 'cam-core') return selectCamera(o);
      if (o && id === 'requests') { openRequests(o.mine ? 'mine' : 'near'); S.activeReq = o.id; refreshRequests(); return; }
      if (o && id === 'provinces' && S.mode === 'province') return selectProvince(o.prov);
      if (o && id === 'hex') return M.flyTo({ longitude: o.position[0], latitude: o.position[1], zoom: Math.min(S.vs.zoom + 2.2, 16) }, 1200);
      if (!o && S.selected) closeDetail();
    },
    afterRender() { updateLabels(); },
  };

  // ---------- event: ปุ่มทั้งหมด (delegation) ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act, v = t.dataset.v;
    switch (a) {
      case 'mode': setMode(v); break;
      case 'view': setView(v); break;
      case 'type': S.types.has(v) ? S.types.delete(v) : S.types.add(v); applyFilters(); renderLayersPanel(); M.refreshCones(); M.render(); break;
      case 'types-all': if (S.types.size === TT.TYPES.length) S.types.clear(); else TT.TYPES.forEach(x => S.types.add(x.key)); applyFilters(); renderLayersPanel(); M.refreshCones(); M.render(); break;
      case 'status': S.statuses.has(v) ? S.statuses.delete(v) : S.statuses.add(v); applyFilters(); renderLayersPanel(); M.refreshCones(); M.render(); break;
      case 'region': M.fitBounds(TT.REGIONS[v], { pitch: 48, maxZoom: 9 }); if (TT.isMobile()) { S.panelOpen = false; renderLayersPanel(); } break;
      case 'toggle': S.toggles[v] = t.checked; M.refreshCones(); M.render(); break;
      case 'close-layers': S.panelOpen = false; renderLayersPanel(); if (TT.isMobile()) navActive('map'); break;
      case 'close-detail': closeDetail(); break;
      case 'close-requests': setSide(null); S.activeReq = null; break;
      case 'cam': { const c = S.camById.get(v); closePalette(); if (S.placing) exitPlacing(); selectCamera(c); break; }
      case 'ptz': { const c = S.selected; c.headingLive = (c.headingLive + parseFloat(v) + 360) % 360; S.ptzAuto = false; if (S.feed) S.feed.pan = TT.clamp(TT.angleDiff(c.headingLive, c.heading) * Math.sign(((c.headingLive - c.heading + 540) % 360) - 180) / 90, -0.5, 0.5); $('#ptz-read').textContent = Math.round(c.headingLive) + '°'; M.render(); break; }
      case 'fullscreen': { const f = $('#feed'); if (f && f.requestFullscreen) f.requestFullscreen().catch(() => TT.toast('อุปกรณ์นี้ไม่รองรับโหมดเต็มจอ')); else TT.toast('อุปกรณ์นี้ไม่รองรับโหมดเต็มจอ'); break; }
      case 'share': TT.copy(`ตาทิพย์ · ${S.selected.name} (${S.selected.id}) ${location.href.split('#')[0]}#cam-${S.selected.id}`, 'คัดลอกลิงก์กล้องแล้ว'); break;
      case 'fav': { const id = S.selected.id; S.favs.has(id) ? S.favs.delete(id) : S.favs.add(id); TT.store.set('favs', [...S.favs]); t.setAttribute('aria-pressed', S.favs.has(id)); t.lastChild.textContent = S.favs.has(id) ? 'ติดตามแล้ว' : 'ติดตาม'; TT.toast(S.favs.has(id) ? 'จะแจ้งเตือนเมื่อกล้องนี้ออฟไลน์หรือกลับมาออนไลน์' : 'เลิกติดตามแล้ว'); break; }
      case 'report': S.reportOpen = !S.reportOpen; { const sc = $('#panel-detail .detail-body').scrollTop; renderDetail(); $('#panel-detail .detail-body').scrollTop = sc; } break;
      case 'copy-coord': TT.copy(`${S.selected.pos[1].toFixed(6)}, ${S.selected.pos[0].toFixed(6)}`, 'คัดลอกพิกัดแล้ว'); break;
      case 'copy-center': TT.copy(`${S.vs.latitude.toFixed(6)}, ${S.vs.longitude.toFixed(6)}`, 'คัดลอกพิกัดแล้ว'); break;
      case 'prov-cams': { const p = TT_GEO.provinces.find(x => x.id === v); S.selectedProv = null; setSide(null); setMode('points'); M.fitBounds(p.bbox, { maxZoom: 11, pitch: 50 }); break; }
      case 'start-request': startPlacing(); break;
      case 'req-tab': S.reqTab = v; refreshRequests(); break;
      case 'req-open': {
        if (e.target.closest('[data-act="vote"]')) break;
        const r = S.requests.find(x => x.id === v); S.activeReq = S.activeReq === v ? null : v; refreshRequests();
        if (r && S.activeReq) centerOn(r.pos, { zoom: Math.max(S.vs.zoom, 15), pitch: 55 }, TT.isMobile() ? [0, innerHeight * 0.26] : [200, 0]);
        break;
      }
      case 'vote': e.stopPropagation(); vote(v); break;
      case 'vote-near': vote(v); exitPlacing(); openRequests('near'); S.activeReq = v; refreshRequests(); break;
      case 'place-cancel': exitPlacing(); break;
      case 'place-next': placeNext(); break;
      case 'place-back': syncForm(); S.placing.step--; renderPlacer(); M.render(); break;
      case 'place-submit': placeSubmit(); break;
      case 'place-done': { const r = S.placing.result; exitPlacing(); openRequests('mine'); S.activeReq = r.id; refreshRequests(); break; }
      case 'share-req': TT.copy(`ช่วยโหวตให้มีกล้องที่ “${S.placing.result.title}” จ.${S.placing.result.provTh} บนตาทิพย์ รหัส ${S.placing.result.id}`, 'คัดลอกข้อความชวนโหวตแล้ว'); break;
      case 'place-search': openPalette('jump'); break;
      case 'place-locate': locate(); break;
      case 'pl-type': S.placing.type = v; renderPlacer(); break;
      case 'pl-kind': S.placing.kind = v; renderPlacer(); break;
      case 'pl-reason': { syncForm(); const P = S.placing; P.reasonTags = P.reasonTags.includes(v) ? P.reasonTags.filter(x => x !== v) : [...P.reasonTags, v]; t.setAttribute('aria-pressed', P.reasonTags.includes(v)); $('#pl-reason-err').hidden = true; break; }
      case 'pal-fill': $('#palette-q').value = v; renderPalette(); $('#palette-q').focus(); break;
      case 'pal-prov': goProvince(v); break;
      case 'pal-city': goCity(v); break;
      case 'play': togglePlay(); break;
      case 'live': if (S.playing) togglePlay(); setHour(null); break;
      case 'tour-next': clearTimeout(tourTimer); nextTour(); break;
      case 'tour-stop': stopTour(); break;
    }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'pl-fov') { S.placing.fov = +t.value; $('#pl-fov-v').textContent = t.value + '°'; $('#pl-dial').innerHTML = U.dialSvg(S.placing); M.render(); }
    if (t.id === 'pl-range') { S.placing.range = +t.value; $('#pl-range-v').textContent = t.value + ' ม.'; $('#pl-dial').innerHTML = U.dialSvg(S.placing); M.render(); }
    if (t.id === 'pl-reason' && t.value.trim().length >= 10) $('#pl-reason-err').hidden = true;
    if (t.id === 'palette-q') renderPalette();
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'report-form') { e.preventDefault(); S.reportOpen = false; renderDetail(); TT.toast('ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลข้อมูล'); }
    if (e.target.id === 'pl-form') e.preventDefault();
  });
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && tag !== 'input' && tag !== 'textarea')) { e.preventDefault(); openPalette(S.placing ? 'jump' : 'search'); return; }
    if (e.key === 'Escape') {
      if (!$('#palette').hidden) return closePalette();
      if (tourIdx >= 0) return stopTour();
      if (S.placing) return exitPlacing();
      if (S.sideOpen) return S.selected || S.selectedProv ? closeDetail() : setSide(null);
    }
    if (!$('#palette').hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const n = palItems().length; if (n) { palSel = (palSel + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; markPal(); } }
    if (!$('#palette').hidden && e.key === 'Enter') { const el = palItems()[palSel]; if (el) { e.preventDefault(); el.click(); } }
    if (e.target.classList && e.target.classList.contains('req') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.click(); }
  });
  document.querySelectorAll('#palette [data-close]').forEach(el => el.addEventListener('click', closePalette));

  $('#search-trigger').addEventListener('click', () => openPalette('search'));
  $('#brand').addEventListener('click', e => { e.preventDefault(); stopTour(); if (S.placing) exitPlacing(); closeDetail(); M.flyTo(overviewView(), 2200); });
  $('#btn-request').addEventListener('click', startPlacing);
  $('#btn-requests').addEventListener('click', () => (!$('#panel-requests').hidden ? setSide(null) : openRequests()));
  $('#btn-layers').addEventListener('click', () => { S.panelOpen = !S.panelOpen; renderLayersPanel(); });
  $('#btn-theme').addEventListener('click', () => { const next = S.dark ? 'light' : 'dark'; root.setAttribute('data-theme', next); TT.store.set('theme', next); themeChanged(); });
  sysDark.addEventListener('change', themeChanged);
  new MutationObserver(() => { if (resolveDark() !== S.dark) themeChanged(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  function themeChanged() { S.dark = resolveDark(); root.setAttribute('data-resolved-theme', S.dark ? 'dark' : 'light'); M.setTheme(); TT.street.setTheme(); renderLayersPanel(); drawTimeCanvas(); labelsDirty = true; }

  $('#ctrl-zoom-in').addEventListener('click', () => M.flyTo({ zoom: Math.min(S.vs.zoom + 1, 17.5) }, 350));
  $('#ctrl-zoom-out').addEventListener('click', () => M.flyTo({ zoom: Math.max(S.vs.zoom - 1, 4) }, 350));
  $('#ctrl-compass').addEventListener('click', () => M.flyTo({ bearing: 0 }, 600));
  $('#ctrl-pitch').addEventListener('click', () => M.flyTo({ pitch: S.vs.pitch > 8 ? 0 : 55 }, 700));
  $('#ctrl-locate').addEventListener('click', locate);
  $('#ctrl-tour').addEventListener('click', () => (tourIdx >= 0 ? stopTour() : startTour()));
  function locate() {
    const fail = () => TT.toast('เข้าถึงตำแหน่งไม่ได้ ลองค้นหาสถานที่หรือเลื่อนแผนที่เองแทน');
    try {
      if (!navigator.geolocation) return fail();
      navigator.geolocation.getCurrentPosition(p => M.flyTo({ longitude: p.coords.longitude, latitude: p.coords.latitude, zoom: 15.5, pitch: 50 }, 2000), fail, { timeout: 6000 });
    } catch (err) { fail(); }
  }
  document.querySelectorAll('#bottom-nav button').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.nav;
    if (k === 'map') { if (S.placing) exitPlacing(); setSide(null); S.selected = null; S.selectedProv = null; S.panelOpen = false; renderLayersPanel(); navActive('map'); M.render(); }
    if (k === 'layers') { if (S.placing) exitPlacing(); setSide(null); S.panelOpen = !S.panelOpen; renderLayersPanel(); navActive(S.panelOpen ? 'layers' : 'map'); }
    if (k === 'request') startPlacing();
    if (k === 'requests') { S.panelOpen = false; renderLayersPanel(); openRequests(); }
    if (k === 'search') openPalette(S.placing ? 'jump' : 'search');
  }));

  // ---------- bottom sheet ลากได้ (มือถือ) ----------
  function sheetDrag(panel, onClose) {
    let y0 = null, dy = 0;
    panel.addEventListener('pointerdown', e => {
      if (!TT.isMobile() || !e.target.closest('[data-drag], .panel-head, .detail-head')) return;
      if (e.target.closest('button, a, input')) return;
      y0 = e.clientY; dy = 0; panel.setPointerCapture(e.pointerId); panel.style.transition = 'none';
    });
    panel.addEventListener('pointermove', e => { if (y0 == null) return; dy = e.clientY - y0; panel.style.setProperty('--drag', Math.max(dy, -40) + 'px'); });
    const end = () => {
      if (y0 == null) return; y0 = null; panel.style.transition = ''; panel.style.setProperty('--drag', '0px');
      if (dy > 110) { if (panel.classList.contains('peek') || panel.id === 'panel-layers' || panel.id === 'panel-requests') onClose(); else panel.classList.add('peek'); }
      else if (dy < -40) panel.classList.remove('peek');
      else if (Math.abs(dy) < 6 && panel.classList.contains('peek')) panel.classList.remove('peek');
    };
    panel.addEventListener('pointerup', end); panel.addEventListener('pointercancel', end);
  }
  sheetDrag($('#panel-detail'), closeDetail);
  sheetDrag($('#panel-requests'), () => setSide(null));
  sheetDrag($('#panel-layers'), () => { S.panelOpen = false; renderLayersPanel(); navActive('map'); });
  sheetDrag($('#placer-panel'), () => $('#placer-panel').classList.add('peek'));

  let resizeT; addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { app.classList.toggle('side-open', S.sideOpen && !TT.isMobile()); drawTimeCanvas(); labelsDirty = true; }, 150); });

  // ---------- เริ่มต้น ----------
  root.setAttribute('data-resolved-theme', S.dark ? 'dark' : 'light');
  M.init(S, H);
  TT.street.init(S, H);
  renderLayersPanel();
  renderTimebar();
  setInterval(() => { if (S.hour == null) { const l = $('#time-label'); if (l) l.innerHTML = U.timeLabel(S); } }, 15000);
  pushAlert(); pushAlert();
  setInterval(pushAlert, 7000);

  const boot = $('#boot');
  let n = 0; const line = $('#boot-line');
  const bootTick = setInterval(() => { n = Math.min(77, n + 9); line.textContent = `กำลังเชื่อมต่อเครือข่ายกล้อง ${n}/77 จังหวัด`; }, 80);
  setTimeout(() => {
    clearInterval(bootTick); boot.classList.add('done');
    M.startIntro();
    if (S.view === 'street') { Object.assign(S.vs, overviewView()); setView('street', true); }
    else M.flyTo(overviewView(), 2600);
    const m = /^#cam-([A-Z0-9-]+)$/.exec(location.hash);
    if (m && S.camById.has(m[1])) setTimeout(() => selectCamera(S.camById.get(m[1])), 2700);
  }, TT.reducedMotion() ? 50 : 950);
})(window.TT);

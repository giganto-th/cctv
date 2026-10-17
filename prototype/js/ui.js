/* ตาทิพย์ — เทมเพลตหน้าจอ (render เป็น HTML string แล้วผูก event ใน app.js ผ่าน data-act) */
(function (TT) {
  'use strict';
  const U = (TT.ui = {});
  const I = TT.icon, esc = TT.esc;
  const DIRS = ['เหนือ', 'ตะวันออกเฉียงเหนือ', 'ตะวันออก', 'ตะวันออกเฉียงใต้', 'ใต้', 'ตะวันตกเฉียงใต้', 'ตะวันตก', 'ตะวันตกเฉียงเหนือ'];
  U.dirName = h => DIRS[Math.round((((h % 360) + 360) % 360) / 45) % 8];
  const typeVar = t => `--c:${TT.TYPE[t].css}`;
  const handle = '<div class="sheet-handle" data-drag aria-hidden="true"></div>';

  // ---------- ชั้นข้อมูล ----------
  U.layers = function (S) {
    const st = S.national;
    const modes = [['points', 'camera', 'จุดกล้อง'], ['hex', 'cube', 'หนาแน่น 3D'], ['province', 'map', 'รายจังหวัด'], ['requests', 'inbox', 'คำขอ']];
    const legend = {
      points: '<div class="attr">แตะจุดเพื่อดูภาพสด ซูมใกล้ระดับถนนเพื่อเห็นกรวยมุมมองของกล้องแต่ละตัว</div>',
      hex: `<div class="legend-ramp" style="background:${TT.map.rampCss()}"></div><div class="legend-scale"><span>กล้องน้อย</span><span>ความสูงเปลี่ยนตามช่วงเวลา</span><span>มาก</span></div>`,
      province: `<div class="legend-ramp" style="background:${TT.map.rampCss()}"></div><div class="legend-scale"><span>0</span><span>กล้องต่อ 100 ตร.กม.</span><span>${TT.fmt(Math.round(st.maxDensity))}</span></div>`,
      requests: `<div class="legend-ramp" style="background:${TT.map.heatCss()}"></div><div class="legend-scale"><span>คำขอน้อย</span><span>ถ่วงน้ำหนักด้วยเสียงโหวต</span><span>มาก</span></div>`,
    }[S.mode];
    const spark = TT.sparkPath(Array.from({ length: 24 }, (_, h) => 92 + Math.sin(h / 3) * 1.5 + Math.cos(h) * 0.6), 120, 18);
    return `${handle}
      <div class="panel-head"><div><div class="eyebrow">ภาพรวมประเทศ · ${TT.thDate(TT.bangkokNow())}</div><h2>ชั้นข้อมูล</h2></div>
        <button class="icon-btn sm" data-act="close-layers" aria-label="ซ่อนชั้นข้อมูล">${I('x')}</button></div>
      <div class="panel-scroll">
        <div class="stats">
          <div class="stat"><b>${TT.fmt(st.total)}</b><span>กล้องในระบบ</span></div>
          <div class="stat"><b>${TT.fmt1(st.onlinePct)}<small>%</small></b><span>ออนไลน์ตอนนี้</span><svg class="spark" viewBox="0 0 120 18" preserveAspectRatio="none"><path d="${spark}" stroke="var(--ok)" stroke-width="1.4"/></svg></div>
          <div class="stat"><b>${TT.fmt(st.voting)}</b><span>คำขอรอชุมชนโหวต</span></div>
          <div class="stat"><b>${st.provinces}<small>/77</small></b><span>จังหวัดที่มีกล้อง</span></div>
        </div>
        <div class="section">
          <div class="section-title"><span class="eyebrow">มุมมองแผนที่</span></div>
          <div class="seg" style="--n:4" role="group" aria-label="มุมมองแผนที่">
            ${modes.map(([k, ic, th]) => `<button type="button" data-act="mode" data-v="${k}" aria-pressed="${S.mode === k}">${I(ic)}<span>${th}</span></button>`).join('')}
          </div>
          ${legend}
        </div>
        <div class="section">
          <div class="section-title"><span class="eyebrow">ประเภทกล้อง</span><button class="chip" style="height:24px" data-act="types-all">${S.types.size === TT.TYPES.length ? 'ล้าง' : 'ทั้งหมด'}</button></div>
          <div class="chips">${TT.TYPES.map(t => `<button type="button" class="chip" style="${typeVar(t.key)}" data-act="type" data-v="${t.key}" aria-pressed="${S.types.has(t.key)}"><i class="dot"></i>${t.th}<span class="count">${TT.fmt(st.byType[t.key] || 0)}</span></button>`).join('')}</div>
        </div>
        <div class="section">
          <span class="eyebrow">สถานะ</span>
          <div class="chips">${Object.entries(TT.STATUS).map(([k, v]) => `<button type="button" class="chip" style="--c:var(--${v.cls})" data-act="status" data-v="${k}" aria-pressed="${S.statuses.has(k)}"><i class="dot"></i>${v.th}<span class="count">${TT.fmt(st.byStatus[k] || 0)}</span></button>`).join('')}</div>
        </div>
        <div class="section">
          <span class="eyebrow">ไปยังภูมิภาค</span>
          <div class="regions">${Object.keys(TT.REGIONS).map(r => `<button type="button" data-act="region" data-v="${r}">${r}</button>`).join('')}</div>
        </div>
        <div class="section">
          <span class="eyebrow">การแสดงผล</span>
          <div>
            ${[['traffic', 'กระแสจราจร (จำลอง)'], ['buildings', 'เมือง 3 มิติ'], ['cones', 'กรวยมุมมองกล้อง'], ['requests', 'หมุดคำขอจากประชาชน']].map(([k, th]) => `<label class="switch">${th}<input type="checkbox" id="tg-${k}" data-act="toggle" data-v="${k}" ${S.toggles[k] ? 'checked' : ''}></label>`).join('')}
          </div>
        </div>
        <p class="attr">${esc(TT_GEO.attribution)} · ตำแหน่งกล้อง สถานะ และค่าวิเคราะห์ทั้งหมดเป็นข้อมูลจำลองเพื่อการออกแบบ</p>
      </div>`;
  };

  U.statStrip = S => `<span class="chip"><b>${TT.fmt(S.national.total)}</b> กล้อง</span><span class="chip"><b>${TT.fmt1(S.national.onlinePct)}%</b> ออนไลน์</span><span class="chip"><b>${S.national.voting}</b> คำขอรอโหวต</span><span class="chip">ข้อมูลจำลอง</span>`;

  // ---------- รายละเอียดกล้อง ----------
  U.detail = function (S, c) {
    const t = TT.TYPE[c.type], st = TT.STATUS[c.status];
    const fav = S.favs.has(c.id);
    const statusPill = c.status === 'offline' ? `<span class="pill bad">ออฟไลน์ ${c.offlineHours} ชม.</span>` : `<span class="pill ${st.cls} ${c.status === 'online' ? 'live' : ''}">${st.th}</span>`;
    const feed = c.status === 'offline'
      ? `<div class="feed"><div class="offline"><b>ไม่มีสัญญาณภาพ</b><span>ขาดการเชื่อมต่อ ${c.offlineHours} ชั่วโมง · แจ้งผู้ดูแลแล้ว</span></div></div>`
      : `<div class="feed" id="feed"><canvas id="feed-canvas" aria-label="ภาพสดจำลองจากกล้อง ${esc(c.name)}"></canvas>
          <i class="bracket tl"></i><i class="bracket tr"></i><i class="bracket bl"></i><i class="bracket br"></i>
          <div class="osd"><div class="r"><span class="rec ${S.hour == null ? '' : 'past'}" id="osd-rec">${S.hour == null ? 'LIVE' : 'บันทึก'}</span><span>${c.id}</span></div>
          <div class="r"><span id="osd-time"></span><span>${c.res} · ${c.fps}fps</span></div></div></div>`;
    const near = S.nearestOf(c, 4);
    return `${handle}
      <div class="detail-head">
        <div class="row"><span class="type-tag" style="${typeVar(c.type)}">${t.th}${c.ptz ? ' · PTZ' : ''}</span>
          <span style="display:flex;gap:6px;align-items:center">${statusPill}<button class="icon-btn sm" data-act="close-detail" aria-label="ปิด">${I('x')}</button></span></div>
        <h2>${esc(c.name)}</h2>
        <div class="sub"><span>${esc(c.city && c.city !== c.provTh ? c.city + ' · ' : '')}จ.${esc(c.provTh)}</span><span class="mono">${c.id}</span></div>
      </div>
      <div class="detail-body">
        ${feed}
        ${c.status === 'offline' ? '' : `<div class="feed-tools">
          <button type="button" class="chip" data-act="ai" aria-pressed="${S.aiOverlay}">${I('sparkle')}AI ตรวจจับ</button>
          ${c.ptz ? `<div class="ptz" role="group" aria-label="หมุนกล้อง"><button type="button" data-act="ptz" data-v="-15" aria-label="หมุนซ้าย">${I('chev-l')}</button><span id="ptz-read">${Math.round(c.headingLive ?? c.heading)}°</span><button type="button" data-act="ptz" data-v="15" aria-label="หมุนขวา">${I('chev-r')}</button></div>` : ''}
          <span class="grow"></span>
          <button type="button" class="icon-btn sm" data-act="fullscreen" aria-label="เต็มจอ">${I('expand')}</button>
        </div>`}
        <div class="privacy-note">${I('eye')}<span>ระบบเบลอใบหน้าและป้ายทะเบียนอัตโนมัติก่อนเผยแพร่ ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)</span></div>
        <div>
          <div class="section-title" style="margin-bottom:8px"><span class="eyebrow">วิเคราะห์โดย AI · ${TT.hhmm(S.hourView())} น.</span></div>
          <div class="insights" id="insights">${U.insights(S, c)}</div>
        </div>
        <div class="actions">
          <a href="https://www.google.com/maps/search/?api=1&query=${c.pos[1].toFixed(6)},${c.pos[0].toFixed(6)}" target="_blank" rel="noopener">${I('nav')}นำทาง</a>
          <button type="button" data-act="share">${I('share')}แชร์</button>
          <button type="button" data-act="fav" aria-pressed="${fav}">${I('star')}${fav ? 'ติดตามแล้ว' : 'ติดตาม'}</button>
          <button type="button" data-act="report" aria-expanded="${!!S.reportOpen}">${I('flag')}รายงาน</button>
        </div>
        ${S.reportOpen ? `<form class="report" id="report-form">
          <b style="font-size:var(--fs-sm)">แจ้งปัญหาของกล้องนี้</b>
          ${['ภาพไม่ขึ้น หรือภาพค้าง', 'ตำแหน่งบนแผนที่ไม่ถูกต้อง', 'ทิศทางกล้องไม่ตรงกับที่แสดง', 'ภาพละเมิดความเป็นส่วนตัว'].map((o, i) => `<label><input type="radio" name="rp" id="rp-${i}" value="${i}" ${i === 0 ? 'checked' : ''}>${o}</label>`).join('')}
          <button class="btn btn-primary" type="submit">ส่งรายงาน</button></form>` : ''}
        <dl class="kv">
          <dt>หน่วยงานเจ้าของ</dt><dd>${esc(c.agency)}</dd>
          <dt>ทิศทาง / มุมกว้าง</dt><dd>${U.dirName(c.heading)} ${c.heading}° · ${c.fov}°</dd>
          <dt>คุณภาพสัญญาณ</dt><dd>${c.res} · ${c.codec} · ${c.fps}fps</dd>
          <dt>ความพร้อมใช้งาน 30 วัน</dt><dd>${TT.fmt1(c.uptime)}%</dd>
          <dt>ติดตั้งเมื่อ</dt><dd>พ.ศ. ${c.installed}</dd>
          <dt>พิกัด</dt><dd><button class="mono" data-act="copy-coord" style="text-decoration:underline dotted;font-size:.75rem">${TT.coord(c.pos)}</button></dd>
        </dl>
        <div>
          <div class="eyebrow" style="margin-bottom:6px">กล้องใกล้เคียง</div>
          <div class="nearby">${near.map(n => `<button type="button" data-act="cam" data-v="${n.cam.id}" style="${typeVar(n.cam.type)}"><i class="sw"></i><span>${esc(n.cam.name)}</span><span class="d">${TT.dist(n.d)}</span></button>`).join('')}</div>
        </div>
      </div>`;
  };

  U.insights = function (S, c) {
    const h = S.hourView(), m = TT.metrics(c, h), f = S.feed && S.feed.stats || {};
    const trend = (fn, color) => {
      const vals = Array.from({ length: 49 }, (_, i) => fn(TT.metrics(c, i / 2)));
      const p = TT.sparkPath(vals, 300, 44, 4), x = (h / 24) * 300;
      return `<svg class="trend" viewBox="0 0 300 44" preserveAspectRatio="none" aria-hidden="true"><path d="${p} L300,44 L0,44 Z" fill="${color}" fill-opacity=".12" stroke="none"/><path d="${p}" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/><line x1="${x}" x2="${x}" y1="0" y2="44" stroke="var(--fg-3)" stroke-dasharray="2 3" vector-effect="non-scaling-stroke"/></svg>
        <div class="legend-scale"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>`;
    };
    const card = (k, v, extra = '', cls = '', icon = 'sparkle') => `<div class="insight ${cls}"><span class="k">${I(icon)}${k}</span><span class="v">${v}</span>${extra}</div>`;
    if (c.type === 'haze') {
      const [lab, col] = TT.pmLabel(m.pm25);
      return card('PM2.5', `${m.pm25}<small>µg/m³</small>`, `<span style="font-size:.75rem;color:${col};font-weight:600">${lab}</span>`) +
        card('จุดความร้อนรอบ 5 กม.', `${Math.max(0, Math.round((m.pm25 - 40) / 18))}<small>จุด</small>`, '<span class="muted" style="font-size:.75rem">จากภาพ + ดาวเทียม</span>', '', 'alert') +
        card('แนวโน้ม PM2.5 วันนี้', '', trend(x => x.pm25, 'var(--t-haze)'), 'wide', 'clock');
    }
    if (c.type === 'flood') {
      const cls = m.water > 25 ? 'bad' : m.water > 10 ? 'warn' : 'ok';
      return card('ระดับน้ำบนผิวถนน', `${m.water}<small>ซม.</small>`, `<div class="meter" style="--c:var(--${cls})"><i style="width:${TT.clamp(m.water / 60 * 100, 2, 100)}%"></i></div>`) +
        card('โอกาสฝนตก 1 ชม.', `${Math.round(m.rain * 100)}<small>%</small>`, '<span class="muted" style="font-size:.75rem">ร่วมกับเรดาร์ฝน</span>', '', 'clock') +
        card('ระดับน้ำ 24 ชม.', '', trend(x => x.water, 'var(--t-flood)'), 'wide', 'clock');
    }
    if (c.type === 'tourism') {
      return card('ความหนาแน่นผู้คน', `${Math.round(m.crowd * 100)}<small>%</small>`, `<div class="meter" style="--c:var(--t-tourism)"><i style="width:${m.crowd * 100}%"></i></div>`) +
        card('ตรวจพบในภาพ', `${TT.fmt(f.person ?? Math.round(m.crowd * 30))}<small>คน</small>`, f.boat ? `<span class="muted" style="font-size:.75rem">เรือ ${f.boat} ลำ</span>` : '', '', 'eye') +
        card('ความหนาแน่นตลอดวัน', '', trend(x => x.crowd, 'var(--t-tourism)'), 'wide', 'clock');
    }
    const [lab, cls] = TT.congestionLabel(m.congestion);
    const det = ['car', 'moto', 'bus', 'person'].map(k => `${{ car: 'รถยนต์', moto: 'จยย.', bus: 'รถโดยสาร', person: 'คน' }[k]} ${f[k] ?? 0}`).join(' · ');
    return card('สภาพจราจร', `${Math.round(m.congestion * 100)}<small>% ${lab}</small>`, `<div class="meter" style="--c:var(--${cls})"><i style="width:${m.congestion * 100}%"></i></div>`) +
      card('ยานพาหนะต่อชั่วโมง', `${TT.fmt(m.vehicles)}<small>คัน</small>`, '<span class="muted" style="font-size:.75rem">นับโดย AI จากภาพ</span>', '', 'camera') +
      card('ตรวจพบในภาพตอนนี้', `<span style="font-size:.95rem">${det}</span>`, '', 'wide', 'eye') +
      card('แนวโน้มความหนาแน่น 24 ชม.', '', trend(x => x.congestion, 'var(--t-traffic)'), 'wide', 'clock');
  };

  // ---------- สรุปจังหวัด ----------
  U.province = function (S, p) {
    const s = S.provStats[p.id];
    const rows = TT.TYPES.map(t => [t, s.byType[t.key] || 0]).filter(r => r[1]).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...rows.map(r => r[1]), 1);
    const reqs = S.requests.filter(r => r.prov === p.id && r.status === 'voting').length;
    const rank = Object.values(S.provStats).filter(o => o.density > s.density).length + 1;
    const gap = s.density < S.national.medianDensity;
    return `${handle}
      <div class="detail-head"><div class="row"><span class="eyebrow">ภาค${p.region} · ${TT.fmt(p.area)} ตร.กม.</span><button class="icon-btn sm" data-act="close-detail" aria-label="ปิด">${I('x')}</button></div>
        <h2>จังหวัด${p.th}</h2><div class="sub"><span>${p.en}</span><span>อันดับความหนาแน่นที่ ${rank} จาก 77</span></div></div>
      <div class="detail-body">
        <div class="stats"><div class="stat"><b>${TT.fmt(s.count)}</b><span>กล้องทั้งหมด</span></div><div class="stat"><b>${TT.fmt1(s.onlinePct)}<small>%</small></b><span>ออนไลน์</span></div>
          <div class="stat"><b>${TT.fmt1(s.density)}</b><span>กล้องต่อ 100 ตร.กม.</span></div><div class="stat"><b>${reqs}</b><span>คำขอรอโหวต</span></div></div>
        <div class="pal-ai"><div class="h">${I('sparkle')}สรุปโดย AI</div><p>${gap ? `ความหนาแน่นกล้องของ${p.th}ต่ำกว่าค่ากลางประเทศ จุดที่ประชาชนขอเพิ่มมากที่สุดคือ${reqs ? 'ทางแยกและพื้นที่ชุมชน' : 'ถนนสายหลักระหว่างอำเภอ'} ควรจัดลำดับติดตั้งตามคะแนนโหวต` : `${p.th}มีกล้องครอบคลุมดีกว่าค่ากลางประเทศ กล้องส่วนใหญ่เป็นประเภท${rows[0] ? rows[0][0].th : ''} ควรเน้นดูแลกล้องที่ออฟไลน์ ${TT.fmt(s.count - s.online)} ตัวให้กลับมาใช้งาน`}</p></div>
        <div class="section"><span class="eyebrow">สัดส่วนตามประเภท</span>
          ${rows.map(([t, n]) => `<div style="display:grid;grid-template-columns:110px 1fr 44px;gap:10px;align-items:center;font-size:var(--fs-sm)"><span>${t.th}</span><div class="meter" style="--c:${t.css};height:7px"><i style="width:${(n / max) * 100}%"></i></div><span class="mono" style="text-align:right;font-size:.75rem">${TT.fmt(n)}</span></div>`).join('')}
        </div>
        <button class="btn btn-primary btn-block" data-act="prov-cams" data-v="${p.id}">${I('camera')}ดูกล้องทั้งหมดใน${p.th}</button>
      </div>`;
  };

  // ---------- คำขอ ----------
  U.requests = function (S) {
    const tab = S.reqTab;
    const mine = S.requests.filter(r => r.mine);
    const center = [S.vs.longitude, S.vs.latitude];
    let list = tab === 'mine' ? mine : S.requests.filter(r => !r.mine).sort((a, b) => TT.distance(a.pos, center) - TT.distance(b.pos, center));
    const pts = mine.length * 50 + S.votes.size * 5 + 120;
    const lv = 1 + Math.floor(pts / 150);
    return `${handle}
      <div class="panel-head"><div><div class="eyebrow">ชุมชนร่วมออกแบบเมือง</div><h2>คำขอปักหมุดกล้อง</h2></div><button class="icon-btn sm" data-act="close-requests" aria-label="ปิด">${I('x')}</button></div>
      <div style="padding:0 16px 12px"><div class="profile"><span class="avatar">คุณ</span><div><b style="font-size:var(--fs-sm)">ผู้พิทักษ์ชุมชน · Lv.${lv}</b><div class="meter" style="margin-top:6px"><i style="width:${(pts % 150) / 1.5}%"></i></div><small class="muted" style="font-size:.75rem">${pts} แต้ม · ขอปักหมุด ${mine.length} · โหวต ${S.votes.size}</small></div>
        <button class="btn btn-primary" data-act="start-request" style="min-height:34px;padding:0 12px">${I('plus')}ขอใหม่</button></div></div>
      <div class="tabs" role="tablist"><button role="tab" data-act="req-tab" data-v="near" aria-selected="${tab !== 'mine'}">ใกล้มุมมองนี้</button><button role="tab" data-act="req-tab" data-v="mine" aria-selected="${tab === 'mine'}">ของฉัน (${mine.length})</button></div>
      <div class="detail-body"><div class="req-list">
        ${list.length ? list.slice(0, 30).map(r => U.reqItem(S, r)).join('') : `<div class="empty">${I('pin')}<span>ยังไม่มีคำขอของคุณ<br>เห็นจุดเสี่ยงที่ควรมีกล้อง? ปักหมุดให้ชุมชนช่วยโหวตได้เลย</span><button class="btn btn-primary" data-act="start-request">${I('plus')}ขอปักหมุดกล้อง</button></div>`}
      </div></div>`;
  };
  U.reqItem = function (S, r) {
    const voted = S.votes.has(r.id), votes = r.votes + (voted && !r.mine ? 1 : 0);
    const [stTh, stCls] = TT.REQ_STATUS[r.status];
    const open = S.activeReq === r.id;
    const stepIdx = Math.max(0, TT.REQ_STEPS.findIndex(s => s[0] === r.status));
    return `<div class="req ${open ? 'active' : ''}" data-act="req-open" data-v="${r.id}" role="button" tabindex="0">
      <div class="top"><span class="type-tag" style="${typeVar(r.type)}">${TT.TYPE[r.type].th}</span><span class="pill ${stCls}">${stTh}</span></div>
      <h4>${esc(r.title)}</h4>
      <div class="meta"><span>จ.${esc(r.provTh)}</span><span>${TT.ago(r.days)}</span><span>โดย ${esc(r.by)}</span><span class="mono">${r.id}</span></div>
      ${open ? `<p style="margin:0;font-size:var(--fs-sm)">“${esc(r.reason)}”</p><ul class="timeline">${TT.REQ_STEPS.map((s, i) => `<li class="${r.status === 'rejected' ? (i < 2 ? 'done' : '') : i < stepIdx ? 'done' : i === stepIdx ? 'now' : ''}">${s[1]}<small>${s[2]}</small></li>`).join('')}</ul>` : ''}
      ${r.status === 'voting' ? `<div class="vote-row"><div class="meter"><i style="width:${Math.min(100, (votes / TT.REQ_TARGET) * 100)}%"></i></div><span class="mono" style="font-size:.75rem;color:var(--fg-3)">${votes}/${TT.REQ_TARGET}</span>
        ${r.mine ? '' : `<button type="button" class="vote-btn" data-act="vote" data-v="${r.id}" aria-pressed="${voted}" aria-label="โหวตสนับสนุน">${I('up')}${voted ? 'โหวตแล้ว' : 'โหวต'}</button>`}</div>` : ''}
    </div>`;
  };

  // ---------- ขั้นตอนปักหมุด ----------
  U.placer = function (S) {
    const P = S.placing, c = TT.map.pinCoord();
    const prov = TT.provinceAt(c);
    const steps = `<div class="steps" aria-label="ขั้นที่ ${Math.min(P.step, 3)} จาก 3">${[1, 2, 3].map(i => `<i class="${i <= P.step ? 'on' : ''}"></i>`).join('')}</div>`;
    const titles = { 1: 'เลือกตำแหน่ง', 2: 'ทิศทางและมุมมอง', 3: 'รายละเอียดคำขอ', 4: 'ส่งคำขอแล้ว' };
    let body = '', foot = '';
    if (P.step === 1) {
      body = `<div class="coord-box"><div><div class="mono" id="pl-coord">${TT.coord(c)}</div><small class="muted" id="pl-prov">${prov ? 'จ.' + prov.th + ' · ภาค' + prov.region : 'อยู่นอกเขตประเทศไทย'}</small></div>
          <button class="icon-btn sm" data-act="copy-center" aria-label="คัดลอกพิกัด">${I('copy')}</button></div>
        <div id="pl-dup">${U.dup(S)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-act="place-search">${I('search')}ค้นหาสถานที่</button><button class="btn btn-ghost" data-act="place-locate">${I('locate')}ตำแหน่งของฉัน</button></div>`;
      foot = `<button class="btn btn-ghost" data-act="place-cancel">ยกเลิก</button><button class="btn btn-primary" data-act="place-next" id="pl-next" ${S.vs.zoom < 13 || !prov ? 'disabled' : ''}>ถัดไป</button>`;
    } else if (P.step === 2) {
      body = `<div class="field"><span class="lab">ประเภทกล้องที่ต้องการ</span><div class="chips">${TT.TYPES.map(t => `<button type="button" class="chip" style="${typeVar(t.key)}" data-act="pl-type" data-v="${t.key}" aria-pressed="${P.type === t.key}"><i class="dot"></i>${t.th}</button>`).join('')}</div></div>
        <div class="dial-wrap"><div class="dial" id="pl-dial" role="slider" tabindex="0" aria-label="ทิศทางกล้อง" aria-valuemin="0" aria-valuemax="359" aria-valuenow="${P.heading}">${U.dialSvg(P)}</div>
          <div style="display:grid;gap:4px"><span class="eyebrow">หันไปทาง</span><b class="num" style="font-size:1.6rem" id="pl-head">${P.heading}°</b><span id="pl-dir" class="muted" style="font-size:var(--fs-sm)">ทิศ${U.dirName(P.heading)}</span><small class="muted" style="font-size:.75rem">ลากวงกลม หรือกดลูกศรซ้าย/ขวา</small></div></div>
        <div class="field"><label for="pl-fov">มุมกว้างของภาพ <span class="muted" id="pl-fov-v">${P.fov}°</span></label><input type="range" id="pl-fov" min="30" max="120" step="5" value="${P.fov}" data-act="pl-fov"></div>
        <div class="field"><label for="pl-range">ระยะมองเห็น <span class="muted" id="pl-range-v">${P.range} ม.</span></label><input type="range" id="pl-range" min="20" max="250" step="10" value="${P.range}" data-act="pl-range"></div>
        <div class="field"><span class="lab">กล้องตัวนี้</span><div class="seg" style="--n:2"><button type="button" data-act="pl-kind" data-v="new" aria-pressed="${P.kind === 'new'}">ขอให้ติดตั้งใหม่</button><button type="button" data-act="pl-kind" data-v="share" aria-pressed="${P.kind === 'share'}">มีอยู่แล้ว ขอแชร์ภาพ</button></div></div>`;
      foot = `<button class="btn btn-ghost" data-act="place-back">ย้อนกลับ</button><button class="btn btn-primary" data-act="place-next">ถัดไป</button>`;
    } else if (P.step === 3) {
      body = `<form id="pl-form" class="placer-form" novalidate style="display:grid;gap:14px">
        <div class="field"><label for="pl-title">ชื่อจุดที่ขอ</label><input type="text" id="pl-title" maxlength="80" value="${esc(P.title)}" placeholder="เช่น ทางม้าลายหน้าโรงเรียนวัดใหม่"></div>
        <div class="field"><span class="lab">ทำไมจุดนี้ควรมีกล้อง</span><div class="chips">${TT.QUICK_REASONS.map(q => `<button type="button" class="chip" data-act="pl-reason" data-v="${esc(q)}" aria-pressed="${P.reasonTags.includes(q)}">${q}</button>`).join('')}</div>
          <textarea id="pl-reason" maxlength="500" placeholder="เล่าเหตุการณ์หรือปัญหาที่พบ เพื่อช่วยหน่วยงานตัดสินใจ">${esc(P.reason)}</textarea><span class="err" id="pl-reason-err" hidden>เลือกเหตุผลหรือเขียนอธิบายอย่างน้อย 10 ตัวอักษร</span></div>
        ${P.kind === 'share' ? `<div class="field"><label for="pl-stream">ลิงก์สตรีม <span class="muted">RTSP / HLS ไม่บังคับ</span></label><input type="url" id="pl-stream" placeholder="rtsp://" value="${esc(P.stream)}"></div>` : ''}
        <div class="field"><span class="lab">รูปถ่ายหน้างาน <span class="muted">ไม่บังคับ</span></span>
          <label class="upload" id="pl-upload">${P.photo ? `<img src="${P.photo}" alt="รูปที่แนบ">` : `${I('image')}<span>แตะเพื่อเลือกรูป หรือลากไฟล์มาวาง<br><small class="muted">ระบบจะเบลอใบหน้าก่อนเผยแพร่</small></span>`}<input type="file" id="pl-file" accept="image/*"></label></div>
        <div class="field"><label for="pl-contact">ช่องทางติดต่อกลับ <span class="muted">ไม่บังคับ ไม่เปิดเผยต่อสาธารณะ</span></label><input type="tel" id="pl-contact" value="${esc(P.contact)}" placeholder="เบอร์โทรหรือ LINE ID"></div>
        <label class="consent"><input type="checkbox" id="pl-consent" ${P.consent ? 'checked' : ''}>ยินยอมให้เผยแพร่ตำแหน่งและเหตุผลของคำขอนี้ต่อสาธารณะ โดยไม่แสดงข้อมูลติดต่อ ตามนโยบายความเป็นส่วนตัว</label>
        <span class="err" id="pl-consent-err" hidden>ต้องยินยอมก่อนส่งคำขอ</span></form>`;
      foot = `<button class="btn btn-ghost" data-act="place-back">ย้อนกลับ</button><button class="btn btn-primary" data-act="place-submit">${I('check')}ส่งคำขอ</button>`;
    } else {
      const r = P.result;
      body = `<div class="success"><span class="badge-ok">${I('check')}</span><h3>ได้รับคำขอของคุณแล้ว</h3><span class="code">${r.id}</span>
        <p class="muted" style="margin:0;font-size:var(--fs-sm)">หมุดของคุณขึ้นบนแผนที่แล้ว เมื่อมีผู้โหวตครบ ${TT.REQ_TARGET} เสียง ระบบจะส่งต่อหน่วยงานที่ดูแลพื้นที่ จ.${esc(r.provTh)} ให้อัตโนมัติ</p>
        <ul class="timeline">${TT.REQ_STEPS.map((s, i) => `<li class="${i === 0 ? 'done' : i === 1 ? 'now' : ''}">${s[1]}<small>${s[2]}</small></li>`).join('')}</ul></div>`;
      foot = `<button class="btn btn-ghost" data-act="share-req">${I('share')}ชวนเพื่อนโหวต</button><button class="btn btn-primary" data-act="place-done">กลับสู่แผนที่</button>`;
    }
    return `${handle}<div class="panel-head"><div><div class="eyebrow">ขอปักหมุดกล้องใหม่${P.step < 4 ? ` · ขั้นที่ ${P.step}/3` : ''}</div><h2>${titles[P.step]}</h2></div>${P.step < 4 ? `<button class="icon-btn sm" data-act="place-cancel" aria-label="ยกเลิก">${I('x')}</button>` : ''}</div>
      ${P.step < 4 ? steps : ''}<div class="placer-body">${body}</div><div class="placer-foot">${foot}</div>`;
  };
  U.dialSvg = function (P) {
    const cx = 74, cy = 74, r = 62, rad = d => ((d - 90) * Math.PI) / 180;
    const pt = (d, rr) => [cx + rr * Math.cos(rad(d)), cy + rr * Math.sin(rad(d))];
    const a0 = P.heading - P.fov / 2, a1 = P.heading + P.fov / 2, rr = 20 + (P.range / 250) * 34;
    const [x0, y0] = pt(a0, rr), [x1, y1] = pt(a1, rr), [kx, ky] = pt(P.heading, r);
    let ticks = '';
    for (let d = 0; d < 360; d += 15) { const [ax, ay] = pt(d, r - (d % 90 ? 4 : 8)), [bx, by] = pt(d, r); ticks += `<line class="tick" x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/>`; }
    const lab = [['N', 0, 'n'], ['E', 90, ''], ['S', 180, ''], ['W', 270, '']].map(([t, d, c]) => { const [x, y] = pt(d, r - 17); return `<text class="cardinal ${c}" x="${x}" y="${y}">${t}</text>`; }).join('');
    return `<svg viewBox="0 0 148 148"><circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/>${ticks}${lab}
      <path class="cone" d="M${cx},${cy} L${x0},${y0} A${rr},${rr} 0 ${P.fov > 180 ? 1 : 0} 1 ${x1},${y1} Z"/><circle class="center" cx="${cx}" cy="${cy}" r="3.5"/><circle class="knob" cx="${kx}" cy="${ky}" r="8"/></svg>`;
  };
  U.dup = function (S) {
    const P = S.placing; if (!P) return '';
    if (S.vs.zoom < 13) return `<div class="dup"><div class="h">${I('search')}ซูมเข้าใกล้ระดับถนนเพื่อปักหมุดให้แม่นยำ</div><span class="muted">ระบบจะตรวจหากล้องซ้ำในรัศมี ${TT.DUP_RADIUS} ม. ให้อัตโนมัติ</span></div>`;
    const near = P.nearby || [], cover = near.filter(n => n.covers), reqs = P.nearReqs || [];
    let html = '';
    if (cover.length) html += `<div class="dup warn"><div class="h">${I('alert')}จุดนี้อยู่ในมุมมองของกล้อง ${cover.length} ตัวแล้ว</div><ul>${cover.slice(0, 3).map(n => `<li><span>${esc(n.cam.name)}</span><span>${TT.dist(n.d)}</span></li>`).join('')}</ul>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-act="cam" data-v="${cover[0].cam.id}" style="min-height:32px">ดูภาพกล้องนี้</button></div><span class="muted" style="font-size:.75rem">ยังส่งคำขอได้ หากต้องการมุมมองที่ต่างออกไป</span></div>`;
    else if (near.length) html += `<div class="dup"><div class="h">${I('camera')}มีกล้อง ${near.length} ตัวใกล้เคียง แต่ยังมองไม่เห็นจุดนี้</div><ul>${near.slice(0, 3).map(n => `<li><span>${esc(n.cam.name)}</span><span>${TT.dist(n.d)}</span></li>`).join('')}</ul></div>`;
    else html += `<div class="dup ok"><div class="h">${I('check')}ยังไม่มีกล้องในรัศมี ${TT.DUP_RADIUS} ม.</div><span class="muted">จุดนี้เป็นช่องว่างของการครอบคลุม ขอเพิ่มได้เลย</span></div>`;
    if (reqs.length) { const q = reqs[0]; html += `<div class="dup"><div class="h">${I('inbox')}มีคนขอจุดใกล้เคียงไว้แล้ว</div><span>“${esc(q.title)}” ห่าง ${TT.dist(q.d)} มี ${q.votes} เสียง ร่วมโหวตแทนเพื่อให้ผ่านเร็วขึ้น</span><div><button class="btn btn-ghost" data-act="vote-near" data-v="${q.id}" style="min-height:32px">${I('up')}โหวตคำขอนี้แทน</button></div></div>`; }
    return html;
  };

  // ---------- ค้นหา / AI ----------
  U.paletteEmpty = function (S) {
    const sug = ['กล้องจราจรที่รถติดตอนนี้ในกรุงเทพ', 'จุดเฝ้าระวังน้ำท่วมที่ระดับน้ำสูง', 'ค่าฝุ่น PM2.5 สูงในภาคเหนือ', 'กล้องชายหาดภูเก็ตที่คนเยอะ', 'กล้องที่ออฟไลน์ในเชียงใหม่'];
    const pops = ['bkk', 'cmi', 'pkt', 'kkn', 'cbi', 'ska'].map(id => TT_GEO.provinces.find(p => p.id === id));
    const recent = S.recent.slice(0, 4);
    return `<div class="pal-group eyebrow">ลองถาม AI ด้วยภาษาไทย</div><div class="suggest">${sug.map(s => `<button type="button" class="chip" data-act="pal-fill" data-v="${esc(s)}">${I('sparkle')}${s}</button>`).join('')}</div>
      ${recent.length ? `<div class="pal-group eyebrow">ค้นหาล่าสุด</div><div class="suggest">${recent.map(s => `<button type="button" class="chip" data-act="pal-fill" data-v="${esc(s)}">${I('clock')}${esc(s)}</button>`).join('')}</div>` : ''}
      <div class="pal-group eyebrow">จังหวัดยอดนิยม</div><div class="suggest">${pops.map(p => `<button type="button" class="chip" data-act="pal-prov" data-v="${p.id}">${p.th}</button>`).join('')}</div>`;
  };
  U.paletteResults = function (S, q, res) {
    let html = '';
    const direct = res.provs.length + res.cities.length + res.cams.length > 0;
    const aiBlock = () => {
      if (!res.ai) return '';
      let html = '';
      const a = res.ai;
      html += `<div class="pal-ai"><div class="h">${I('sparkle')}คำตอบจาก AI · ข้อมูล ${TT.hhmm(S.hourView())} น.</div><p>${a.summary}</p>
        ${a.items.length ? `<div style="display:grid;gap:2px">${a.items.slice(0, 4).map(it => `<button type="button" class="pal-item" data-act="cam" data-v="${it.cam.id}" style="${typeVar(it.cam.type)}"><span class="ic">${I('camera')}</span><span><b>${esc(it.cam.name)}</b><small>จ.${esc(it.cam.provTh)} · ${it.note}</small></span><span class="go">ดู</span></button>`).join('')}</div>` : ''}
        ${a.items.length ? `<div class="row"><button class="btn btn-primary" data-act="ai-apply" style="min-height:34px">${I('map')}แสดงทั้งหมดบนแผนที่ (${TT.fmt(a.items.length)})</button></div>` : ''}</div>`;
      return html;
    };
    // ถ้าพิมพ์ตรงกับชื่อสถานที่/กล้อง ให้ผลตรงขึ้นก่อน คำตอบ AI ตามหลัง
    if (!direct) html += aiBlock();
    const group = (title, items) => (items.length ? `<div class="pal-group eyebrow">${title}</div>${items.join('')}` : '');
    html += group('จังหวัด', res.provs.map(p => `<button type="button" class="pal-item" role="option" data-act="pal-prov" data-v="${p.id}"><span class="ic">${I('map')}</span><span><b>${p.th}</b><small>ภาค${p.region} · ${TT.fmt(S.provStats[p.id].count)} กล้อง</small></span><span class="go">ไป ↵</span></button>`));
    html += group('เมืองและพื้นที่', res.cities.map(c => `<button type="button" class="pal-item" role="option" data-act="pal-city" data-v="${c.id}"><span class="ic">${I('pin')}</span><span><b>${c.th}</b><small>${TT.fmt(c.n)}+ กล้องในตัวเมือง</small></span><span class="go">ไป ↵</span></button>`));
    html += group('กล้อง', res.cams.map(c => `<button type="button" class="pal-item" role="option" data-act="cam" data-v="${c.id}" style="${typeVar(c.type)}"><span class="ic">${I('camera')}</span><span><b>${esc(c.name)}</b><small>${TT.TYPE[c.type].th} · จ.${esc(c.provTh)} · <span class="mono">${c.id}</span></small></span><span class="go">ดู ↵</span></button>`));
    if (direct) html += aiBlock();
    if (!html) html = `<div class="empty">${I('search')}<span>ไม่พบ “${esc(q)}”<br>ลองพิมพ์ชื่อจังหวัด ชื่อแยก หรือรหัสกล้อง เช่น BKK-TRF-0001</span></div>`;
    return html;
  };

  // ---------- แถบเวลา ----------
  U.timebar = S => `<button type="button" class="play" data-act="play" aria-label="${S.playing ? 'หยุดเล่น' : 'เล่นย้อนดู 24 ชั่วโมง'}">${I(S.playing ? 'pause' : 'play')}</button>
    <div class="time-track"><canvas id="time-canvas" aria-hidden="true"></canvas><input type="range" id="time-range" min="0" max="23.75" step="0.25" value="${S.hourView()}" aria-label="เลือกช่วงเวลา"><div class="time-ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div></div>
    <div class="time-label" id="time-label"></div>`;
  U.timeLabel = S => (S.hour == null ? `<span class="live">สด</span><b>${TT.hhmm(TT.hourNow())}</b>` : `<b>${TT.hhmm(S.hour)} น.</b><button type="button" data-act="live">กลับสู่สด</button>`);

  U.alert = a => `<button type="button" class="alert" data-act="cam" data-v="${a.cam.id}" style="--c:${TT.TYPE[a.type].css}"><span class="ic">${I(a.icon)}</span><span><b>${esc(a.msg)}</b><small>${esc(a.cam.name)} · ${TT.hhmm(TT.hourNow())}</small></span></button>`;
})(window.TT);

/* ตาทิพย์ — ภาพสดจำลองจากกล้อง (วาดด้วย canvas ล้วน ไม่มีวิดีโอจริง)
   แสดงแนวคิด: ภาพสด + AI ตรวจจับวัตถุ + เบลอใบหน้า/ทะเบียนอัตโนมัติ (PDPA) */
(function (TT) {
  'use strict';

  const CLASS = {
    car: { th: 'รถยนต์', w: 1.8, h: 1.5, color: '#FFB238' },
    moto: { th: 'จยย.', w: 0.75, h: 1.45, color: '#3FD6CF' },
    bus: { th: 'รถโดยสาร', w: 2.5, h: 3.2, color: '#FF6FA8' },
    truck: { th: 'รถบรรทุก', w: 2.4, h: 2.8, color: '#FF6FA8' },
    person: { th: 'บุคคล', w: 0.55, h: 1.65, color: '#8CD65A' },
    boat: { th: 'เรือ', w: 6, h: 1.4, color: '#5C9CFF' },
  };
  const CAR_COLORS = ['#E8ECEF', '#C9CED3', '#2B2F33', '#8B1E24', '#1F3E6E', '#D9D2C3', '#5D6A73', '#F2F2F2', '#B5462E'];

  function sceneOf(cam) {
    if (cam.type === 'haze') return 'forest';
    if (cam.type === 'tourism' && /หาด|อ่าว|ทะเล|ริม|ท่าเรือ/.test(cam.name)) return 'beach';
    if (cam.type === 'tourism' && cam.seed > 0.55) return 'beach';
    return 'road';
  }

  class Feed {
    constructor(canvas, cam, getHour) {
      this.cv = canvas; this.ctx = canvas.getContext('2d'); this.cam = cam; this.getHour = getHour;
      this.r = TT.rng(Math.floor(cam.seed * 1e9));
      this.scene = sceneOf(cam); this.ai = true; this.pan = 0; this.zoom = 1;
      this.objs = []; this.stats = {}; this.raf = 0; this.lastT = 0; this.acc = 0;
      this.skyline = Array.from({ length: 26 }, () => ({ w: this.r.range(0.03, 0.08), h: this.r.range(0.08, 0.42), lit: Array.from({ length: 30 }, () => this.r() < 0.4) }));
      this.hills = [0, 1, 2].map(k => Array.from({ length: 14 }, () => this.r.range(0.05, 0.22) * (1 - k * 0.2)));
      this.noise = document.createElement('canvas'); this.noise.width = this.noise.height = 96;
      const nc = this.noise.getContext('2d'), id = nc.createImageData(96, 96);
      for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 26; }
      nc.putImageData(id, 0, 0);
      this.resize();
      this.seedObjects();
    }
    resize() {
      const rect = this.cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      this.W = this.cv.width = Math.max(320, Math.min(900, Math.round(rect.width * dpr)));
      this.H = this.cv.height = Math.round(this.W * 9 / 16);
    }
    metrics() { return TT.metrics(this.cam, this.getHour()); }
    seedObjects() {
      const m = this.metrics(), r = this.r;
      this.objs = [];
      if (this.scene === 'road') {
        const n = Math.round(6 + m.congestion * 24);
        for (let i = 0; i < n; i++) this.objs.push(this.newVehicle(r.range(6, 160)));
        for (let i = 0; i < 4 + Math.round(m.people / 120); i++) this.objs.push(this.newPerson(r.range(6, 70)));
      } else if (this.scene === 'beach') {
        for (let i = 0; i < 6 + Math.round(m.crowd * 28); i++) this.objs.push({ k: 'person', X: r.range(-22, 22), Z: r.range(5, 60), v: r.range(-0.6, 0.6), color: r.pick(['#C0563E', '#2E6FA8', '#F2C14E', '#E8ECEF', '#3B8F5A']) });
        this.objs.push({ k: 'boat', X: r.range(-40, 40), Z: r.range(140, 260), v: r.range(1.5, 3) * (r() < 0.5 ? -1 : 1) });
      } else {
        this.plumes = Array.from({ length: 2 }, () => ({ x: r.range(0.2, 0.8), parts: [] }));
      }
    }
    newVehicle(Z) {
      const r = this.r, away = r() < 0.5, k = r.weighted({ car: 62, moto: 30, bus: 4, truck: 4 });
      const lanes = away ? [-5.4, -1.9] : [1.9, 5.4];
      const X = r.pick(lanes) + (k === 'moto' ? r.range(-1.2, 1.2) : r.range(-0.3, 0.3));
      return { k, X, Z, away, color: k === 'bus' ? r.pick(['#2E6FA8', '#E8ECEF', '#C0563E']) : k === 'truck' ? '#D9D2C3' : r.pick(CAR_COLORS), conf: r.range(0.82, 0.98), sp: r.range(0.85, 1.15) };
    }
    newPerson(Z) { const r = this.r, side = r() < 0.5 ? -1 : 1; return { k: 'person', X: side * r.range(8.6, 10.5), Z, v: r.range(0.6, 1.3) * (r() < 0.5 ? -1 : 1), color: r.pick(['#C0563E', '#2E6FA8', '#F2C14E', '#E8ECEF', '#3B8F5A', '#7650D6']), conf: r.range(0.78, 0.95) }; }

    start() {
      const reduce = TT.reducedMotion();
      this.update(0.05); this.draw();
      const tick = (t) => {
        const dt = Math.min((t - (this.lastT || t)) / 1000, 0.1); this.lastT = t;
        this.acc += dt;
        const step = reduce ? 1 : 1 / 30;
        if (this.acc >= step) { this.update(reduce ? 0.2 : this.acc); this.draw(); this.acc = 0; }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

    update(dt) {
      const m = this.metrics(), speed = 15 * (1 - m.congestion * 0.82) + 1.5;
      this.t = (this.t || 0) + dt;
      for (const o of this.objs) {
        if (o.k === 'person') { o.Z += o.v * dt; if (o.Z < 4 || o.Z > (this.scene === 'beach' ? 64 : 75)) o.v *= -1; if (this.scene === 'beach') o.X += Math.sin(this.t + o.Z) * 0.02; continue; }
        if (o.k === 'boat') { o.X += o.v * dt; if (Math.abs(o.X) > 70) o.v *= -1; continue; }
        o.Z += (o.away ? 1 : -1) * speed * o.sp * dt;
        if (o.Z < 4) Object.assign(o, this.newVehicle(170), { away: false, Z: 170 });
        if (o.Z > 175) Object.assign(o, this.newVehicle(5), { away: true, Z: 5 });
      }
      // จำนวนตามความหนาแน่นจริงของชั่วโมงนั้น
      if (this.scene === 'road') {
        const want = Math.round(6 + m.congestion * 24), cars = this.objs.filter(o => o.k !== 'person');
        if (cars.length < want) this.objs.push(this.newVehicle(this.r() < 0.5 ? 170 : 5));
        else if (cars.length > want + 2) this.objs.splice(this.objs.indexOf(cars[0]), 1);
      }
    }

    // ---------- วาด ----------
    draw() {
      const { ctx, W, H } = this, h = this.getHour(), day = TT.daylight(h), m = this.metrics();
      const night = day < 0.18;
      this.hy = H * (0.4 - this.pan * 0.02);
      this.vx = W * (0.5 - this.pan * 0.9);
      ctx.save();
      this.drawSky(day, h);
      if (this.scene === 'road') this.drawRoad(day, night, m);
      else if (this.scene === 'beach') this.drawBeach(day, night, m);
      else this.drawForest(day, night, m);
      if (m.rain > 0.62 && this.scene !== 'forest') this.drawRain(m.rain);
      // grain + vignette
      ctx.globalAlpha = 1;
      const pat = ctx.createPattern(this.noise, 'repeat');
      ctx.save(); ctx.translate(Math.random() * 96, Math.random() * 96); ctx.fillStyle = pat; ctx.fillRect(-96, -96, W + 192, H + 192); ctx.restore();
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    mix(a, b, t) { const A = TT.hexToRgb(a), B = TT.hexToRgb(b); return `rgb(${A.map((v, i) => Math.round(TT.lerp(v, B[i], t))).join(',')})`; }
    drawSky(day, h) {
      const { ctx, W } = this, dusk = Math.exp(-(((h - 18.3) / 0.9) ** 2)) + Math.exp(-(((h - 6.2) / 0.8) ** 2)) * 0.6;
      const g = ctx.createLinearGradient(0, 0, 0, this.hy);
      g.addColorStop(0, this.mix('#050A14', '#7FA6C2', day));
      g.addColorStop(1, dusk > 0.2 ? this.mix(this.mix('#142233', '#D9E3E8', day), '#F0A060', TT.clamp(dusk, 0, 0.8)) : this.mix('#142233', '#D9E3E8', day));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, this.hy + 1);
    }
    proj(X, Z, Yh = 0) {
      // กล้องสูง 6 ม. มองตามถนน
      const Z0 = 6, camH = 6, s = Z0 / Z, base = this.H - this.hy;
      const pxm = (this.W * 0.62) / 9 * this.zoom;
      return { x: this.vx + X * s * pxm, y: this.hy + base * s * (camH - Yh) / camH, s: s * pxm };
    }
    drawRoad(day, night, m) {
      const { ctx, W, H } = this;
      // เส้นขอบฟ้าเมือง
      let x = -this.pan * W * 0.6 - 20;
      for (const b of this.skyline) {
        const bw = b.w * W, bh = b.h * this.hy;
        ctx.fillStyle = this.mix('#0A121C', '#8A9EAE', day);
        ctx.fillRect(x, this.hy - bh, bw - 2, bh);
        if (night) { ctx.fillStyle = 'rgba(255,200,110,0.75)'; b.lit.forEach((on, i) => { if (on) ctx.fillRect(x + 3 + (i % 3) * (bw / 3.4), this.hy - bh + 4 + Math.floor(i / 3) * 7, 2.2, 3); }); }
        x += bw; if (x > W + 40) break;
      }
      // พื้น + ถนน
      ctx.fillStyle = this.mix('#0D1217', '#6C757C', day); ctx.fillRect(0, this.hy, W, H - this.hy);
      const a = this.proj(-9, 400), b = this.proj(9, 400), c = this.proj(9, 6), d = this.proj(-9, 6);
      ctx.fillStyle = this.mix('#141A20', '#545C63', day);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
      // ทางเท้า
      ctx.fillStyle = this.mix('#1B2127', '#8C949A', day);
      for (const side of [-1, 1]) { const p1 = this.proj(side * 9, 400), p2 = this.proj(side * 12, 400), p3 = this.proj(side * 12, 6), p4 = this.proj(side * 9, 6); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill(); }
      // เส้นแบ่งช่องจราจร (เคลื่อนที่ตามเวลา)
      const off = ((this.t || 0) * 6) % 9;
      ctx.fillStyle = night ? 'rgba(230,230,210,0.55)' : 'rgba(250,250,240,0.85)';
      for (const lx of [-3.6, 3.6]) for (let z = 6 + (9 - off); z < 200; z += 9) { const p = this.proj(lx, z), q = this.proj(lx, z + 4); ctx.beginPath(); ctx.moveTo(p.x - p.s * 0.08, p.y); ctx.lineTo(p.x + p.s * 0.08, p.y); ctx.lineTo(q.x + q.s * 0.08, q.y); ctx.lineTo(q.x - q.s * 0.08, q.y); ctx.fill(); }
      ctx.strokeStyle = '#E3B341'; ctx.lineWidth = 1.5;
      for (const lx of [-0.15, 0.15]) { const p = this.proj(lx, 400), q = this.proj(lx, 6); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
      // เสาไฟโซเดียมริมถนน
      for (let z = 12; z < 220; z += 28) for (const side of [-1, 1]) {
        const base = this.proj(side * 10.5, z), top = this.proj(side * 10.5, z, 8.5);
        ctx.strokeStyle = this.mix('#2A3138', '#5E666C', day); ctx.lineWidth = Math.max(1, base.s * 0.12);
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
        if (night) { const gl = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, top.s * 3.2); gl.addColorStop(0, 'rgba(255,190,90,0.85)'); gl.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(top.x, top.y, top.s * 3.2, 0, 7); ctx.fill(); }
      }
      // วัตถุ (ไกล → ใกล้)
      const objs = this.objs.slice().sort((p, q) => q.Z - p.Z);
      const counts = { car: 0, moto: 0, bus: 0, truck: 0, person: 0 };
      for (const o of objs) { this.drawObj(o, night, day); if (o.Z < 110) counts[o.k]++; }
      if (this.cam.type === 'flood') this.drawFlood(m, day);
      if (this.cam.region === 'เหนือ' && m.pm25 > 45) this.drawHaze(m.pm25, day);
      if (this.ai) for (const o of objs) if (o.Z < (o.k === 'person' ? 60 : 105)) this.drawBox(o);
      this.stats = counts;
    }
    drawObj(o, night, day) {
      const { ctx } = this, c = CLASS[o.k], p = this.proj(o.X, o.Z);
      const w = c.w * p.s, h = c.h * p.s, x = p.x - w / 2, y = p.y - h;
      o.box = [x, y, w, h];
      if (w < 0.6) return;
      if (o.k === 'person') {
        ctx.fillStyle = this.mix('#11161B', o.color, 0.25 + day * 0.6);
        ctx.beginPath(); ctx.roundRect(x, y + h * 0.22, w, h * 0.78, w * 0.4); ctx.fill();
        // เบลอใบหน้า (mosaic)
        const hs = Math.max(2, w * 0.7); ctx.fillStyle = 'rgba(160,170,178,0.9)';
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.globalAlpha = 0.6 + ((i + j) % 2) * 0.3; ctx.fillRect(p.x - hs / 2 + i * hs / 2, y + j * hs / 2, hs / 2, hs / 2); }
        ctx.globalAlpha = 1; return;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - w * 0.05, p.y - h * 0.08, w * 1.1, h * 0.1);
      ctx.fillStyle = this.mix('#0E1216', o.color, 0.35 + day * 0.65);
      ctx.beginPath(); ctx.roundRect(x, y + (o.k === 'moto' ? h * 0.25 : 0), w, o.k === 'moto' ? h * 0.75 : h, Math.max(1, w * 0.12)); ctx.fill();
      if (o.k === 'moto') { ctx.fillStyle = this.mix('#1B1F24', '#3A3F45', day); ctx.beginPath(); ctx.arc(p.x, y + h * 0.18, w * 0.38, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = night ? 'rgba(20,28,36,0.9)' : 'rgba(40,58,72,0.75)'; ctx.fillRect(x + w * 0.1, y + h * (o.k === 'car' ? 0.1 : 0.12), w * 0.8, h * 0.32); }
      // ไฟหน้า/ไฟท้าย
      if (night || day < 0.4) {
        const ly = y + h * 0.72, col = o.away ? 'rgba(255,50,50,' : 'rgba(255,248,225,';
        for (const lx of o.k === 'moto' ? [p.x] : [x + w * 0.16, x + w * 0.84]) {
          const rr = Math.max(1.5, w * (o.away ? 0.1 : 0.2));
          const gl = this.ctx.createRadialGradient(lx, ly, 0, lx, ly, rr * 3); gl.addColorStop(0, col + '1)'); gl.addColorStop(1, col + '0)');
          ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(lx, ly, rr * 3, 0, 7); ctx.fill();
        }
      }
      // ทะเบียนรถถูกเบลอ
      if (!o.away && o.k !== 'moto' && w > 18) {
        const pw = w * 0.32, ph = h * 0.14, px = p.x - pw / 2, py = y + h * 0.8;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? 'rgba(170,176,182,0.95)' : 'rgba(120,126,132,0.95)'; ctx.fillRect(px + i * pw / 4, py + j * ph / 2, pw / 4 + 0.5, ph / 2 + 0.5); }
      }
    }
    drawBox(o) {
      if (!o.box) return;
      const { ctx } = this, [x, y, w, h] = o.box, c = CLASS[o.k];
      if (w < 6) return;
      ctx.strokeStyle = c.color; ctx.lineWidth = 1.4; ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      const fs = Math.max(9, Math.min(13, w * 0.22)); ctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
      const label = `${c.th} ${(o.conf || 0.9).toFixed(2)}`; const tw = ctx.measureText(label).width;
      ctx.fillStyle = c.color; ctx.fillRect(x - 2, y - fs - 6, tw + 8, fs + 4);
      ctx.fillStyle = '#0B1218'; ctx.fillText(label, x + 2, y - 6);
    }
    drawFlood(m, day) {
      const { ctx, W, H } = this, lvl = m.water;
      if (lvl > 0) {
        const top = this.proj(0, 400, lvl / 100).y;
        const g = ctx.createLinearGradient(0, top, 0, H);
        g.addColorStop(0, `rgba(${day > 0.3 ? '110,120,105' : '30,40,45'},0.45)`); g.addColorStop(1, `rgba(${day > 0.3 ? '96,104,88' : '20,28,30'},0.78)`);
        ctx.fillStyle = g; ctx.fillRect(0, top, W, H - top);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) { const z = 8 + ((i * 13 + (this.t || 0) * 2) % 150); const p = this.proj(-12 + (i % 5) * 6, z, lvl / 100); ctx.beginPath(); ctx.moveTo(p.x - p.s * 1.5, p.y); ctx.quadraticCurveTo(p.x, p.y - 2, p.x + p.s * 1.5, p.y); ctx.stroke(); }
      }
      // เสาวัดระดับน้ำ
      const b = this.proj(7.6, 16), t = this.proj(7.6, 16, 1.2), pw = Math.max(5, b.s * 0.25);
      ctx.fillStyle = '#F2F4F5'; ctx.fillRect(b.x - pw / 2, t.y, pw, b.y - t.y);
      for (let cm = 0; cm <= 120; cm += 10) { const yy = this.proj(7.6, 16, cm / 100).y; ctx.fillStyle = cm % 50 === 0 ? '#E5484D' : '#2B2F33'; ctx.fillRect(b.x - pw / 2, yy - 1, cm % 50 === 0 ? pw : pw * 0.6, 2); }
      if (lvl > 0) { const wy = this.proj(7.6, 16, lvl / 100).y; ctx.fillStyle = 'rgba(60,140,200,0.55)'; ctx.fillRect(b.x - pw / 2, wy, pw, b.y - wy); }
      if (this.ai) { ctx.strokeStyle = '#38D6CF'; ctx.lineWidth = 1.4; ctx.strokeRect(b.x - pw, t.y - 4, pw * 2, b.y - t.y + 8); ctx.font = '600 11px "JetBrains Mono", monospace'; const s = `ระดับน้ำ ${lvl} ซม.`; ctx.fillStyle = '#38D6CF'; ctx.fillRect(b.x - pw, t.y - 20, ctx.measureText(s).width + 8, 15); ctx.fillStyle = '#0B1218'; ctx.fillText(s, b.x - pw + 4, t.y - 9); }
    }
    drawHaze(pm, day) { const a = TT.clamp((pm - 30) / 160, 0, 0.55); this.ctx.fillStyle = day > 0.3 ? `rgba(196,170,140,${a})` : `rgba(60,50,45,${a})`; this.ctx.fillRect(0, 0, this.W, this.H); }
    drawRain(v) {
      const { ctx, W, H } = this; ctx.strokeStyle = 'rgba(200,215,230,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 90 * v; i++) { const x = Math.random() * W, y = Math.random() * H; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); }
      ctx.stroke();
    }
    drawBeach(day, night, m) {
      const { ctx, W, H } = this, seaBottom = H * 0.62;
      const g = ctx.createLinearGradient(0, this.hy, 0, seaBottom);
      g.addColorStop(0, this.mix('#06121C', '#3F86A8', day)); g.addColorStop(1, this.mix('#0B1C26', '#79C0D0', day));
      ctx.fillStyle = g; ctx.fillRect(0, this.hy, W, seaBottom - this.hy);
      ctx.strokeStyle = night ? 'rgba(160,190,210,0.18)' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) { const y = this.hy + (seaBottom - this.hy) * ((i / 9) ** 1.6) + Math.sin((this.t || 0) * 1.2 + i) * 1.5; ctx.beginPath(); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y + Math.sin(x / 40 + (this.t || 0) * 2 + i) * (1 + i * 0.3)); ctx.stroke(); }
      ctx.fillStyle = this.mix('#26221C', '#DCCBA2', day); ctx.fillRect(0, seaBottom, W, H - seaBottom);
      ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.fillRect(0, seaBottom - 2, W, 3);
      if (night) { const gl = ctx.createRadialGradient(W * 0.8, this.hy * 0.4, 0, W * 0.8, this.hy * 0.4, 18); gl.addColorStop(0, 'rgba(240,240,230,0.95)'); gl.addColorStop(1, 'rgba(240,240,230,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(W * 0.8, this.hy * 0.4, 18, 0, 7); ctx.fill(); }
      // ร่มชายหาด
      const ur = TT.rng(Math.floor(this.cam.seed2 * 1e6));
      for (let i = 0; i < 7; i++) { const x = ur.range(0.05, 0.95) * W, y = seaBottom + ur.range(0.15, 0.75) * (H - seaBottom), s = 10 + (y - seaBottom) / 6; ctx.fillStyle = ur.pick(['#E5484D', '#F2C14E', '#2E6FA8', '#E8ECEF']); ctx.beginPath(); ctx.ellipse(x, y - s, s, s * 0.35, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#5E4B32'; ctx.fillRect(x - 0.8, y - s, 1.6, s); }
      const counts = { person: 0, boat: 0 };
      const objs = this.objs.slice().sort((p, q) => q.Z - p.Z);
      for (const o of objs) {
        if (o.k === 'boat') {
          const y = this.hy + (seaBottom - this.hy) * 0.35, x = W / 2 + o.X * 4, w = 34;
          ctx.fillStyle = night ? '#1A222A' : '#6B4A2E'; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y - 4); ctx.lineTo(x + w / 2 - 6, y + 5); ctx.lineTo(x - w / 2 + 4, y + 5); ctx.fill();
          o.box = [x - w / 2, y - 6, w, 12]; o.conf = 0.88; counts.boat++; continue;
        }
        const s = (o.Z ? 1 / (o.Z / 9) : 1), y = seaBottom + (H - seaBottom) * TT.clamp(1 - o.Z / 66, 0.02, 1), x = W / 2 + o.X * 14 * (0.4 + (y - seaBottom) / (H - seaBottom));
        const h = 10 + (y - seaBottom) * 0.22, w = h * 0.34;
        ctx.fillStyle = this.mix('#14181C', o.color, 0.3 + day * 0.6); ctx.beginPath(); ctx.roundRect(x - w / 2, y - h * 0.78, w, h * 0.78, w * 0.4); ctx.fill();
        ctx.fillStyle = 'rgba(160,170,178,0.85)'; ctx.fillRect(x - w * 0.45, y - h, w * 0.9, h * 0.24);
        o.box = [x - w / 2, y - h, w, h]; o.conf = o.conf || 0.86; counts.person++;
        void s;
      }
      if (this.ai) for (const o of objs) this.drawBox(o);
      this.stats = counts;
    }
    drawForest(day, night, m) {
      const { ctx, W, H } = this;
      this.hills.forEach((pts, k) => {
        const baseY = this.hy + k * H * 0.12, col = this.mix(['#0A1410', '#08100C', '#050A08'][k], ['#7C8F7A', '#5E7558', '#3F5A3A'][k], day);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
        pts.forEach((v, i) => ctx.lineTo((i / (pts.length - 1)) * W, baseY - v * H * 0.5));
        ctx.lineTo(W, H); ctx.fill();
      });
      // ควันไฟ
      const t = this.t || 0, r = this.r;
      for (const pl of this.plumes) {
        if (r() < 0.5) pl.parts.push({ x: pl.x * W + r.range(-4, 4), y: this.hy + H * 0.16, r: r.range(4, 9), a: 0.5 });
        for (const p of pl.parts) { p.y -= 0.9 + Math.sin(t + p.x) * 0.2; p.x += 0.35; p.r += 0.22; p.a *= 0.985; }
        pl.parts = pl.parts.filter(p => p.a > 0.03);
        for (const p of pl.parts) { ctx.fillStyle = `rgba(${night ? '70,64,60' : '170,160,150'},${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
        if (night) { const gl = ctx.createRadialGradient(pl.x * W, this.hy + H * 0.17, 0, pl.x * W, this.hy + H * 0.17, 14); gl.addColorStop(0, 'rgba(255,120,40,0.9)'); gl.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(pl.x * W, this.hy + H * 0.17, 14, 0, 7); ctx.fill(); }
      }
      this.drawHaze(m.pm25 + 20, day);
      if (this.ai && m.pm25 > 50) {
        const pl = this.plumes[0], x = pl.x * W - 22, y = this.hy + H * 0.08;
        ctx.strokeStyle = '#FF7A45'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, 44, H * 0.14);
        ctx.font = '600 11px "JetBrains Mono", monospace'; const s = 'จุดความร้อน 0.81'; ctx.fillStyle = '#FF7A45'; ctx.fillRect(x, y - 16, ctx.measureText(s).width + 8, 15); ctx.fillStyle = '#0B1218'; ctx.fillText(s, x + 4, y - 5);
      }
      this.stats = { smoke: this.plumes.length };
    }
  }
  TT.Feed = Feed;
})(window.TT);

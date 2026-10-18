# ตาทิพย์ · CCTV Thailand

แพลตฟอร์มรวมกล้อง CCTV ทั่วประเทศไทยบน **แผนที่ถนน (Leaflet + OpenStreetMap)** ให้ประชาชนทั่วไปค้นหา ดูภาพ และ **ขอปักหมุดกล้องใหม่** ได้เอง

> **สถานะ: เฟส 1 · ออกแบบ UX/UI**
> ตำแหน่งกล้องค่าเริ่มต้นเป็น **ข้อมูลจริง** จาก OpenStreetMap (277 จุด ดู [แหล่งข้อมูล](docs/DATA-SOURCES.md)) สลับเป็นข้อมูลจำลองได้เพื่อทดสอบ UX · ภาพสด สถานะ และคำขอยังเป็นข้อมูลจำลอง · ระบบไม่ใช้ AI

![ภาพรวมประเทศ](docs/screens/overview.jpg)

> ภาพหน้าจอถ่ายในสภาพแวดล้อมที่โหลดภาพแผนที่ OSM ไม่ได้ จึงใช้ภาพแผนที่แทนชั่วคราว ของจริงบน GitHub Pages จะเห็นถนนจาก OpenStreetMap

| modal กล้อง | มุมมองรายจังหวัด (ธีมกลางวัน) |
|---|---|
| ![modal กล้อง](docs/screens/detail.jpg) | ![รายจังหวัด](docs/screens/province.jpg) |

![มือถือ: แผนที่ ค้นหา รายละเอียดกล้อง และขั้นตอนขอปักหมุด](docs/screens/mobile.jpg)

## เปิดดูต้นแบบ

**ออนไลน์ (GitHub Pages):** https://giganto-th.github.io/cctv/ (deploy จาก branch หลักอัตโนมัติทุกครั้งที่ push; หน้าแรกพาไปที่ `prototype/`)

**บนเครื่อง:**

```bash
npm run dev          # เปิด http://localhost:5173 (ใช้ Node 20+ ไม่ต้องติดตั้งแพ็กเกจ)
```

หรือเปิด `prototype/index.html` ผ่านเว็บเซิร์ฟเวอร์ไฟล์นิ่งใดก็ได้ ต้องต่ออินเทอร์เน็ตเพื่อโหลด Leaflet ภาพแผนที่ OSM และฟอนต์

สร้างไฟล์ HTML เดียวไว้แชร์:

```bash
npm run build:single # → dist/tathip.html
```

## ลองทำสิ่งเหล่านี้

- **⌘K / Ctrl+K** หรือแตะช่องค้นหา แล้วพิมพ์ชื่อจังหวัด ชื่อแยก เช่น "อโศก" หรือรหัสกล้อง เช่น "BKK-TRF-0001"
- แตะจุดกล้อง → **modal** แสดงภาพสดจำลอง สถานะการเชื่อมต่อ 24 ชม. ข้อมูลกล้อง และกล้องใกล้เคียง (กล้อง PTZ หมุนได้ กรวยบนแผนที่หมุนตาม)
- ซูมเข้าระดับถนน (ซูม 16+) เพื่อดู **ทิศทางมุมมองของกล้องทุกตัว**
- สลับมุมมอง **จุดกล้อง / รายจังหวัด / คำขอ** ในแผงชั้นข้อมูล
- กด **＋ ขอปักหมุดกล้อง** → เลื่อนหมุด ระบบตรวจกล้องซ้ำในรัศมี 150 ม. → หมุนวงทิศทาง → กรอกเหตุผล → ได้รหัสติดตาม
- สลับธีมกลางวัน/กลางคืนที่ปุ่มพระอาทิตย์/พระจันทร์

## ข้อมูลกล้องจริง

```bash
npm run fetch:data   # ดึงจาก OpenStreetMap, data.bangkok.go.th, data.go.th → prototype/data/cameras.json
```

GitHub Actions รันให้อัตโนมัติทุกสัปดาห์ (หรือสั่งเองที่แท็บ Actions → Fetch real CCTV data) · แหล่งข้อมูลรัฐไทยปฏิเสธเครื่องนอกประเทศ ต้องรันจากเครื่องในไทยเพื่อให้ได้ข้อมูลครบ · รายละเอียดการค้นคว้าและรูปแบบ JSON อยู่ใน [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)

## เอกสาร

- [แหล่งข้อมูลกล้อง CCTV จริง](docs/DATA-SOURCES.md): ผลการค้นคว้า สัญญาอนุญาต วิธีดึง และรูปแบบ JSON
- [เอกสารออกแบบ UX/UI เฟส 1](docs/PHASE1-UXUI.md): persona, user journey, IA, รายการหน้าจอ, การออกแบบแผนที่, design system, responsive, นวัตกรรม, accessibility, แผนทดสอบผู้ใช้ และภาพรวมเฟสถัดไป

## โครงสร้าง

```
prototype/
  index.html          โครงหน้าและไอคอน
  css/styles.css      design tokens (ธีมกลางวัน/กลางคืน) และเลย์เอาต์ responsive
  js/geo-data.js      ขอบเขต 77 จังหวัด (สร้างด้วย tools/build-geo.mjs)
  js/util.js          ฟังก์ชันภูมิศาสตร์ เวลาไทย/พ.ศ. ที่เก็บข้อมูล
  js/mock-data.js     ข้อมูลจำลอง: กล้อง คำขอ ทางหลวง อัปเดตสถานะ
  js/real-data.js     ข้อมูลกล้องจริง (สร้างด้วย tools/fetch-real-data.mjs)
  js/real.js          แปลงข้อมูลจริงเป็นรูปแบบกล้องของแอป
  data/cameras.json   ข้อมูลกล้องจริงแบบ JSON + data/sources.json ที่มาและสัญญาอนุญาต
  js/feed.js          ภาพสดจำลองบน canvas
  js/map.js           แผนที่ Leaflet + OSM (จุดกล้อง กรวยมุมมอง จังหวัด คำขอ หมุดปักตำแหน่ง)
  css/leaflet.css     สไตล์ของ Leaflet 1.9.4 (BSD-2-Clause)
  js/ui.js            เทมเพลตแผง modal และฟอร์ม
  js/app.js           สถานะแอป การค้นหา modal ขั้นตอนขอปักหมุด คำขอ
tools/
  build-geo.mjs       แปลงข้อมูลจังหวัดเป็นพิกัด (npm install ก่อนใช้)
  build-single.mjs    รวมเป็นไฟล์ HTML เดียว
  fetch-real-data.mjs ดึงข้อมูลกล้องจริงจากแหล่งข้อมูลเปิด
  serve.mjs           เซิร์ฟเวอร์สำหรับเปิดต้นแบบ
data/raw/             ไฟล์ดิบที่ดาวน์โหลดจากแหล่งข้อมูล
docs/                 เอกสารออกแบบ แหล่งข้อมูล และภาพหน้าจอ
```

## ที่มาของข้อมูลแผนที่

- ขอบเขตจังหวัด: [@svg-maps/thailand](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0) แปลงเป็นพิกัดโดยประมาณ
- ตำแหน่งกล้องจริง: © ผู้ร่วมพัฒนา [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL 1.0)
- แผนที่: [Leaflet](https://leafletjs.com) 1.9.4 + แผนที่ฐาน © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- ต้นแบบนี้ใช้ tile.openstreetmap.org โดยตรงซึ่งเหมาะกับการสาธิตเท่านั้น ระบบจริงต้องใช้ tile server ของโครงการเองตาม[นโยบายของ OSM](https://operations.osmfoundation.org/policies/tiles/)

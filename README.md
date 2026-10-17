# ตาทิพย์ · CCTV Thailand

แพลตฟอร์มรวมกล้อง CCTV ทั่วประเทศไทยบน **แผนที่ถนน (Leaflet + OpenStreetMap)** ให้ประชาชนทั่วไปค้นหา ดูภาพ และ **ขอปักหมุดกล้องใหม่** ได้เอง

> **สถานะ: เฟส 1 · ออกแบบ UX/UI ด้วยข้อมูลจำลอง**
> ทุกตำแหน่ง สถานะ และภาพในต้นแบบเป็นข้อมูลจำลองเพื่อการออกแบบเท่านั้น · ระบบไม่ใช้ AI

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

## เอกสาร

- [เอกสารออกแบบ UX/UI เฟส 1](docs/PHASE1-UXUI.md): persona, user journey, IA, รายการหน้าจอ, การออกแบบแผนที่, design system, responsive, นวัตกรรม, accessibility, แผนทดสอบผู้ใช้ และภาพรวมเฟสถัดไป

## โครงสร้าง

```
prototype/
  index.html          โครงหน้าและไอคอน
  css/styles.css      design tokens (ธีมกลางวัน/กลางคืน) และเลย์เอาต์ responsive
  js/geo-data.js      ขอบเขต 77 จังหวัด (สร้างด้วย tools/build-geo.mjs)
  js/util.js          ฟังก์ชันภูมิศาสตร์ เวลาไทย/พ.ศ. ที่เก็บข้อมูล
  js/mock-data.js     ข้อมูลจำลอง: กล้อง คำขอ ทางหลวง อัปเดตสถานะ
  js/feed.js          ภาพสดจำลองบน canvas
  js/map.js           แผนที่ Leaflet + OSM (จุดกล้อง กรวยมุมมอง จังหวัด คำขอ หมุดปักตำแหน่ง)
  css/leaflet.css     สไตล์ของ Leaflet 1.9.4 (BSD-2-Clause)
  js/ui.js            เทมเพลตแผง modal และฟอร์ม
  js/app.js           สถานะแอป การค้นหา modal ขั้นตอนขอปักหมุด คำขอ
tools/
  build-geo.mjs       แปลงข้อมูลจังหวัดเป็นพิกัด (npm install ก่อนใช้)
  build-single.mjs    รวมเป็นไฟล์ HTML เดียว
  serve.mjs           เซิร์ฟเวอร์สำหรับเปิดต้นแบบ
docs/                 เอกสารออกแบบและภาพหน้าจอ
```

## ที่มาของข้อมูลแผนที่

- ขอบเขตจังหวัด: [@svg-maps/thailand](https://github.com/VictorCazanave/svg-maps) (CC BY 4.0) แปลงเป็นพิกัดโดยประมาณ
- แผนที่: [Leaflet](https://leafletjs.com) 1.9.4 + แผนที่ฐาน © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- ต้นแบบนี้ใช้ tile.openstreetmap.org โดยตรงซึ่งเหมาะกับการสาธิตเท่านั้น ระบบจริงต้องใช้ tile server ของโครงการเองตาม[นโยบายของ OSM](https://operations.osmfoundation.org/policies/tiles/)

# แหล่งข้อมูลกล้อง CCTV จริงในประเทศไทย

> สรุปผลการค้นคว้า ณ 18 ต.ค. 2569 และวิธีที่โครงการดึงข้อมูลจริงมาเป็น JSON

## สรุปสั้น

| แหล่งข้อมูล | มีพิกัดกล้อง | สัญญาอนุญาต | ดึงอัตโนมัติได้ไหม | ผลล่าสุด |
|---|---|---|---|---|
| **OpenStreetMap** (`man_made=surveillance`) | ✅ ทุกจุด | ODbL 1.0 (ใช้ได้ ต้องให้เครดิต) | ✅ ผ่าน Overpass API | **277 จุด** ใน 27 จังหวัด |
| **กรุงเทพมหานคร** data.bangkok.go.th ชุด `bma-cctv` | ✅ (CSV ~238 จุด กล้องจราจร BMA Traffic) | ไม่ระบุ | ⚠️ เข้าไม่ได้จากเครื่องนอกประเทศ | ยังไม่ได้ข้อมูล |
| **data.go.th / gdcc.data.go.th** | ⚠️ ส่วนใหญ่เป็น "จำนวนกล้อง" รายพื้นที่ มีพิกัดเพียงบางชุด | Open Data Common (ตามชุด) | ⚠️ ตอบ 403 กับเครื่องนอกประเทศ | ยังไม่ได้ข้อมูล |
| กรมทางหลวง (แอป Thailand Highway Traffic) | มีในแอป | ไม่มีชุดข้อมูลเปิด | ❌ | ต้องขอความร่วมมือ |
| iTIC / Longdo Traffic | มีกล้องจราจรบนแผนที่ | เชิงพาณิชย์/ต้องขออนุญาต | ❌ ไม่มีเอกสาร API สาธารณะ | ต้องขอความร่วมมือ |
| BMA Traffic (cpudapp.bangkok.go.th/bmatraffic) | ภาพสดกล้องจราจร กทม. | ไม่ระบุ | ❌ ไม่มี API เปิด | ใช้เป็นลิงก์ไปดูภาพได้ |

ตัวเลขประกอบ: กทม. มีกล้อง CCTV รวมราว 65,015 ตัวใน 16,623 จุด (ข่าว ก.ค. 2568) แต่เป็นกล้องจราจรเพียงราว 1,000 ตัว ส่วนใหญ่เป็นกล้องความปลอดภัยที่ไม่เปิดตำแหน่งต่อสาธารณะ

## รายละเอียดแต่ละแหล่ง

### 1. OpenStreetMap — ใช้งานแล้ว

- คิวรีผ่าน Overpass API: ทุก node/way ที่มี `man_made=surveillance` ภายในขอบเขตประเทศไทย
- แท็กที่ใช้: `surveillance` (public/outdoor/indoor), `surveillance:type` (camera/ALPR), `surveillance:zone` (traffic/street/…), `camera:type`, `camera:mount`, `camera:direction`, `operator`, `name`
- ผลรอบแรก: 277 จุด, ระบุทิศทาง 54 จุด, ระบุผู้ดูแล 4 จุด, มีชื่อ 12 จุด กระจุกที่ กทม. 114, เชียงใหม่ 50, นนทบุรี 43, ภูเก็ต 13
- ข้อจำกัด: อาสาสมัครบันทึกไว้ ไม่ครบทุกกล้อง ส่วนใหญ่ไม่มีแท็กประเภท (จัดเป็น "ไม่ระบุประเภท") และไม่มีภาพสดหรือสถานะ
- ต้องแสดงเครดิต "© OpenStreetMap contributors" ทุกที่ที่ใช้ และถ้าแจกจ่ายฐานข้อมูลที่ดัดแปลงต้องใช้ ODbL ต่อ

### 2. กรุงเทพมหานคร — data.bangkok.go.th `bma-cctv`

- CKAN `package_show?id=bma-cctv` มี CSV 1 ไฟล์ ราว 238 แถว ตรงกับจำนวนกล้องจราจรของ BMA Traffic
- คอลัมน์ที่ทราบ: ` ID Camera` (มีช่องว่างนำหน้า), `Code DVR`, `project` และพิกัด มี 4 แถวที่ลองจิจูดมีจุดทศนิยมสองจุด (ต้องตัดทิ้ง)
- ไม่มีลิงก์ภาพรายกล้อง ให้ลิงก์ไปหน้า BMA Traffic แทน
- สัญญาอนุญาต: ไม่ระบุ ควรขอหนังสืออนุญาตจาก กทม. ก่อนเผยแพร่จริง
- อ้างอิง: [flukelaster/SIAHRA#108](https://github.com/flukelaster/SIAHRA/pull/108) ที่ใช้ชุดข้อมูลเดียวกัน

### 3. data.go.th และ gdcc.data.go.th

- ค้นด้วย CKAN `package_search` คำว่า "CCTV", "กล้องวงจรปิด", "กล้อง CCTV"
- ชุดที่พบส่วนใหญ่เป็นสถิติ เช่น [จำนวนกล้อง CCTV](https://data.go.th/en/dataset/cctv5), [กล้อง CCTV ในแหล่งท่องเที่ยว](https://data.go.th/en/dataset/dataset_20_159), [กล้องวงจรปิด (CCTV)](https://gdcc.data.go.th/en/dataset/dataset_20_20), [กล้องวงจรปิดส่วนเอกชน ศรีสะเกษ](https://gdcc.data.go.th/en/dataset/sskpol) (รายงานเป็น "จุด" ระดับตำบล)
- สคริปต์จะดาวน์โหลด CSV/JSON/GeoJSON ทุกไฟล์ในชุดที่พบ แล้วหาคอลัมน์ละติจูด/ลองจิจูดเอง (รองรับชื่อคอลัมน์ไทย/อังกฤษ, คอลัมน์ "พิกัด" แบบรวม, ไฟล์ Windows-874) และบันทึกหัวตารางของทุกไฟล์ไว้ใน `sources.json` เพื่อปรับต่อ
- ยังไม่รองรับไฟล์ XLSX (หลายชุดของรัฐเป็น XLSX)

### 4. แหล่งที่ต้องขอความร่วมมือ

กรมทางหลวง, กรมทางหลวงชนบท, การทางพิเศษแห่งประเทศไทย, iTIC/Longdo, สำนักงานตำรวจแห่งชาติ, เทศบาลนครต่าง ๆ มีกล้องจำนวนมากแต่ไม่เปิดเป็นชุดข้อมูล แนะนำทำ MOU ขอ API รายการกล้อง (ตำแหน่ง สถานะ ลิงก์ภาพ) ในเฟส 2

## วิธีดึงข้อมูล

```bash
npm run fetch:data   # = node tools/fetch-real-data.mjs (Node 20+ ไม่ต้องติดตั้งแพ็กเกจ)
```

- รันอัตโนมัติด้วย GitHub Actions `.github/workflows/fetch-cctv-data.yml` (สั่งเองได้ที่แท็บ Actions และรันทุกวันจันทร์ 03:17 น.) แล้ว commit ไฟล์ที่เปลี่ยนกลับเข้า branch
- **data.go.th และ data.bangkok.go.th ปฏิเสธเครื่องที่อยู่นอกประเทศไทย** (เครื่อง GitHub Actions อยู่สหรัฐฯ) จึงต้องรัน `npm run fetch:data` จากเครื่องหรือเซิร์ฟเวอร์ในประเทศไทย หรือใช้ self-hosted runner ในไทย แล้ว commit ผลลัพธ์
- สคริปต์ตัดจุดซ้ำข้ามแหล่งที่ห่างกันไม่เกิน 15 ม. (ให้ข้อมูลหน่วยงานรัฐมาก่อน OSM) และกำหนดจังหวัดด้วยขอบเขตจังหวัดของโครงการ

## รูปแบบไฟล์

`prototype/data/cameras.json`

```jsonc
{
  "fetchedAt": "2026-10-18T02:19:00.000Z",
  "count": 277,
  "cameras": [
    {
      "id": "osm-n2403914289",      // แหล่ง-รหัสต้นทาง
      "src": "osm",                 // osm | bma | dgt | gdcc
      "name": "",                   // ชื่อจากต้นทาง (ถ้ามี)
      "lat": 13.737245, "lon": 100.627401,
      "type": "other",              // traffic | safety | flood | tourism | haze | other
      "prov": "bkk",                // รหัสจังหวัดในโครงการ
      "operator": "BMTA",           // ผู้ดูแล (ถ้ามี)
      "dir": 90,                    // ทิศทางกล้อง องศาจากทิศเหนือ (ถ้ามี)
      "access": "public",           // surveillance=public/outdoor/indoor
      "kind": "camera", "cam": "dome", "mount": "pole", "zone": "traffic",
      "updated": "2013-08-01",      // แก้ไขล่าสุดที่ต้นทาง
      "url": "https://www.openstreetmap.org/node/2403914289"
    }
  ]
}
```

คีย์ที่ไม่มีค่าจะถูกตัดออกเพื่อลดขนาดไฟล์ · `prototype/data/sources.json` เก็บจำนวน ข้อผิดพลาด สัญญาอนุญาต และหัวตารางของทุกไฟล์ที่ดาวน์โหลด · `prototype/js/real-data.js` เป็นข้อมูลชุดเดียวกันสำหรับให้แอปโหลดโดยไม่ต้องมีเซิร์ฟเวอร์

## การใช้ในแอป

- แผงชั้นข้อมูล → **แหล่งข้อมูลกล้อง**: "ข้อมูลจริง" (ค่าเริ่มต้น) หรือ "ข้อมูลจำลอง" (สำหรับทดสอบ UX ที่มีภาพสดและสถานะ)
- กล้องจริงแสดงเฉพาะสิ่งที่ต้นทางมี: ตำแหน่ง ประเภท (ถ้ามีแท็ก) ทิศทาง ผู้ดูแล ลิงก์ต้นทาง ไม่มีภาพสดและสถานะออนไลน์ จึงแสดงว่า "ไม่ทราบสถานะ" และ "ยังไม่มีภาพจากกล้องนี้"
- คำขอปักหมุดจากประชาชนยังเป็นข้อมูลจำลอง

## แหล่งอ้างอิง

- [OSM Wiki: Tag:man_made=surveillance](https://wiki.openstreetmap.org/wiki/Tag:man_made=surveillance)
- [data.go.th: จำนวนกล้อง CCTV](https://data.go.th/en/dataset/cctv5) · [กล้อง CCTV ในแหล่งท่องเที่ยว](https://data.go.th/en/dataset/dataset_20_159) · [gdcc: กล้องวงจรปิด (CCTV)](https://gdcc.data.go.th/en/dataset/dataset_20_20) · [gdcc: กล้องวงจรปิดส่วนเอกชน](https://gdcc.data.go.th/en/dataset/sskpol)
- [flukelaster/SIAHRA#108: ใช้ชุด bma-cctv ของ data.bangkok.go.th](https://github.com/flukelaster/SIAHRA/pull/108)
- [PR Bangkok: กทม. ชี้แจงงบ CCTV (จำนวนกล้องรวม)](https://pr-bangkok.com/?p=507873)
- [Thansettakij: ตรวจสภาพจราจรผ่านกล้องกรมทางหลวงในแอป Thailand Highway Traffic](https://www.thansettakij.com/content/normal_news/448222)
- [Nation Thailand: ขอภาพกล้อง กทม. ออนไลน์ที่ cctv.bangkok.go.th](https://www.nationthailand.com/thailand/general/40024762)

# SANHA — เว็บไซต์ชิปปิ้งจีนครบวงจร

เว็บไซต์ของบริการนำเข้าสินค้าจากจีนแบบ One Stop Service: รับหาสินค้า, สั่งซื้อแทน, ฝากจ่าย / แลกหยวน, ขนส่งทางรถและทางเรือ จนถึงมือลูกค้า

## เริ่มต้น

ต้องติดตั้ง [Node.js](https://nodejs.org) เวอร์ชัน 20 ขึ้นไปก่อน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 (ระบบจะพาไปที่ `/th` อัตโนมัติ)

## โครงสร้าง

```
content/kb/<th|en>/*.md     บทความคู่มือ / FAQ (Markdown)
src/config/site.ts          ข้อมูลติดต่อบริษัท
src/config/rates.ts         เรทค่าขนส่ง แยกตามประเภทสินค้า (เรทหยวนไม่แสดงบนเว็บ ให้สอบถามทาง LINE)
src/i18n/dictionaries/      ข้อความบนเว็บ ภาษาไทย / อังกฤษ
src/app/[locale]/           หน้าเว็บทั้งหมด
src/app/api/quote/          รับข้อมูลจากฟอร์มขอใบเสนอราคา
```

## หน้าเว็บ

| URL | หน้า |
|---|---|
| `/th` | หน้าแรก |
| `/th/services` | บริการ |
| `/th/calculator` | คำนวณค่าขนส่ง (กิโล / คิว) |
| `/th/exchange` | แลกเงินหยวน & ฝากจ่าย (สอบถามเรททาง LINE) |
| `/th/kb` | คู่มือ & FAQ |
| `/th/quote` | ฟอร์มฝากหาสินค้า / ขอใบเสนอราคา (มีช่องยินยอม PDPA) |
| `/th/privacy` | นโยบายความเป็นส่วนตัว (แก้ที่ `content/pages/<locale>/privacy.md`) |
| `/sitemap.xml`, `/robots.txt` | สำหรับ Google |

## การเพิ่มบทความใน Knowledge Base

สร้างไฟล์ `.md` ใน `content/kb/th/` (และ `content/kb/en/` ใช้ชื่อไฟล์เดียวกัน) โดยมีส่วนหัวดังนี้

```markdown
---
title: ชื่อบทความ
description: คำอธิบายสั้นๆ
category: getting-started | shipping | payment | policies
order: 1
---

เนื้อหาบทความ...
```

## ตั้งค่าการแจ้งเตือนฟอร์มเข้า LINE

ฟอร์มขอใบเสนอราคาจะส่งข้อความเข้า LINE ของทีมงานผ่าน LINE Messaging API (ถ้ายังไม่ตั้งค่า ระบบจะแค่บันทึกไว้ใน log ของเซิร์ฟเวอร์)

1. สร้าง LINE Official Account และเปิดใช้ Messaging API ที่ [LINE Developers Console](https://developers.line.biz/console/)
2. ในแท็บ Messaging API กด Issue **Channel access token (long-lived)**
3. หา ID ของผู้รับ:
   - ส่งให้ตัวเอง: ใช้ **Your user ID** ในแท็บ Basic settings (ขึ้นต้นด้วย `U`)
   - ส่งเข้ากลุ่มทีม: เชิญ OA เข้ากลุ่ม แล้วดู Group ID (ขึ้นต้นด้วย `C`) จาก webhook event
4. คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_TARGET_ID`
5. รีสตาร์ท `npm run dev`

> Push message นับรวมในโควต้าข้อความรายเดือนของ LINE OA ตามแพ็กเกจที่ใช้

## งานที่ยังต้องทำ (TODO)

- [ ] ใส่ข้อมูลติดต่อจริง ลิงก์ LINE OA และโดเมนเว็บ (`url`) ใน `src/config/site.ts`
- [ ] กรอก TODO ในนโยบายความเป็นส่วนตัว และให้นักกฎหมายตรวจก่อนเผยแพร่
- [ ] ใส่เรทค่าขนส่งจริงแยกตามประเภทสินค้าใน `src/config/rates.ts` (ตอนนี้เป็นค่าตัวอย่าง)
- [ ] ตั้งค่า LINE Messaging API ตามหัวข้อด้านบน
- [ ] เติมรายละเอียดค่าธรรมเนียมในบทความที่มี TODO
- [ ] โลโก้และสีแบรนด์ (แก้สีได้ที่ `src/app/globals.css`)

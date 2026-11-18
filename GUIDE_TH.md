---
title: "คู่มืออ่านเอง: SkinMatch Project 2"
subtitle: "CSS325 Database Systems · อธิบายทุกส่วนของโปรเจกต์ + สคริปต์เดโม 15 นาที + คำถามที่น่าจะโดนถาม"
---

# 0. อ่านตรงนี้ก่อน

ไฟล์นี้อธิบายทุกอย่างที่อยู่ในโฟลเดอร์ `skinmatch/` ว่าทำอะไร ทำไมออกแบบแบบนี้ และจะพูดอะไรตอนนำเสนอ อ่านตามลำดับได้เลย หรือถ้าเวลาน้อยให้อ่านข้อ 1, 2, 13 และ 14 ก่อน

สิ่งที่ส่งให้มีทั้งหมด

| ไฟล์ | คืออะไร |
|---|---|
| `CSS325_Project2_SkinMatch_Report.docx` | รายงาน Project 2 (ภาษาอังกฤษ ต่อจาก report Project 1) |
| `skinmatch/sql/01-05` | สคริปต์ฐานข้อมูลทั้งหมด |
| `skinmatch/` ที่เหลือ | เว็บแอป (Node.js + Express + หน้าเว็บ) |
| `GUIDE_TH.md` / ไฟล์ PDF นี้ | คู่มืออ่านเอง |

# 1. Project 2 ต้องทำอะไร และเราทำครบตรงไหน

โจทย์ Project 2 (12%) คือเอา design จาก Project 1 มาสร้างจริงใน DBMS แล้วเดโม ตารางนี้จับคู่ข้อกำหนดแต่ละข้อกับสิ่งที่เราทำ ใช้ตอบได้ทันทีถ้าอาจารย์ถามว่า "ข้อนี้อยู่ตรงไหน"

| ข้อกำหนดในโจทย์ | เราทำที่ไหน |
|---|---|
| Implement relational schema ใน DBMS | `01_schema.sql` (MySQL 8, 17 ตาราง) |
| ใส่ sample data ให้พอ | `03_data.sql` (18 สินค้า, 9 แบรนด์, 27 ส่วนผสม, 9 ผู้ใช้, 29 รีวิว) |
| SQL สำหรับ data definition | `01_schema.sql` + section 1 ของ `05_demo_queries.sql` (ALTER TABLE) |
| SQL สำหรับ retrieval และ modification | section 2-3 ของ `05` และใน controller ของเว็บ |
| Joins, aggregate, nested queries | section 4, 5, 6 ของ `05` |
| SQL features อื่นๆ | section 7: UNION, CTE (WITH), window function (RANK), CASE |
| Views หรือ triggers | 4 views + 5 triggers ใน `02_views_routines.sql` |
| Database programming | 2 functions + 2 procedures ใน `02` |
| Transactions | section 11 ของ `05` + ในเว็บ (บันทึกโปรไฟล์, เพิ่มสินค้า) |
| Access control / security | `04_accounts.sql` (roles, 3 accounts) + section 12 ของ `05` + login/role ในเว็บ |
| ส่ง scripts, sample data, program files, final report | ทั้งโฟลเดอร์ + report |
| Demo ภายใน 15 นาที | ข้อ 13 ของคู่มือนี้ |

# 2. ต้องทำ full stack ไหม

ตามโจทย์ไม่ได้บังคับว่าต้องมีหน้าเว็บ สิ่งที่โดนให้คะแนนจริงคือฐานข้อมูลและ SQL (ทุกอย่างในข้อ 1) แต่โจทย์บอกว่าต้อง "demonstrate the completed system" และให้ส่ง "relevant program files" ด้วย การมีเว็บทำให้เดโมดูเป็นระบบจริง และโชว์ transaction กับ access control ได้เป็นธรรมชาติมาก (เช่น member เข้าหน้า admin แล้วโดน 403)

เราเลยทำทั้งสองแบบ คือ

- **ฝั่ง SQL ล้วน**: `05_demo_queries.sql` รันใน Workbench ได้ทีละข้อ ครบทุกข้อกำหนด ถ้าเว็บมีปัญหาวันจริงก็เดโมจากไฟล์นี้อย่างเดียวได้
- **ฝั่งเว็บ**: ใช้โครงสร้างเดียวกับ Lab 12 ของ CSS326 (Express + mysql2 + fetch) หน้าตาตาม mock-up ในวิดีโอที่เราทำไว้ตอน Project 1

# 3. วิธีติดตั้งและรันบน Mac

ต้องมี MySQL 8 (8.0.16 ขึ้นไป), MySQL Workbench และ Node.js (เครื่องที่ใช้ทำ lab CSS326 มีครบอยู่แล้ว)

**ขั้นที่ 1 ฐานข้อมูล**

1. เปิด MySQL Workbench ด้วย login root (หรือ admin ของเรา)
2. File > Open SQL Script > เลือก `sql/01_schema.sql` แล้วกดสายฟ้า (Execute all)
3. ทำแบบเดียวกันกับ `02_views_routines.sql`, `03_data.sql`, `04_accounts.sql` ตามลำดับนี้
4. ตอนจบ `03_data.sql` จะเห็นตารางจำนวนแถวของทุกตาราง แปลว่าข้อมูลเข้าครบ

ถ้ารัน `01` ใหม่อีกรอบ ฐานข้อมูลจะถูกล้างทั้งหมด ต้องรัน 02, 03, 04 ตามอีกครั้ง (ใช้วิธีนี้ "รีเซ็ต" ก่อนเดโมได้)

**ขั้นที่ 2 เว็บ**

เปิด Terminal ในโฟลเดอร์ `skinmatch` แล้วพิมพ์

```
npm install
npm run dev
```

เปิด browser ไปที่ `http://localhost:3000`

**บัญชีทดลอง**

| ใคร | อีเมล | รหัส |
|---|---|---|
| Member 1 (ผิวมัน แพ้น้ำหอม) | member1@example.com | member1234 |
| Member 3 (ผิวแพ้ง่าย แพ้ 3 อย่าง) | member3@example.com | member1234 |
| สมาชิกใหม่ ยังไม่มีโปรไฟล์ | new-member@example.com | member1234 |
| ผู้ดูแล | demo-admin@example.com | admin1234 |

ในหน้า login มีปุ่มกดกรอกให้อัตโนมัติอยู่แล้ว

**ถ้ามีปัญหา**

- `Access denied for user 'skinmatch_app'` ให้รัน `04_accounts.sql` ใหม่ ถ้ายังไม่ได้ เปลี่ยน `localhost` เป็น `127.0.0.1` ทั้งในไฟล์ `.env` และใน `04_accounts.sql` แล้วรันใหม่
- `Error 1418` ตอนสร้าง function แปลว่าไม่ได้ใช้ root หรือให้รัน `SET GLOBAL log_bin_trust_function_creators = 1;` ครั้งเดียวด้วย root
- `npm install` ไม่ผ่าน เช็กว่าต่อเน็ตอยู่
- หน้าเว็บขึ้นว่า "เชื่อมต่อฐานข้อมูลไม่ได้" แปลว่า MySQL ไม่ได้เปิด หรือยังไม่ได้รัน `04_accounts.sql`

**สำคัญ**: ไฟล์ทั้งหมดเขียนตาม syntax ของ MySQL 8 แต่ยังไม่ได้รันบน MySQL จริง (เครื่องที่ใช้ทำไม่มี MySQL) ให้ลองรันบนเครื่องเราก่อนวันนำเสนออย่างน้อยหนึ่งรอบ ถ้าเจอ error ตรงไหน จด error มาแก้ได้เลย

# 4. ฐานข้อมูล: 17 ตาราง อธิบายทีละกลุ่ม

## 4.1 ของเดิมจาก Project 1 (11 ตาราง ไม่เปลี่ยน)

- **users**: บัญชีผู้ใช้ (ใน report Project 1 ชื่อ USER แต่ `USER` เป็นคำสงวนใน MySQL เลยตั้งชื่อเป็น `users`)
- **skin_profile**: โปรไฟล์ผิว 1 คนมีได้ 1 อัน (UNIQUE user_id) เป็น weak entity เพราะถ้าลบ user โปรไฟล์ต้องหายไปด้วย (ON DELETE CASCADE)
- **skin_concern**: คำศัพท์มาตรฐานของปัญหาผิว 6 อย่าง (สิว, ริ้วรอย, จุดด่างดำ, รูขุมขนกว้าง, ผิวหมองคล้ำ, ผิวแดง) ใช้ร่วมกันทั้งฝั่ง user และฝั่งสินค้า นี่คือเหตุผลที่จับคู่กันได้
- **brand**, **product**, **ingredient**: แบรนด์ สินค้า ส่วนผสม (`is_allergen` บอกว่าเป็นสารก่อภูมิแพ้ไหม)
- **review**: รีวิว คะแนน 1-5 คนหนึ่งรีวิวสินค้าหนึ่งได้ครั้งเดียว (UNIQUE user_id, product_id)
- **recommendation**: log ว่าเคยแนะนำสินค้าอะไรให้ใคร คะแนนเท่าไร
- **bridge 3 ตาราง**: `skin_profile_concern` (มี severity_level), `product_ingredient` (มี concentration_percent), `product_concern` (มี effectiveness_level)

## 4.2 ของใหม่ใน Project 2 (6 ตาราง + 1 column)

นี่คือจุดที่อาจารย์น่าจะถาม ให้จำเหตุผลไว้

| เพิ่มอะไร | ทำไม |
|---|---|
| column `users.role` (member / admin) | Project 1 เขียนไว้ว่าจะเพิ่ม ADMIN ใน Project 2 ใช้ column เดียวพอ เพราะ admin ไม่มีข้อมูลพิเศษอะไรเพิ่ม |
| `skin_profile_allergen` | Project 1 มี `is_allergen` แต่ไม่มีที่เก็บว่า "ใครแพ้อะไร" เลยกรองสินค้าตามคนไม่ได้ ตารางนี้คือ M:N ระหว่างโปรไฟล์กับส่วนผสม |
| `product_skin_type` | ต้องรู้ว่าสินค้าเหมาะกับผิวแบบไหน สินค้าหนึ่งเหมาะได้หลายแบบ ถ้าเก็บเป็นข้อความ "oily, combination" ใน column เดียวจะผิด 1NF |
| `moisturizer`, `serum`, `sunscreen` | EER specialization ที่ Project 1 บอกว่าจะทำ (ดูข้อ 5) |
| `product_price_log` | เก็บประวัติการเปลี่ยนราคา ให้ trigger เขียนเท่านั้น ใช้โชว์ trigger และช่วยงาน admin |

ประโยคสั้นๆ ไว้พูด: "เราเก็บ design เดิมของ Project 1 ไว้ทั้งหมด และเพิ่มเฉพาะส่วนที่ต้องใช้จริงตอนทำฟีเจอร์จับคู่ โดยทุกตารางที่เพิ่มยังอยู่ใน 3NF"

## 4.3 Constraints ที่ควรรู้

- **PRIMARY KEY / FOREIGN KEY** ทุกตาราง
- **UNIQUE**: email, brand_name, ingredient_name, concern_name, skin_profile.user_id (ทำให้ 1:1 จริง), review(user_id, product_id)
- **CHECK**: ราคา > 0, rating 1-5, severity/effectiveness 1-3, เปอร์เซ็นต์ 0-100, SPF 1-100
- **ENUM**: ค่าที่มีให้เลือกจำกัด เช่น skin_type, category
- **ON DELETE CASCADE**: ลูกอยู่เดี่ยวๆ ไม่ได้ เช่น ลบสินค้า แถวใน bridge, รีวิว, subtype หายตาม
- **ON DELETE RESTRICT**: ห้ามลบถ้ายังมีคนใช้ เช่น ลบแบรนด์ที่ยังมีสินค้าไม่ได้

# 5. EER Specialization แบบเข้าใจง่าย

PRODUCT เป็น superclass แบ่งเป็น subclass 3 แบบ แต่ละแบบมีข้อมูลเฉพาะของตัวเอง

- MOISTURIZER: texture (gel/lotion/cream/balm), finish (matte/natural/dewy)
- SERUM: key_active, active_percent
- SUNSCREEN: spf, pa_rating, filter_type

ลักษณะของ specialization นี้

- **Disjoint (d)**: สินค้าหนึ่งเป็นได้แค่แบบเดียว (เป็นทั้งเซรั่มและกันแดดไม่ได้)
- **Partial**: ไม่จำเป็นต้องมี subclass ทุกตัว คลีนเซอร์ โทนเนอร์ มาส์ก ไม่มีตาราง subclass
- **Attribute-defined**: ใช้ column `category` เป็นตัวกำหนดว่าเป็น subclass ไหน

การ map เป็นตาราง ใช้วิธี "หนึ่งตารางต่อหนึ่ง subclass" โดย PK ของ subclass = product_id ซึ่งเป็น FK ไปที่ product ด้วย

ถ้าอาจารย์ถามว่า "ทำไมไม่ใส่ spf ไว้ใน product เลย" ตอบว่า จะมี NULL เต็มไปหมด เพราะสินค้าส่วนใหญ่ไม่ใช่กันแดด และ attribute นั้นไม่มีความหมายกับสินค้าอื่น

ถ้าถามว่า "รู้ได้ยังไงว่าไม่มีใครใส่ข้อมูล sunscreen ให้มาส์ก" ตอบว่า มี trigger `trg_sunscreen_category` เช็กก่อน INSERT ว่า category ต้องเป็น sunscreen ไม่งั้น SIGNAL error และมี `trg_product_category_change` กันไม่ให้เปลี่ยน category ทั้งที่ยังมีแถว subclass อยู่

# 6. Normalization (สรุปไว้ตอบ)

- ทุกตารางมี candidate key เดียว (surrogate key หรือ composite key ของ bridge) เลยไม่มี partial dependency จึงอยู่ใน 2NF อัตโนมัติ
- **3NF ตัวอย่างจาก Project 1**: ถ้าเก็บ brand_name, country_of_origin ไว้ใน product จะเกิด product_id → brand_name → country_of_origin (transitive) เลยแยก BRAND ออกมา
- **1NF ตัวอย่าง**: ถ้าเก็บ concerns = "acne, sensitive" ในช่องเดียวจะเป็น multivalued attribute เลยแยกเป็น bridge table ใช้เหตุผลเดียวกันกับ `product_skin_type` ที่เพิ่มใหม่
- ตารางใหม่: `product_skin_type` และ `skin_profile_allergen` เป็น all-key (ทุก column เป็น key) จึงอยู่ใน BCNF, ตาราง subclass มี product_id → attribute ตรงๆ ไม่มี transitive, `product_price_log` ก็เช่นกัน
- **ค่าที่คำนวณได้ไม่เก็บซ้ำ**: คะแนนเฉลี่ยและจำนวนสารก่อภูมิแพ้ ไม่เก็บใน product แต่คำนวณใน view `v_product_catalog` เลยไม่มีวันข้อมูลไม่ตรงกัน

# 7. อธิบาย `05_demo_queries.sql` ทีละ section

วิธีรัน: วางเคอร์เซอร์ในคำสั่งแล้วกด Cmd + Enter (รันเฉพาะคำสั่งนั้น) บรรทัดที่เขียนว่า `[EXPECTED ERROR]` ตั้งใจให้ error เพื่อโชว์ว่า constraint ทำงาน ถูก comment ไว้ไม่ให้สคริปต์หยุด เวลาจะโชว์ให้ลากเลือกข้อความหลัง `-- ` แล้วกด Cmd + Shift + Enter

| Section | โชว์อะไร | ผลที่จะเห็น / จุดที่ควรพูด |
|---|---|---|
| 1 DDL | DESCRIBE, ALTER TABLE เพิ่ม/แก้/ลบ column และ CHECK | สุดท้าย schema กลับเหมือนเดิม |
| 1.4 | ใส่ข้อมูลผิด | CHECK (rating 9), UNIQUE (รีวิวซ้ำ), FK (product 999), RESTRICT (ลบ brand) โดนปฏิเสธหมด |
| 2 DML | INSERT แบรนด์ + สินค้า + bridge, UPDATE ลดราคามาส์ก 10%, DELETE | ลบสินค้าแล้ว bridge หายเอง = CASCADE |
| 3 Basic | WHERE, IN, BETWEEN, LIKE, DISTINCT, IS NULL, ORDER BY, LIMIT | |
| 4 Joins | inner join 4 ตาราง, LEFT JOIN หาสินค้าไม่มีรีวิว, join ผ่าน 2 bridge, self join, superclass+subclass | 4.2 ได้สินค้า 13, 15, 17 |
| 5 Aggregate | GROUP BY + COUNT/MIN/MAX/AVG, HAVING, GROUP_CONCAT | 5.2 แบรนด์ที่คะแนน ≥ 4 และรีวิว ≥ 3 |
| 6 Nested | NOT EXISTS (กรองสารแพ้), IN, correlated, scalar, > ALL, derived table, **relational division** | 6.7 คือ "สินค้าที่รักษาครบทุกปัญหาของ user 3" ใช้ NOT EXISTS ซ้อน 2 ชั้น เป็นข้อที่ยากที่สุด ควรอธิบายได้ |
| 7 Others | UNION, intersection ด้วย IN, CTE (WITH), RANK() OVER, CASE | |
| 8 Views | ใช้ 4 views | v_public_reviews ไม่มี email |
| 9 Routines | fn_match_score ใน SELECT, CALL procedure + OUT parameter | 9.2 ได้ 0 เพราะ user 2 แพ้น้ำหอม และสินค้า 3 มีน้ำหอม |
| 10 Triggers | เปลี่ยนราคาแล้วดู log, ใส่ subtype ผิด | log มีแถวใหม่ทันที |
| 11 Transactions | ROLLBACK, COMMIT, SAVEPOINT, isolation 2 แท็บ | หลัง ROLLBACK นับได้ 0 |
| 12 Security | SHOW GRANTS, REVOKE/GRANT, LOCK, ทดลอง login ด้วย report/editor | report อ่าน users ไม่ได้ (error 1142) |
| 13 Index | SHOW INDEX, EXPLAIN | ข้อมูลแค่ 18 แถว MySQL อาจเลือก full scan ได้ แต่ possible_keys จะโชว์ index |

## อธิบาย relational division (6.7) ให้เข้าใจ

คำถาม: "หาสินค้า p ที่ไม่มีปัญหาผิวข้อไหนของ user 3 ที่ p ไม่รักษา" (ปฏิเสธซ้อนสองชั้น = รักษาครบทุกข้อ)

- NOT EXISTS ชั้นนอก: ไม่มีปัญหาผิวของ user 3 ข้อไหนเลย ที่...
- NOT EXISTS ชั้นใน: ...หาแถวใน product_concern ของสินค้า p ไม่เจอ

ถ้าสินค้ารักษาครบทุกข้อ ชั้นในจะเจอทุกครั้ง ชั้นนอกเลยว่าง เงื่อนไขจึงเป็นจริง

# 8. fn_match_score: หัวใจของระบบ

ฟังก์ชันนี้รับ (user, product) แล้วคืนคะแนน 0-100

| ส่วน | คะแนนเต็ม | คิดยังไง |
|---|---|---|
| ปัญหาผิว | 60 | 60 × ผลรวม(severity × effectiveness ของปัญหาที่ตรงกัน) ÷ (ผลรวม severity ทั้งหมดของ user × 3) ถ้า user ไม่มีปัญหาผิวให้ 30 |
| ประเภทผิว | 30 | สินค้าเหมาะกับผิว user ได้ 30 ไม่งั้น 0 |
| เพศ | 10 | สินค้า unisex หรือตรงเพศ user ได้ 10 |
| สารที่แพ้ | ตัดเหลือ 0 | ถ้าสินค้ามีส่วนผสมที่ user แพ้แม้แต่ตัวเดียว คะแนน = 0 |

**ตัวอย่าง** user 2 Member 1: ผิวมัน, หญิง, สิว (3), จุดด่างดำ (2), ผิวแดง (1), แพ้น้ำหอม กับสินค้า 1 (มอยส์เจอร์ไรเซอร์ไร้น้ำมัน เหมาะผิวมัน/ผสม รักษาสิว 3, รูขุมขน 2, ไม่มีน้ำหอม)

- ปัญหาที่ตรงกันมีแค่สิว: 3 × 3 = 9, severity รวม = 6 → 60 × 9 ÷ 18 = 30
- ผิวมันตรง: +30
- unisex: +10
- รวม **70%** (ตรงกับที่เห็นบนเว็บ)

ทำไมทำเป็น function ในฐานข้อมูล: ใช้ได้ทั้งใน SELECT และ ORDER BY ทุก client (Workbench, เว็บ) ได้ผลเหมือนกัน และกฎอยู่ที่เดียว

# 9. Procedures และ Triggers

**sp_generate_recommendations(user, limit, OUT count)**

1. ถ้า user ยังไม่มีโปรไฟล์ → SIGNAL SQLSTATE '45000' (error 1644) ข้อความ "Please create your skin profile..."
2. คำนวณคะแนนทุกสินค้าด้วย fn_match_score
3. INSERT สินค้าที่ดีที่สุด (คะแนน > 0) ลง recommendation ด้วย INSERT ... SELECT คำสั่งเดียว เลยเป็น all-or-nothing
4. ตั้ง OUT parameter = จำนวนแถวที่บันทึก (ROW_COUNT())
5. SELECT ผลลัพธ์ส่งกลับไป

**sp_product_summary(product, OUT avg, OUT reviews)** ตัวอย่าง IN/OUT parameter แบบ Lab 11

**Triggers 5 ตัว**

| Trigger | ทำงานเมื่อ | ทำอะไร |
|---|---|---|
| trg_product_price_audit | AFTER UPDATE ON product | ถ้าราคาเปลี่ยน เขียน log ราคาเก่า/ใหม่/ใครเปลี่ยน |
| trg_moisturizer/serum/sunscreen_category | BEFORE INSERT บนตาราง subclass | category ไม่ตรง → SIGNAL error |
| trg_product_category_change | BEFORE UPDATE ON product | ห้ามเปลี่ยน category ถ้ายังมีแถว subclass |

เกร็ด "ใครเปลี่ยนราคา": เว็บใช้ connection เดียว สั่ง `SET @app_user = 'อีเมล admin'` ก่อน UPDATE แล้ว trigger อ่าน `@app_user` ไปเขียน log ถ้าแก้จาก Workbench ไม่มีตัวแปรนี้ trigger จะใช้ `CURRENT_USER()` แทน

# 10. Transactions

**ทำไมต้องมี**: บางงานมีหลายคำสั่ง ต้องสำเร็จทั้งหมดหรือไม่สำเร็จเลย

**ในเว็บมี 2 ที่**

1. **บันทึกโปรไฟล์ผิว** (PUT /me/profile) แตะ 4 ตาราง: อัปเดตเพศใน users → INSERT/UPDATE skin_profile (อ่านด้วย SELECT ... FOR UPDATE เพื่อล็อกแถว) → ลบและใส่ concerns ใหม่ → ลบและใส่ allergens ใหม่ ถ้าขั้นไหนพัง (เช่นส่ง concern_id ที่ไม่มีจริง) ROLLBACK ทั้งหมด โปรไฟล์เดิมยังอยู่ครบ
2. **เพิ่มสินค้า** (admin) INSERT product + subclass + 3 bridge ถ้าส่วนผสมผิดตัวเดียว ไม่มีอะไรถูกบันทึก

**กฎของ mysql2 ที่ต้องจำ** (เหมือน Lab 9): transaction ต้องใช้ connection เดียว (`pool.getConnection()`) เพราะ `pool.execute` แต่ละครั้งอาจได้คนละ connection และต้อง `release()` ใน finally เสมอ ไม่งั้น pool หมดแล้วแอปค้าง

**ACID แบบสั้น**

- Atomicity: ROLLBACK แล้วไม่เหลืออะไร
- Consistency: constraint และ trigger ถูกเช็กใน transaction
- Isolation: แท็บที่สองมองไม่เห็นราคาที่ยังไม่ COMMIT (default ของ MySQL คือ REPEATABLE READ)
- Durability: COMMIT แล้วปิดเครื่องข้อมูลก็ยังอยู่

# 11. Security / Access Control

**ผู้ใช้มี 2 แบบ ห้ามสับสน**

- **ผู้ใช้แอป** (สมาชิก, admin) เป็นแค่ "แถว" ในตาราง users มีรหัสผ่านแบบ hash ไม่มี login MySQL
- **บัญชี MySQL** เป็นของ "โปรแกรม" หนึ่งบัญชีต่อหนึ่งงาน (least privilege)

**Roles และบัญชีใน `04_accounts.sql`**

| | สิทธิ์ | ใครใช้ |
|---|---|---|
| role sm_reader | SELECT | |
| role sm_writer | INSERT, UPDATE, DELETE | |
| role sm_executor | EXECUTE (CALL, ใช้ function) | |
| skinmatch_app | 3 roles ข้างบน ไม่มี CREATE/DROP/ALTER | เว็บแอป (อยู่ใน .env) |
| skinmatch_report | SELECT เฉพาะ 3 views | dashboard อ่านอย่างเดียว ไม่เห็น email/hash |
| skinmatch_editor | อ่านได้หมด แก้ได้เฉพาะ brand, ingredient และ column ชื่อ/ราคา/ปริมาณของ product | ตัวอย่าง column-level privilege |

ประโยคไว้พูด: "แม้มีคนทำ SQL injection สำเร็จ บัญชีของแอปก็ DROP TABLE ไม่ได้ เพราะไม่มีสิทธิ์นั้นตั้งแต่แรก"

**Security ฝั่งแอป**

- รหัสผ่าน hash ด้วย scrypt + salt สุ่มต่อคน (เก็บเป็น `scrypt$salt$hash`) ไม่ใช้ SHA2 ของ MySQL เพราะเร็วและไม่มี salt
- login ผิดตอบข้อความเดียวกันทั้ง "ไม่มีอีเมลนี้" และ "รหัสผิด" คนอื่นจะได้เดาไม่ได้ว่าอีเมลไหนมีในระบบ
- session cookie เป็น httpOnly เก็บแค่ id สุ่ม และสร้าง session ใหม่ทุกครั้งที่ login
- middleware: ไม่ login → 401, ไม่ใช่ admin → 403
- route `/me/...` เอา user id จาก session เท่านั้น ไม่เอาจาก URL ดังนั้นแก้ URL ไปดูของคนอื่นไม่ได้
- ทุกค่าใส่ผ่าน `?` placeholder ส่วน ORDER BY และ column ที่ PATCH ได้ เลือกจาก list ที่เขียนตายตัวในโค้ด
- error ที่ไม่คาดคิดตอบแค่ "Something went wrong" รายละเอียดไปอยู่ใน log ของ server

# 12. Back end และ Front end

## 12.1 โครงสร้างไฟล์ (เหมือน Lab 12)

```
server.js            ตั้งค่า express, session, static, ผูก routes
db.js                connection pool เดียว อ่าน login จาก .env
middleware/auth.js   requireLogin, requireRole
utils/passwords.js   hash / verify รหัสผ่าน
utils/http.js        toId(), fail(), sqlError() แปลง error MySQL เป็น 4xx
routes/*.js          URL ไหน → ผ่าน middleware อะไร → controller ไหน
controllers/*.js     SQL ทั้งหมดอยู่ที่นี่
public/              หน้าเว็บ (index.html, app.js, style.css)
```

## 12.2 ตัวอย่าง request หนึ่งครั้งเดินทางยังไง: กด "ดูคำแนะนำสำหรับฉัน"

1. `app.js` เรียก `api('PUT', '/me/profile', {...})` ด้วย fetch
2. `routes/me.js` → `requireLogin` เช็ก session (ไม่มี → 401)
3. `meController.saveProfile` ตรวจข้อมูล (ผิด → 400) แล้วเปิด transaction บันทึก 4 ตาราง → COMMIT
4. หน้าเว็บเรียกต่อ `POST /me/recommendations` → controller สั่ง `CALL sp_generate_recommendations(?, ?, @saved)` บน connection เดียวกับ `SELECT @saved`
5. procedure ใช้ fn_match_score จัดอันดับ เขียน log และส่งรายการกลับ
6. หน้าเว็บวาดการ์ดพร้อม % ตรงกับผิว

## 12.3 หน้าจอ

- **ผิวของฉัน**: แบบสอบถาม ประเภทผิว / ปัญหาผิว + ระดับความรุนแรง / สารที่แพ้ / เพศ / อายุ / สีผิว
- **คำแนะนำ**: การ์ดเรียงตาม % พร้อมประวัติจากตาราง recommendation
- **สินค้าทั้งหมด**: ค้นหา, กรองหมวด, ราคา, เรียงลำดับ, ซ่อนสินค้าที่มีสารที่ฉันแพ้
- **รายละเอียดสินค้า**: % ตรงกับผิว, ข้อมูล subclass, ส่วนผสม (สารที่เราแพ้เป็นสีแดง), รีวิว, เขียนรีวิว
- **ผู้ดูแล**: รายงานแบรนด์ (view), รายงานหมวดหมู่, สมาชิก, จัดการสินค้า (แก้ราคา/ลบ), เพิ่มสินค้า, ประวัติราคา
- **ปุ่ม API มุมขวาล่าง**: เปิดดู request ทุกอันพร้อม status code ใช้ตอนเดโมให้เห็น 401, 403, 409

# 13. สคริปต์เดโม 15 นาที

เตรียมก่อนขึ้น: รัน 01-04 ใหม่ให้ข้อมูลสะอาด, เปิด `npm run dev`, เปิด Workbench ไว้ที่ `05_demo_queries.sql`, เปิด browser 1 หน้าต่างที่ยังไม่ login, ซูมหน้าจอให้คนข้างหลังเห็น

| เวลา | ใครพูด (แบ่งเอง) | ทำอะไร | พูดว่า |
|---|---|---|---|
| 0:00-1:30 | คนที่ 1 | สไลด์/report: ปัญหา, เป้าหมาย | "SkinMatch จับคู่สกินแคร์กับผิวของแต่ละคน และตัดสินค้าที่มีสารที่คนนั้นแพ้" |
| 1:30-4:00 | คนที่ 1 | รูป schema (Figure 3) | สิ่งที่เพิ่มจาก Project 1 ทั้ง 6 อย่างและเหตุผล, EER specialization, 3NF |
| 4:00-8:00 | คนที่ 2 | เว็บ: login Member 1 → ทำแบบสอบถาม → ดูคำแนะนำ → เปิดสินค้า | "กดบันทึกคือ transaction 4 ตาราง แล้ว CALL procedure ที่ใช้ fn_match_score" ชี้ว่าสินค้าที่มีน้ำหอมไม่อยู่ในคำแนะนำ, ในหน้ารายการขึ้น "มีสารที่คุณแพ้", เขียนรีวิวซ้ำโชว์ 409 |
| | | เปิดปุ่ม API ให้ดู status code | ลองเข้าหน้า admin ด้วย URL ตอนเป็น member → 403 |
| 8:00-10:00 | คนที่ 2 | logout → login admin → แก้ราคา → แท็บประวัติราคา → รายงานแบรนด์ | "log นี้ trigger เขียนเอง ตัวแอปไม่ได้ INSERT" |
| 10:00-13:30 | คนที่ 3 | Workbench: 6.7 relational division, 5.2 HAVING, 9.1 function, 11.1 ROLLBACK, 1.4 ลองใส่ rating 9, 10.3 subtype ผิด | อธิบายผลแต่ละข้อสั้นๆ |
| 13:30-15:00 | คนที่ 3 | 12.1 SHOW GRANTS + สรุป | "แอปใช้บัญชีที่ไม่มีสิทธิ์ DROP, report เห็นแค่ view" |

ถ้าเวลาเหลือน้อยให้ตัด Workbench เหลือ 6.7 กับ 11.1 สองข้อ เพราะเว็บโชว์ส่วนอื่นไปแล้ว

**แผนสำรอง**: ถ้าเว็บพังวันจริง เดโมจาก `05_demo_queries.sql` อย่างเดียวได้ครบทุกข้อกำหนด

# 14. คำถามที่น่าจะโดนถาม พร้อมคำตอบ

**Q1 ทำไม SKIN_PROFILE เป็น weak entity ทั้งที่มี profile_id ของตัวเอง**
ความหมายคือมันอยู่เดี่ยวๆ ไม่ได้ ต้องมี user เจ้าของเสมอ (total participation) เราใช้ surrogate key เพื่อให้ bridge table อ้างถึงง่าย แต่บังคับความเป็นเจ้าของด้วย FK NOT NULL + UNIQUE + ON DELETE CASCADE

**Q2 1:1 บังคับยังไง**
UNIQUE บน skin_profile.user_id (ลองใส่ซ้ำใน 1.4 จะ error)

**Q3 ทำไม review กับ recommendation ไม่ใช้ composite PK (user_id, product_id)**
recommendation แนะนำสินค้าเดิมให้คนเดิมได้หลายครั้ง (เป็น log) เลยต้องมี id ของตัวเอง ส่วน review ใช้ surrogate key ให้อ้างถึงง่าย แต่มี UNIQUE(user_id, product_id) กันรีวิวซ้ำ

**Q4 view ต่างจาก table ยังไง ทำไมใช้**
view ไม่เก็บข้อมูลเอง เป็น query ที่ตั้งชื่อไว้ ใช้ซ่อนความซับซ้อน (catalog) และใช้เป็นขอบเขตสิทธิ์ (report เห็นแค่ view ไม่เห็น users)

**Q5 function กับ procedure ต่างกันยังไง**
function คืนค่าเดียว ใช้ใน SELECT/WHERE/ORDER BY ได้ ไม่ควรแก้ข้อมูล ส่วน procedure เรียกด้วย CALL แก้ข้อมูลได้ คืนผลเป็น result set หรือ OUT parameter

**Q6 ทำไม function ต้องเขียน READS SQL DATA**
MySQL 8 ที่เปิด binary log บังคับให้บอกว่า function ทำงานแบบไหน ไม่งั้น error 1418

**Q7 trigger SIGNAL แล้วเกิดอะไร**
คำสั่งที่ทำให้ trigger ทำงานถูกยกเลิกทั้งคำสั่ง เพราะ InnoDB ถือว่า statement กับ trigger ของมันเป็นหน่วยเดียว

**Q8 ทำไมโปรไฟล์ต้องใช้ transaction ทั้งที่แต่ละคำสั่งก็ atomic อยู่แล้ว**
แต่ละคำสั่ง atomic แค่ตัวมันเอง ถ้าลบ concerns เก่าสำเร็จแต่ใส่ใหม่พัง ผู้ใช้จะเหลือโปรไฟล์ที่ไม่มี concern เลย transaction ทำให้ทั้งชุดย้อนกลับ

**Q9 SELECT ... FOR UPDATE ใช้ทำไม**
ล็อกแถวโปรไฟล์ไว้จน COMMIT ถ้ากดบันทึกพร้อมกันสองแท็บ อีกอันจะรอ ไม่ทับกัน

**Q10 SAVEPOINT คืออะไร**
จุดที่ย้อนกลับไปได้กลางทาง ใน 11.3 เก็บการแก้ครั้งแรก ยกเลิกเฉพาะครั้งที่สอง

**Q11 role ใน users กับ role ใน MySQL ต่างกันไหม**
คนละเรื่อง `users.role` คือสิทธิ์ในแอป (member/admin) ตรวจด้วย middleware ส่วน SQL role (sm_reader ฯลฯ) คือชุดสิทธิ์ของบัญชี MySQL

**Q12 ทำไมไม่ให้ admin ของแอปมีบัญชี MySQL**
ผู้ใช้เว็บมีได้เป็นพันคน การสร้างบัญชี MySQL ให้ทุกคนจัดการยากและเสี่ยง เลยให้แอปใช้บัญชีเดียวที่สิทธิ์จำกัด แล้วคุมสิทธิ์รายคนในแอป

**Q13 กัน SQL injection ยังไง**
ใช้ `?` placeholder ทุกค่า ค่าไม่เคยถูกต่อเป็น string ใน SQL, ORDER BY เลือกจาก list ตายตัว, และบัญชีแอปไม่มีสิทธิ์ DROP อยู่แล้ว

**Q14 ทำไม hash ใน Node ไม่ใช้ SHA2() ของ MySQL**
SHA2 เร็วและไม่มี salt รหัสเดียวกันได้ hash เดียวกัน เดาได้ง่าย และต้องส่งรหัสจริงไปที่ MySQL ซึ่งอาจถูกบันทึกใน query log, scrypt ช้าโดยตั้งใจและมี salt ต่อคน

**Q15 index ที่สร้างมีอะไร ทำไม**
`idx_product_category_price (category, price)` เพราะหน้ารายการกรองตามหมวดและราคาบ่อย และ `idx_reco_user_date` สำหรับดูประวัติคำแนะนำ PK/UNIQUE/FK มี index อยู่แล้ว

**Q16 ข้อมูล 18 แถว EXPLAIN ไม่ใช้ index**
optimizer เลือก full scan ได้เมื่อตารางเล็กมากเพราะถูกกว่า ดู possible_keys จะเห็นว่าใช้ index ได้ ถ้าข้อมูลเยอะจะเลือก index

**Q17 คะแนนเฉลี่ยเก็บไว้ไหน**
ไม่เก็บ คำนวณสดใน view ถ้าเก็บจะเป็นข้อมูลซ้ำ (redundant) และต้องคอยอัปเดตให้ตรง

**Q18 ถ้าลบ user เกิดอะไรขึ้น**
CASCADE ลบ skin_profile → bridge ของโปรไฟล์, review และ recommendation ของ user นั้นหายตาม

**Q19 ถ้าลบส่วนผสมที่ยังมีสินค้าใช้อยู่**
ไม่ได้ เพราะ product_ingredient อ้าง ingredient แบบ ON DELETE RESTRICT

**Q20 ต่อยอดได้อีกไหม**
กฎส่วนผสมที่ไม่ควรใช้คู่กัน (เรตินอลกับวิตามินซี), ปรับค่า effectiveness จากคะแนนรีวิวจริง, full-text search ชื่อสินค้า

# 15. Checklist ก่อนวันนำเสนอ

- [ ] รัน 01-04 บน Mac จริงอย่างน้อยหนึ่งรอบ ถ้ามี error แก้ก่อน
- [ ] รัน `npm install` และ `npm run dev` ลอง login ทั้ง 4 บัญชี
- [ ] รูปหน้าจอใน report (Figure 4-5) ทำจากหน้าเว็บตัวจริงด้วยข้อมูลชุดเดียวกัน ถ้าอยากชัวร์ ให้แคปหน้าจอจากเครื่องตัวเองแล้วเปลี่ยนรูปใน report
- [ ] ตรวจชื่อ-รหัสนักศึกษาในหน้าปก report
- [ ] ซ้อมเดโมจับเวลาให้ไม่เกิน 15 นาที และแบ่งว่าใครตอบส่วนไหน (อาจารย์สุ่มถามรายคน ทุกคนควรอ่านข้อ 8, 10, 11, 14)
- [ ] หัวหน้าทีมเป็นคนส่งไฟล์ ดูชื่อไฟล์และวิธีส่งใน Google Classroom

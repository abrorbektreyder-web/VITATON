# 📋 VITAMIN SHOP TMA — TEXNIK TOPSHIRIQ

Ushbu hujjat **Vitaminlar** sotuvi uchun **USDT/TON** to'lovlari bilan ishlaydigan Telegram Mini App (TMA) loyihasining to'liq rejasi.

---

## 1. MAHSULOT VIZIYASI
- **Nomi:** VitaTON (yoki o'zingiz tanlagan nom)
- **Maqsadi:** Xavfsiz va sodda kripto-to'lov orqali vitaminlar savdosi.
- **Asosiy foydalanuvchi:** Telegram foydalanuvchilari.

---

## 2. FEATURE PRIORITIZATSIYA (MoSCoW)
- **MUST HAVE (MVP):** TMA interfeysi, hamyon nusxalash, rasm yuklash, admin bot.
- **SHOULD HAVE:** Buyurtmalar tarixi, mahsulotlar katalogi.
- **COULD HAVE:** Blockchain orqali avtomatik tekshiruv.

---

## 3. TEXNIK STACK
- **Frontend:** React + Vite + Tailwind CSS
- **Backend/DB:** Supabase (Database + Storage)
- **Admin Bot:** GrammY (Node.js)
- **Hosting:** Vercel

---

## ✅ ISHLAR RO'YXATI (CHECKLIST)

Quyidagi bosqichlarni ketma-ket bajarish orqali loyihani bitkazasiz:

### 🛠 BOSQICH 1: TAYYORGARLIK (SETUP)
1. [ ] **BotFather** orqali yangi bot yaratish va `BOT_TOKEN` olish.
2. [ ] **Supabase**-da yangi loyiha ochish.
3. [ ] Supabase Database-da `orders` jadvalini yaratish (ID, tg_nik, photo_url, status, created_at).
4. [ ] Supabase **Storage**-da `receipts` nomli public "bucket" yaratish (rasmlar uchun).

### 🎨 BOSQICH 2: FRONTEND (MINI APP UI)
5. [ ] **React + Vite** loyihasini yaratish va o'rnatish.
6. [ ] **Tailwind CSS**-ni sozlash (chiroyli dizayn uchun).
7. [ ] **Telegram Mini App SDK**-ni loyihaga ulash (`@telegram-apps/sdk`).
8. [ ] **Asosiy Ekran:** Hamyon manzillarini (USDT/TON) ko'rsatuvchi va nusxa oluvchi komponent.
9. [ ] **Forma:** Telegram Nik kiritish inputi va Rasm tanlash (file input) qismi.
10. [ ] **Rasm yuklash logikasi:** Tanlangan rasmni Supabase Storage-ga yuklama.
11. [ ] **Ma'lumotlarni saqlash:** Nik va rasm linkini Supabase Database-ga yozish.

### 🤖 BOSQICH 3: ADMIN BARCHA VA BILDIRISHLAR
12. [ ] **GrammY** frameworki yordamida admin botini sozlash.
13. [ ] **Xavfsiz ulanish:** Botdan faqat sizga (Admin ID) xabar kelishini ta'minlash.
14. [ ] **Webhook/Trigger:** Supabase-ga yangi ma'lumot tushganda botga xabar yuborish funksiyasi.

### 🚀 BOSQICH 4: DEPLOY VA TEST
15. [ ] Frontend-ni **Vercel**-ga deploy qilish.
16. [ ] BotFather-da **Menu Button** yoki **Inline Button** orqali Mini App-ga havola berish.
17. [ ] **Final Test:** To'lov qilish, rasm yuklash va botga xabar kelishini tekshirish.

---

## 📐 ARXITEKTURA SXEMASI
`MIJOZ (TMA)` ➔ `SUPABASE STORAGE (Foto)` ➔ `SUPABASE DB (Ma'muotlar)` ➔ `ADMIN BOT (Xabarnoma)`

---

**Siz tayyor bo'lganingizda 1-banddan boshlashimiz mumkin!**

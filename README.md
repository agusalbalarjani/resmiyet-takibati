# Portal Resmiyet — versi gratis

Arsitektur:

Browser
  -> Render (Node.js/Express)
  -> Apps Script Web App (API)
  -> Google Spreadsheet

Tidak memakai Google Cloud Service Account.

## 1. Update Code.gs di Apps Script

Ganti/isi Code.gs dengan file `Code.gs` dari paket ini.

Jalankan `setupDatabase()` sekali jika database belum pernah dibuat.

Lalu di Apps Script:
- Project Settings -> Script Properties
- Tambahkan:
  - Property: `RENDER_API_KEY`
  - Value: buat sendiri, contoh `portal-rahasia-2026-acak`

Deploy -> New deployment -> Web app:
- Execute as: Me
- Who has access: Anyone

Salin URL `/exec`, contohnya:
`https://script.google.com/macros/s/XXXXXXXX/exec`

## 2. Upload ke GitHub

Upload seluruh isi folder ini ke repository GitHub.

Jangan upload `.env` atau password API asli.

## 3. Deploy di Render

Buat Web Service dari repository GitHub.

Build Command:
`npm install`

Start Command:
`npm start`

Tambahkan Environment Variables:
- `GAS_API_URL` = URL Web App Apps Script Anda
- `GAS_API_KEY` = nilai yang sama persis dengan Script Property `RENDER_API_KEY`

Setelah deploy, Render memberi URL:
`https://nama-service.onrender.com`

## 4. Catatan keamanan

API key hanya disimpan di Render dan Script Properties. Jangan ditaruh di index.html.

Password login lama yang tertanam pada mode preview sudah tidak dipakai oleh bridge Render; autentikasi online diarahkan ke Apps Script/Spreadsheet.

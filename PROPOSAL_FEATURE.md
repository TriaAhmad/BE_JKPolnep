# Fitur Pengajuan Proposal PDF — Dokumentasi Lengkap

## Gambaran Umum

Fitur ini menambahkan kemampuan bagi **user** untuk mengajukan proposal kegiatan dalam bentuk PDF, dan bagi **admin** untuk mengelola persetujuan proposal tersebut.

---

## File Baru yang Ditambahkan

| File | Deskripsi |
|------|-----------|
| `src/models/proposal.model.ts` | Model Mongoose & validasi Yup untuk proposal |
| `src/controllers/proposal.controller.ts` | Semua logika bisnis proposal (submit, review, approval) |
| `src/middlewares/proposal.middleware.ts` | Middleware Multer khusus PDF (validasi tipe file + limit 10MB) |

## File yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `src/routes/api.ts` | Ditambahkan 9 endpoint baru untuk proposal |
| `src/utils/uploader.ts` | Ditambahkan `uploadPDF()` dan `removePDF()` untuk Cloudinary |

---

## Daftar Endpoint API

### USER Endpoints (role: user / admin)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/proposals` | Mengajukan proposal baru (upload PDF) |
| `GET` | `/api/proposals/my` | Melihat daftar proposal milik sendiri |
| `GET` | `/api/proposals/my/:id` | Melihat detail proposal milik sendiri |

### ADMIN Endpoints (role: admin saja)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/proposals` | Melihat semua proposal (filter: status, event) |
| `GET` | `/api/proposals/stats` | Statistik ringkasan (total, pending, approved, rejected) |
| `GET` | `/api/proposals/:id` | Melihat detail satu proposal |
| `PUT` | `/api/proposals/:id/approve` | Menyetujui proposal |
| `PUT` | `/api/proposals/:id/reject` | Menolak proposal (wajib sertakan alasan) |
| `DELETE` | `/api/proposals/:id` | Menghapus proposal |

---

## Cara Menggunakan

### 1. Submit Proposal (User)

```http
POST /api/proposals
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
  title        : "Proposal Seminar Nasional 2025"
  description  : "Deskripsi singkat mengenai kegiatan yang diusulkan"
  event        : "60d21b4667d0d8992e610c85"   ← ObjectId event yang dituju
  pdf          : [file.pdf]                    ← File PDF maks 10MB
```

**Response sukses:**
```json
{
  "data": {
    "_id": "...",
    "title": "Proposal Seminar Nasional 2025",
    "description": "...",
    "pdfUrl": "https://res.cloudinary.com/.../proposal.pdf",
    "status": "pending",
    "event": { "name": "...", "startDate": "...", "endDate": "..." },
    "submittedBy": { "fullname": "...", "username": "...", "email": "..." },
    "reviewNote": null,
    "reviewedBy": null,
    "reviewedAt": null,
    "createdAt": "..."
  },
  "message": "Proposal berhasil diajukan"
}
```

### 2. Lihat Proposal Saya (User)

```http
GET /api/proposals/my?page=1&limit=10&search=seminar
Authorization: Bearer <token>
```

### 3. Menyetujui Proposal (Admin)

```http
PUT /api/proposals/:id/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reviewNote": "Proposal memenuhi syarat dan disetujui untuk dilanjutkan"
}
```

### 4. Menolak Proposal (Admin)

```http
PUT /api/proposals/:id/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reviewNote": "Proposal ditolak karena kurang lengkap pada bagian anggaran"
}
```
> ⚠️ `reviewNote` **wajib diisi** saat menolak, agar user tahu alasan penolakan.

### 5. Lihat Semua Proposal + Filter (Admin)

```http
GET /api/proposals?status=pending&page=1&limit=10
GET /api/proposals?status=approved&event=60d21b4667d0d8992e610c85
GET /api/proposals?search=seminar
Authorization: Bearer <admin-token>
```

### 6. Statistik Proposal (Admin)

```http
GET /api/proposals/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "data": {
    "total": 42,
    "pending": 15,
    "approved": 22,
    "rejected": 5
  },
  "message": "Berhasil mendapatkan statistik proposal"
}
```

---

## Status Proposal

| Status | Keterangan |
|--------|-----------|
| `pending` | Baru diajukan, menunggu review admin |
| `approved` | Disetujui oleh admin |
| `rejected` | Ditolak oleh admin |

> Proposal hanya bisa di-approve/reject jika statusnya masih `pending`.

---

## Skema Data Proposal (MongoDB)

```typescript
{
  title: String,           // Judul proposal
  description: String,     // Deskripsi proposal
  pdfUrl: String,          // URL PDF di Cloudinary
  event: ObjectId,         // Referensi ke Event
  submittedBy: ObjectId,   // Referensi ke User yang mengajukan
  status: "pending" | "approved" | "rejected",
  reviewNote: String,      // Catatan dari admin (alasan approve/reject)
  reviewedBy: ObjectId,    // Referensi ke Admin yang mereview
  reviewedAt: String,      // Waktu direview (ISO string)
  createdAt: Date,
  updatedAt: Date
}
```

---

## Aturan Upload PDF

- **Tipe file:** Hanya `.pdf` (validasi MIME type `application/pdf`)
- **Ukuran maksimum:** 10 MB
- **Storage:** Cloudinary folder `events/proposals/`
- **resource_type:** `raw` (diperlukan agar PDF bisa diakses via URL)

---

## Catatan untuk Skripsi

Fitur ini relevan dengan judul skripsi karena:

1. **Integrasi FCM (Firebase Cloud Messaging):** Ketika admin menyetujui/menolak proposal, Anda bisa mengirim push notification ke user melalui FCM. Tambahkan pengiriman notifikasi di dalam method `approve()` dan `reject()` pada controller.

2. **Alur kerja nyata Politeknik Negeri Pontianak:** Fitur ini mensimulasikan proses pengajuan proposal kegiatan kampus secara digital.

### Contoh integrasi FCM di controller:
```typescript
// Setelah update status, kirim notifikasi FCM
await admin.messaging().send({
  token: userFcmToken,   // token dari tabel user
  notification: {
    title: "Status Proposal Anda",
    body: `Proposal "${proposal.title}" telah DISETUJUI`,
  },
  data: { proposalId: id, status: "approved" },
});
```

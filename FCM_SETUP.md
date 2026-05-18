# Setup Firebase Cloud Messaging (FCM) — Panduan Lengkap

## 1. Buat Project Firebase

1. Buka https://console.firebase.google.com
2. Klik **"Add project"** → isi nama project (misal: `polnep-event`)
3. Setelah project dibuat, buka **Project Settings** (ikon ⚙️)

## 2. Download Service Account Key

1. Di Project Settings → tab **"Service accounts"**
2. Pilih **"Firebase Admin SDK"** → pilih **Node.js**
3. Klik **"Generate new private key"**
4. Simpan file JSON yang didownload sebagai:
   ```
   firebase-service-account.json
   ```
   Taruh di **root folder project** (sejajar dengan `package.json`)

> ⚠️ JANGAN commit file ini ke Git! Sudah dimasukkan ke `.gitignore`

## 3. Isi .env

```env
FCM_PROJECT_ID="polnep-event"   ← isi sesuai Project ID Firebase kamu
```

Project ID bisa dilihat di Firebase Console → Project Settings → General → **Project ID**

## 4. Install dependency

```bash
npm install
# firebase-admin sudah ditambahkan di package.json
```

## 5. Jalankan project

```bash
npm run dev
```

Jika berhasil akan muncul log:
```
[FCM] Firebase Admin SDK berhasil diinisialisasi.
database status: connected
server running on http://localhost:3000
```

---

## Alur Kerja FCM di Sistem Ini

```
Frontend/Mobile                 Backend (Express)              Firebase FCM
─────────────────               ──────────────────────         ────────────
1. User login
   ↓ dapat JWT token
2. Inisialisasi FCM SDK
   getToken() → fcmToken
   ↓
3. PUT /api/notifications/     → Simpan fcmToken
   fcm-token                     ke user document
   { fcmToken: "..." }           di MongoDB

─── Saat Admin Approve Proposal ──────────────────────────────────────────────

4. Admin: PUT /api/proposals/:id/approve
                                ↓
                           Ubah status → approved
                                ↓
                           Ambil fcmToken dari
                           user.submittedBy
                                ↓
                           fcm.sendToDevice()  →  FCM Server
                                                       ↓
                                               Kirim ke device
                                               user pengaju ←─────────────────
5.                                                     ↑
   User terima notif: ←───────────────────────────────┘
   "✅ Proposal Disetujui"
   "Proposal [judul] Anda
    telah disetujui admin"
```

---

## Endpoint FCM

### PUT /api/notifications/fcm-token
Dipanggil frontend setelah mendapat FCM token dari Firebase SDK.

```http
PUT /api/notifications/fcm-token
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "fcmToken": "c8Fx3h...token_dari_firebase_sdk"
}
```

### DELETE /api/notifications/fcm-token
Dipanggil saat user logout agar tidak dapat notifikasi.

```http
DELETE /api/notifications/fcm-token
Authorization: Bearer <jwt_token>
```

### POST /api/notifications/send (Admin)
Kirim notifikasi manual. Jika `targetUserId` kosong → broadcast ke semua user.

```http
POST /api/notifications/send
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "title": "Pengumuman Penting",
  "body": "Jadwal kegiatan telah diperbarui",
  "targetUserId": "60d21b4667d0d8992e610c85",  ← opsional
  "data": {
    "type": "announcement",
    "refId": ""
  }
}
```

### POST /api/notifications/send-topic (Admin)
Kirim ke semua user yang subscribe topic di frontend.

```http
POST /api/notifications/send-topic
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "topic": "all-users",
  "title": "Kegiatan Baru",
  "body": "Seminar Nasional 2025 telah dibuka pendaftarannya"
}
```

---

## Otomatis Terkirim Saat:

| Kejadian | Penerima | Isi Notifikasi |
|----------|----------|----------------|
| Proposal **disetujui** admin | User pengaju | "✅ Proposal Disetujui" |
| Proposal **ditolak** admin | User pengaju | "❌ Proposal Ditolak + alasan" |

---

## Kode Frontend (contoh Flutter/Dart)

```dart
// 1. Inisialisasi FCM
final messaging = FirebaseMessaging.instance;
await messaging.requestPermission();

// 2. Dapatkan token
final fcmToken = await messaging.getToken();

// 3. Kirim ke backend
await http.put(
  Uri.parse('$baseUrl/api/notifications/fcm-token'),
  headers: {
    'Authorization': 'Bearer $jwtToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({'fcmToken': fcmToken}),
);

// 4. Handle notifikasi masuk
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Notifikasi: ${message.notification?.title}');
  print('Data: ${message.data}');
  // Navigasi ke halaman proposal jika data['type'] == 'proposal_approved'
});
```

## Kode Frontend (contoh React Native / Expo)

```javascript
import messaging from '@react-native-firebase/messaging';

// Dapatkan token & kirim ke backend
const token = await messaging().getToken();
await fetch(`${BASE_URL}/api/notifications/fcm-token`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fcmToken: token }),
});

// Handle notifikasi foreground
messaging().onMessage(async remoteMessage => {
  console.log('FCM message:', remoteMessage);
});
```

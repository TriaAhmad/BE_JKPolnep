/**
 * Firebase Cloud Messaging (FCM) Utility
 * 
 * Menggunakan firebase-admin SDK untuk mengirim push notification
 * ke device user melalui FCM.
 * 
 * Setup:
 *   1. Buka Firebase Console → Project Settings → Service Accounts
 *   2. Klik "Generate new private key" → simpan sebagai firebase-service-account.json
 *   3. Taruh file tersebut di root project (jangan di-commit ke git!)
 *   4. Isi FCM_PROJECT_ID di .env
 */

import * as firebaseAdmin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";
import { FCM_PROJECT_ID } from "./env";

let isInitialized = false;

/**
 * Inisialisasi Firebase Admin SDK (hanya sekali)
 */
function initFirebase(): void {
    if (isInitialized || firebaseAdmin.apps.length > 0) {
        isInitialized = true;
        return;
    }

    const serviceAccountPath = path.resolve(
        process.cwd(),
        "firebase-service-account.json"
    );

    if (!fs.existsSync(serviceAccountPath)) {
        console.warn(
            "[FCM] WARNING: firebase-service-account.json tidak ditemukan.\n" +
            "  → Download dari Firebase Console → Project Settings → Service Accounts\n" +
            "  → Simpan sebagai firebase-service-account.json di root project."
        );
        return;
    }

    try {
        const serviceAccount = JSON.parse(
            fs.readFileSync(serviceAccountPath, "utf8")
        );

        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
            projectId: FCM_PROJECT_ID,
        });

        isInitialized = true;
        console.log("[FCM] Firebase Admin SDK berhasil diinisialisasi.");
    } catch (err) {
        console.error("[FCM] Gagal inisialisasi Firebase Admin SDK:", err);
    }
}

// Inisialisasi saat modul pertama kali dimuat
initFirebase();

// ─── Tipe Data ────────────────────────────────────────────────────────────────

export interface FcmPayload {
    title: string;
    body: string;
    /** Data tambahan (key-value string) yang diterima di frontend */
    data?: Record<string, string>;
    /** URL gambar notifikasi (opsional) */
    imageUrl?: string;
}

export interface FcmResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// ─── Fungsi Pengiriman ────────────────────────────────────────────────────────

/**
 * Kirim notifikasi ke SATU device berdasarkan FCM token
 */
async function sendToDevice(
    fcmToken: string,
    payload: FcmPayload
): Promise<FcmResult> {
    if (!isInitialized || firebaseAdmin.apps.length === 0) {
        return { success: false, error: "Firebase Admin SDK belum diinisialisasi" };
    }

    try {
        const message: firebaseAdmin.messaging.Message = {
            token: fcmToken,
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
            },
            data: payload.data || {},
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    clickAction: "FLUTTER_NOTIFICATION_CLICK",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };

        const messageId = await firebaseAdmin.messaging().send(message);
        return { success: true, messageId };
    } catch (error: any) {
        console.error("[FCM] Gagal kirim notifikasi ke device:", error?.message);
        return { success: false, error: error?.message };
    }
}

/**
 * Kirim notifikasi ke BANYAK device sekaligus (maks 500 token)
 */
async function sendToMultipleDevices(
    fcmTokens: string[],
    payload: FcmPayload
): Promise<{ successCount: number; failureCount: number; results: FcmResult[] }> {
    if (!isInitialized || firebaseAdmin.apps.length === 0) {
        return {
            successCount: 0,
            failureCount: fcmTokens.length,
            results: fcmTokens.map(() => ({
                success: false,
                error: "Firebase Admin SDK belum diinisialisasi",
            })),
        };
    }

    if (fcmTokens.length === 0) {
        return { successCount: 0, failureCount: 0, results: [] };
    }

    const messages: firebaseAdmin.messaging.Message[] = fcmTokens.map((token) => ({
        token,
        notification: {
            title: payload.title,
            body: payload.body,
            ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
        },
        data: payload.data || {},
        android: {
            priority: "high" as const,
            notification: {
                sound: "default",
                clickAction: "FLUTTER_NOTIFICATION_CLICK",
            },
        },
        apns: {
            payload: {
                aps: { sound: "default", badge: 1 },
            },
        },
    }));

    try {
        const batchResponse = await firebaseAdmin.messaging().sendEach(messages);

        const results: FcmResult[] = batchResponse.responses.map((r) => ({
            success: r.success,
            messageId: r.messageId,
            error: r.error?.message,
        }));

        return {
            successCount: batchResponse.successCount,
            failureCount: batchResponse.failureCount,
            results,
        };
    } catch (error: any) {
        console.error("[FCM] Gagal batch send:", error?.message);
        return {
            successCount: 0,
            failureCount: fcmTokens.length,
            results: fcmTokens.map(() => ({
                success: false,
                error: error?.message,
            })),
        };
    }
}

/**
 * Kirim notifikasi ke TOPIC (semua user yang subscribe topic tersebut)
 * Contoh topic: "all-users", "event-12345"
 */
async function sendToTopic(
    topic: string,
    payload: FcmPayload
): Promise<FcmResult> {
    if (!isInitialized || firebaseAdmin.apps.length === 0) {
        return { success: false, error: "Firebase Admin SDK belum diinisialisasi" };
    }

    try {
        const message: firebaseAdmin.messaging.Message = {
            topic,
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
            },
            data: payload.data || {},
            android: {
                priority: "high",
                notification: { sound: "default" },
            },
            apns: {
                payload: { aps: { sound: "default" } },
            },
        };

        const messageId = await firebaseAdmin.messaging().send(message);
        return { success: true, messageId };
    } catch (error: any) {
        console.error("[FCM] Gagal kirim ke topic:", error?.message);
        return { success: false, error: error?.message };
    }
}

// ─── Template Notifikasi Siap Pakai ──────────────────────────────────────────

const notifications = {
    /**
     * Notifikasi: proposal disetujui
     */
    proposalApproved(proposalTitle: string, proposalId: string): FcmPayload {
        return {
            title: "✅ Proposal Disetujui",
            body: `Proposal "${proposalTitle}" Anda telah disetujui oleh admin.`,
            data: {
                type: "proposal_approved",
                proposalId,
                click_action: "OPEN_PROPOSAL_DETAIL",
            },
        };
    },

    /**
     * Notifikasi: proposal ditolak
     */
    proposalRejected(proposalTitle: string, proposalId: string, reason: string): FcmPayload {
        return {
            title: "❌ Proposal Ditolak",
            body: `Proposal "${proposalTitle}" ditolak. Alasan: ${reason}`,
            data: {
                type: "proposal_rejected",
                proposalId,
                click_action: "OPEN_PROPOSAL_DETAIL",
            },
        };
    },

    /**
     * Notifikasi: kegiatan baru dipublikasikan
     */
    newEvent(eventName: string, eventId: string): FcmPayload {
        return {
            title: "📅 Kegiatan Baru",
            body: `Kegiatan baru telah ditambahkan: "${eventName}"`,
            data: {
                type: "new_event",
                eventId,
                click_action: "OPEN_EVENT_DETAIL",
            },
        };
    },

    /**
     * Notifikasi: pengingat kegiatan (H-1)
     */
    eventReminder(eventName: string, eventId: string, startDate: string): FcmPayload {
        return {
            title: "⏰ Pengingat Kegiatan",
            body: `Kegiatan "${eventName}" akan berlangsung besok, ${startDate}`,
            data: {
                type: "event_reminder",
                eventId,
                click_action: "OPEN_EVENT_DETAIL",
            },
        };
    },

    /**
     * Notifikasi: pengumuman umum
     */
    announcement(title: string, message: string): FcmPayload {
        return {
            title,
            body: message,
            data: {
                type: "announcement",
                click_action: "OPEN_HOME",
            },
        };
    },
};

export default {
    sendToDevice,
    sendToMultipleDevices,
    sendToTopic,
    notifications,
};

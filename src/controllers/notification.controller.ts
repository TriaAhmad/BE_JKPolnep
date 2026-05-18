import { Response } from "express";
import { IReqUser } from "../utils/interfaces";
import response from "../utils/response";
import UserModel from "../models/user.model";
import fcm from "../utils/fcm";
import * as Yup from "yup";

export default {
    /**
     * User/Admin: Menyimpan/update FCM token device ke profil user
     * Dipanggil dari frontend setelah mendapat token dari Firebase SDK
     */
    async updateFcmToken(req: IReqUser, res: Response) {
        try {
            const schema = Yup.object({
                fcmToken: Yup.string().required("FCM token wajib diisi"),
            });
            const { fcmToken } = await schema.validate(req.body);

            const user = await UserModel.findByIdAndUpdate(
                req.user?.id,
                { fcmToken },
                { new: true, select: "-password -activationCode" }
            );

            if (!user) {
                return res.status(404).json({ data: null, message: "User tidak ditemukan" });
            }

            response.success(res, { fcmToken: user.fcmToken }, "FCM token berhasil disimpan");
        } catch (error) {
            response.error(res, error, "Gagal menyimpan FCM token");
        }
    },

    /**
     * User/Admin: Menghapus FCM token (logout / cabut izin notifikasi)
     */
    async removeFcmToken(req: IReqUser, res: Response) {
        try {
            await UserModel.findByIdAndUpdate(req.user?.id, { fcmToken: null });
            response.success(res, null, "FCM token berhasil dihapus");
        } catch (error) {
            response.error(res, error, "Gagal menghapus FCM token");
        }
    },

    /**
     * ADMIN: Kirim notifikasi manual ke satu user atau broadcast ke semua user
     * Body: { title, body, targetUserId?, data? }
     */
    async sendNotification(req: IReqUser, res: Response) {
        try {
            const schema = Yup.object({
                title: Yup.string().required("Judul notifikasi wajib diisi"),
                body: Yup.string().required("Isi notifikasi wajib diisi"),
                targetUserId: Yup.string().nullable().optional(),
                data: Yup.object().optional(),
            });
            const { title, body, targetUserId, data } = await schema.validate(req.body);

            const payload = {
                title,
                body,
                data: (data as Record<string, string>) || {},
            };

            // ── Kirim ke SATU user tertentu ──────────────────────────
            if (targetUserId) {
                const targetUser = await UserModel.findById(targetUserId).select("fcmToken fullname");
                if (!targetUser) {
                    return res.status(404).json({ data: null, message: "User tujuan tidak ditemukan" });
                }
                if (!targetUser.fcmToken) {
                    return res.status(400).json({
                        data: null,
                        message: "User tujuan belum memiliki FCM token (belum login di device)",
                    });
                }

                const result = await fcm.sendToDevice(targetUser.fcmToken, payload);
                return response.success(res, result, `Notifikasi berhasil dikirim ke ${targetUser.fullname}`);
            }

            // ── Broadcast ke SEMUA user yang punya FCM token ─────────
            const allUsers = await UserModel.find(
                { fcmToken: { $ne: null } },
                { fcmToken: 1 }
            );

            const tokens = allUsers
                .map((u) => u.fcmToken)
                .filter((t): t is string => !!t);

            if (tokens.length === 0) {
                return res.status(400).json({
                    data: null,
                    message: "Tidak ada user dengan FCM token aktif",
                });
            }

            const result = await fcm.sendToMultipleDevices(tokens, payload);
            return response.success(
                res,
                {
                    totalTarget: tokens.length,
                    successCount: result.successCount,
                    failureCount: result.failureCount,
                },
                `Broadcast notifikasi selesai: ${result.successCount}/${tokens.length} berhasil`
            );
        } catch (error) {
            response.error(res, error, "Gagal mengirim notifikasi");
        }
    },

    /**
     * ADMIN: Kirim notifikasi ke topic FCM
     * (semua user yang subscribe topic di frontend)
     */
    async sendToTopic(req: IReqUser, res: Response) {
        try {
            const schema = Yup.object({
                topic: Yup.string().required("Nama topic wajib diisi"),
                title: Yup.string().required("Judul notifikasi wajib diisi"),
                body: Yup.string().required("Isi notifikasi wajib diisi"),
                data: Yup.object().optional(),
            });
            const { topic, title, body, data } = await schema.validate(req.body);

            const result = await fcm.sendToTopic(topic, {
                title,
                body,
                data: (data as Record<string, string>) || {},
            });

            response.success(res, result, `Notifikasi berhasil dikirim ke topic "${topic}"`);
        } catch (error) {
            response.error(res, error, "Gagal mengirim notifikasi ke topic");
        }
    },
};

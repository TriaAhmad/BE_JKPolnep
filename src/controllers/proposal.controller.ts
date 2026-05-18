import { Response } from "express";
import { IReqUser, IPaginationQuery } from "../utils/interfaces";
import response from "../utils/response";
import ProposalModel, { proposalDAO, PROPOSAL_STATUS, TProposal } from "../models/proposal.model";
import uploader from "../utils/uploader";
import UserModel from "../models/user.model";
import fcm from "../utils/fcm";
import { FilterQuery } from "mongoose";
import * as Yup from "yup";

export default {
  /**
   * User: Mengajukan proposal (upload PDF)
   */
  async submit(req: IReqUser, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          data: null,
          message: "File PDF proposal wajib diunggah",
        });
      }

      // Upload PDF ke Cloudinary dengan resource_type: "raw" agar PDF bisa diakses
      const uploadResult = await uploader.uploadPDF(req.file);

      const payload: TProposal = {
        ...req.body,
        pdfUrl: uploadResult.secure_url,
        submittedBy: req.user?.id as any,
        status: PROPOSAL_STATUS.PENDING,
      };

      await proposalDAO.validate(payload);
      const result = await ProposalModel.create(payload);

      const populated = await result.populate([
        { path: "submittedBy", select: "fullname username email" },
        { path: "event", select: "name startDate endDate" },
      ]);

      response.success(res, populated, "Proposal berhasil diajukan");
    } catch (error) {
      response.error(res, error, "Gagal mengajukan proposal");
    }
  },

  /**
   * User: Melihat proposal milik sendiri
   */
  async myProposals(req: IReqUser, res: Response) {
    try {
      const {
        limit = 10,
        page = 1,
        search,
      } = req.query as unknown as IPaginationQuery;

      const query: FilterQuery<TProposal> = {
        submittedBy: req.user?.id,
      };

      if (search) {
        Object.assign(query, {
          ...query,
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        });
      }

      const result = await ProposalModel.find(query)
        .populate({ path: "event", select: "name startDate endDate slug" })
        .populate({ path: "reviewedBy", select: "fullname username" })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();

      const count = await ProposalModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          current: page,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        "Berhasil mendapatkan daftar proposal"
      );
    } catch (error) {
      response.error(res, error, "Gagal mendapatkan daftar proposal");
    }
  },

  /**
   * User: Lihat detail proposal milik sendiri
   */
  async myProposalDetail(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const result = await ProposalModel.findOne({
        _id: id,
        submittedBy: req.user?.id,
      })
        .populate({ path: "event", select: "name startDate endDate slug banner" })
        .populate({ path: "reviewedBy", select: "fullname username" });

      if (!result) {
        return res.status(404).json({
          data: null,
          message: "Proposal tidak ditemukan",
        });
      }

      response.success(res, result, "Berhasil mendapatkan detail proposal");
    } catch (error) {
      response.error(res, error, "Gagal mendapatkan detail proposal");
    }
  },

  /**
   * Admin: Melihat semua proposal (dengan filter status & event)
   */
  async findAll(req: IReqUser, res: Response) {
    try {
      const {
        limit = 10,
        page = 1,
        search,
      } = req.query as unknown as IPaginationQuery;

      const { status, event } = req.query as {
        status?: string;
        event?: string;
      };

      const query: FilterQuery<TProposal> = {};

      if (status && Object.values(PROPOSAL_STATUS).includes(status as any)) {
        Object.assign(query, { status });
      }

      if (event) {
        Object.assign(query, { ...query, event });
      }

      if (search) {
        Object.assign(query, {
          ...query,
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        });
      }

      const result = await ProposalModel.find(query)
        .populate({ path: "submittedBy", select: "fullname username email" })
        .populate({ path: "event", select: "name startDate endDate slug" })
        .populate({ path: "reviewedBy", select: "fullname username" })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .exec();

      const count = await ProposalModel.countDocuments(query);

      response.pagination(
        res,
        result,
        {
          current: page,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        "Berhasil mendapatkan semua proposal"
      );
    } catch (error) {
      response.error(res, error, "Gagal mendapatkan semua proposal");
    }
  },

  /**
   * Admin: Melihat detail satu proposal
   */
  async findOne(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const result = await ProposalModel.findById(id)
        .populate({ path: "submittedBy", select: "fullname username email profilePicture" })
        .populate({ path: "event", select: "name startDate endDate slug banner category" })
        .populate({ path: "reviewedBy", select: "fullname username" });

      if (!result) {
        return res.status(404).json({
          data: null,
          message: "Proposal tidak ditemukan",
        });
      }

      response.success(res, result, "Berhasil mendapatkan detail proposal");
    } catch (error) {
      response.error(res, error, "Gagal mendapatkan detail proposal");
    }
  },

  /**
   * Admin: Menyetujui proposal + kirim FCM notification ke user
   */
  async approve(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { reviewNote } = req.body;

      const schema = Yup.object({
        reviewNote: Yup.string().nullable().optional(),
      });
      await schema.validate({ reviewNote });

      const proposal = await ProposalModel.findById(id);
      if (!proposal) {
        return res.status(404).json({ data: null, message: "Proposal tidak ditemukan" });
      }

      if (proposal.status !== PROPOSAL_STATUS.PENDING) {
        return res.status(400).json({
          data: null,
          message: `Proposal tidak dapat disetujui, status saat ini: ${proposal.status}`,
        });
      }

      const result = await ProposalModel.findByIdAndUpdate(
        id,
        {
          status: PROPOSAL_STATUS.APPROVED,
          reviewNote: reviewNote || "Proposal disetujui",
          reviewedBy: req.user?.id,
          reviewedAt: new Date().toISOString(),
        },
        { new: true }
      )
        .populate({ path: "submittedBy", select: "fullname username email fcmToken" })
        .populate({ path: "event", select: "name startDate endDate" })
        .populate({ path: "reviewedBy", select: "fullname username" });

      // ── Kirim FCM push notification ke user pengaju ───────────────
      const submitter = result?.submittedBy as any;
      if (submitter?.fcmToken) {
        const notifPayload = fcm.notifications.proposalApproved(
          result!.title,
          id
        );
        await fcm.sendToDevice(submitter.fcmToken, notifPayload).catch((err) => {
          // Jangan gagalkan response meski FCM error
          console.error("[FCM] Gagal kirim notifikasi approve:", err);
        });
      }

      response.success(res, result, "Proposal berhasil disetujui");
    } catch (error) {
      response.error(res, error, "Gagal menyetujui proposal");
    }
  },

  /**
   * Admin: Menolak proposal + kirim FCM notification ke user
   */
  async reject(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const { reviewNote } = req.body;

      const schema = Yup.object({
        reviewNote: Yup.string().required("Alasan penolakan wajib diisi"),
      });
      await schema.validate({ reviewNote });

      const proposal = await ProposalModel.findById(id);
      if (!proposal) {
        return res.status(404).json({ data: null, message: "Proposal tidak ditemukan" });
      }

      if (proposal.status !== PROPOSAL_STATUS.PENDING) {
        return res.status(400).json({
          data: null,
          message: `Proposal tidak dapat ditolak, status saat ini: ${proposal.status}`,
        });
      }

      const result = await ProposalModel.findByIdAndUpdate(
        id,
        {
          status: PROPOSAL_STATUS.REJECTED,
          reviewNote,
          reviewedBy: req.user?.id,
          reviewedAt: new Date().toISOString(),
        },
        { new: true }
      )
        .populate({ path: "submittedBy", select: "fullname username email fcmToken" })
        .populate({ path: "event", select: "name startDate endDate" })
        .populate({ path: "reviewedBy", select: "fullname username" });

      // ── Kirim FCM push notification ke user pengaju ───────────────
      const submitter = result?.submittedBy as any;
      if (submitter?.fcmToken) {
        const notifPayload = fcm.notifications.proposalRejected(
          result!.title,
          id,
          reviewNote
        );
        await fcm.sendToDevice(submitter.fcmToken, notifPayload).catch((err) => {
          console.error("[FCM] Gagal kirim notifikasi reject:", err);
        });
      }

      response.success(res, result, "Proposal berhasil ditolak");
    } catch (error) {
      response.error(res, error, "Gagal menolak proposal");
    }
  },

  /**
   * Admin: Menghapus proposal
   */
  async remove(req: IReqUser, res: Response) {
    try {
      const { id } = req.params;
      const result = await ProposalModel.findByIdAndDelete(id, { new: true });

      if (!result) {
        return res.status(404).json({ data: null, message: "Proposal tidak ditemukan" });
      }

      // Hapus PDF dari Cloudinary
      if (result.pdfUrl) {
        await uploader.removePDF(result.pdfUrl).catch(() => {});
      }

      response.success(res, result, "Proposal berhasil dihapus");
    } catch (error) {
      response.error(res, error, "Gagal menghapus proposal");
    }
  },

  /**
   * Admin: Statistik ringkasan proposal
   */
  async stats(_req: IReqUser, res: Response) {
    try {
      const [total, pending, approved, rejected] = await Promise.all([
        ProposalModel.countDocuments({}),
        ProposalModel.countDocuments({ status: PROPOSAL_STATUS.PENDING }),
        ProposalModel.countDocuments({ status: PROPOSAL_STATUS.APPROVED }),
        ProposalModel.countDocuments({ status: PROPOSAL_STATUS.REJECTED }),
      ]);

      response.success(
        res,
        { total, pending, approved, rejected },
        "Berhasil mendapatkan statistik proposal"
      );
    } catch (error) {
      response.error(res, error, "Gagal mendapatkan statistik proposal");
    }
  },
};

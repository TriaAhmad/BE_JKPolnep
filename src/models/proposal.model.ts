import mongoose, { ObjectId } from "mongoose";
import * as Yup from "yup";

const Schema = mongoose.Schema;

export const PROPOSAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type TProposalStatus = (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

export const proposalDAO = Yup.object({
  title: Yup.string().required("Judul proposal wajib diisi"),
  description: Yup.string().required("Deskripsi proposal wajib diisi"),
  pdfUrl: Yup.string().required("File PDF proposal wajib diunggah"),
  event: Yup.string().required("ID kegiatan wajib diisi"),
  submittedBy: Yup.string(),
  status: Yup.string()
    .oneOf(Object.values(PROPOSAL_STATUS))
    .default(PROPOSAL_STATUS.PENDING),
  reviewNote: Yup.string().nullable(),
  reviewedBy: Yup.string().nullable(),
  reviewedAt: Yup.string().nullable(),
});

export type TProposal = Yup.InferType<typeof proposalDAO>;

export interface Proposal extends Omit<TProposal, "event" | "submittedBy" | "reviewedBy"> {
  event: ObjectId;
  submittedBy: ObjectId;
  reviewedBy?: ObjectId | null;
}

const ProposalSchema = new Schema<Proposal>(
  {
    title: {
      type: Schema.Types.String,
      required: true,
    },
    description: {
      type: Schema.Types.String,
      required: true,
    },
    pdfUrl: {
      type: Schema.Types.String,
      required: true,
    },
    event: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Event",
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    status: {
      type: Schema.Types.String,
      enum: Object.values(PROPOSAL_STATUS),
      default: PROPOSAL_STATUS.PENDING,
    },
    reviewNote: {
      type: Schema.Types.String,
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Schema.Types.String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ProposalModel = mongoose.model("Proposal", ProposalSchema);

export default ProposalModel;

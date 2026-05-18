import express, {Request, Response} from "express";
import authController from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import aclMiddleware from "../middlewares/acl.middleware";
import { ROLES } from "../utils/constant";
import mediaMiddleware from "../middlewares/media.middleware";
import mediaController from "../controllers/media.controller";
import categoryController from "../controllers/category.controller";
import regionController from "../controllers/region.controller";
import eventController from "../controllers/event.controller";
import proposalController from "../controllers/proposal.controller";
import proposalMiddleware from "../middlewares/proposal.middleware";
import notificationController from "../controllers/notification.controller";

const router = express.Router();

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/me", authMiddleware, authController.me);
router.post("/auth/activation", authController.activation);

// router.get("/test-acl", 
//     [authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.USER])], 
//     (req:Request, res:Response) => {
//         res.status(200).json({
//             data: "success",
//             message: "OK",
//         });
//  });

router.post("/category", [authMiddleware, aclMiddleware([ROLES.ADMIN])], 
categoryController.create
    /*
    #swagger.tags = ['Category']
    #swagger.security = [{
    "bearerAuth": {}
    }]
    #swagger.requestBody = {
    required: true,
    schema:{
    $ref: "#/components/schemas/CreateCategoryRequest"
    }
    }
    */
);
router.get("/category", categoryController.findAll
    /*
    #swagger.tags = ['Category']
    */
);
router.get("/category/:id", categoryController.findOne
    /*
    #swagger.tags = ['Category']
    */
);
router.put("/category/:id", [authMiddleware, aclMiddleware([ROLES.ADMIN])], 
categoryController.update
    /*
     #swagger.tags = ['Category']
     #swagger.security = [{
     "bearerAuth": {}
     }]   
     #swagger.requestBody = {
     required: true,
     schema: {
     $ref:"#/components/schemas/CreateCategoryRequest"
     }
     }
    */
);
router.delete("/category/:id", [authMiddleware, aclMiddleware([ROLES.ADMIN])],
categoryController.remove
    /* 
    #swagger.tags = ['Category']
    #swagger.security = [{
        "bearerAuth": {}
    }]
    */
);

router.post("/media/upload-single", [
    authMiddleware,
    aclMiddleware([ROLES.ADMIN, ROLES.USER]),
    mediaMiddleware.single("file"),
], mediaController.single
    /*
    #swagger.tags = ['Media']
    #swagger.security = [{
     "bearerAuth": {}
    }]
     #swagger.requestBody = {
        required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            file: {
                                type: "string",
                                format: "binary"
                            }
                        }
                    }
                }
            }
        }
    */
);
router.post("/media/upload-multiple",[
    authMiddleware,
    aclMiddleware([ROLES.ADMIN, ROLES.USER]),
    mediaMiddleware.multiple("files"),
], mediaController.multiple
    /*
    #swagger.tags = ["Media"]
    #swagger.security = [{
        "bearerAuth": {}
    }]
        #swagger.requestBody = {
            required: true,
            content: {
                "multipart/form-data": {
                    schema: {
                        type: "object",
                        properties: {
                            files: {
                                type: "array",
                                items: {
                                    type: "string",
                                    format: "binary"
                                }
                            }
                        }
                    }
                }
            }
        }
     */
);
router.delete("/media/remove",[
    authMiddleware,
    aclMiddleware([ROLES.ADMIN, ROLES.USER]),
], mediaController.remove
    /*
        #swagger.tags = ["Media"]
        #swagger.security = [{
            "bearerAuth": {}
        }]
        #swagger.requestBody = {
            required: true,
            schema: {
             $ref: "#/components/schemas/RemovesMediaComponents"
            }
        }
    */
);

router.get("/regions", regionController.getAllProvinces
    /*
    #swagger.tags = ['Regions']
    */
);
router.get("/regions/:id/province", regionController.getProvince
    /*
    #swagger.tags = ['Regions']
    */
);
router.get("/regions/:id/regency", regionController.getRegency
    /*
    #swagger.tags = ['Regions']
    */
);
router.get("/regions/:id/district", regionController.getDistrict
    /*
    #swagger.tags = ['Regions']
    */
);
router.get("/regions/:id/village", regionController.getVillage
    /*
    #swagger.tags = ['Regions']
    */
);
router.get("/regions-search",regionController.findByCity
    /*
    #swagger.tags = ['Regions']
    */
);

router.post("/events", [authMiddleware, aclMiddleware([ROLES.ADMIN])], 
eventController.create
    /*
    #swagger.tags = ['Events']
    #swagger.security = [{
     "bearerAuth": {}
    }]
     #swagger.requestBody = {
     required: true,
     schema: {
     $ref: "#/components/schemas/CreateEventRequest"
     }
     }
    */
);
router.get("/events", eventController.findAll
     /*
    #swagger.tags = ['Events']
    */
);
router.get("/events/:id", eventController.findOne
    /*
    #swagger.tags = ['Events']
    */
);
router.put("/events/:id", [authMiddleware, aclMiddleware([ROLES.ADMIN])], 
eventController.update
   /*
    #swagger.tags = ['Events']
    #swagger.security = [{
     "bearerAuth": {}
    }]
     #swagger.requestBody = {
     required: true,
     schema: {
     $ref: "#/components/schemas/CreateEventRequest"
     }
     }
    */
   );
router.delete("/events/:id", [authMiddleware, aclMiddleware([ROLES.ADMIN])], 
eventController.remove
/*
    #swagger.tags = ['Events']
    #swagger.security = [{
     "bearerAuth": {}
    }]
    */);
router.get("/events/:slug/slug", eventController.findOneBySlug
    /*
    #swagger.tags = ["Events"]
    */
);

// =============================================
// PROPOSAL ROUTES
// =============================================

// USER: Mengajukan proposal PDF untuk sebuah kegiatan
router.post(
  "/proposals",
  [
    authMiddleware,
    aclMiddleware([ROLES.ADMIN, ROLES.USER]),
    proposalMiddleware.single("pdf"),
    proposalMiddleware.errorHandler,
  ],
  proposalController.submit
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
    #swagger.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["title", "description", "event", "pdf"],
            properties: {
              title: { type: "string", example: "Proposal Seminar Nasional 2025" },
              description: { type: "string", example: "Deskripsi singkat proposal kegiatan" },
              event: { type: "string", example: "60d21b4667d0d8992e610c85" },
              pdf: { type: "string", format: "binary" }
            }
          }
        }
      }
    }
  */
);

// USER: Melihat daftar proposal milik sendiri
router.get(
  "/proposals/my",
  [authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.USER])],
  proposalController.myProposals
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

// USER: Melihat detail proposal milik sendiri
router.get(
  "/proposals/my/:id",
  [authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.USER])],
  proposalController.myProposalDetail
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

// ADMIN: Melihat semua proposal (bisa filter status & event)
router.get(
  "/proposals",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  proposalController.findAll
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
    #swagger.parameters['status'] = {
      in: 'query', description: 'Filter status: pending | approved | rejected', schema: { type: 'string' }
    }
    #swagger.parameters['event'] = {
      in: 'query', description: 'Filter berdasarkan ID kegiatan', schema: { type: 'string' }
    }
  */
);

// ADMIN: Statistik ringkasan proposal
router.get(
  "/proposals/stats",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  proposalController.stats
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

// ADMIN: Melihat detail satu proposal
router.get(
  "/proposals/:id",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  proposalController.findOne
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

// ADMIN: Menyetujui proposal
router.put(
  "/proposals/:id/approve",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  proposalController.approve
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
    #swagger.requestBody = {
      required: false,
      schema: { $ref: "#/components/schemas/ReviewProposalRequest" }
    }
  */
);

// ADMIN: Menolak proposal
router.put(
  "/proposals/:id/reject",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  proposalController.reject
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
    #swagger.requestBody = {
      required: true,
      schema: { $ref: "#/components/schemas/ReviewProposalRequest" }
    }
  */
);

// ADMIN: Menghapus proposal
router.delete(
  "/proposals/:id",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  proposalController.remove
  /*
    #swagger.tags = ['Proposals']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

// =============================================
// NOTIFICATION / FCM ROUTES
// =============================================

// USER/ADMIN: Simpan FCM token device setelah login di frontend/mobile
router.put(
  "/notifications/fcm-token",
  [authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.USER])],
  notificationController.updateFcmToken
  /*
    #swagger.tags = ['Notifications']
    #swagger.security = [{ "bearerAuth": {} }]
    #swagger.requestBody = {
      required: true,
      schema: { $ref: "#/components/schemas/UpdateFcmTokenRequest" }
    }
  */
);

// USER/ADMIN: Hapus FCM token (saat logout)
router.delete(
  "/notifications/fcm-token",
  [authMiddleware, aclMiddleware([ROLES.ADMIN, ROLES.USER])],
  notificationController.removeFcmToken
  /*
    #swagger.tags = ['Notifications']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

// ADMIN: Kirim notifikasi manual ke user tertentu atau broadcast ke semua
router.post(
  "/notifications/send",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  notificationController.sendNotification
  /*
    #swagger.tags = ['Notifications']
    #swagger.security = [{ "bearerAuth": {} }]
    #swagger.requestBody = {
      required: true,
      schema: { $ref: "#/components/schemas/SendNotificationRequest" }
    }
  */
);

// ADMIN: Kirim notifikasi ke FCM topic
router.post(
  "/notifications/send-topic",
  [authMiddleware, aclMiddleware([ROLES.ADMIN])],
  notificationController.sendToTopic
  /*
    #swagger.tags = ['Notifications']
    #swagger.security = [{ "bearerAuth": {} }]
  */
);

export default router;



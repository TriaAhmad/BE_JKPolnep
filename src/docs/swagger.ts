import swaggerAutogen from "swagger-autogen";

const doc = {
    info: {
        version: "v0.0.1",
        title: "Dokumentasi API Event - Polnep",
        description: "Dokumentasi API Website Jadwal Kegiatan Politeknik Negeri Pontianak",
    },

    servers: [
        {
            url: "http://localhost:3000/api",
            description: "Local Server",
        },
        {
            url: "https://backend-event-cyan.vercel.app/api",
            description: "Deploy Server",
        },
    ],

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
            },
        },
        schemas: {
            LoginRequest: {
                identifier: "triaAhmad",
                password: "amer2345",
            },
            RegisterRequest: {
                fullname: "Tria Ahmad",
                username: "triaAhmad",
                email: "matchakubawa@gmail.com",
                password: "amer2345",
                confirmPassword: "amer2345",
            },
            ActivationRequest: {
                code: "abcdef",
            },
            CreateCategoryRequest: {
                name: "",
                description: "",
                icon: "",
            },
            CreateEventRequest: {
                name: " ",
                banner: "fileUrl",
                category: "category ObjectID",
                description: "",
                startDate: "yyyy-mm-dd hh:mm:ss",
                endDate: "yyyy-mm-dd hh:mm:ss",
                location: {
                    region: "region id",
                    coordinates: [0, 0],
                },
                isOnline: false,
                isFeatured: false,
            },
            RemoveMediaRequest: {
                fileUrl: "",
            },
            // ── Proposal ──────────────────────────────────────────────
            ReviewProposalRequest: {
                reviewNote: "Catatan dari admin mengenai keputusan review proposal",
            },
            // ── FCM / Notifikasi ──────────────────────────────────────
            UpdateFcmTokenRequest: {
                fcmToken: "token_fcm_dari_firebase_sdk",
            },
            SendNotificationRequest: {
                title: "Judul Notifikasi",
                body: "Isi pesan notifikasi",
                targetUserId: "userId_tujuan_opsional_kosong_untuk_broadcast",
                data: {
                    type: "info",
                    refId: "ObjectId_opsional",
                },
            },
        },
    },
};

const outputFile = "./swagger_output.json";
const endpointFiles = ["../routes/api.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointFiles, doc);

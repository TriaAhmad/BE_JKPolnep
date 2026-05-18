import {v2 as cloudinary} from "cloudinary";
import Multer from "multer";
import  {CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "./env";

cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
});

const toDataURL = (file: Express.Multer.File) => {
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURL = `data:${file.mimetype};base64,${b64}`;
    return dataURL;
};

const getPublicIdFromFileUrl = (fileUrl: string) => {
    const fileNameUsingSubstring = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
    const publicId = fileNameUsingSubstring.substring(
    0, 
    fileNameUsingSubstring.lastIndexOf("."));
    return publicId;
};

export default {
    async uploadSingle(file: Express.Multer.File) {
        const fileDataURL = toDataURL(file);
        const result = await cloudinary.uploader.upload(fileDataURL, {
            resource_type: "auto",
            folder: "events/media",
        });
        return result;
    },
    async uploadPDF(file: Express.Multer.File) {
        const fileDataURL = toDataURL(file);
        const result = await cloudinary.uploader.upload(fileDataURL, {
            resource_type: "raw",   // "raw" wajib untuk PDF agar bisa diakses
            folder: "events/proposals",
            format: "pdf",
        });
        return result;
    },
    async uploadMultiple(files: Express.Multer.File[]) {
        const uploadBatch = files.map((item) => {
            const result = this.uploadSingle(item);
            return result;
        });
        const result = await Promise.all(uploadBatch);
        return result;
    },
    async remove(fileUrl: string) {
        const publicId = getPublicIdFromFileUrl(fileUrl);
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    },
    async removePDF(fileUrl: string) {
        const publicId = getPublicIdFromFileUrl(fileUrl);
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw",
        });
        return result;
    },
};
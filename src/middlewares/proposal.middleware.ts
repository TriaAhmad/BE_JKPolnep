import multer from "multer";
import { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Hanya file PDF yang diizinkan"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Maksimal 10 MB
  },
});

const proposalUpload = {
  single(fieldName: string) {
    return upload.single(fieldName);
  },
  errorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          data: null,
          message: "Ukuran file PDF melebihi batas maksimum 10 MB",
        });
      }
      return res.status(400).json({ data: null, message: err.message });
    }
    if (err?.message === "Hanya file PDF yang diizinkan") {
      return res.status(400).json({ data: null, message: err.message });
    }
    next(err);
  },
};

export default proposalUpload;

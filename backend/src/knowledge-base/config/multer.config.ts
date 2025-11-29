import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';

// Tamanhos máximos de arquivo suportados pelo Gemini File Search (aprox.)
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',    // .xlsx
  'text/plain',
  'text/csv',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

export const multerOptions: MulterOptions = {
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, callback) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException(`Unsupported file type: ${file.mimetype}. Supported types are: ${SUPPORTED_MIME_TYPES.join(', ')}`), false);
    } else {
      callback(null, true);
    }
  },
};

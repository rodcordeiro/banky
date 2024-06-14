import { MulterOptions } from '@nest-lab/fastify-multer';

export const multerConfig: MulterOptions = {
  dest: './uploads',
  storage: {
    _handleFile(req, file, callback) {
      console.log(req, file, callback());
    },
    _removeFile(req, file, callback) {
      return callback();
    },
  },
};

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { FileInterceptor, FilesInterceptor } from '@nest-lab/fastify-multer';
import {
  Controller,
  Patch,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  // Logger,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UploadsService } from '../services/upload.services';

@ApiTags('Uploads')
@Controller({
  version: '1',
  path: '/uploads',
})
export class UploadsCrontroller {
  // private _logger = new Logger();
  constructor(private readonly _uploadsService: UploadsService) {}
  @Patch('/file')
  @ApiOperation({ summary: 'Uploads a single file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  singleFile(@UploadedFile() file: File) {
    return this._uploadsService.uploadFile(file);
  }

  @Patch('/files')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploads multiple files' })
  @UseInterceptors(FilesInterceptor('files', 4))
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  multipleFiles(@UploadedFiles() files: Array<File>) {
    return this._uploadsService.uploadFiles(files);
  }
}

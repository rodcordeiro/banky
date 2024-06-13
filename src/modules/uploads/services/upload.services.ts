import { FtpProviders } from '@/core/ftp/providers/ftp.provider';
import { Injectable } from '@nestjs/common';
import { mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class UploadsService {
  constructor(private readonly _ftpService: FtpProviders) {}

  async uploadToFtp(path: string, name: string) {
    try {
      await this._ftpService.upload(path, '/pontos/' + name);
    } catch (error) {
      throw new Error(error);
    }
  }

  async receiveFile(file: File) {
    const ext = file.originalname.split('.').reverse()[0];
    const name = `${new Date().getTime()}_${Math.floor(Math.random() * 666)}`;
    const parsedName = `${name}.${ext}`;

    const path = join('./', 'uploaded', parsedName);
    const _file = createWriteStream(path);

    _file.write(file.buffer);
    _file.end(async () => await this.uploadToFtp(path, parsedName));
    return {
      name: parsedName,
      originalName: file.originalname,
      mime: file.mimetype,
      size: file.size,
      url: 'http://raizes.rodrigocordeiro.com.br/pontos/' + parsedName,
    };
  }

  public async uploadFile(file: File) {
    mkdirSync('./uploaded', { recursive: true });

    return this.receiveFile(file);
  }

  public async uploadFiles(files: File[]) {
    return files.map(this.uploadFile);
  }
}

import { FastifyMulterModule } from '@nest-lab/fastify-multer';
import { Module } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { FtpModule } from 'nestjs-ftp';

import { UploadsCrontroller } from './controllers/upload.controller';
import { UploadsService } from './services/upload.services';
// import { ENV_VARIABLES } from '@/common/config/env.config';

@Module({
  imports: [
    FastifyMulterModule,
    // FtpModule.forRootFtpAsync({
    //   useFactory: async () => {
    //     return {
    //       host: ENV_VARIABLES.FTP_HOST,
    //       port: ENV_VARIABLES.FTP_PORT,
    //       password: ENV_VARIABLES.FTP_PWD,
    //       user: ENV_VARIABLES.FTP_USER,
    //       secure: false,
    //     };
    //   },
    //   inject: [ConfigService],
    // }),
  ],
  controllers: [UploadsCrontroller],
  providers: [UploadsService],
})
export class UploadsModule {}

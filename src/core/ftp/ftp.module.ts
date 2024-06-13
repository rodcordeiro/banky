import { Global, Module } from '@nestjs/common';
import { FtpProviders } from './providers/ftp.provider';

@Global()
@Module({
  providers: [FtpProviders],
  exports: [FtpProviders],
})
export class FtpModule {}

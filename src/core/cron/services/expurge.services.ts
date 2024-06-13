import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FtpProviders } from '@/core/ftp/providers/ftp.provider';
import { PointsService } from '@/modules/points/services/points.service';

@Injectable()
export class ExampleService {
  private readonly _logger = new Logger(ExampleService.name);
  constructor(
  ) {
    this._logger.log('ExampleService Initialized');
  }
  
  @Cron('0 0 9 * * *')
  async purgePontos() {
    this._logger.info('Cron Job runned');
  }
}

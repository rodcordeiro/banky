import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { FtpProviders } from '@/core/ftp/providers/ftp.provider';
import { PointsService } from '@/modules/points/services/points.service';

@Injectable()
export class ExpurgeServices {
  private readonly _logger = new Logger(ExpurgeServices.name);
  constructor(
    private _pontosService: PointsService,
    private readonly _ftpServices: FtpProviders,
  ) {
    this._logger.log('ExpurgeServices Initialized');
  }
  private itemsPresentInAAndNotInB(
    arrayA: Array<{ name: string; url: string }>,
    arrayB: Array<string>,
  ) {
    return arrayA.filter(item => !arrayB.includes(item.url));
  }
  @Cron('0 0 9 * * *')
  async purgePontos() {
    this._logger.log('Cleaning files not linked to database');
    try {
      const dirData = await this._ftpServices.list('/pontos/').then(data =>
        data.map(({ name }) => ({
          name,
          url: `https://raizes.rodrigocordeiro.com.br/pontos/${name}`,
        })),
      );

      const urls = await this._pontosService
        .getAudioUrls()
        .then(data => data.map(item => item.audio_url));

      const files_not_saved = this.itemsPresentInAAndNotInB(dirData, urls);
      for await (const file of files_not_saved) {
        const path = `/pontos/${file.name}`;
        this._logger.verbose(
          `Removing file ${file.name} for not being recognized on database`,
        );
        await this._ftpServices.delete(path);
      }
    } catch (err) {
      this._logger.error(err);
    }
  }
}

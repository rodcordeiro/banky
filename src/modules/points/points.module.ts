import { Module } from '@nestjs/common';

import { LinesModule } from '@/modules/lines/lines.module';
import { RythmsModule } from '@/modules/rythms/rythms.module';

import { PointsController } from './controllers/points.controller';
import { PointsService } from './services/points.service';
import { pointsProviders } from './providers/points.provider';

@Module({
  imports: [LinesModule, RythmsModule],
  controllers: [PointsController],
  providers: [...pointsProviders, PointsService],
  exports: [PointsService],
})
export class PointsModule {}

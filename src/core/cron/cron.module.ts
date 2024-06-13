import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ExpurgeServices } from './services/expurge.services';
import { PointsModule } from '@/modules/points/points.module';

@Module({
  imports: [ScheduleModule.forRoot(), PointsModule],
  providers: [ExpurgeServices],
})
export class CronModule {}

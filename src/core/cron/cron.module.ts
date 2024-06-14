import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ExampleService } from './services/expurge.services';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ExampleService],
})
export class CronModule {}

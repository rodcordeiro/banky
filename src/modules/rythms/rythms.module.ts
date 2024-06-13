import { Module } from '@nestjs/common';

import { RythmsController } from './controllers/rythms.controller';
import { RythmsService } from './services/rythms.service';
import { rythmsProviders } from './providers/rythms.provider';

@Module({
  imports: [],
  controllers: [RythmsController],
  providers: [...rythmsProviders, RythmsService],
  exports: [RythmsService],
})
export class RythmsModule {}

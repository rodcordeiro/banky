import { Module } from '@nestjs/common';

import { GirasController } from './controllers/giras.controller';
import { GirasService } from './services/giras.service';
import {
  girasLinhasProviders,
  girasProviders,
} from './providers/giras.provider';
import { LinesModule } from '../lines/lines.module';

@Module({
  imports: [LinesModule],
  controllers: [GirasController],
  providers: [...girasProviders, ...girasLinhasProviders, GirasService],
  exports: [GirasService],
})
export class GirasModule {}

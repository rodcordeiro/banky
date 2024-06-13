import { Module } from '@nestjs/common';

import { CategoriesModule } from '@/modules/categories/categories.module';

import { LineController } from './controllers/lines.controller';
import { LineServices } from './services/lines.service';
import { linesProviders } from './providers/lines.providers';

@Module({
  imports: [CategoriesModule],
  controllers: [LineController],
  providers: [...linesProviders, LineServices],
  exports: [LineServices],
})
export class LinesModule {}

import { Module } from '@nestjs/common';

import { CategoriesController } from '@/modules/categories/controllers/categories.controller';
import { CategoriesService } from '@/modules/categories/services/categories.service';
import { categoriesProviders } from './providers/categories.provider';

@Module({
  imports: [],
  controllers: [CategoriesController],
  providers: [...categoriesProviders, CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}

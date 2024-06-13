import { Module } from '@nestjs/common';

import { CategoryController } from '@/modules/categories/controllers/categories.controller';
import { CategoryServices } from '@/modules/categories/services/categories.service';
import { categoriesProviders } from './providers/categories.providers';

@Module({
  imports: [],
  controllers: [CategoryController],
  providers: [...categoriesProviders, CategoryServices],
  exports: [CategoryServices],
})
export class CategoriesModule {}

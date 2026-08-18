import { Module } from '@nestjs/common';

import { PaginationModule } from '@/core/paginate/paginate.module';
import { CategoriesController } from '@/modules/categories/controllers/categories.controller';
import { CategoriesService } from '@/modules/categories/services/categories.service';
import { categoriesProviders } from './providers/categories.provider';

@Module({
  imports: [PaginationModule],
  controllers: [CategoriesController],
  providers: [...categoriesProviders, CategoriesService],
  exports: [...categoriesProviders, CategoriesService],
})
export class CategoriesModule {}

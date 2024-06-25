import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';

import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDTO } from '../dto/create.dto';

@Auth()
@ApiTags('Categories')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: '/categories',
})
export class CategoriesController {
  constructor(private readonly _service: CategoriesService) {}

  @Get()
  async index() {
    return this._service.listAll();
  }

  @Get('/:id')
  async view(@Param('id') id: string) {
    return this._service.findOneBy({ id });
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateCategoryDTO,
  ) {
    return this._service.store({ ...data, owner: req.user.id });
  }

  @Put('/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: CreateCategoryDTO,
  ) {
    return this._service.update(id, { ...data, owner: req.user.id });
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this._service.destroy(id);
  }
}

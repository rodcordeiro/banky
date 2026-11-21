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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';
import { QueryPaginateDTO } from '@/core/paginate/dto/query-paginate.dto';

import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDTO } from '../dto/create.dto';

@Auth()
@ApiBearerAuth()
@ApiTags('Payment types')
@Controller({
  version: '1',
  path: '/payments',
})
export class PaymentsController {
  constructor(private readonly _service: PaymentsService) {}

  @Get()
  async index(@Query() query: QueryPaginateDTO) {
    return await this._service.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }

  @Get('/:id')
  async view(@Param('id') id: string) {
    return this._service.findOneBy({ id });
  }

  @Post()
  async create(@Body() data: CreatePaymentDTO) {
    return this._service.store(data);
  }

  @Put('/:id')
  async update(@Param('id') id: string, @Body() data: CreatePaymentDTO) {
    return this._service.update(id, data);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this._service.destroy(id);
  }
}

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
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';

import { TransactionsService } from '../services/transactions.service';
import { CreateTransactionDTO } from '../dto/create.dto';
import { QueryTransactionsDTO } from '../dto/query.dto';

@Auth()
@ApiTags('Transactions')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: '/transactions',
})
export class TransactionsController {
  constructor(private readonly _service: TransactionsService) {}

  @Get()
  async index(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryTransactionsDTO,
  ) {
    return await this._service.listAll({
      ...query,
      owner: req.user.id,
    });
  }

  @Get('/:id')
  async view(@Param('id') id: string) {
    return this._service.findOneBy({ id });
  }

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateTransactionDTO,
  ) {
    return this._service.store({ ...data, owner: req.user.id });
  }

  @Put('/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: Partial<CreateTransactionDTO>,
  ) {
    return this._service.update(id, { ...data, owner: req.user.id });
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this._service.destroy(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';

import { ExpensesService } from '@/modules/expenses/services/expenses.service';
import { CreateExpenseDTO } from '@/modules/expenses/dto/create.dto';
import { UpdateExpenseDTO } from '@/modules/expenses/dto/update.dto';

@Auth()
@ApiTags('Expense')
@Controller({
  version: '1',
  path: '/expenses',
})
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  async list(@Req() req: BankyRequest, @Res() res: FastifyReply) {
    const expenses = await this.expensesService.list(req.user.id);
    return res.header('X-TOTAL-EXPENSES', expenses.length).send(expenses);
  }

  @Get(':id')
  async view(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.expensesService.findOneBy({ id });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: BankyRequest, @Body() body: CreateExpenseDTO) {
    return this.expensesService.store({ ...body, owner: req.user.id });
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateExpenseDTO,
  ) {
    return this.expensesService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.expensesService.delete(id);
  }
}

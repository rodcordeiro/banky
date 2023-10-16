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

import { BillsService } from '@/modules/bills/services/bills.service';
import { CreateBillDTO } from '@/modules/bills/dto/create.dto';
import { UpdateBillDTO } from '@/modules/bills/dto/update.dto';

@Auth()
@ApiTags('Bills')
@Controller({
  version: '1',
  path: '/bills',
})
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  async list(@Req() req: BankyRequest, @Res() res: FastifyReply) {
    const bills = await this.billsService.list(req.user.id);
    return res.header('X-TOTAL-BILLS', bills.length).send(bills);
  }

  @Get(':id')
  async view(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.billsService.findOneBy({ id });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: BankyRequest, @Body() body: CreateBillDTO) {
    return this.billsService.store({ ...body, owner: req.user.id });
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateBillDTO,
  ) {
    return this.billsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.billsService.delete(id);
  }
}

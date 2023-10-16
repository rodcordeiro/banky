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

import { AccountsService } from '@/modules/accounts/services/accounts.service';
import { CreateAccountDTO } from '@/modules/accounts/dto/create.dto';
import { UpdateAccountDTO } from '@/modules/accounts/dto/update.dto';

@Auth()
@ApiTags('Accounts')
@Controller({
  version: '1',
  path: '/accounts',
})
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async list(@Req() req: BankyRequest, @Res() res: FastifyReply) {
    const accounts = await this.accountsService.list(req.user.id);
    return res.header('X-TOTAL-ACCOUNTS', accounts.length).send(accounts);
  }

  @Get(':id')
  async view(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.accountsService.findOneBy({ id });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: BankyRequest, @Body() body: CreateAccountDTO) {
    return this.accountsService.create({ ...body, owner: req.user.id });
  }

  @Put(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateAccountDTO,
  ) {
    return this.accountsService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.accountsService.delete(id);
  }
}

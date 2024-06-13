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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';

import { RythmsService } from '../services/rythms.service';
import { CreateRythmDTO } from '../dtos/create.dto';
import { UpdateRythmDTO } from '../dtos/update.dto';

@Auth()
@ApiTags('Ritmos')
@Controller({
  version: '1',
  path: '/rythm',
})
export class RythmsController {
  constructor(private readonly _service: RythmsService) {}

  @Get()
  async index() {
    return await this._service.findAll();
  }
  @Get('/:id')
  async view(@Param('id') id: number) {
    return this._service.findOneBy({ id: id });
  }
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateRythmDTO) {
    return this._service.store(data);
  }
  @Put('/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: number, @Body() data: UpdateRythmDTO) {
    return this._service.update(id, data);
  }
  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: number) {
    return this._service.destroy(id);
  }
}

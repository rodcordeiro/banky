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

import { LineServices } from '../services/lines.service';
import { CreateLineDTO } from '../dtos/create.dto';
import { UpdateLineDTO } from '../dtos/update.dto';

@ApiTags('Linhas')
@Controller({
  version: '1',
  path: '/lines',
})
export class LineController {
  constructor(private readonly _service: LineServices) {}

  @Get()
  async index() {
    return await this._service.findAll();
  }
  @Get('/:id')
  async view(@Param('id') id: number) {
    return this._service.findBy({ id: id });
  }
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: CreateLineDTO) {
    return this._service.store(data);
  }
  @Put('/:id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: number, @Body() data: UpdateLineDTO) {
    return this._service.update(id, data);
  }
  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: number) {
    return this._service.destroy(id);
  }
}

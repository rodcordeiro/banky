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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';

import {
  ParametersService,
  ParameterValuesService,
} from '../services/parameters.service';
import { CreateParameterDTO } from '../dto/create.dto';

@Auth()
@ApiTags('Parameters')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: '/parameters',
})
export class ParametersController {
  constructor(
    private readonly _service: ParametersService,
    private readonly _valuesService: ParameterValuesService,
  ) {}

  @Get()
  async findAllParams() {
    return await this._service.findAllParams();
  }
  @Get('values')
  async index(@Req() req: AuthenticatedRequest) {
    return await this._valuesService.findBy({ owner: req.user.id });
  }

  @Get('/:id')
  async view(@Param('id') id: string) {
    return this._service.findOneBy({ id });
  }

  @Post()
  async create(@Body() data: CreateParameterDTO) {
    return this._service.store(data);
  }

  @Put('/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: Partial<CreateParameterDTO>,
  ) {
    return this._service.update(id, data);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this._service.destroy(id);
  }
}

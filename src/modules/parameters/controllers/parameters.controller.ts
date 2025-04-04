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
import { CreateParameterDTO, CreateParameterValueDTO } from '../dto/create.dto';

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
    return await this._valuesService.findAll(req.user.id);
  }

  @Get('/:id')
  async view(@Param('id') id: string) {
    return this._service.findOneBy({ id });
  }

  @Get('values/:id')
  async viewValue(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this._valuesService.findByQueryBuilder(async qb => {
      qb.innerJoinAndSelect('a.parameter', 'b');
      qb.where(`a.parameter = '${id}'`);
      qb.andWhere(`a.owner = '${req.user.id}'`);
      return await qb.getMany();
    });
  }

  @Post()
  async create(@Body() data: CreateParameterDTO) {
    return this._service.store(data);
  }
  @Post('values')
  async createValue(
    @Req() req: AuthenticatedRequest,
    @Body() data: CreateParameterValueDTO,
  ) {
    return this._valuesService.store({ ...data, owner: req.user.id });
  }

  @Put('/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: Partial<CreateParameterDTO>,
  ) {
    return this._service.update(id, data);
  }
  @Put('values/:id')
  async updateValue(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() data: Partial<CreateParameterValueDTO>,
  ) {
    return this._valuesService.update(id, data);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this._service.destroy(id);
  }
  @Delete('values/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeValue(@Param('id') id: string) {
    return this._valuesService.destroy(id);
  }
}

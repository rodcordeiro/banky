import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '@/common/decorators/auth.decorator';
import { QueryPaginateDTO } from '@/core/paginate/dto/query-paginate.dto';

import { UsersService } from '@/modules/users/services/users.service';

@Auth()
@ApiTags('Users')
@ApiBearerAuth()
@Controller({
  version: '1',
  path: '/users',
})
export class UsersControllers {
  constructor(private readonly _usersService: UsersService) {}

  @Get()
  async index(@Query() query: QueryPaginateDTO) {
    return await this._usersService.findAll({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });
  }
  @Get('/me')
  async view(@Req() req: AuthenticatedRequest) {
    return this._usersService.findOneBy({ id: req.user.id });
  }
}

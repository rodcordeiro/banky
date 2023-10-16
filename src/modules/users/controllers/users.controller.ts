import { Controller, Get } from '@nestjs/common';
// import { ApiTags } from '@nestjs/swagger';

import { UsersService } from '@/modules/users/services/users.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller({
  version: '1',
  path: '/users',
})
export class UsersControllers {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async index() {
    return await this.usersService.findAll();
  }
}

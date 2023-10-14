import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

import { Authenticate } from '@/common/interfaces/authenticated.interface';

import { CreateUserDTO } from '@/modules/users/dto/create.dto';

import { AuthService } from '@/modules/auth/services/auth.service';
import { LocalAuth, Reauth } from '@/common/decorators/auth.decorator';

@ApiTags('auth')
@Controller({
  version: '1',
  path: '/auth',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @LocalAuth()
  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async login(@Req() req: BankyRequest) {
    return this.authService.login(req.user);
  }

  @Post('/register')
  async store(@Body() body: CreateUserDTO) {
    return this.authService.register(body);
  }

  @Reauth()
  @Post('/refresh')
  async refresh(@Req() req: Authenticate.IAuthenticatedUser) {
    return this.authService.reAuth({
      id: req.user.id,
      username: req.user.username,
    });
  }
}

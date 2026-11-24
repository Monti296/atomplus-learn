import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type AuthenticatedRequest } from './auth.guard';
import { type CurrentUserResponse, toCurrentUser } from './auth-user';

@ApiTags('me')
@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() request: AuthenticatedRequest): CurrentUserResponse {
    return toCurrentUser(request.authUser);
  }
}

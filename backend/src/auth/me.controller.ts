import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowDuringPasswordChange } from './allow-during-password-change.decorator';
import { type AuthenticatedRequest } from './auth.guard';
import { type CurrentUserResponse, toCurrentUser } from './auth-user';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ProfileService } from './profile.service';

@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly profile: ProfileService) {}

  @AllowDuringPasswordChange()
  @Get()
  getMe(@Req() request: AuthenticatedRequest): CurrentUserResponse {
    return toCurrentUser(request.authUser);
  }

  @Patch()
  async updateName(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateMeDto,
  ): Promise<CurrentUserResponse> {
    const user = await this.profile.updateName(request.authUser.id, body);
    return toCurrentUser(user);
  }

  @AllowDuringPasswordChange()
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.profile.changePassword(
      request.authUser.id,
      request.sessionId,
      body,
    );
  }
}

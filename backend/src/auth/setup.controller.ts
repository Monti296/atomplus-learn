import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { type CurrentUserResponse, toCurrentUser } from './auth-user';
import { FirstAdminDto } from './dto/first-admin.dto';
import { Public } from './public.decorator';
import { SetupService } from './setup.service';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  // Public on purpose: the first admin has no session yet. The setup token header
  // is the only guard, and the route stays off when SETUP_TOKEN is not set.
  @Public()
  @Post('first-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'X-Setup-Token',
    required: true,
    description: 'The SETUP_TOKEN value from the server settings.',
  })
  async createFirstAdmin(
    @Body() body: FirstAdminDto,
    @Headers('x-setup-token') token: string | undefined,
  ): Promise<CurrentUserResponse> {
    const user = await this.setup.createFirstAdmin(body, token ?? '');
    return toCurrentUser(user);
  }
}

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { ValidatedEnvironment } from '../../config/environment';
import { AllowDuringPasswordChange } from '../decorators/allow-during-password-change.decorator';
import { AuthService } from './auth.service';
import { type AuthenticatedRequest } from '../guards/auth.guard';
import { type CurrentUserResponse, toCurrentUser } from '../auth-user';
import { LoginDto } from './dto/login.dto';
import { Public } from '../decorators/public.decorator';
import { SessionsService } from '../sessions/sessions.service';
import {
  readSessionId,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_LIFETIME_MS,
  sessionCookieOptions,
} from '../sessions/session-cookie';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService<ValidatedEnvironment, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUserResponse> {
    const user = await this.auth.verifyCredentials(
      body.email,
      body.password,
      request.ip ?? 'unknown',
    );

    // A new session at every login; an old session from this browser is removed (SR-4).
    const previousSessionId = readSessionId(request.headers.cookie);
    if (previousSessionId) {
      await this.sessions.delete(previousSessionId);
    }

    const sessionId = await this.sessions.create(user.id);
    response.cookie(SESSION_COOKIE_NAME, sessionId, {
      ...sessionCookieOptions(this.cookieDomain()),
      maxAge: SESSION_IDLE_LIFETIME_MS,
    });

    return toCurrentUser(user);
  }

  @AllowDuringPasswordChange()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.delete(request.sessionId);
    response.clearCookie(
      SESSION_COOKIE_NAME,
      sessionCookieOptions(this.cookieDomain()),
    );
  }

  private cookieDomain(): string | undefined {
    return this.config.get('COOKIE_DOMAIN', { infer: true });
  }
}

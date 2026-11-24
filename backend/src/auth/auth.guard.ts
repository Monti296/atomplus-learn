import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { ValidatedEnvironment } from '../config/environment';
import type { AuthUser } from './auth-user';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionsService } from './sessions.service';
import {
  readSessionId,
  SESSION_COOKIE_NAME,
  SESSION_IDLE_LIFETIME_MS,
  sessionCookieOptions,
} from './session-cookie';

export interface AuthenticatedRequest extends Request {
  authUser: AuthUser;
  sessionId: string;
}

// Global guard: every route needs a valid session unless marked @Public().
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService<ValidatedEnvironment, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const sessionId = readSessionId(request.headers.cookie);
    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const active = await this.sessions.findActiveSession(sessionId);
    if (!active) {
      throw new UnauthorizedException();
    }

    request.authUser = active.user;
    request.sessionId = sessionId;

    if (active.refreshed) {
      const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
      response.cookie(SESSION_COOKIE_NAME, sessionId, {
        ...sessionCookieOptions(domain),
        maxAge: SESSION_IDLE_LIFETIME_MS,
      });
    }

    return true;
  }
}

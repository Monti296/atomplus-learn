import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginAttemptsService } from './login-attempts.service';
import { MeController } from './me.controller';
import { PasswordService } from './password/password.service';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    LoginAttemptsService,
    PasswordService,
    SessionsService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}

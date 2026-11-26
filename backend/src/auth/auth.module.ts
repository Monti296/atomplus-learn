import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './login/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './login/auth.service';
import { LoginAttemptsService } from './login/login-attempts.service';
import { MeController } from './profile/me.controller';
import { PasswordService } from './password/password.service';
import { ProfileService } from './profile/profile.service';
import { SessionsService } from './sessions/sessions.service';
import { SetupController } from './setup/setup.controller';
import { SetupService } from './setup/setup.service';

@Module({
  controllers: [AuthController, MeController, SetupController],
  providers: [
    AuthService,
    LoginAttemptsService,
    PasswordService,
    ProfileService,
    SessionsService,
    SetupService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}

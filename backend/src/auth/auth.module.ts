import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';
import { PasswordService } from './password/password.service';
import { SessionsService } from './sessions.service';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  controllers: [AuthController, MeController, SetupController],
  providers: [
    AuthService,
    PasswordService,
    SessionsService,
    SetupService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}

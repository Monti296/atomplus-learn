import { Module } from '@nestjs/common';
import { PasswordService } from '../auth/password/password.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PasswordService],
})
export class UsersModule {}

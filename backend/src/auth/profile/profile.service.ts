import { BadRequestException, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import {
  PasswordPolicyError,
  PasswordService,
} from '../password/password.service';
import { WEAK_PASSWORD_ERROR } from '../setup/setup.service';

export const CURRENT_PASSWORD_INCORRECT_ERROR = {
  code: 'CURRENT_PASSWORD_INCORRECT',
  message: 'The current password is not correct.',
} as const;

export const PASSWORD_UNCHANGED_ERROR = {
  code: 'PASSWORD_UNCHANGED',
  message: 'The new password must be different from the current one.',
} as const;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async updateName(userId: string, input: UpdateMeDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
    });
  }

  // Keeps the session that made the request; every other session of the user ends (SR-4).
  async changePassword(
    userId: string,
    currentSessionId: string,
    input: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const currentMatches = await this.passwordService.verify(
      user.passwordHash,
      input.currentPassword,
    );
    if (!currentMatches) {
      throw new BadRequestException(CURRENT_PASSWORD_INCORRECT_ERROR);
    }

    const sameAsCurrent = await this.passwordService.verify(
      user.passwordHash,
      input.newPassword,
    );
    if (sameAsCurrent) {
      throw new BadRequestException(PASSWORD_UNCHANGED_ERROR);
    }

    let passwordHash: string;
    try {
      passwordHash = await this.passwordService.hashNewPassword(
        input.newPassword,
      );
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw new BadRequestException(WEAK_PASSWORD_ERROR);
      }
      throw error;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.session.deleteMany({
        where: { userId, NOT: { id: currentSessionId } },
      });
    });
  }
}

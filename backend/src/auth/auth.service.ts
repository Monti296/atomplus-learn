import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { generateTemporaryPassword } from './password/temporary-password';
import { PasswordService } from './password/password.service';

export const INVALID_CREDENTIALS_ERROR = {
  code: 'INVALID_CREDENTIALS',
  message: 'Email or password is incorrect.',
} as const;

@Injectable()
export class AuthService {
  private unknownUserHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  // Same error for unknown email, wrong password and blocked user, so nothing
  // reveals which part was wrong (FR-1.1, FR-1.3).
  async verifyCredentials(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Checking a password even for unknown emails makes both cases take the same time.
    const hash = user?.passwordHash ?? (await this.getUnknownUserHash());
    const passwordMatches = await this.passwordService.verify(hash, password);

    if (!user || !passwordMatches || user.status !== 'active') {
      throw new UnauthorizedException(INVALID_CREDENTIALS_ERROR);
    }

    return user;
  }

  private getUnknownUserHash(): Promise<string> {
    this.unknownUserHash ??= this.passwordService.hashNewPassword(
      generateTemporaryPassword(),
    );
    return this.unknownUserHash;
  }
}

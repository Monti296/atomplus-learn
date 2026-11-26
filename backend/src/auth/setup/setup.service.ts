import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus, type User } from '@prisma/client';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import type { ValidatedEnvironment } from '../../config/environment';
import type { FirstAdminDto } from './dto/first-admin.dto';
import {
  PasswordPolicyError,
  PasswordService,
} from '../password/password.service';

export const INVALID_SETUP_TOKEN_ERROR = {
  code: 'SETUP_TOKEN_INVALID',
  message: 'The setup token is not correct.',
} as const;

export const SETUP_ALREADY_DONE_ERROR = {
  code: 'SETUP_ALREADY_DONE',
  message: 'Setup has already been completed.',
} as const;

export const EMAIL_TAKEN_ERROR = {
  code: 'EMAIL_TAKEN',
  message: 'An account with this email already exists.',
} as const;

export const WEAK_PASSWORD_ERROR = {
  code: 'WEAK_PASSWORD',
  message:
    'Password must be longer than 6 characters, with an uppercase letter, a number, a symbol, and no character repeated three times in a row.',
} as const;

// Hashing both sides first gives timingSafeEqual two equal-length inputs.
function tokensMatch(given: string, expected: string): boolean {
  const givenDigest = createHash('sha256').update(given).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(givenDigest, expectedDigest);
}

@Injectable()
export class SetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly config: ConfigService<ValidatedEnvironment, true>,
  ) {}

  // Order matters: the token is checked first, so only someone with the token
  // learns whether setup is already done (SR-6).
  async createFirstAdmin(input: FirstAdminDto, token: string): Promise<User> {
    const expectedToken = this.config.get('SETUP_TOKEN', { infer: true });
    if (!expectedToken) {
      throw new NotFoundException();
    }
    if (!tokensMatch(token, expectedToken)) {
      throw new ForbiddenException(INVALID_SETUP_TOKEN_ERROR);
    }

    const passwordHash = await this.hashPassword(input.password);

    try {
      // Serializable makes two simultaneous setup calls behave as if one ran first,
      // so only one admin can be created (FR-1.6).
      return await this.prisma.$transaction(
        async (tx) => {
          const adminCount = await tx.user.count({
            where: { role: UserRole.admin },
          });
          if (adminCount > 0) {
            throw new ConflictException(SETUP_ALREADY_DONE_ERROR);
          }

          return tx.user.create({
            data: {
              name: input.name,
              email: input.email,
              passwordHash,
              role: UserRole.admin,
              status: UserStatus.active,
              mustChangePassword: false,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      throw this.toSetupError(error);
    }
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      return await this.passwordService.hashNewPassword(password);
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw new BadRequestException(WEAK_PASSWORD_ERROR);
      }
      throw error;
    }
  }

  private toSetupError(error: unknown): unknown {
    if (error instanceof ConflictException) {
      return error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2034: a concurrent setup call won the race.
      if (error.code === 'P2034') {
        return new ConflictException(SETUP_ALREADY_DONE_ERROR);
      }
      // P2002: the email is already used by another account.
      if (error.code === 'P2002') {
        return new ConflictException(EMAIL_TAKEN_ERROR);
      }
    }
    return error;
  }
}

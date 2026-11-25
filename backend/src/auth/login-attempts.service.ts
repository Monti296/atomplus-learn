import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export const TOO_MANY_ATTEMPTS_ERROR = {
  code: 'TOO_MANY_ATTEMPTS',
  message:
    'Too many failed login attempts. Please wait a few minutes and try again.',
} as const;

export const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const FIRST_BLOCK_MS = 60 * 1000;
const MAX_BLOCK_MS = 15 * 60 * 1000;

// After the fifth failure the block doubles with each further failure, up to 15 minutes.
export function loginBlockDelayMs(failedCount: number): number {
  const extraFailures = failedCount - MAX_FAILED_ATTEMPTS;
  return Math.min(FIRST_BLOCK_MS * 2 ** extraFailures, MAX_BLOCK_MS);
}

// Counters are rows in login_attempts, so a block survives a server restart (SR-3).
@Injectable()
export class LoginAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNotBlocked(email: string, ip: string): Promise<void> {
    const attempt = await this.prisma.loginAttempt.findUnique({
      where: { email_ip: { email, ip } },
    });
    if (attempt?.blockedUntil && attempt.blockedUntil > new Date()) {
      throw new HttpException(
        TOO_MANY_ATTEMPTS_ERROR,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    const now = new Date();
    await this.ensureRow(email, ip, now);

    // Start a new 15-minute window when the old one has ended.
    await this.prisma.loginAttempt.updateMany({
      where: {
        email,
        ip,
        windowStart: { lt: new Date(now.getTime() - ATTEMPT_WINDOW_MS) },
      },
      data: { failedCount: 0, windowStart: now },
    });

    // The increment is done by the database, so two wrong passwords at once both count.
    const updated = await this.prisma.loginAttempt.update({
      where: { email_ip: { email, ip } },
      data: { failedCount: { increment: 1 } },
    });
    if (updated.failedCount < MAX_FAILED_ATTEMPTS) {
      return;
    }

    // Only ever move blockedUntil later, so a slower request cannot shorten a block.
    const blockedUntil = new Date(
      now.getTime() + loginBlockDelayMs(updated.failedCount),
    );
    await this.prisma.loginAttempt.updateMany({
      where: {
        email,
        ip,
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: blockedUntil } }],
      },
      data: { blockedUntil },
    });
  }

  async clear(email: string, ip: string): Promise<void> {
    await this.prisma.loginAttempt.deleteMany({ where: { email, ip } });
  }

  private async ensureRow(email: string, ip: string, now: Date): Promise<void> {
    try {
      await this.prisma.loginAttempt.create({
        data: { email, ip, failedCount: 0, windowStart: now },
      });
    } catch (error) {
      // Another request created the row first, which is fine.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { SESSION_IDLE_LIFETIME_MS } from './session-cookie';
import type { AuthUser } from './auth-user';

// Refreshing the database row on every request would slow down every page,
// so activity is saved at most once every 5 minutes.
const ACTIVITY_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export interface ActiveSession {
  user: AuthUser;
  refreshed: boolean;
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');
    const now = new Date();

    await this.prisma.session.create({
      data: {
        id,
        userId,
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + SESSION_IDLE_LIFETIME_MS),
      },
    });

    return id;
  }

  async findActiveSession(id: string): Promise<ActiveSession | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!session) {
      return null;
    }

    const now = new Date();
    if (session.expiresAt <= now || session.user.status !== 'active') {
      await this.delete(id);
      return null;
    }

    const refreshed =
      now.getTime() - session.lastActivityAt.getTime() >=
      ACTIVITY_REFRESH_INTERVAL_MS;
    if (refreshed) {
      await this.prisma.session.update({
        where: { id },
        data: {
          lastActivityAt: now,
          expiresAt: new Date(now.getTime() + SESSION_IDLE_LIFETIME_MS),
        },
      });
    }

    return { user: session.user, refreshed };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }
}

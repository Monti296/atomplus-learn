import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  Controller,
  Get,
  Module,
  type INestApplication,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import {
  loginBlockDelayMs,
  MAX_FAILED_ATTEMPTS,
} from '../src/auth/login/login-attempts.service';
import { PasswordService } from '../src/auth/password/password.service';
import { resetTestDatabase } from './database-test-helper';

const FRONTEND_ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Correct#Horse1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function resolveTestDatabaseUrl(): string {
  const url =
    process.env.TEST_DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/atomplus_learn_test';
  const databaseName = new URL(url).pathname.slice(1);
  if (!databaseName.includes('test')) {
    throw new Error(
      'Refusing to run: the test database name must contain "test" because tests delete data.',
    );
  }
  return url;
}

@Controller('admin-probe')
@UseGuards(AdminGuard)
class AdminProbeController {
  @Get()
  read(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

@Module({ controllers: [AdminProbeController] })
class AdminProbeModule {}

describe('login, logout, sessions and guards (FR-1, SR-4 to SR-7)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;

  before(async () => {
    process.env.FRONTEND_ORIGIN = FRONTEND_ORIGIN;
    process.env.DATABASE_URL = resolveTestDatabaseUrl();
    process.env.NODE_ENV = 'test';

    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/main');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, AdminProbeModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  after(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function createUser(
    overrides: { email?: string; role?: UserRole; status?: UserStatus } = {},
  ) {
    const passwordHash = await new PasswordService().hashNewPassword(PASSWORD);
    return prisma.user.create({
      data: {
        name: 'Test Person',
        email: overrides.email ?? 'employee@example.com',
        passwordHash,
        role: overrides.role ?? UserRole.employee,
        status: overrides.status ?? UserStatus.active,
        mustChangePassword: false,
      },
    });
  }

  function login(email: string, password: string) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', FRONTEND_ORIGIN)
      .send({ email, password });
  }

  function setCookieHeaders(response: request.Response): string[] {
    // supertest types this header as a string, but Node sends an array of cookies.
    const value: unknown = response.headers['set-cookie'];
    return Array.isArray(value) ? value.map(String) : [];
  }

  function sessionCookieFrom(response: request.Response): string {
    const cookie = setCookieHeaders(response).find((header) =>
      header.startsWith('atomplus_session='),
    );
    assert.ok(cookie, 'expected a session cookie in the response');
    return cookie.split(';')[0];
  }

  async function createSessionRow(
    userId: string,
    lastActivityAt: Date,
    expiresAt: Date,
  ): Promise<string> {
    const id = randomBytes(32).toString('base64url');
    await prisma.session.create({
      data: { id, userId, lastActivityAt, expiresAt },
    });
    return id;
  }

  describe('public and protected routes', () => {
    it('refuses GET /me without a session with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/me');

      assert.equal(response.status, 401);
      assert.deepEqual(response.body, {
        code: 'UNAUTHORIZED',
        message: 'The request could not be completed.',
      });
    });

    it('keeps the health check public', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      assert.equal(response.status, 200);
    });

    it('refuses a malformed session cookie with 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', 'atomplus_session=not-a-valid-session');

      assert.equal(response.status, 401);
    });
  });

  describe('login', () => {
    it('sets an HttpOnly, Secure, SameSite session cookie and returns the user', async () => {
      const user = await createUser();

      const response = await login('employee@example.com', PASSWORD);

      assert.equal(response.status, 200);
      assert.deepEqual(response.body, {
        id: user.id,
        name: 'Test Person',
        email: 'employee@example.com',
        role: 'employee',
        mustChangePassword: false,
      });

      const cookie = setCookieHeaders(response).find((header) =>
        header.startsWith('atomplus_session='),
      );
      assert.ok(cookie);
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /Secure/);
      assert.match(cookie, /SameSite=Lax/);

      assert.equal(
        await prisma.session.count({ where: { userId: user.id } }),
        1,
      );
    });

    it('accepts the email in any letter case', async () => {
      await createUser({ email: 'employee@example.com' });

      const response = await login('  EMPLOYEE@Example.COM ', PASSWORD);

      assert.equal(response.status, 200);
    });

    it('gives the same error for a wrong password, an unknown email and a blocked user', async () => {
      await createUser({ email: 'employee@example.com' });
      await createUser({
        email: 'blocked@example.com',
        status: UserStatus.blocked,
      });

      const wrongPassword = await login(
        'employee@example.com',
        'Wrong#Password1',
      );
      const unknownEmail = await login('nobody@example.com', PASSWORD);
      const blockedUser = await login('blocked@example.com', PASSWORD);

      const expectedBody = {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      };
      for (const response of [wrongPassword, unknownEmail, blockedUser]) {
        assert.equal(response.status, 401);
        assert.deepEqual(response.body, expectedBody);
      }
      assert.equal(await prisma.session.count(), 0);
    });

    it('replaces the session the browser already had when logging in again', async () => {
      await createUser();
      const firstCookie = sessionCookieFrom(
        await login('employee@example.com', PASSWORD),
      );

      const second = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Origin', FRONTEND_ORIGIN)
        .set('Cookie', firstCookie)
        .send({ email: 'employee@example.com', password: PASSWORD });
      const secondCookie = sessionCookieFrom(second);

      assert.notEqual(secondCookie, firstCookie);
      assert.equal(await prisma.session.count(), 1);
      const oldSession = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', firstCookie);
      assert.equal(oldSession.status, 401);
      const newSession = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', secondCookie);
      assert.equal(newSession.status, 200);
    });

    it('refuses unknown fields in the login body with 400', async () => {
      await createUser();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Origin', FRONTEND_ORIGIN)
        .send({
          email: 'employee@example.com',
          password: PASSWORD,
          role: 'admin',
        });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
    });
  });

  describe('logout and GET /me', () => {
    it('returns the logged-in user from GET /me', async () => {
      const user = await createUser();
      const cookie = sessionCookieFrom(
        await login('employee@example.com', PASSWORD),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookie);

      assert.equal(response.status, 200);
      assert.equal(response.body.id, user.id);
      assert.equal(response.body.passwordHash, undefined);
      assert.equal(response.body.status, undefined);
    });

    it('ends the session and clears the cookie on logout', async () => {
      await createUser();
      const cookie = sessionCookieFrom(
        await login('employee@example.com', PASSWORD),
      );

      const logout = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Origin', FRONTEND_ORIGIN)
        .set('Cookie', cookie);

      assert.equal(logout.status, 204);
      const cleared = setCookieHeaders(logout).find((header) =>
        header.startsWith('atomplus_session='),
      );
      assert.ok(cleared);
      assert.match(cleared, /Expires=Thu, 01 Jan 1970/);
      assert.equal(await prisma.session.count(), 0);

      const after = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookie);
      assert.equal(after.status, 401);
    });

    it('refuses logout without a session with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Origin', FRONTEND_ORIGIN);

      assert.equal(response.status, 401);
    });
  });

  describe('admin role guard (SR-7)', () => {
    it('refuses an employee on an admin route with 403', async () => {
      await createUser({ role: UserRole.employee });
      const cookie = sessionCookieFrom(
        await login('employee@example.com', PASSWORD),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin-probe')
        .set('Cookie', cookie);

      assert.equal(response.status, 403);
      assert.equal(response.body.code, 'FORBIDDEN');
    });

    it('lets an admin use an admin route', async () => {
      await createUser({
        email: 'admin@example.com',
        role: UserRole.admin,
      });
      const cookie = sessionCookieFrom(
        await login('admin@example.com', PASSWORD),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/admin-probe')
        .set('Cookie', cookie);

      assert.equal(response.status, 200);
    });
  });

  describe('blocking and idle timeout (SR-5)', () => {
    it('refuses a blocked user at once, even with a session that existed before', async () => {
      const user = await createUser();
      const cookie = sessionCookieFrom(
        await login('employee@example.com', PASSWORD),
      );
      await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.blocked },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', cookie);

      assert.equal(response.status, 401);
    });

    it('refuses a session idle for more than 5 days and removes it', async () => {
      const user = await createUser();
      const now = Date.now();
      const id = await createSessionRow(
        user.id,
        new Date(now - 5 * DAY_MS - MINUTE_MS),
        new Date(now - MINUTE_MS),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', `atomplus_session=${id}`);

      assert.equal(response.status, 401);
      assert.equal(await prisma.session.count({ where: { id } }), 0);
    });

    it('restarts the 5-day count on a request after 5 minutes of inactivity', async () => {
      const user = await createUser();
      const now = Date.now();
      const staleActivity = new Date(now - 6 * MINUTE_MS);
      const id = await createSessionRow(
        user.id,
        staleActivity,
        new Date(now + DAY_MS),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', `atomplus_session=${id}`);

      assert.equal(response.status, 200);
      const refreshed = await prisma.session.findUniqueOrThrow({
        where: { id },
      });
      assert.ok(refreshed.lastActivityAt.getTime() > staleActivity.getTime());
      assert.ok(refreshed.expiresAt.getTime() - Date.now() > 4.9 * DAY_MS);
      const refreshedCookie = setCookieHeaders(response).find((header) =>
        header.startsWith('atomplus_session='),
      );
      assert.ok(refreshedCookie);
      assert.match(refreshedCookie, /Max-Age=432000/);
    });

    it('does not save activity again within 5 minutes of the last save', async () => {
      const user = await createUser();
      const recentActivity = new Date(Date.now() - MINUTE_MS);
      const id = await createSessionRow(
        user.id,
        recentActivity,
        new Date(Date.now() + DAY_MS),
      );

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Cookie', `atomplus_session=${id}`);

      assert.equal(response.status, 200);
      const unchanged = await prisma.session.findUniqueOrThrow({
        where: { id },
      });
      assert.equal(
        unchanged.lastActivityAt.getTime(),
        recentActivity.getTime(),
      );
    });
  });

  describe('login rate limiting (SR-3)', () => {
    const ADDRESS = '203.0.113.10';
    const WRONG_PASSWORD = 'Wrong#Password1';

    function attemptLogin(email: string, password: string, address = ADDRESS) {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('Origin', FRONTEND_ORIGIN)
        .set('X-Forwarded-For', address)
        .send({ email, password });
    }

    async function failLogins(
      email: string,
      count: number,
      address = ADDRESS,
    ): Promise<void> {
      for (let i = 0; i < count; i += 1) {
        await attemptLogin(email, WRONG_PASSWORD, address);
      }
    }

    function attemptRow(email: string, address = ADDRESS) {
      return prisma.loginAttempt.findUniqueOrThrow({
        where: { email_ip: { email, ip: address } },
      });
    }

    it('refuses the sixth failed login with 429 and the same message', async () => {
      await createUser();

      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS);
      const sixth = await attemptLogin('employee@example.com', WRONG_PASSWORD);

      assert.equal(sixth.status, 429);
      assert.deepEqual(sixth.body, {
        code: 'TOO_MANY_ATTEMPTS',
        message:
          'Too many failed login attempts. Please wait a few minutes and try again.',
      });
    });

    it('keeps the fifth failed login as an ordinary wrong-password error', async () => {
      await createUser();

      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS - 1);
      const fifth = await attemptLogin('employee@example.com', WRONG_PASSWORD);

      assert.equal(fifth.status, 401);
      assert.equal(fifth.body.code, 'INVALID_CREDENTIALS');
    });

    it('refuses the correct password while the pair is blocked', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS);

      const response = await attemptLogin('employee@example.com', PASSWORD);

      assert.equal(response.status, 429);
      assert.equal(response.body.code, 'TOO_MANY_ATTEMPTS');
      assert.equal(await prisma.session.count(), 0);
    });

    it('gives the same refusal for an unknown email as for a known one', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS);
      await failLogins('nobody@example.com', MAX_FAILED_ATTEMPTS);

      const known = await attemptLogin('employee@example.com', WRONG_PASSWORD);
      const unknown = await attemptLogin('nobody@example.com', WRONG_PASSWORD);

      assert.equal(known.status, 429);
      assert.equal(unknown.status, 429);
      assert.deepEqual(unknown.body, known.body);
    });

    it('counts each email and address pair separately', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS);

      const otherAddress = await attemptLogin(
        'employee@example.com',
        PASSWORD,
        '203.0.113.99',
      );

      assert.equal(otherAddress.status, 200);
    });

    it('stores the block in the database with a one-minute first delay', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS);

      const row = await attemptRow('employee@example.com');
      assert.ok(row.blockedUntil);
      const remainingMs = row.blockedUntil.getTime() - Date.now();
      assert.ok(remainingMs > MINUTE_MS - 5000);
      assert.ok(remainingMs <= MINUTE_MS);
    });

    it('makes the delay grow with each further failure', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS);
      await prisma.loginAttempt.update({
        where: { email_ip: { email: 'employee@example.com', ip: ADDRESS } },
        data: { blockedUntil: new Date(Date.now() - 1000) },
      });

      await failLogins('employee@example.com', 1);

      const row = await attemptRow('employee@example.com');
      const remainingMs = (row.blockedUntil?.getTime() ?? 0) - Date.now();
      assert.ok(remainingMs > 2 * MINUTE_MS - 5000);
      assert.ok(remainingMs <= 2 * MINUTE_MS);
    });

    it('starts a new 15-minute window after the old one ends', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS - 1);
      await prisma.loginAttempt.update({
        where: { email_ip: { email: 'employee@example.com', ip: ADDRESS } },
        data: { windowStart: new Date(Date.now() - 16 * MINUTE_MS) },
      });

      await failLogins('employee@example.com', 1);

      const row = await attemptRow('employee@example.com');
      assert.equal(row.failedCount, 1);
      assert.equal(row.blockedUntil, null);
    });

    it('clears the counter after a successful login', async () => {
      await createUser();
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS - 1);

      const success = await attemptLogin('employee@example.com', PASSWORD);
      assert.equal(success.status, 200);
      await failLogins('employee@example.com', MAX_FAILED_ATTEMPTS - 1);

      const next = await attemptLogin('employee@example.com', WRONG_PASSWORD);
      assert.equal(next.status, 401);
      assert.equal(
        await prisma.loginAttempt.count({
          where: { email: 'employee@example.com' },
        }),
        1,
      );
    });

    it('caps the block delay at 15 minutes and doubles it before that', () => {
      assert.equal(loginBlockDelayMs(5), 60 * 1000);
      assert.equal(loginBlockDelayMs(6), 2 * 60 * 1000);
      assert.equal(loginBlockDelayMs(7), 4 * 60 * 1000);
      assert.equal(loginBlockDelayMs(8), 8 * 60 * 1000);
      assert.equal(loginBlockDelayMs(9), 15 * 60 * 1000);
      assert.equal(loginBlockDelayMs(50), 15 * 60 * 1000);
    });
  });
});

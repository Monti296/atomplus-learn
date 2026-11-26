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
import { AdminGuard } from '../src/auth/admin.guard';
import { PasswordService } from '../src/auth/password/password.service';
import { resetTestDatabase } from './database-test-helper';

const FRONTEND_ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Correct#Horse1';
const NEW_PASSWORD = 'Better#Horse2';

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

describe('profile and forced password change (FR-2.1 to FR-2.3, SR-2, SR-4)', () => {
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
    overrides: {
      email?: string;
      role?: UserRole;
      mustChangePassword?: boolean;
    } = {},
  ) {
    const passwordHash = await new PasswordService().hashNewPassword(PASSWORD);
    return prisma.user.create({
      data: {
        name: 'Test Person',
        email: overrides.email ?? 'employee@example.com',
        passwordHash,
        role: overrides.role ?? UserRole.employee,
        status: UserStatus.active,
        mustChangePassword: overrides.mustChangePassword ?? false,
      },
    });
  }

  function login(email: string, password: string) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', FRONTEND_ORIGIN)
      .send({ email, password });
  }

  async function sessionCookieFor(
    email: string,
    password: string = PASSWORD,
  ): Promise<string> {
    const response = await login(email, password);
    assert.equal(response.status, 200, 'expected a successful login');
    const value: unknown = response.headers['set-cookie'];
    const cookies = Array.isArray(value) ? value.map(String) : [];
    const cookie = cookies.find((header) =>
      header.startsWith('atomplus_session='),
    );
    assert.ok(cookie, 'expected a session cookie in the response');
    return cookie.split(';')[0];
  }

  async function createSessionRow(userId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');
    const now = Date.now();
    await prisma.session.create({
      data: {
        id,
        userId,
        lastActivityAt: new Date(now),
        expiresAt: new Date(now + 24 * 60 * 60 * 1000),
      },
    });
    return `atomplus_session=${id}`;
  }

  function send(
    method: 'get' | 'patch' | 'post',
    path: string,
    cookie?: string,
    body?: object,
  ): request.Test {
    const server = app.getHttpServer();
    const url = `/api/v1${path}`;
    const started = request(server)[method](url).set('Origin', FRONTEND_ORIGIN);
    const withCookie = cookie ? started.set('Cookie', cookie) : started;
    return body === undefined ? withCookie : withCookie.send(body);
  }

  describe('access (SR-2)', () => {
    it('refuses PATCH /me without a session with 401', async () => {
      const response = await send('patch', '/me', undefined, { name: 'New' });

      assert.equal(response.status, 401);
    });

    it('refuses PATCH /me/password without a session with 401', async () => {
      const response = await send('patch', '/me/password', undefined, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      assert.equal(response.status, 401);
    });
  });

  describe('change name (FR-2.1, FR-2.2)', () => {
    it('changes the name and returns the user', async () => {
      await createUser();
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me', cookie, {
        name: '  Ravi Kumar  ',
      });

      assert.equal(response.status, 200);
      assert.equal(response.body.name, 'Ravi Kumar');
      assert.equal(response.body.email, 'employee@example.com');
      assert.equal(response.body.passwordHash, undefined);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'employee@example.com' },
      });
      assert.equal(stored.name, 'Ravi Kumar');
    });

    it('refuses an email change with 400 and keeps the email', async () => {
      await createUser();
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me', cookie, {
        name: 'Ravi Kumar',
        email: 'other@example.com',
      });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'employee@example.com' },
      });
      assert.equal(stored.name, 'Test Person');
    });

    it('refuses an empty name with 400', async () => {
      await createUser();
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me', cookie, { name: '   ' });

      assert.equal(response.status, 400);
    });
  });

  describe('change password (FR-2.3, SR-2, SR-4)', () => {
    it('changes the password, clears the must-change flag and keeps the current session', async () => {
      await createUser({ mustChangePassword: true });
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me/password', cookie, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      assert.equal(response.status, 204);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'employee@example.com' },
      });
      assert.equal(stored.mustChangePassword, false);
      assert.equal((await send('get', '/me', cookie)).status, 200);
      assert.equal((await login('employee@example.com', PASSWORD)).status, 401);
      assert.equal(
        (await login('employee@example.com', NEW_PASSWORD)).status,
        200,
      );
    });

    it('ends every other session of the user but not the current one', async () => {
      const user = await createUser();
      const current = await sessionCookieFor('employee@example.com');
      const otherPhone = await createSessionRow(user.id);
      const otherLaptop = await createSessionRow(user.id);

      const response = await send('patch', '/me/password', current, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      assert.equal(response.status, 204);
      assert.equal(
        await prisma.session.count({ where: { userId: user.id } }),
        1,
      );
      assert.equal((await send('get', '/me', otherPhone)).status, 401);
      assert.equal((await send('get', '/me', otherLaptop)).status, 401);
      assert.equal((await send('get', '/me', current)).status, 200);
    });

    it('refuses a wrong current password with 400 and changes nothing', async () => {
      await createUser({ mustChangePassword: true });
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me/password', cookie, {
        currentPassword: 'Wrong#Password1',
        newPassword: NEW_PASSWORD,
      });

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        code: 'CURRENT_PASSWORD_INCORRECT',
        message: 'The current password is not correct.',
      });
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'employee@example.com' },
      });
      assert.equal(stored.mustChangePassword, true);
      assert.equal((await login('employee@example.com', PASSWORD)).status, 200);
    });

    it('refuses a new password that does not meet the policy with 400', async () => {
      await createUser();
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me/password', cookie, {
        currentPassword: PASSWORD,
        newPassword: 'weakpass',
      });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'WEAK_PASSWORD');
    });

    it('refuses a new password equal to the current one with 400', async () => {
      await createUser();
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me/password', cookie, {
        currentPassword: PASSWORD,
        newPassword: PASSWORD,
      });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'PASSWORD_UNCHANGED');
    });

    it('refuses unknown fields in the password body with 400', async () => {
      await createUser();
      const cookie = await sessionCookieFor('employee@example.com');

      const response = await send('patch', '/me/password', cookie, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        role: 'admin',
      });

      assert.equal(response.status, 400);
    });
  });

  describe('forced password change (SR-2)', () => {
    it('refuses other routes for a user who must change the password, with 403', async () => {
      await createUser({ mustChangePassword: true });
      const cookie = await sessionCookieFor('employee@example.com');

      const nameChange = await send('patch', '/me', cookie, { name: 'New' });
      const adminRoute = await send('get', '/admin-probe', cookie);

      assert.equal(nameChange.status, 403);
      assert.equal(nameChange.body.code, 'PASSWORD_CHANGE_REQUIRED');
      assert.equal(adminRoute.status, 403);
      assert.equal(adminRoute.body.code, 'PASSWORD_CHANGE_REQUIRED');
    });

    it('refuses an admin who must change the password on admin routes', async () => {
      await createUser({
        email: 'admin@example.com',
        role: UserRole.admin,
        mustChangePassword: true,
      });
      const cookie = await sessionCookieFor('admin@example.com');

      const response = await send('get', '/admin-probe', cookie);

      assert.equal(response.status, 403);
      assert.equal(response.body.code, 'PASSWORD_CHANGE_REQUIRED');
    });

    it('allows GET /me and logout for a user who must change the password', async () => {
      await createUser({ mustChangePassword: true });
      const cookie = await sessionCookieFor('employee@example.com');

      const me = await send('get', '/me', cookie);
      const logout = await send('post', '/auth/logout', cookie);

      assert.equal(me.status, 200);
      assert.equal(me.body.mustChangePassword, true);
      assert.equal(logout.status, 204);
    });

    it('lets the user use every route again once the password is changed', async () => {
      await createUser({ mustChangePassword: true });
      const cookie = await sessionCookieFor('employee@example.com');
      await send('patch', '/me/password', cookie, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      });

      const nameChange = await send('patch', '/me', cookie, { name: 'New' });

      assert.equal(nameChange.status, 200);
      assert.equal(nameChange.body.name, 'New');
    });
  });
});

import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { isPasswordAllowed } from '../src/auth/password/password-policy';
import { PasswordService } from '../src/auth/password/password.service';
import { resetTestDatabase } from './database-test-helper';

const FRONTEND_ORIGIN = 'http://localhost:5173';
const PASSWORD = 'Correct#Horse1';
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

type Method = 'get' | 'post' | 'patch' | 'delete';

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

describe('admin user management (FR-8.1, FR-8.5, SR-2, SR-4, SR-7)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;

  before(async () => {
    process.env.FRONTEND_ORIGIN = FRONTEND_ORIGIN;
    process.env.DATABASE_URL = resolveTestDatabaseUrl();
    process.env.NODE_ENV = 'test';

    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/main');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
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
      name?: string;
      role?: UserRole;
      status?: UserStatus;
    } = {},
  ) {
    const passwordHash = await new PasswordService().hashNewPassword(PASSWORD);
    return prisma.user.create({
      data: {
        name: overrides.name ?? 'Test Person',
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

  function send(
    method: Method,
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

  async function adminCookie(): Promise<string> {
    await createUser({
      email: 'admin@example.com',
      name: 'Admin Person',
      role: UserRole.admin,
    });
    return sessionCookieFor('admin@example.com');
  }

  describe('admin-only access (SR-7)', () => {
    it('refuses requests without a session with 401', async () => {
      const response = await send('get', '/admin/users');

      assert.equal(response.status, 401);
    });

    it('refuses an employee on every admin user route with 403', async () => {
      await createUser({ email: 'employee@example.com' });
      const cookie = await sessionCookieFor('employee@example.com');
      const target = `/admin/users/${MISSING_ID}`;

      const responses = [
        await send('get', '/admin/users', cookie),
        await send('post', '/admin/users', cookie, {
          name: 'New Person',
          email: 'new@example.com',
        }),
        await send('patch', target, cookie, { name: 'Changed' }),
        await send('patch', `${target}/password`, cookie),
        await send('delete', target, cookie),
      ];

      for (const response of responses) {
        assert.equal(response.status, 403);
        assert.equal(response.body.code, 'FORBIDDEN');
      }
      assert.equal(await prisma.user.count(), 1);
    });
  });

  describe('list users (FR-8.1)', () => {
    it('returns users one page at a time without password hashes', async () => {
      const cookie = await adminCookie();
      await createUser({ email: 'a@example.com', name: 'Asha' });
      await createUser({ email: 'b@example.com', name: 'Bala' });
      await createUser({ email: 'c@example.com', name: 'Chitra' });

      const response = await send(
        'get',
        '/admin/users?page=1&pageSize=2',
        cookie,
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.items.length, 2);
      assert.equal(response.body.total, 4);
      assert.equal(response.body.page, 1);
      assert.equal(response.body.pageSize, 2);
      for (const item of response.body.items) {
        assert.equal(item.passwordHash, undefined);
        assert.equal(item.password_hash, undefined);
      }
    });

    it('refuses a page size above 100 with 400', async () => {
      const cookie = await adminCookie();

      const response = await send('get', '/admin/users?pageSize=101', cookie);

      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
    });
  });

  describe('create user (FR-8.1, SR-2)', () => {
    it('creates an employee with a temporary password shown once and a must-change flag', async () => {
      const cookie = await adminCookie();

      const response = await send('post', '/admin/users', cookie, {
        name: '  Ravi Kumar  ',
        email: '  Ravi@Example.com ',
      });

      assert.equal(response.status, 201);
      assert.equal(response.body.user.name, 'Ravi Kumar');
      assert.equal(response.body.user.email, 'ravi@example.com');
      assert.equal(response.body.user.role, 'employee');
      assert.equal(response.body.user.status, 'active');
      assert.equal(response.body.user.mustChangePassword, true);
      assert.equal(response.body.user.passwordHash, undefined);
      assert.ok(isPasswordAllowed(response.body.temporaryPassword));

      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'ravi@example.com' },
      });
      assert.notEqual(stored.passwordHash, response.body.temporaryPassword);
    });

    it('creates another admin when the role is set to admin', async () => {
      const cookie = await adminCookie();

      const response = await send('post', '/admin/users', cookie, {
        name: 'Second Admin',
        email: 'second@example.com',
        role: 'admin',
      });

      assert.equal(response.status, 201);
      assert.equal(response.body.user.role, 'admin');
      const stored = await prisma.user.findUniqueOrThrow({
        where: { email: 'second@example.com' },
      });
      assert.equal(stored.role, UserRole.admin);
    });

    it('refuses a role other than employee or admin with 400 and creates nothing', async () => {
      const cookie = await adminCookie();

      const response = await send('post', '/admin/users', cookie, {
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        role: 'superuser',
      });

      assert.equal(response.status, 400);
      assert.equal(
        await prisma.user.count({ where: { email: 'ravi@example.com' } }),
        0,
      );
    });

    it('lets the new user log in with the temporary password', async () => {
      const cookie = await adminCookie();
      const created = await send('post', '/admin/users', cookie, {
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
      });

      const loginResponse = await login(
        'ravi@example.com',
        created.body.temporaryPassword,
      );

      assert.equal(loginResponse.status, 200);
      assert.equal(loginResponse.body.mustChangePassword, true);
    });

    it('refuses an email that already exists with 409', async () => {
      const cookie = await adminCookie();
      await createUser({ email: 'ravi@example.com' });

      const response = await send('post', '/admin/users', cookie, {
        name: 'Another Ravi',
        email: 'RAVI@example.com',
      });

      assert.equal(response.status, 409);
      assert.deepEqual(response.body, {
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
      });
    });

    it('refuses unknown fields such as a status or a password with 400 and creates nothing', async () => {
      const cookie = await adminCookie();

      const response = await send('post', '/admin/users', cookie, {
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        status: 'blocked',
        password: 'Chosen#Password1',
      });

      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
      assert.equal(
        await prisma.user.count({ where: { email: 'ravi@example.com' } }),
        0,
      );
    });

    it('refuses an invalid email with 400', async () => {
      const cookie = await adminCookie();

      const response = await send('post', '/admin/users', cookie, {
        name: 'Ravi Kumar',
        email: 'not-an-email',
      });

      assert.equal(response.status, 400);
    });
  });

  describe('update user: rename, block and unblock (FR-8.1, FR-8.5, SR-4)', () => {
    it('changes the name and refuses any attempt to change the email', async () => {
      const cookie = await adminCookie();
      const employee = await createUser({ email: 'employee@example.com' });

      const renamed = await send(
        'patch',
        `/admin/users/${employee.id}`,
        cookie,
        { name: 'New Name' },
      );
      const emailChange = await send(
        'patch',
        `/admin/users/${employee.id}`,
        cookie,
        { email: 'other@example.com' },
      );

      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.name, 'New Name');
      assert.equal(renamed.body.email, 'employee@example.com');
      assert.equal(emailChange.status, 400);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: employee.id },
      });
      assert.equal(stored.email, 'employee@example.com');
    });

    it('blocks a user, ends their sessions at once and keeps their data', async () => {
      const cookie = await adminCookie();
      const employee = await createUser({ email: 'employee@example.com' });
      const employeeCookie = await sessionCookieFor('employee@example.com');

      const response = await send(
        'patch',
        `/admin/users/${employee.id}`,
        cookie,
        { status: 'blocked' },
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.status, 'blocked');
      assert.equal(
        await prisma.session.count({ where: { userId: employee.id } }),
        0,
      );
      assert.equal(await prisma.user.count({ where: { id: employee.id } }), 1);

      const oldSession = await send('get', '/me', employeeCookie);
      assert.equal(oldSession.status, 401);
      const loginAttempt = await login('employee@example.com', PASSWORD);
      assert.equal(loginAttempt.status, 401);
      assert.equal(loginAttempt.body.code, 'INVALID_CREDENTIALS');
    });

    it('lets a blocked user log in again after unblocking', async () => {
      const cookie = await adminCookie();
      const employee = await createUser({ email: 'employee@example.com' });
      await send('patch', `/admin/users/${employee.id}`, cookie, {
        status: 'blocked',
      });

      const unblock = await send(
        'patch',
        `/admin/users/${employee.id}`,
        cookie,
        { status: 'active' },
      );
      const loginAgain = await login('employee@example.com', PASSWORD);

      assert.equal(unblock.status, 200);
      assert.equal(unblock.body.status, 'active');
      assert.equal(loginAgain.status, 200);
    });

    it('refuses an admin blocking their own account with 400 and keeps it active', async () => {
      const cookie = await adminCookie();
      const admin = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const response = await send('patch', `/admin/users/${admin.id}`, cookie, {
        status: 'blocked',
      });

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        code: 'CANNOT_BLOCK_OWN_ACCOUNT',
        message: 'You cannot block your own account.',
      });
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: admin.id },
      });
      assert.equal(stored.status, UserStatus.active);
      assert.equal((await send('get', '/me', cookie)).status, 200);
    });

    it('refuses an unknown user id with 404 and an invalid id with 400', async () => {
      const cookie = await adminCookie();

      const unknown = await send(
        'patch',
        `/admin/users/${MISSING_ID}`,
        cookie,
        { name: 'Nobody' },
      );
      const invalid = await send('patch', '/admin/users/not-a-uuid', cookie, {
        name: 'Nobody',
      });

      assert.equal(unknown.status, 404);
      assert.equal(invalid.status, 400);
    });
  });

  describe('reset password (FR-8.1, SR-2, SR-4)', () => {
    it('returns a new temporary password, sets the must-change flag and signs the user out', async () => {
      const cookie = await adminCookie();
      const employee = await createUser({ email: 'employee@example.com' });
      const employeeCookie = await sessionCookieFor('employee@example.com');
      const before = await prisma.user.findUniqueOrThrow({
        where: { id: employee.id },
      });

      const response = await send(
        'patch',
        `/admin/users/${employee.id}/password`,
        cookie,
      );

      assert.equal(response.status, 200);
      assert.equal(response.body.user.mustChangePassword, true);
      assert.ok(isPasswordAllowed(response.body.temporaryPassword));
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: employee.id },
      });
      assert.notEqual(after.passwordHash, before.passwordHash);
      assert.equal(
        await prisma.session.count({ where: { userId: employee.id } }),
        0,
      );
      assert.equal((await send('get', '/me', employeeCookie)).status, 401);
    });

    it('stops the old password and accepts the new temporary password', async () => {
      const cookie = await adminCookie();
      const employee = await createUser({ email: 'employee@example.com' });
      const reset = await send(
        'patch',
        `/admin/users/${employee.id}/password`,
        cookie,
      );

      const oldPassword = await login('employee@example.com', PASSWORD);
      const newPassword = await login(
        'employee@example.com',
        reset.body.temporaryPassword,
      );

      assert.equal(oldPassword.status, 401);
      assert.equal(newPassword.status, 200);
      assert.equal(newPassword.body.mustChangePassword, true);
    });

    it('refuses an unknown user id with 404', async () => {
      const cookie = await adminCookie();

      const response = await send(
        'patch',
        `/admin/users/${MISSING_ID}/password`,
        cookie,
      );

      assert.equal(response.status, 404);
    });
  });

  describe('remove user (FR-8.5)', () => {
    it('deletes the user and their sessions', async () => {
      const cookie = await adminCookie();
      const employee = await createUser({ email: 'employee@example.com' });
      const employeeCookie = await sessionCookieFor('employee@example.com');

      const response = await send(
        'delete',
        `/admin/users/${employee.id}`,
        cookie,
      );

      assert.equal(response.status, 204);
      assert.equal(await prisma.user.count({ where: { id: employee.id } }), 0);
      assert.equal(await prisma.session.count(), 1);
      assert.equal((await send('get', '/me', employeeCookie)).status, 401);
    });

    it('refuses an admin removing their own account with 400', async () => {
      const cookie = await adminCookie();
      const admin = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@example.com' },
      });

      const response = await send('delete', `/admin/users/${admin.id}`, cookie);

      assert.equal(response.status, 400);
      assert.deepEqual(response.body, {
        code: 'CANNOT_REMOVE_OWN_ACCOUNT',
        message: 'You cannot remove your own account.',
      });
      assert.equal(await prisma.user.count({ where: { id: admin.id } }), 1);
    });

    it('refuses removing an unknown user with 404', async () => {
      const cookie = await adminCookie();

      const response = await send(
        'delete',
        `/admin/users/${MISSING_ID}`,
        cookie,
      );

      assert.equal(response.status, 404);
    });
  });
});

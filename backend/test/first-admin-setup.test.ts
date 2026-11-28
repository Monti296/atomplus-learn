import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { NotFoundException, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { PasswordService } from '../src/auth/password/password.service';
import { SetupService } from '../src/auth/setup/setup.service';
import {
  validateEnvironment,
  type ValidatedEnvironment,
} from '../src/config/environment';
import { PrismaService } from '../src/database/prisma.service';
import { resetTestDatabase } from './database-test-helper';

const FRONTEND_ORIGIN = 'http://localhost:5173';
const SETUP_TOKEN = 'test-setup-token-that-is-long-enough-123';
const PASSWORD = 'Correct#Horse1';

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

describe('SETUP_TOKEN setting (SR-6)', () => {
  const base = {
    FRONTEND_ORIGIN,
    DATABASE_URL: 'postgresql://localhost:5432/atomplus_learn_test',
  };

  it('leaves the setup route off when SETUP_TOKEN is not set', () => {
    assert.equal(validateEnvironment(base).SETUP_TOKEN, undefined);
    assert.equal(
      validateEnvironment({ ...base, SETUP_TOKEN: '' }).SETUP_TOKEN,
      undefined,
    );
  });

  it('accepts a token of at least 32 characters', () => {
    assert.equal(
      validateEnvironment({ ...base, SETUP_TOKEN: SETUP_TOKEN }).SETUP_TOKEN,
      SETUP_TOKEN,
    );
  });

  it('refuses a token shorter than 32 characters', () => {
    assert.throws(
      () => validateEnvironment({ ...base, SETUP_TOKEN: 'too-short' }),
      /SETUP_TOKEN must be at least 32 characters/,
    );
  });

  it('answers 404 when the server has no setup token configured', async () => {
    const config = {
      get: () => undefined,
    } as unknown as ConfigService<ValidatedEnvironment, true>;
    const prisma = new PrismaService();
    const service = new SetupService(prisma, new PasswordService(), config);

    await assert.rejects(
      service.createFirstAdmin(
        { name: 'Asha', email: 'admin@example.com', password: PASSWORD },
        SETUP_TOKEN,
      ),
      NotFoundException,
    );
    await prisma.$disconnect();
  });
});

describe('first-admin one-time setup (FR-1.6, SR-6)', () => {
  const prisma = new PrismaClient();
  let app: INestApplication;

  before(async () => {
    process.env.FRONTEND_ORIGIN = FRONTEND_ORIGIN;
    process.env.DATABASE_URL = resolveTestDatabaseUrl();
    process.env.NODE_ENV = 'test';
    process.env.SETUP_TOKEN = SETUP_TOKEN;

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

  const adminBody = {
    name: '  Asha Rao ',
    email: '  Admin@AtomPlus.in ',
    password: PASSWORD,
  };

  function setup(body: object, token: string | null = SETUP_TOKEN) {
    const call = request(app.getHttpServer())
      .post('/api/v1/setup/first-admin')
      .set('Origin', FRONTEND_ORIGIN)
      .send(body);
    return token === null ? call : call.set('X-Setup-Token', token);
  }

  async function createAdmin(email = 'existing@example.com') {
    const passwordHash = await new PasswordService().hashNewPassword(PASSWORD);
    return prisma.user.create({
      data: {
        name: 'Existing Admin',
        email,
        passwordHash,
        role: UserRole.admin,
        status: UserStatus.active,
        mustChangePassword: false,
      },
    });
  }

  it('creates the first admin with the token, without logging them in', async () => {
    const response = await setup(adminBody);

    assert.equal(response.status, 201);
    assert.equal(response.body.name, 'Asha Rao');
    assert.equal(response.body.email, 'admin@atomplus.in');
    assert.equal(response.body.role, 'admin');
    assert.equal(response.body.mustChangePassword, true);
    assert.equal(response.body.passwordHash, undefined);
    assert.equal(response.headers['set-cookie'], undefined);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@atomplus.in' },
    });
    assert.equal(stored.role, UserRole.admin);
    assert.equal(stored.mustChangePassword, true);
    assert.notEqual(stored.passwordHash, PASSWORD);
    assert.equal(
      await new PasswordService().verify(stored.passwordHash, PASSWORD),
      true,
    );
  });

  it('refuses a second setup with 409 and creates nothing more', async () => {
    assert.equal((await setup(adminBody)).status, 201);

    const second = await setup({
      ...adminBody,
      email: 'second@atomplus.in',
    });

    assert.equal(second.status, 409);
    assert.deepEqual(second.body, {
      code: 'SETUP_ALREADY_DONE',
      message: 'Setup has already been completed.',
    });
    assert.equal(
      await prisma.user.count({ where: { role: UserRole.admin } }),
      1,
    );
  });

  it('refuses setup once an admin exists, even with the right token', async () => {
    await createAdmin();

    const response = await setup(adminBody);

    assert.equal(response.status, 409);
    assert.equal(response.body.code, 'SETUP_ALREADY_DONE');
    assert.equal(await prisma.user.count(), 1);
  });

  it('refuses a missing token with 403 and creates nothing', async () => {
    const response = await setup(adminBody, null);

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      code: 'SETUP_TOKEN_INVALID',
      message: 'The setup token is not correct.',
    });
    assert.equal(await prisma.user.count(), 0);
  });

  it('refuses a wrong token with 403 and creates nothing', async () => {
    const response = await setup(
      adminBody,
      'a-different-token-that-is-also-long-enough',
    );

    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'SETUP_TOKEN_INVALID');
    assert.equal(await prisma.user.count(), 0);
  });

  it('refuses a weak password with 400 and creates nothing', async () => {
    const response = await setup({ ...adminBody, password: 'weakpass' });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'WEAK_PASSWORD');
    assert.equal(await prisma.user.count(), 0);
  });

  it('refuses unknown fields in the body with 400', async () => {
    const response = await setup({ ...adminBody, status: 'blocked' });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
    assert.equal(await prisma.user.count(), 0);
  });

  it('refuses an email already used by another account with 409', async () => {
    const passwordHash = await new PasswordService().hashNewPassword(PASSWORD);
    await prisma.user.create({
      data: {
        name: 'Employee',
        email: 'admin@atomplus.in',
        passwordHash,
        role: UserRole.employee,
        status: UserStatus.active,
        mustChangePassword: false,
      },
    });

    const response = await setup(adminBody);

    assert.equal(response.status, 409);
    assert.equal(response.body.code, 'EMAIL_TAKEN');
    assert.equal(
      await prisma.user.count({ where: { role: UserRole.admin } }),
      0,
    );
  });

  it('lets only one admin be created when two setup calls race', async () => {
    const responses = await Promise.all([
      setup({ ...adminBody, email: 'first@atomplus.in' }),
      setup({ ...adminBody, email: 'second@atomplus.in' }),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    assert.equal(
      await prisma.user.count({ where: { role: UserRole.admin } }),
      1,
    );
  });
});

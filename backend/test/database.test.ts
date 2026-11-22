import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { resetTestDatabase } from './database-test-helper';

describe('database schema', () => {
  const prisma = new PrismaClient();

  before(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetTestDatabase(prisma);
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('creates and reads a user with the documented defaults', async () => {
    const created = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'test-hash',
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: created.id },
    });

    assert.ok(user);
    assert.equal(user.email, 'test@example.com');
    assert.equal(user.role, UserRole.employee);
    assert.equal(user.status, UserStatus.active);
    assert.equal(user.mustChangePassword, true);
  });
});

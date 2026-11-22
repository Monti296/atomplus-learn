import { PrismaClient } from '@prisma/client';

export async function resetTestDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.loginAttempt.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

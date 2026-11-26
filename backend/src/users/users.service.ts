import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus, type User } from '@prisma/client';
import { EMAIL_TAKEN_ERROR } from '../auth/setup.service';
import { PasswordService } from '../auth/password/password.service';
import { generateTemporaryPassword } from '../auth/password/temporary-password';
import { PrismaService } from '../database/prisma.service';
import { CreatableUserRole, CreateUserDto } from './dto/create-user.dto';
import { EditableUserStatus, UpdateUserDto } from './dto/update-user.dto';

export const CANNOT_BLOCK_OWN_ACCOUNT_ERROR = {
  code: 'CANNOT_BLOCK_OWN_ACCOUNT',
  message: 'You cannot block your own account.',
} as const;

export const CANNOT_REMOVE_OWN_ACCOUNT_ERROR = {
  code: 'CANNOT_REMOVE_OWN_ACCOUNT',
  message: 'You cannot remove your own account.',
} as const;

export interface UserPage {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserWithTemporaryPassword {
  user: User;
  temporaryPassword: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async list(page: number, pageSize: number): Promise<UserPage> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page, pageSize };
  }

  // The temporary password is returned once, here, and never stored in plain text (SR-2).
  async create(input: CreateUserDto): Promise<UserWithTemporaryPassword> {
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash =
      await this.passwordService.hashNewPassword(temporaryPassword);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role:
            input.role === CreatableUserRole.admin
              ? UserRole.admin
              : UserRole.employee,
          status: UserStatus.active,
          mustChangePassword: true,
        },
      });
      return { user, temporaryPassword };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(EMAIL_TAKEN_ERROR);
      }
      throw error;
    }
  }

  // Blocking ends the user's sessions in the same step, so access stops at once (SR-4).
  async update(
    actorId: string,
    userId: string,
    input: UpdateUserDto,
  ): Promise<User> {
    if (input.status === EditableUserStatus.blocked && userId === actorId) {
      throw new BadRequestException(CANNOT_BLOCK_OWN_ACCOUNT_ERROR);
    }
    await this.findOrThrow(userId);

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data });
      if (input.status === EditableUserStatus.blocked) {
        await tx.session.deleteMany({ where: { userId } });
      }
      return updated;
    });
  }

  // A reset also signs the user out everywhere, so the old password cannot keep a session alive (SR-4).
  async resetPassword(userId: string): Promise<UserWithTemporaryPassword> {
    await this.findOrThrow(userId);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash =
      await this.passwordService.hashNewPassword(temporaryPassword);

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: true },
      });
      await tx.session.deleteMany({ where: { userId } });
      return updated;
    });

    return { user, temporaryPassword };
  }

  // Removing deletes the user row; sessions go with it through the database cascade.
  async remove(actorId: string, userId: string): Promise<void> {
    if (userId === actorId) {
      throw new BadRequestException(CANNOT_REMOVE_OWN_ACCOUNT_ERROR);
    }
    await this.findOrThrow(userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  private async findOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }
}

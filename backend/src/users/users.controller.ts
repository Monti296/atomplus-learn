import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { type AuthenticatedRequest } from '../auth/guards/auth.guard';
import { toAdminUser, type AdminUserResponse } from './admin-user-response';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

export interface AdminUserPageResponse {
  items: AdminUserResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatedUserResponse {
  user: AdminUserResponse;
  // Shown once to the admin, then the user must change it at first login (SR-2).
  temporaryPassword: string;
}

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(@Query() query: ListUsersQuery): Promise<AdminUserPageResponse> {
    const page = await this.users.list(query.page, query.pageSize);
    return {
      items: page.items.map(toAdminUser),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUserDto): Promise<CreatedUserResponse> {
    const { user, temporaryPassword } = await this.users.create(body);
    return { user: toAdminUser(user), temporaryPassword };
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ): Promise<AdminUserResponse> {
    const user = await this.users.update(request.authUser.id, id, body);
    return toAdminUser(user);
  }

  @Patch(':id/password')
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreatedUserResponse> {
    const { user, temporaryPassword } = await this.users.resetPassword(id);
    return { user: toAdminUser(user), temporaryPassword };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.users.remove(request.authUser.id, id);
  }
}

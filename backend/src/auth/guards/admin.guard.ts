import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard';

// Use with @UseGuards(AdminGuard) on admin controllers. Runs after AuthGuard.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.authUser?.role !== 'admin') {
      throw new ForbiddenException();
    }
    return true;
  }
}

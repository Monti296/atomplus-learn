import type { User } from '@prisma/client';

export interface AdminUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
}

// Never return the password hash to the browser.
export function toAdminUser(user: User): AdminUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  };
}

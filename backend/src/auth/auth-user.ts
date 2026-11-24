import type { User } from '@prisma/client';

export type AuthUser = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'status' | 'mustChangePassword'
>;

export interface CurrentUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

// Never return the password hash or the account status to the browser.
export function toCurrentUser(user: AuthUser): CurrentUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

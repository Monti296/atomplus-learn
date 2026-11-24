import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { failedPasswordRules, PasswordRuleId } from './password-policy';

export class PasswordPolicyError extends Error {
  constructor(readonly rules: PasswordRuleId[]) {
    super('Password does not meet the password rules.');
    this.name = 'PasswordPolicyError';
  }
}

// Settings from the OWASP password storage guidance, kept low so the free
// Render server does not run out of memory when several people log in at once.
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  async hashNewPassword(password: string): Promise<string> {
    const rules = failedPasswordRules(password);
    if (rules.length > 0) {
      throw new PasswordPolicyError(rules);
    }
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}

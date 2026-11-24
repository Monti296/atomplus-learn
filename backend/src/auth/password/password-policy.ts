export const MIN_PASSWORD_LENGTH = 7;

export type PasswordRuleId =
  | 'minLength'
  | 'uppercase'
  | 'number'
  | 'symbol'
  | 'noTripleRepeat';

const RULE_CHECKS: Record<PasswordRuleId, (password: string) => boolean> = {
  minLength: (password) => password.length >= MIN_PASSWORD_LENGTH,
  uppercase: (password) => /\p{Lu}/u.test(password),
  number: (password) => /\p{Nd}/u.test(password),
  symbol: (password) => /[^\p{L}\p{N}]/u.test(password),
  noTripleRepeat: (password) => !/(.)\1\1/su.test(password),
};

export function failedPasswordRules(password: string): PasswordRuleId[] {
  return (Object.keys(RULE_CHECKS) as PasswordRuleId[]).filter(
    (rule) => !RULE_CHECKS[rule](password),
  );
}

export function isPasswordAllowed(password: string): boolean {
  return failedPasswordRules(password).length === 0;
}

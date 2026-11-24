import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  failedPasswordRules,
  isPasswordAllowed,
} from '../src/auth/password/password-policy';
import {
  PasswordPolicyError,
  PasswordService,
} from '../src/auth/password/password.service';
import {
  generateTemporaryPassword,
  TEMPORARY_PASSWORD_LENGTH,
} from '../src/auth/password/temporary-password';

describe('password policy (FR-1.5)', () => {
  it('accepts a password that meets every rule', () => {
    assert.deepEqual(failedPasswordRules('Abcdef1!'), []);
    assert.equal(isPasswordAllowed('Abcdef1!'), true);
  });

  it('requires longer than 6 characters, so 6 fails and 7 passes', () => {
    assert.deepEqual(failedPasswordRules('Ab1!xy'), ['minLength']);
    assert.deepEqual(failedPasswordRules('Ab1!xyz'), []);
  });

  it('requires one uppercase letter', () => {
    assert.deepEqual(failedPasswordRules('abcdef1!'), ['uppercase']);
  });

  it('requires one number', () => {
    assert.deepEqual(failedPasswordRules('Abcdefg!'), ['number']);
  });

  it('requires one symbol, where a symbol is not a letter or a digit', () => {
    assert.deepEqual(failedPasswordRules('Abcdefg1'), ['symbol']);
    assert.deepEqual(failedPasswordRules('Abcdef1 '), []);
    assert.deepEqual(failedPasswordRules('Abcdef1€'), []);
  });

  it('refuses the same character three times in a row', () => {
    assert.deepEqual(failedPasswordRules('Abbb1!xy'), ['noTripleRepeat']);
    assert.deepEqual(failedPasswordRules('Abbbb1!x'), ['noTripleRepeat']);
  });

  it('allows a character to repeat twice in a row', () => {
    assert.deepEqual(failedPasswordRules('Aabb1!xy'), []);
  });

  it('treats uppercase and lowercase as different characters for repeats', () => {
    assert.deepEqual(failedPasswordRules('AAa1!xyz'), []);
  });

  it('reports every rule that fails, not only the first one', () => {
    assert.deepEqual(failedPasswordRules('abc'), [
      'minLength',
      'uppercase',
      'number',
      'symbol',
    ]);
  });
});

describe('password hashing (SR-1)', () => {
  const service = new PasswordService();

  it('stores an argon2id hash, never the password itself', async () => {
    const hash = await service.hashNewPassword('Abcdef1!');

    assert.ok(hash.startsWith('$argon2id$'));
    assert.ok(!hash.includes('Abcdef1!'));
  });

  it('verifies the right password and refuses a wrong one', async () => {
    const hash = await service.hashNewPassword('Abcdef1!');

    assert.equal(await service.verify(hash, 'Abcdef1!'), true);
    assert.equal(await service.verify(hash, 'Abcdef1 '), false);
  });

  it('gives a different hash for the same password each time', async () => {
    const first = await service.hashNewPassword('Abcdef1!');
    const second = await service.hashNewPassword('Abcdef1!');

    assert.notEqual(first, second);
  });

  it('refuses to hash a password that breaks the rules', async () => {
    await assert.rejects(
      service.hashNewPassword('abc'),
      (error: unknown) =>
        error instanceof PasswordPolicyError &&
        error.rules.join(',') === 'minLength,uppercase,number,symbol',
    );
  });

  it('returns false instead of throwing when the stored hash is not valid', async () => {
    assert.equal(await service.verify('not-a-hash', 'Abcdef1!'), false);
  });
});

describe('temporary password generator (FR-8.1, SR-2)', () => {
  it('creates passwords of the agreed length that meet every rule', () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword();

      assert.equal(password.length, TEMPORARY_PASSWORD_LENGTH);
      assert.deepEqual(failedPasswordRules(password), []);
    }
  });

  it('includes an uppercase letter, a lowercase letter, a number and a symbol', () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword();

      assert.match(password, /[A-Z]/);
      assert.match(password, /[a-z]/);
      assert.match(password, /[0-9]/);
      assert.match(password, /[^A-Za-z0-9]/);
    }
  });

  it('does not repeat the same password', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      passwords.add(generateTemporaryPassword());
    }

    assert.equal(passwords.size, 50);
  });
});

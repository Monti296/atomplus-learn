import { randomInt } from 'node:crypto';
import { isPasswordAllowed } from './password-policy';

export const TEMPORARY_PASSWORD_LENGTH = 12;

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%&*+-=?';
const ALL_CHARACTERS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;

// crypto-based random numbers, not Math.random, so the password cannot be guessed from earlier ones
function pickOne(characters: string): string {
  return characters[randomInt(characters.length)];
}

function shuffle(characters: string[]): string[] {
  for (let i = characters.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [characters[i], characters[j]] = [characters[j], characters[i]];
  }
  return characters;
}

function buildCandidate(): string {
  const required = [
    pickOne(UPPERCASE),
    pickOne(LOWERCASE),
    pickOne(DIGITS),
    pickOne(SYMBOLS),
  ];
  while (required.length < TEMPORARY_PASSWORD_LENGTH) {
    required.push(pickOne(ALL_CHARACTERS));
  }
  return shuffle(required).join('');
}

export function generateTemporaryPassword(): string {
  let candidate = buildCandidate();
  while (!isPasswordAllowed(candidate)) {
    candidate = buildCandidate();
  }
  return candidate;
}

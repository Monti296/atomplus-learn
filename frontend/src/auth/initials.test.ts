import { describe, expect, it } from 'vitest';
import { initialsFor } from './initials';

describe('initialsFor', () => {
  it('uses the first and last word of a name', () => {
    expect(initialsFor('Asha Rao')).toBe('AR');
    expect(initialsFor('  asha   kumari  rao ')).toBe('AR');
  });

  it('uses one letter for a single-word name', () => {
    expect(initialsFor('Asha')).toBe('A');
  });

  it('falls back to a question mark for an empty name', () => {
    expect(initialsFor('   ')).toBe('?');
  });
});

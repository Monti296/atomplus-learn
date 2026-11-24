import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readSessionId } from '../src/auth/session-cookie';

const SESSION_ID = 'a'.repeat(42) + '_';

describe('session cookie reader (SR-4)', () => {
  it('reads the session id from the atomplus_session cookie', () => {
    assert.equal(readSessionId(`atomplus_session=${SESSION_ID}`), SESSION_ID);
  });

  it('finds the cookie among other cookies', () => {
    assert.equal(
      readSessionId(`theme=dark; atomplus_session=${SESSION_ID}; lang=en`),
      SESSION_ID,
    );
  });

  it('returns null when there is no session cookie', () => {
    assert.equal(readSessionId(undefined), null);
    assert.equal(readSessionId(''), null);
    assert.equal(readSessionId('theme=dark'), null);
  });

  it('rejects a value that is not in the 43-character session format', () => {
    assert.equal(readSessionId('atomplus_session=short'), null);
    assert.equal(readSessionId(`atomplus_session=${SESSION_ID}extra!`), null);
  });
});

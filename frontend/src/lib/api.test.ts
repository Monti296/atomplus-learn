import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from './api';

function mockFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends the session cookie and a JSON body', async () => {
    const fetchMock = mockFetch(Response.json({ ok: true }));

    await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'asha@atomplus.in', password: 'x' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'asha@atomplus.in', password: 'x' }),
      }),
    );
  });

  it('returns undefined for a 204 response', async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiRequest('/auth/logout', { method: 'POST' })).resolves.toBe(
      undefined,
    );
  });

  it('turns the server error body into an ApiError with code and message', async () => {
    mockFetch(
      Response.json(
        { code: 'TOO_MANY_ATTEMPTS', message: 'Wait a few minutes.' },
        { status: 429 },
      ),
    );

    const error = await apiRequest('/auth/login', { method: 'POST' }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 429,
      code: 'TOO_MANY_ATTEMPTS',
      message: 'Wait a few minutes.',
    });
  });

  it('uses a generic error when the server does not send a readable body', async () => {
    mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }));

    const error = await apiRequest('/me').catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 502,
      code: 'UNKNOWN',
      message: 'Something went wrong. Please try again.',
    });
  });
});

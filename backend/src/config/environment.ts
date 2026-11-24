export type AppEnvironment = 'development' | 'test' | 'production';

export interface ValidatedEnvironment {
  NODE_ENV: AppEnvironment;
  PORT: number;
  FRONTEND_ORIGIN: string;
  DATABASE_URL: string;
  COOKIE_DOMAIN?: string;
}

function parseEnvironment(value: unknown): AppEnvironment {
  if (value === undefined) {
    return 'development';
  }

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error('NODE_ENV must be development, test or production.');
}

function parsePort(value: unknown): number {
  if (value === undefined) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseCookieDomain(value: unknown): string | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (typeof value !== 'string' || !/^[a-z0-9.-]+$/i.test(value)) {
    throw new Error('COOKIE_DOMAIN must be a domain name such as atomplus.in.');
  }

  return value;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): ValidatedEnvironment {
  const frontendOrigin = config.FRONTEND_ORIGIN;
  if (typeof frontendOrigin !== 'string' || frontendOrigin.trim() === '') {
    throw new Error('FRONTEND_ORIGIN is required.');
  }

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(frontendOrigin);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid URL.');
  }

  if (parsedOrigin.origin !== frontendOrigin || parsedOrigin.pathname !== '/') {
    throw new Error('FRONTEND_ORIGIN must be an origin URL.');
  }

  const databaseUrl = config.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required.');
  }

  return {
    NODE_ENV: parseEnvironment(config.NODE_ENV),
    PORT: parsePort(config.PORT),
    FRONTEND_ORIGIN: parsedOrigin.origin,
    DATABASE_URL: databaseUrl,
    COOKIE_DOMAIN: parseCookieDomain(config.COOKIE_DOMAIN),
  };
}

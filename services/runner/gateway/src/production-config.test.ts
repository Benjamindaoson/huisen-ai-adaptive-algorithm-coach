import { describe, expect, it } from 'vitest';
import { validateProductionEnvironment } from './production-config.js';

const valid = {
  APP_ENV: 'production', DATABASE_URL: 'postgres://identity:strong-password@db:5432/platform',
  MENTOR_AUTH_SECRET: 'mentor-auth-secret-at-least-32-bytes', ACCOUNT_TOKEN_PEPPER: 'account-token-pepper-at-least-32-bytes',
  COOKIE_SECURE: 'true', RUNNER_ALLOWED_ORIGIN: 'https://learn.example.cn',
  OBJECT_STORE_SECRET_KEY: 'object-store-secret-at-least-24', REDIS_PASSWORD: 'redis-secret-at-least-24',
  IDENTITY_DELIVERY_WEBHOOK_URL: 'https://mail.example.cn/identity', IDENTITY_DELIVERY_WEBHOOK_SECRET: 'identity-delivery-secret-at-least-32',
};

describe('production environment validation', () => {
  it('allows local development without production secrets', () => {
    expect(validateProductionEnvironment({ APP_ENV: 'development' }).production).toBe(false);
  });

  it('fails closed on missing database, weak secrets, insecure cookies and origins', () => {
    expect(() => validateProductionEnvironment({ APP_ENV: 'production' })).toThrow(/DATABASE_URL/);
    expect(() => validateProductionEnvironment({ ...valid, ACCOUNT_TOKEN_PEPPER: 'weak' })).toThrow(/ACCOUNT_TOKEN_PEPPER/);
    expect(() => validateProductionEnvironment({ ...valid, COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
    expect(() => validateProductionEnvironment({ ...valid, RUNNER_ALLOWED_ORIGIN: 'http:\/\/localhost:4173' })).toThrow(/HTTPS/);
    expect(() => validateProductionEnvironment({ ...valid, DATABASE_URL: 'postgres://user:replace-with-password@db/platform' })).toThrow(/default credential/);
  });

  it('returns a normalized production database configuration only for a safe environment', () => {
    expect(validateProductionEnvironment(valid)).toEqual({ production: true, databaseUrl: valid.DATABASE_URL, secureCookie: true });
  });
});

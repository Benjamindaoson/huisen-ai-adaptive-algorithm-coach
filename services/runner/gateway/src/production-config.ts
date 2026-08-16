export type ProductionConfiguration = { production: false } | { production: true; databaseUrl: string; secureCookie: true };

function requiredSecret(env: NodeJS.ProcessEnv, name: string, minimum: number): string {
  const value = env[name]?.trim() ?? '';
  if (value.length < minimum) throw new Error(`Production configuration requires ${name} with at least ${minimum} characters`);
  if (/replace-with|changeme|password123|default/i.test(value)) throw new Error(`Production configuration contains a default credential in ${name}`);
  return value;
}

function databaseUrl(env: NodeJS.ProcessEnv): string {
  const configured = env.DATABASE_URL?.trim();
  if (configured) {
    if (!/^postgres(?:ql)?:\/\//i.test(configured)) throw new Error('DATABASE_URL must use PostgreSQL');
    if (/replace-with|changeme|password123|:password@/i.test(configured)) throw new Error('Production configuration contains a default credential in DATABASE_URL');
    return configured;
  }
  const host = env.POSTGRES_HOST?.trim();
  const database = env.POSTGRES_DB?.trim();
  const user = env.POSTGRES_USER?.trim();
  if (!host || !database || !user) throw new Error('Production configuration requires DATABASE_URL or complete POSTGRES_* settings');
  const password = requiredSecret(env, 'POSTGRES_PASSWORD', 16);
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${env.POSTGRES_PORT?.trim() || '5432'}/${encodeURIComponent(database)}`;
}

export function validateProductionEnvironment(env: NodeJS.ProcessEnv): ProductionConfiguration {
  if (env.APP_ENV !== 'production') return { production: false };
  const resolvedDatabaseUrl = databaseUrl(env);
  requiredSecret(env, 'MENTOR_AUTH_SECRET', 32);
  requiredSecret(env, 'ACCOUNT_TOKEN_PEPPER', 32);
  requiredSecret(env, 'OBJECT_STORE_SECRET_KEY', 24);
  requiredSecret(env, 'REDIS_PASSWORD', 24);
  requiredSecret(env, 'IDENTITY_DELIVERY_WEBHOOK_SECRET', 32);
  const deliveryUrl = env.IDENTITY_DELIVERY_WEBHOOK_URL?.trim() ?? '';
  if (!deliveryUrl.startsWith('https://') || /localhost|127\.0\.0\.1/i.test(deliveryUrl)) throw new Error('Production IDENTITY_DELIVERY_WEBHOOK_URL must use public HTTPS');
  if (env.COOKIE_SECURE !== 'true') throw new Error('Production configuration requires COOKIE_SECURE=true');
  const origins = (env.RUNNER_ALLOWED_ORIGIN ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (!origins.length || origins.some((origin) => !origin.startsWith('https://') || /localhost|127\.0\.0\.1/i.test(origin))) {
    throw new Error('Production RUNNER_ALLOWED_ORIGIN must contain explicit public HTTPS origins only');
  }
  return { production: true, databaseUrl: resolvedDatabaseUrl, secureCookie: true };
}

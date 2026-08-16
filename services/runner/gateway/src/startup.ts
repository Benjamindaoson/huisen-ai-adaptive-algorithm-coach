import { buildServer } from './server.js';
import { Pool } from 'pg';
import { createAccountIdentityService } from './identity/account-identity.js';
import { createPostgresAccountStore } from './identity/postgres-account-store.js';
import { validateProductionEnvironment } from './production-config.js';
import { createPostgresLearningStore } from './postgres-learning-store.js';
import { createIdentityNotifier } from './identity/identity-delivery.js';
import { createPostgresSubmissionStore } from './judging/postgres-submission-store.js';
import { createDurableSubmissionService } from './judging/durable-submission-service.js';
import { listAvailableStarterJudgePacks, resolveStarterJudgePack } from './judging/starter-pack-resolver.js';
import { executeRun } from './judge0.js';
import { createPostgresMentorStore } from './mentor/postgres-mentor-store.js';
import { createPostgresMentorOSStore } from './mentor-os/postgres-store.js';

type GatewayApp = ReturnType<typeof buildServer>;

export async function startGateway(options: { app?: GatewayApp; port?: number; host?: string } = {}): Promise<GatewayApp> {
  const production = validateProductionEnvironment(process.env);
  let app = options.app;
  if (!app) {
    const configuredForPostgres = production.production || Boolean(process.env.IDENTITY_PG_HOST?.trim());
    if (configuredForPostgres) {
      const pool = production.production
        ? new Pool({ connectionString: production.databaseUrl })
        : new Pool({
          host: process.env.IDENTITY_PG_HOST, port: Number(process.env.POSTGRES_PORT ?? 5432),
          database: process.env.POSTGRES_DB, user: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD,
        });
      const notifier = createIdentityNotifier(process.env);
      const accountIdentity = createAccountIdentityService({ store: createPostgresAccountStore({ pool }), tokenPepper: process.env.ACCOUNT_TOKEN_PEPPER, notify: notifier });
      const authoritativeLearningStore = createPostgresLearningStore({ pool });
      const durableSubmissions = createDurableSubmissionService({ store: createPostgresSubmissionStore({ pool }), resolvePack: resolveStarterJudgePack, listPacks: listAvailableStarterJudgePacks, execute: executeRun, costMicrosPerSecond: Number(process.env.JUDGE_COST_MICROS_PER_SECOND ?? 0) });
      await durableSubmissions.reconcile();
      app = buildServer({
        accountIdentity, learningStore: authoritativeLearningStore, authoritativeLearningStore, durableSubmissions,
        mentorStore: createPostgresMentorStore({ pool }), mentorOSStore: createPostgresMentorOSStore({ pool }),
        ...(notifier.developmentTokenFor ? { developmentIdentityTokenFor: notifier.developmentTokenFor } : {}),
      });
      app.addHook('onClose', async () => { await pool.end(); });
    } else app = buildServer();
  }
  const port = options.port ?? Number(process.env.PORT ?? 8787);
  const host = options.host ?? '0.0.0.0';
  await app.listen({ port, host });
  return app;
}

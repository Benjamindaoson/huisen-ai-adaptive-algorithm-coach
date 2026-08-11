import { buildServer } from './server.js';

type GatewayApp = ReturnType<typeof buildServer>;

export async function startGateway(options: { app?: GatewayApp; port?: number; host?: string } = {}): Promise<GatewayApp> {
  const app = options.app ?? buildServer();
  const port = options.port ?? Number(process.env.PORT ?? 8787);
  const host = options.host ?? '0.0.0.0';
  await app.listen({ port, host });
  return app;
}

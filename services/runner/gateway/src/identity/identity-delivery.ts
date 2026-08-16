type Delivery = { purpose: 'verification' | 'recovery'; recipient: string; token: string };
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type IdentityNotifier = ((delivery: Delivery) => Promise<void>) & { developmentTokenFor?: (recipient: string, purpose: Delivery['purpose']) => string | undefined };

export function createIdentityNotifier(env: NodeJS.ProcessEnv, fetcher: Fetcher = fetch): IdentityNotifier {
  const url = env.IDENTITY_DELIVERY_WEBHOOK_URL?.trim() ?? '';
  const secret = env.IDENTITY_DELIVERY_WEBHOOK_SECRET?.trim() ?? '';
  if (!url) {
    if (env.APP_ENV === 'production') throw new Error('Production configuration requires IDENTITY_DELIVERY_WEBHOOK_URL');
    const tokens = new Map<string, string>();
    const notifier: IdentityNotifier = async (delivery) => { tokens.set(`${delivery.purpose}:${delivery.recipient.toLowerCase()}`, delivery.token); };
    notifier.developmentTokenFor = (recipient, purpose) => tokens.get(`${purpose}:${recipient.toLowerCase()}`);
    return notifier;
  }
  if (!url.startsWith('https://') || /localhost|127\.0\.0\.1/i.test(url)) throw new Error('IDENTITY_DELIVERY_WEBHOOK_URL must use public HTTPS');
  if (secret.length < 32) throw new Error('IDENTITY_DELIVERY_WEBHOOK_SECRET must contain at least 32 characters');
  return async (delivery) => {
    const response = await fetcher(url, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
      body: JSON.stringify({ version: 1, ...delivery }), signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error('Identity delivery unavailable');
  };
}

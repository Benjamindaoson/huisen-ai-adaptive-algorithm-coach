const baseUrl = (process.env.GATEWAY_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const email = `submission-smoke-${Date.now()}@example.test`;
const password = 'correct horse battery staple 2026';

async function json(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) });
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return { response, body };
}

const registration = await json('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
if (!registration.body.developmentVerificationToken) throw new Error('Local identity delivery did not return a verification token');
await json('/api/v1/auth/verify', { method: 'POST', body: JSON.stringify({ token: registration.body.developmentVerificationToken }) });
const login = await json('/api/v1/auth/sessions', { method: 'POST', body: JSON.stringify({ email, password, deviceName: 'durable-smoke' }) });
const cookie = String(login.response.headers.get('set-cookie') ?? '').split(';')[0];
const csrf = login.body.csrfToken;
if (!cookie || !csrf) throw new Error('Session cookie or CSRF credential missing');

const availability = await json('/api/v1/judge-packs/available', { headers: { cookie } });
const version = availability.body.packs.find((item) => item.problemId === 'od-5e34daac53f3')?.problemVersionId;
if (!version) throw new Error('Expected starter judge pack is not available');
const sourceCode = `import sys
def main():
    lines=sys.stdin.read().strip().splitlines()
    n=int(lines[0]); spans=sorted(tuple(map(int,line.split())) for line in lines[1:n+1])
    merged=[]
    for start,end in spans:
        if not merged or start>merged[-1][1]: merged.append([start,end])
        else: merged[-1][1]=max(merged[-1][1],end)
    print('\\n'.join(f'{start} {end}' for start,end in merged))
if __name__=='__main__': main()
`;
const accepted = await json('/api/v1/submissions', { method: 'POST', headers: { cookie, 'x-csrf-token': csrf }, body: JSON.stringify({ problemVersionId: version, language: 'python', sourceCode, idempotencyKey: `smoke-${Date.now()}` }) });
if (JSON.stringify(accepted.body).includes(sourceCode) || /stdin|expectedOutput/i.test(JSON.stringify(accepted.body))) throw new Error('Submission response leaked source or hidden test fields');
let submission = accepted.body;
for (let index = 0; index < 60 && ['queued', 'running'].includes(submission.status); index += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  submission = (await json(`/api/v1/submissions/${encodeURIComponent(submission.id)}`, { headers: { cookie } })).body;
}
if (submission.status !== 'passed') throw new Error(`Durable hidden submission did not pass: ${JSON.stringify(submission)}`);
process.stdout.write(`${JSON.stringify({ version: 1, authenticated: true, judgePack: version, submission: { id: submission.id, status: submission.status, passedCount: submission.passedCount, totalCount: submission.totalCount, revision: submission.revision } }, null, 2)}\n`);

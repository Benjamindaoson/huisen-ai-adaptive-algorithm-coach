import { expect, it } from 'vitest';
import config from '../vite.config';

it('uses the gateway allowlisted origin for zero-configuration local development', () => {
  expect(config).toMatchObject({
    server: {
      host: '127.0.0.1',
      port: 4178,
      strictPort: true,
    },
  });
});

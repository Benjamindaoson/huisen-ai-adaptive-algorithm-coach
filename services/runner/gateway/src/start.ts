import { startGateway } from './startup.js';

startGateway().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

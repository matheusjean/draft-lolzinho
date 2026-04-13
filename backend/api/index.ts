import serverless from 'serverless-http';

import { createNestApp } from '../src/bootstrap';

type Handler = ReturnType<typeof serverless>;

let cachedHandler: Handler | null = null;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createNestApp();
    cachedHandler = serverless(app.getHttpAdapter().getInstance());
  }

  return cachedHandler;
}

export default async function handler(request: unknown, response: unknown) {
  const server = await getHandler();
  return server(
    request as Parameters<Handler>[0],
    response as Parameters<Handler>[1],
  );
}

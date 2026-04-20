import serverless from 'serverless-http';
import type { IncomingMessage } from 'node:http';

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

function normalizeRequestUrl(request: unknown) {
  const incomingRequest = request as IncomingMessage;
  const url = incomingRequest.url ?? '';

  if (url.startsWith('/api') || !url.startsWith('/')) {
    return;
  }

  incomingRequest.url = `/api${url}`;
}

export default async function handler(request: unknown, response: unknown) {
  normalizeRequestUrl(request);

  const server = await getHandler();
  return server(
    request as Parameters<Handler>[0],
    response as Parameters<Handler>[1],
  );
}

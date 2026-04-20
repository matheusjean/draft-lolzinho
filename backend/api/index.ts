import serverless from 'serverless-http';
import type { IncomingMessage, ServerResponse } from 'node:http';

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

function getRequestPath(request: unknown) {
  const incomingRequest = request as IncomingMessage;
  return (incomingRequest.url ?? '').split('?')[0];
}

function sendJson(
  response: unknown,
  statusCode: number,
  body: Record<string, unknown>,
) {
  const serverResponse = response as ServerResponse;
  serverResponse.statusCode = statusCode;
  serverResponse.setHeader('content-type', 'application/json; charset=utf-8');
  serverResponse.end(JSON.stringify(body));
}

export default async function handler(request: unknown, response: unknown) {
  normalizeRequestUrl(request);

  const requestPath = getRequestPath(request);

  if (requestPath === '/api/health') {
    return sendJson(response, 200, {
      status: 'ok',
      runtime: 'vercel-function',
      timestamp: new Date().toISOString(),
    });
  }

  const server = await getHandler();
  return server(
    request as Parameters<Handler>[0],
    response as Parameters<Handler>[1],
  );
}

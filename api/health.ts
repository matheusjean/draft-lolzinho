import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(
    JSON.stringify({
      status: 'ok',
      runtime: 'vercel-health-function',
      timestamp: new Date().toISOString(),
    }),
  );
}

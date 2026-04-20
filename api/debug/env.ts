import type { IncomingMessage, ServerResponse } from 'node:http';

import { getEnvironmentFallbackDiagnostics } from '../../backend/src/config/env-fallbacks';

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(getEnvironmentFallbackDiagnostics()));
}

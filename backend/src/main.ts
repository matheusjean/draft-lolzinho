import { Logger } from '@nestjs/common';

import { createNestApp } from './bootstrap';

async function bootstrap() {
  const app = await createNestApp();
  const port = Number(process.env.PORT ?? 3333);

  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend listening on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { AppModule } from './app.module';

const express = require('express');

function parseCorsOrigins(value?: string) {
  if (!value) {
    return true;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function findFrontendDistPath() {
  const candidates = [
    resolve(process.cwd(), 'dist'),
    resolve(process.cwd(), '..', 'dist'),
    resolve(process.cwd(), 'frontend', 'dist'),
  ];

  return candidates.find((candidate) =>
    existsSync(join(candidate, 'index.html')),
  );
}

function setupFrontendFallback(app: NestExpressApplication) {
  const frontendDistPath = findFrontendDistPath();

  if (!frontendDistPath) {
    return;
  }

  const frontendIndexPath = join(frontendDistPath, 'index.html');
  app.useStaticAssets(frontendDistPath);

  const server = app.getHttpAdapter().getInstance();
  server.use(
    (
      req: { method?: string; originalUrl?: string; url?: string },
      res: { sendFile: (path: string) => unknown },
      next: () => unknown,
    ) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }

      const requestPath = (req.originalUrl ?? req.url ?? '').split('?')[0];

      if (
        requestPath === '/api' ||
        requestPath.startsWith('/api/') ||
        extname(requestPath)
      ) {
        return next();
      }

      return res.sendFile(frontendIndexPath);
    },
  );
}

export async function createNestApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(express.json({ limit: '10mb' }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: '10mb',
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: parseCorsOrigins(configService.get<string>('CORS_ORIGIN')),
    credentials: true,
  });
  setupFrontendFallback(app);

  await app.init();

  return app;
}

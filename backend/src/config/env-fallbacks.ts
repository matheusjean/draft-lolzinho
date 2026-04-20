import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'draft_PRISMA_DATABASE_URL',
  'draft_DATABASE_URL',
  'draft_POSTGRES_URL',
  'DRAFT_PRISMA_DATABASE_URL',
  'DRAFT_DATABASE_URL',
  'DRAFT_POSTGRES_URL',
  'STORAGE_PRISMA_DATABASE_URL',
  'STORAGE_DATABASE_URL',
  'STORAGE_POSTGRES_URL',
];

const DIRECT_URL_KEYS = [
  'DIRECT_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL',
  'PRISMA_DATABASE_URL',
  'draft_POSTGRES_URL',
  'draft_DATABASE_URL',
  'draft_PRISMA_DATABASE_URL',
  'DRAFT_POSTGRES_URL',
  'DRAFT_DATABASE_URL',
  'DRAFT_PRISMA_DATABASE_URL',
  'STORAGE_POSTGRES_URL',
  'STORAGE_DATABASE_URL',
  'STORAGE_PRISMA_DATABASE_URL',
  'DATABASE_URL',
];

function firstDefined(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return '';
}

function loadDotEnvIfPossible() {
  const envPath = resolve(process.cwd(), '.env');

  if (
    existsSync(envPath) &&
    typeof process.loadEnvFile === 'function'
  ) {
    process.loadEnvFile(envPath);
  }
}

export function applyEnvironmentFallbacks() {
  loadDotEnvIfPossible();

  if (!process.env.DATABASE_URL) {
    const databaseUrl = firstDefined(DATABASE_URL_KEYS);

    if (databaseUrl) {
      process.env.DATABASE_URL = databaseUrl;
    }
  }

  if (!process.env.DIRECT_URL) {
    const directUrl = firstDefined(DIRECT_URL_KEYS);

    if (directUrl) {
      process.env.DIRECT_URL = directUrl;
    }
  }
}

export function getEnvironmentFallbackDiagnostics() {
  applyEnvironmentFallbacks();

  const keys = [
    ...new Set([
      ...DATABASE_URL_KEYS,
      ...DIRECT_URL_KEYS,
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'LOGIN_CODE_TTL_MINUTES',
      'NODE_ENV',
      'CORS_ORIGIN',
      'VERCEL',
      'VERCEL_ENV',
    ]),
  ];

  return {
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    directUrlConfigured: Boolean(process.env.DIRECT_URL),
    jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    presentKeys: keys.filter((key) => Boolean(process.env[key])),
  };
}

applyEnvironmentFallbacks();

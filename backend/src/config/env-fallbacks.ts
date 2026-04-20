import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DATABASE_URL_KEYS = [
  'DATABASE_URL',
  'draft_PRISMA_DATABASE_URL',
  'draft_DATABASE_URL',
  'draft_POSTGRES_URL',
];

const DIRECT_URL_KEYS = [
  'DIRECT_URL',
  'draft_POSTGRES_URL',
  'draft_DATABASE_URL',
  'draft_PRISMA_DATABASE_URL',
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

applyEnvironmentFallbacks();

import { execSync } from 'node:child_process';

const vercelEnv = process.env.VERCEL_ENV ?? '';
const nodeEnv = process.env.NODE_ENV ?? '';
const isVercel = process.env.VERCEL === '1';
const shouldMigrate =
  process.env.AUTO_APPLY_MIGRATIONS === 'true' ||
  (((isVercel && vercelEnv === 'production') ||
    (!isVercel && nodeEnv === 'production')) &&
    process.env.SKIP_PRISMA_MIGRATE !== '1');

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, {
    stdio: 'inherit',
    env: process.env,
  });
}

run('npm run prisma:generate');

if (shouldMigrate) {
  run('npm run prisma:migrate:deploy');
} else {
  console.log(
    '\n> Skipping prisma migrate deploy for this build. Set AUTO_APPLY_MIGRATIONS=true to force it.',
  );
}

run('npm run build');

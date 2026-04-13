import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'matheusjean11@gmail.com';

async function main() {
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { isSuperAdmin: true },
    create: {
      email: ADMIN_EMAIL,
      isSuperAdmin: true,
    },
  });

  console.log(`Admin seed ready for ${ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

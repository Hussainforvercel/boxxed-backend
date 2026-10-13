import { existsSync } from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client';
import { AdminRole } from '../src/generated/prisma/enums';

if (existsSync('.env')) process.loadEnvFile('.env');

const connectionString =
  process.env.DATABASE_URL || 'postgresql://boxxed:boxxed_local_only@localhost:5433/boxxed';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@boxxed.pk').toLowerCase();
  const rawPassword = process.env.SEED_ADMIN_PASSWORD || 'SuperAdmin123!@#';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      title: 'SUPER ADMIN',
      hqLocation: 'Karachi HQ',
    },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'Marcus Vance',
      role: AdminRole.SUPER_ADMIN,
      title: 'SUPER ADMIN',
      hqLocation: 'Karachi HQ',
      isActive: true,
    },
  });

  console.log(`[Seed] Root Super Admin provisioned: ${admin.email} (Role: ${admin.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

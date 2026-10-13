/* eslint-disable */
const { existsSync } = require('node:fs');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const connectionString =
  process.env.DATABASE_URL || 'postgresql://boxxed:boxxed_local_only@localhost:5433/boxxed';

// Load generated client
const { PrismaClient } = require('../dist/generated/prisma/client');
const { StaffRole, StaffStatus } = require('../dist/generated/prisma/enums');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const restaurant = await prisma.restaurant.findFirst({
    where: { partnerNumber: '#100' },
    include: { branches: true },
  });

  if (!restaurant) {
    console.error('Restaurant #100 (The Flour Pavilion) not found!');
    return;
  }

  const cliftonBranch =
    restaurant.branches.find((b) => b.internalCode === 'TFP-CLI-01') || restaurant.branches[0];

  if (!cliftonBranch) {
    console.error('Clifton branch for #100 not found!');
    return;
  }

  const email = 'manager@flourpavilion.pk';
  const rawPassword = 'Partner123!@#';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const existingStaff = await prisma.branchStaff.findFirst({
    where: {
      OR: [{ email }, { username: 'manager.flourpavilion' }],
    },
  });

  let staff;
  if (existingStaff) {
    staff = await prisma.branchStaff.update({
      where: { id: existingStaff.id },
      data: {
        name: 'Zainab Qazi',
        email,
        username: 'manager.flourpavilion',
        passwordHash,
        role: StaffRole.RESTAURANT_ADMIN,
        status: StaffStatus.ACTIVE,
        isActive: true,
        branchId: cliftonBranch.id,
      },
    });
    console.log(`[Provision] Updated Restaurant Admin: ${staff.name} (${staff.email})`);
  } else {
    staff = await prisma.branchStaff.create({
      data: {
        branchId: cliftonBranch.id,
        name: 'Zainab Qazi',
        email,
        username: 'manager.flourpavilion',
        passwordHash,
        role: StaffRole.RESTAURANT_ADMIN,
        status: StaffStatus.ACTIVE,
        isActive: true,
      },
    });
    console.log(`[Provision] Created Restaurant Admin: ${staff.name} (${staff.email})`);
  }

  // Provision menu items for The Flour Pavilion
  const item1 = await prisma.masterMenuItem.upsert({
    where: {
      restaurantId_sku: {
        restaurantId: restaurant.id,
        sku: 'ITM-FP-001',
      },
    },
    update: {
      name: 'Country Sourdough Boule (750g)',
      specNarrative:
        'Naturally fermented 36-hour wild levain loaf with dark caramelized crust and open crumb.',
      category: 'Artisanal Breads',
      basePriceMinor: 65000,
    },
    create: {
      restaurantId: restaurant.id,
      sku: 'ITM-FP-001',
      name: 'Country Sourdough Boule (750g)',
      specNarrative:
        'Naturally fermented 36-hour wild levain loaf with dark caramelized crust and open crumb.',
      category: 'Artisanal Breads',
      basePriceMinor: 65000,
    },
  });

  const item2 = await prisma.masterMenuItem.upsert({
    where: {
      restaurantId_sku: {
        restaurantId: restaurant.id,
        sku: 'ITM-FP-002',
      },
    },
    update: {
      name: 'Cardamom & Orange Morning Bun',
      specNarrative:
        'Laminated croissant dough rolled in green cardamom sugar and organic orange zest.',
      category: 'Viennoiserie',
      basePriceMinor: 38000,
    },
    create: {
      restaurantId: restaurant.id,
      sku: 'ITM-FP-002',
      name: 'Cardamom & Orange Morning Bun',
      specNarrative:
        'Laminated croissant dough rolled in green cardamom sugar and organic orange zest.',
      category: 'Viennoiserie',
      basePriceMinor: 38000,
    },
  });

  // Ensure branch overrides exist
  await prisma.branchMenuOverride.upsert({
    where: {
      branchId_masterMenuItemId: {
        branchId: cliftonBranch.id,
        masterMenuItemId: item1.id,
      },
    },
    update: { isAvailable: true },
    create: {
      branchId: cliftonBranch.id,
      masterMenuItemId: item1.id,
      isAvailable: true,
    },
  });

  await prisma.branchMenuOverride.upsert({
    where: {
      branchId_masterMenuItemId: {
        branchId: cliftonBranch.id,
        masterMenuItemId: item2.id,
      },
    },
    update: { isAvailable: true },
    create: {
      branchId: cliftonBranch.id,
      masterMenuItemId: item2.id,
      isAvailable: true,
    },
  });

  console.log('[Provision] Menu items & branch overrides provisioned for The Flour Pavilion.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

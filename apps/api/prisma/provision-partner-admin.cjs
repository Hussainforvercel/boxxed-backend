/* eslint-disable */
const { existsSync } = require('node:fs');
const crypto = require('node:crypto');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const connectionString =
  process.env.DATABASE_URL || 'postgresql://boxxed:boxxed_local_only@localhost:5433/boxxed';

// Load generated client
const { PrismaClient } = require('../dist/generated/prisma/client');
const {
  StaffRole,
  StaffStatus,
  PartnerStatus,
  SubscriptionTier,
  BranchStatus,
  DropStatus,
  OrderStatus,
} = require('../dist/generated/prisma/enums');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log('[Provision] Connecting to database at port 5433...');

  // 1. Ensure Restaurant #100 exists
  let restaurant = await prisma.restaurant.findFirst({
    where: { partnerNumber: '#100' },
    include: { branches: true },
  });

  if (!restaurant) {
    console.log('[Provision] Creating Restaurant #100 (The Flour Pavilion)...');
    restaurant = await prisma.restaurant.create({
      data: {
        name: 'The Flour Pavilion',
        slug: 'the-flour-pavilion',
        avatarLetter: 'FP',
        avatarBg: '#735A36',
        partnerNumber: '#100',
        cuisine: 'Artisanal Bakery & Continental',
        description: 'Naturally fermented sourdough, laminated viennoiserie, and curated evening boxes.',
        status: PartnerStatus.ACTIVE,
        subscription: SubscriptionTier.ACTIVE,
        contactName: 'Zainab Qazi',
        contactEmail: 'manager@flourpavilion.pk',
        contactPhone: '+92 300 1234567',
        altPhone: '+92 21 3588 9012',
        district: 'DHA / Clifton',
        address: 'Plot 10-C, 7th Commercial Lane, Zamzama, Clifton, Karachi',
        stationId: 'TFP-CLI-01',
        executiveChef: 'Chef Raymond Vance',
        managerName: 'Zainab Qazi',
        verificationPercent: 100,
        activeDropWindow: '19:30 – 21:30 PKT',
        bankName: 'Habib Bank Limited',
        bankAccountTitle: 'The Flour Pavilion Karachi',
        bankAccountNumber: '0042790184092001',
        bankIban: 'PK36HABB0000427901840920',
        commissionRateBasisPoints: 1200, // 12%
        gstRateBasisPoints: 1500, // 15%
        branches: {
          create: {
            name: 'The Flour Pavilion (Clifton #100)',
            slug: 'the-flour-pavilion-clifton',
            internalCode: 'TFP-CLI-01',
            locationArea: 'Plot 10-C, 7th Commercial Lane, Zamzama, Clifton, Karachi',
            address: 'Plot 10-C, 7th Commercial Lane, Zamzama, Clifton, Karachi',
            latitude: 24.8214,
            longitude: 67.0315,
            phone: '+92 21 3588 9012',
            email: 'clifton@flourpavilion.pk',
            status: BranchStatus.ACTIVE,
          },
        },
      },
      include: { branches: true },
    });
    console.log(`[Provision] Created Restaurant: ${restaurant.name} (${restaurant.partnerNumber})`);
  }

  // 2. Identify Clifton branch
  let cliftonBranch =
    restaurant.branches.find((b) => b.internalCode === 'TFP-CLI-01') || restaurant.branches[0];

  if (!cliftonBranch) {
    cliftonBranch = await prisma.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: 'The Flour Pavilion (Clifton #100)',
        slug: 'the-flour-pavilion-clifton',
        internalCode: 'TFP-CLI-01',
        locationArea: 'Plot 10-C, 7th Commercial Lane, Zamzama, Clifton, Karachi',
        address: 'Plot 10-C, 7th Commercial Lane, Zamzama, Clifton, Karachi',
        latitude: 24.8214,
        longitude: 67.0315,
        phone: '+92 21 3588 9012',
        email: 'clifton@flourpavilion.pk',
        status: BranchStatus.ACTIVE,
      },
    });
  }

  // 3. Operating schedules for Clifton branch (7 days)
  for (let day = 0; day <= 6; day++) {
    await prisma.branchOperatingSchedule.upsert({
      where: {
        branchId_dayOfWeek: {
          branchId: cliftonBranch.id,
          dayOfWeek: day,
        },
      },
      update: {
        openTime: '12:00',
        closeTime: day === 5 || day === 6 ? '00:00' : '23:00',
        isClosed: false,
      },
      create: {
        branchId: cliftonBranch.id,
        dayOfWeek: day,
        openTime: '12:00',
        closeTime: day === 5 || day === 6 ? '00:00' : '23:00',
        isClosed: false,
      },
    });
  }

  // 4. Partner Staff Admin account
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

  // 5. Master Menu Items & Overrides
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

  // 6. Drops (Curated dinner boxes)
  const today = new Date();
  const pickupStart = new Date(today);
  pickupStart.setHours(19, 30, 0, 0);
  const pickupEnd = new Date(today);
  pickupEnd.setHours(22, 30, 0, 0);

  const drop1 = await prisma.drop.upsert({
    where: { sku: '#BX-9042' },
    update: {
      branchId: cliftonBranch.id,
      status: DropStatus.ACTIVE_DROP,
      remainingQuantity: 12,
    },
    create: {
      branchId: cliftonBranch.id,
      sku: '#BX-9042',
      title: 'Grand Viennoiserie & Sourdough Harvest Box',
      categoryTag: 'Feast',
      headlineItem: 'Laminated Pastry & 36h Sourdough Loaf',
      description: 'Handcrafted sourdough boule, 2 chocolate croissants, 2 morning buns & salted butter.',
      priceMinor: 485000, // PKR 4,850
      originalPriceMinor: 650000, // PKR 6,500
      discountTier: 'Tier 1',
      totalQuantity: 30,
      remainingQuantity: 12,
      pickupStart,
      pickupEnd,
      pickupSlotDuration: '7:30 PM – 10:30 PM',
      seriesCode: 'SERIES 01',
      rackAllocation: 'Rack A1 – A3',
      scheduledTimeText: '8:00 PM',
      status: DropStatus.ACTIVE_DROP,
    },
  });

  const drop2 = await prisma.drop.upsert({
    where: { sku: '#BX-9041' },
    update: {
      branchId: cliftonBranch.id,
      status: DropStatus.ACTIVE_DROP,
      remainingQuantity: 8,
    },
    create: {
      branchId: cliftonBranch.id,
      sku: '#BX-9041',
      title: 'Artisan Charcoal Brioche & Pastry Drop',
      categoryTag: 'Craft BBQ',
      headlineItem: 'Smoked Brioche with Orange Glaze',
      description: 'Savory brioche burger buns, cardamom twists, and whipped vanilla mascarpone.',
      priceMinor: 380000, // PKR 3,800
      originalPriceMinor: 520000, // PKR 5,200
      discountTier: 'Tier 1',
      totalQuantity: 25,
      remainingQuantity: 8,
      pickupStart,
      pickupEnd,
      pickupSlotDuration: '7:30 PM – 10:30 PM',
      seriesCode: 'SERIES 02',
      rackAllocation: 'Rack B1 – B2',
      scheduledTimeText: '8:30 PM',
      status: DropStatus.ACTIVE_DROP,
    },
  });

  const drop3 = await prisma.drop.upsert({
    where: { sku: '#BX-9039' },
    update: {
      branchId: cliftonBranch.id,
      status: DropStatus.SOLD_OUT,
      remainingQuantity: 0,
    },
    create: {
      branchId: cliftonBranch.id,
      sku: '#BX-9039',
      title: 'Single Estate Morning Pastry Assortment',
      categoryTag: 'Bakery',
      headlineItem: 'Cardamom Buns & Sourdough Croissants',
      description: 'Crisp morning assortment packaged in signature ventilated kraft box.',
      priceMinor: 290000, // PKR 2,900
      originalPriceMinor: 400000, // PKR 4,000
      discountTier: 'Tier 1',
      totalQuantity: 20,
      remainingQuantity: 0,
      pickupStart,
      pickupEnd,
      pickupSlotDuration: '7:30 PM – 10:30 PM',
      seriesCode: 'SERIES 03',
      rackAllocation: 'Rack C1',
      scheduledTimeText: '7:30 PM',
      status: DropStatus.SOLD_OUT,
    },
  });

  // 7. Test Customer & Reservations (Orders)
  let testUser = await prisma.user.findFirst({
    where: { phoneE164: '+923001234567' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        fullName: 'Farhan Zaidi',
        phoneE164: '+923001234567',
        email: 'farhan.z@example.com',
      },
    });
  }

  // Reservation 1 (Ready for pickup / Awaiting)
  await prisma.reservation.upsert({
    where: { orderNumber: 'BX-9042' },
    update: {
      status: OrderStatus.READY_FOR_PICKUP,
      dropId: drop1.id,
    },
    create: {
      orderNumber: 'BX-9042',
      userId: testUser.id,
      dropId: drop1.id,
      quantity: 1,
      status: OrderStatus.READY_FOR_PICKUP,
      priceMinor: 485000,
      referenceCode: 'REF-9042',
      idempotencyKey: crypto.randomUUID(),
      pickupOtp: '4891',
      rackLocation: 'Rack #01',
      holdExpiresAt: pickupEnd,
    },
  });

  // Reservation 2 (In kitchen / Preparing)
  await prisma.reservation.upsert({
    where: { orderNumber: 'BX-9041' },
    update: {
      status: OrderStatus.IN_KITCHEN,
      dropId: drop2.id,
    },
    create: {
      orderNumber: 'BX-9041',
      userId: testUser.id,
      dropId: drop2.id,
      quantity: 1,
      status: OrderStatus.IN_KITCHEN,
      priceMinor: 380000,
      referenceCode: 'REF-9041',
      idempotencyKey: crypto.randomUUID(),
      pickupOtp: '5120',
      rackLocation: 'Rack #02',
      holdExpiresAt: pickupEnd,
    },
  });

  // Reservation 3 (Completed)
  await prisma.reservation.upsert({
    where: { orderNumber: 'BX-9039' },
    update: {
      status: OrderStatus.COMPLETED,
      dropId: drop3.id,
      collectedAt: new Date(),
    },
    create: {
      orderNumber: 'BX-9039',
      userId: testUser.id,
      dropId: drop3.id,
      quantity: 1,
      status: OrderStatus.COMPLETED,
      priceMinor: 290000,
      referenceCode: 'REF-9039',
      idempotencyKey: crypto.randomUUID(),
      pickupOtp: '3318',
      rackLocation: 'Rack #03',
      holdExpiresAt: pickupEnd,
      collectedAt: new Date(),
    },
  });

  // 8. Reviews
  const existingReview = await prisma.review.findFirst({
    where: { restaurantId: restaurant.id },
  });

  if (!existingReview) {
    await prisma.review.create({
      data: {
        restaurantId: restaurant.id,
        branchId: cliftonBranch.id,
        customerName: 'Ayesha Bilgrami',
        rating: 5,
        boxTitle: 'Grand Viennoiserie & Sourdough Harvest Box',
        comment: 'The sourdough was still warm and the cardamom buns are unbeatable in Karachi.',
        tags: ['Crisp Crust', 'Warm on Arrival', 'Artisanal Bread'],
        reply: 'Thank you Ayesha! Our levain was slow-fermented for 36 hours for that crust.',
        repliedAt: new Date(),
      },
    });

    await prisma.review.create({
      data: {
        restaurantId: restaurant.id,
        branchId: cliftonBranch.id,
        customerName: 'Danyal Siddiqui',
        rating: 5,
        boxTitle: 'Artisan Charcoal Brioche & Pastry Drop',
        comment: 'Flawless counter pickup at Clifton. Bagged and sealed with heated liner.',
        tags: ['Fast Handover', 'Piping Hot'],
      },
    });
  }

  // 9. Payouts
  const existingPayout = await prisma.partnerPayout.findFirst({
    where: { restaurantId: restaurant.id },
  });

  if (!existingPayout) {
    await prisma.partnerPayout.create({
      data: {
        restaurantId: restaurant.id,
        payoutReference: 'PAY-2025-10-07',
        periodStart: new Date('2025-10-01'),
        periodEnd: new Date('2025-10-07'),
        grossBoxesSold: 82,
        grossSalesMinor: 38640000,
        platformFeeMinor: 4636800,
        taxWithheldMinor: 0,
        netPayableMinor: 34003200,
        isSettled: true,
        settledAt: new Date('2025-10-08T16:00:00Z'),
      },
    });

    await prisma.partnerPayout.create({
      data: {
        restaurantId: restaurant.id,
        payoutReference: 'PAY-2025-10-08',
        periodStart: new Date('2025-10-08'),
        periodEnd: new Date('2025-10-14'),
        grossBoxesSold: 55,
        grossSalesMinor: 54829500,
        platformFeeMinor: 6579540,
        taxWithheldMinor: 0,
        netPayableMinor: 48250000,
        isSettled: false,
      },
    });
  }

  console.log('[Provision] All Restaurant #100 data provisioned successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

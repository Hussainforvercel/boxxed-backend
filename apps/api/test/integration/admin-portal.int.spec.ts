import { ErrorCode } from '@boxxed/shared';

import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { errorOf, gql } from '../utils/graphql';

import { REDIS_CLIENT } from '../../src/infra/redis/redis.constants';

import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';

const ADMIN_LOGIN = `
  mutation AdminLogin($input: AdminLoginInput!) {
    adminLogin(input: $input) {
      accessToken
      adminUser {
        id
        email
        role
        fullName
      }
    }
  }
`;

const ADMIN_ME = `
  query AdminMe {
    adminMe {
      id
      email
      role
      fullName
    }
  }
`;

const ADMIN_ONBOARD = `
  mutation AdminOnboard($input: CreateRestaurantOnboardingInput!) {
    adminCreateRestaurantWithBranch(input: $input) {
      id
      name
      partnerNumber
      slug
      status
      branchesCount
      branches {
        id
        name
        internalCode
        schedules {
          dayOfWeek
          openTime
          closeTime
        }
      }
      masterMenuItems {
        id
        name
        sku
        basePriceMinor
      }
    }
  }
`;

describe('Super Admin Portal (Auth & Dynamic Onboarding)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      const testRestaurants = await prisma.restaurant.findMany({
        where: { name: { in: ['The Daily Bowl', 'Artisan Crust Pizza'] } },
        select: { id: true },
      });
      const ids = testRestaurants.map((r) => r.id);
      if (ids.length > 0) {
        await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
        await prisma.branchMenuOverride.deleteMany({
          where: { branch: { restaurantId: { in: ids } } },
        });
        await prisma.masterMenuItem.deleteMany({
          where: { restaurantId: { in: ids } },
        });
        await prisma.branchOperatingSchedule.deleteMany({
          where: { branch: { restaurantId: { in: ids } } },
        });
        await prisma.branchStaff.deleteMany({
          where: { branch: { restaurantId: { in: ids } } },
        });
        await prisma.drop.deleteMany({
          where: { branch: { restaurantId: { in: ids } } },
        });
        await prisma.branch.deleteMany({
          where: { restaurantId: { in: ids } },
        });
        await prisma.restaurant.deleteMany({
          where: { id: { in: ids } },
        });
      }
    } catch {}
    const redis = app.get<Redis>(REDIS_CLIENT);
    await redis.quit().catch(() => redis.disconnect());
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects invalid admin login credentials', async () => {
    const res = await gql(app, ADMIN_LOGIN, {
      variables: {
        input: {
          email: 'admin@boxxed.pk',
          password: 'WrongPassword123!',
        },
      },
    });

    expect(errorOf(res).code).toBe(ErrorCode.ADMIN_UNAUTHORIZED);
  });

  it('authenticates root super admin and accesses adminMe', async () => {
    const loginRes = await gql<{
      adminLogin: {
        accessToken: string;
        adminUser: { id: string; email: string; role: string };
      };
    }>(app, ADMIN_LOGIN, {
      variables: {
        input: {
          email: 'admin@boxxed.pk',
          password: 'SuperAdmin123!@#',
        },
      },
    });

    expect(loginRes.errors).toBeUndefined();
    expect(loginRes.data?.adminLogin.accessToken).toBeDefined();
    expect(loginRes.data?.adminLogin.adminUser.email).toBe('admin@boxxed.pk');
    expect(loginRes.data?.adminLogin.adminUser.role).toBe('SUPER_ADMIN');

    const adminToken = loginRes.data?.adminLogin.accessToken ?? '';

    const meRes = await gql<{
      adminMe: { email: string; role: string };
    }>(app, ADMIN_ME, { token: adminToken });

    expect(meRes.errors).toBeUndefined();
    expect(meRes.data?.adminMe.email).toBe('admin@boxxed.pk');
    expect(meRes.data?.adminMe.role).toBe('SUPER_ADMIN');
  });

  it('dynamically onboards a restaurant brand and branch atomically with #100 partnerNumber', async () => {
    const loginRes = await gql<{
      adminLogin: { accessToken: string };
    }>(app, ADMIN_LOGIN, {
      variables: {
        input: {
          email: 'admin@boxxed.pk',
          password: 'SuperAdmin123!@#',
        },
      },
    });
    const token = loginRes.data?.adminLogin.accessToken ?? '';

    const existing = await prisma.restaurant.findMany({ select: { partnerNumber: true } });
    let highest = 99;
    for (const { partnerNumber } of existing) {
      const match = partnerNumber.match(/#?(\d+)/);
      if (match?.[1]) {
        const val = Number.parseInt(match[1], 10);
        if (!Number.isNaN(val) && val > highest) highest = val;
      }
    }
    const expectedFirst = `#${highest + 1}`;
    const expectedSecond = `#${highest + 2}`;

    const onboardRes = await gql<{
      adminCreateRestaurantWithBranch: {
        id: string;
        partnerNumber: string;
        name: string;
        branches: Array<{ internalCode: string; schedules: Array<unknown> }>;
        masterMenuItems: Array<{ name: string; sku: string; basePriceMinor: number }>;
      };
    }>(app, ADMIN_ONBOARD, {
      token,
      variables: {
        input: {
          name: 'The Daily Bowl',
          cuisine: 'Healthy Bowls',
          description: 'Fresh organic grain and salad bowls',
          contactName: 'Hamza Khan',
          contactEmail: 'hamza@dailybowl.pk',
          contactPhone: '+923001234567',
          locationArea: 'Clifton Block 4',
          address: 'Plot 12-C, 7th Commercial Lane, Zamzama',
          latitude: 24.8211,
          longitude: 67.0125,
          geofenceRadiusKm: 1.5,
          masterMenuItems: [
            {
              name: 'Signature Chicken Grain Bowl',
              specNarrative: 'Grilled chicken, quinoa, avocado dressing',
              category: 'Bowls',
              basePriceMinor: 85000,
              gstRateBasisPoints: 800,
            },
          ],
        },
      },
    });

    expect(onboardRes.errors).toBeUndefined();
    const created = onboardRes.data?.adminCreateRestaurantWithBranch;
    expect(created).toBeDefined();
    if (!created) return;

    expect(created.partnerNumber).toBe(expectedFirst);
    expect(created.branches.length).toBe(1);
    expect(created.branches[0]?.internalCode).toMatch(/^TDB-CLI-01$/);
    expect(created.branches[0]?.schedules.length).toBe(7);
    expect(created.masterMenuItems.length).toBe(1);
    expect(created.masterMenuItems[0]?.basePriceMinor).toBe(85000);

    // Verify AuditLog entry was recorded
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: created.id },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorEmail).toBe('admin@boxxed.pk');
  });

  it('increments sequential partnerNumber dynamically to #101 on second restaurant onboarding', async () => {
    const loginRes = await gql<{
      adminLogin: { accessToken: string };
    }>(app, ADMIN_LOGIN, {
      variables: {
        input: {
          email: 'admin@boxxed.pk',
          password: 'SuperAdmin123!@#',
        },
      },
    });
    const token = loginRes.data?.adminLogin.accessToken ?? '';

    const existing = await prisma.restaurant.findMany({ select: { partnerNumber: true } });
    let highest = 99;
    for (const { partnerNumber } of existing) {
      const match = partnerNumber.match(/#?(\d+)/);
      if (match?.[1]) {
        const val = Number.parseInt(match[1], 10);
        if (!Number.isNaN(val) && val > highest) highest = val;
      }
    }
    const expectedSecond = `#${highest + 1}`;

    const secondOnboard = await gql<{
      adminCreateRestaurantWithBranch: {
        partnerNumber: string;
        name: string;
      };
    }>(app, ADMIN_ONBOARD, {
      token,
      variables: {
        input: {
          name: 'Artisan Crust Pizza',
          cuisine: 'Neapolitan Pizza',
          contactName: 'Sara Ali',
          contactEmail: 'sara@artisancrust.pk',
          contactPhone: '+923009876543',
          locationArea: 'DHA Phase 6',
          address: 'Shop 4, Bukhari Commercial, Lane 8',
          latitude: 24.811,
          longitude: 67.042,
        },
      },
    });

    expect(secondOnboard.errors).toBeUndefined();
    expect(secondOnboard.data?.adminCreateRestaurantWithBranch.partnerNumber).toBe(expectedSecond);
  });
});

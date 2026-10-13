import { ErrorCode } from '@boxxed/shared';

import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { errorOf, gql } from '../utils/graphql';

import { REDIS_CLIENT } from '../../src/infra/redis/redis.constants';

import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';

const ADMIN_LOGIN = `mutation AdminLogin($input: AdminLoginInput!) { adminLogin(input: $input) { accessToken } }`;
const ADMIN_ONBOARD = `mutation AdminOnboard($input: CreateRestaurantOnboardingInput!) { adminCreateRestaurantWithBranch(input: $input) { id branches { id } } }`;
const UPDATE_BRANCH_THROTTLE = `mutation UpdateBranchThrottle($input: UpdateBranchThrottleInput!) { adminUpdateBranchThrottle(input: $input) { id isThrottled prepBufferMinutes status } }`;
const TOGGLE_ORDER_INGESTION = `mutation ToggleOrderIngestion($branchId: String!, $enabled: Boolean!) { adminToggleOrderIngestion(branchId: $branchId, enabled: $enabled) { id orderIngestionEnabled } }`;
const EMERGENCY_SHUTDOWN = `mutation EmergencyShutdown($branchId: String!) { adminEmergencyBranchShutdown(branchId: $branchId) { id status orderIngestionEnabled } }`;
const CREATE_DROP = `mutation CreateDrop($input: CreateDropInput!) { adminCreateDrop(input: $input) { id sku priceMinor originalPriceMinor status remainingQuantity } }`;
const PUBLISH_DROP = `mutation PublishDrop($dropId: String!) { adminPublishDrop(dropId: $dropId) { id status publishedAt } }`;
const CREATE_CATALOG_ITEM = `mutation CreateMasterItem($restaurantId: String!, $input: CreateMasterMenuItemInput!) { adminCreateMasterMenuItem(restaurantId: $restaurantId, input: $input) { id name sku basePriceMinor } }`;
const TOGGLE_BRANCH_ITEM = `mutation ToggleBranchItem($branchId: String!, $masterMenuItemId: String!, $isAvailable: Boolean!) { adminToggleBranchMenuItem(branchId: $branchId, masterMenuItemId: $masterMenuItemId, isAvailable: $isAvailable) { id isAvailable } }`;
const OVERVIEW_KPIS = `query OverviewKpis {
  adminOverviewKpis { activeRestaurantsCount activeBoxesCount todayReservationsCount noShowsTodayCount }
  adminNeedsAttention { pendingComplaintsCount zeroDropsBranchesCount expiringSoonDropsCount }
  adminLiveToday { totalReservations awaitingPickupPercent pickedUpPercent noShowPercent }
}`;

describe('Super Admin Operations (Branches, Drops, Catalog & Overview KPIs)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let restaurantId: string;
  let branchId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const loginRes = await gql<{ adminLogin: { accessToken: string } }>(app, ADMIN_LOGIN, {
      variables: {
        input: {
          email: 'admin@boxxed.pk',
          password: 'SuperAdmin123!@#',
        },
      },
    });
    token = loginRes.data?.adminLogin.accessToken ?? '';

    const onboardRes = await gql<{
      adminCreateRestaurantWithBranch: {
        id: string;
        branches: Array<{ id: string }>;
      };
    }>(app, ADMIN_ONBOARD, {
      token,
      variables: {
        input: {
          name: 'Operations Test Bistro',
          cuisine: 'Fusion Grill',
          contactName: 'Zayd Tariq',
          contactEmail: 'zayd@bistro.pk',
          contactPhone: '+923005556677',
          locationArea: 'Gulberg 3',
          address: 'Plot 44, Main Boulevard',
          latitude: 31.5204,
          longitude: 74.3587,
        },
      },
    });

    restaurantId = onboardRes.data?.adminCreateRestaurantWithBranch.id ?? '';
    branchId = onboardRes.data?.adminCreateRestaurantWithBranch.branches[0]?.id ?? '';
  });

  afterAll(async () => {
    if (restaurantId) {
      await prisma.drop.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branchMenuOverride.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.masterMenuItem.deleteMany({ where: { restaurantId } });
      await prisma.branchOperatingSchedule.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branchStaff.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branch.deleteMany({ where: { restaurantId } });
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
      await prisma.auditLog.deleteMany({ where: { entityId: restaurantId } });
    }
    const redis = app.get<Redis>(REDIS_CLIENT);
    await redis.quit().catch(() => redis.disconnect());
    await prisma.$disconnect();
    await app.close();
  });

  it('manages branch operational throttles and emergency shutdown killswitch', async () => {
    const throttleRes = await gql<{
      adminUpdateBranchThrottle: {
        isThrottled: boolean;
        prepBufferMinutes: number;
        status: string;
      };
    }>(app, UPDATE_BRANCH_THROTTLE, {
      token,
      variables: {
        input: { branchId, isThrottled: true, prepBufferMinutes: 20 },
      },
    });

    expect(throttleRes.errors).toBeUndefined();
    expect(throttleRes.data?.adminUpdateBranchThrottle.isThrottled).toBe(true);
    expect(throttleRes.data?.adminUpdateBranchThrottle.prepBufferMinutes).toBe(20);
    expect(throttleRes.data?.adminUpdateBranchThrottle.status).toBe('BUSY_THROTTLED');

    const ingestionRes = await gql<{
      adminToggleOrderIngestion: { orderIngestionEnabled: boolean };
    }>(app, TOGGLE_ORDER_INGESTION, {
      token,
      variables: { branchId, enabled: false },
    });

    expect(ingestionRes.errors).toBeUndefined();
    expect(ingestionRes.data?.adminToggleOrderIngestion.orderIngestionEnabled).toBe(false);

    const shutdownRes = await gql<{
      adminEmergencyBranchShutdown: { status: string; orderIngestionEnabled: boolean };
    }>(app, EMERGENCY_SHUTDOWN, {
      token,
      variables: { branchId },
    });

    expect(shutdownRes.errors).toBeUndefined();
    expect(shutdownRes.data?.adminEmergencyBranchShutdown.status).toBe('CLOSED_EMERGENCY');
    expect(shutdownRes.data?.adminEmergencyBranchShutdown.orderIngestionEnabled).toBe(false);
  });

  it('enforces drop validation integrity, draft creation, and publication', async () => {
    const now = new Date();
    const pickupStart = new Date(now.getTime() + 2 * 3600 * 1000);
    const pickupEnd = new Date(now.getTime() + 4 * 3600 * 1000);

    // 1. Invalid price: priceMinor > originalPriceMinor
    const invalidPriceRes = await gql(app, CREATE_DROP, {
      token,
      variables: {
        input: {
          branchId,
          title: 'Mystery Dinner Box',
          categoryTag: 'Dinner',
          headlineItem: 'Grilled Ribeye',
          priceMinor: 60000,
          originalPriceMinor: 40000,
          totalQuantity: 5,
          pickupStart: pickupStart.toISOString(),
          pickupEnd: pickupEnd.toISOString(),
        },
      },
    });
    expect(errorOf(invalidPriceRes).code).toBe(ErrorCode.COMMISSION_INVALID);

    // 2. Invalid pickup window: pickupEnd <= pickupStart
    const invalidWindowRes = await gql(app, CREATE_DROP, {
      token,
      variables: {
        input: {
          branchId,
          title: 'Mystery Dinner Box',
          categoryTag: 'Dinner',
          headlineItem: 'Grilled Ribeye',
          priceMinor: 20000,
          originalPriceMinor: 40000,
          totalQuantity: 5,
          pickupStart: pickupEnd.toISOString(),
          pickupEnd: pickupStart.toISOString(),
        },
      },
    });
    expect(errorOf(invalidWindowRes).code).toBe(ErrorCode.BAD_USER_INPUT);

    // 3. Valid drop creation
    const validCreateRes = await gql<{
      adminCreateDrop: { id: string; status: string; remainingQuantity: number; sku: string };
    }>(app, CREATE_DROP, {
      token,
      variables: {
        input: {
          branchId,
          title: 'Mystery Dinner Box',
          categoryTag: 'Dinner',
          headlineItem: 'Grilled Ribeye',
          priceMinor: 25000,
          originalPriceMinor: 50000,
          totalQuantity: 12,
          pickupStart: pickupStart.toISOString(),
          pickupEnd: pickupEnd.toISOString(),
        },
      },
    });

    expect(validCreateRes.errors).toBeUndefined();
    const drop = validCreateRes.data?.adminCreateDrop;
    expect(drop?.status).toBe('DRAFT_REVIEW');
    expect(drop?.remainingQuantity).toBe(12);

    const dropId = drop?.id ?? '';

    // 4. Publish drop to live state
    const publishRes = await gql<{
      adminPublishDrop: { id: string; status: string; publishedAt: string };
    }>(app, PUBLISH_DROP, {
      token,
      variables: { dropId },
    });

    expect(publishRes.errors).toBeUndefined();
    expect(publishRes.data?.adminPublishDrop.status).toBe('ACTIVE_DROP');
    expect(publishRes.data?.adminPublishDrop.publishedAt).toBeDefined();
  });

  it('adds master catalog dish and overrides branch availability', async () => {
    const itemRes = await gql<{
      adminCreateMasterMenuItem: { id: string; name: string; sku: string };
    }>(app, CREATE_CATALOG_ITEM, {
      token,
      variables: {
        restaurantId,
        input: {
          name: 'Artisan Truffle Fries',
          specNarrative: 'Hand-cut russet potatoes tossed in white truffle oil',
          category: 'Sides',
          basePriceMinor: 45000,
        },
      },
    });

    expect(itemRes.errors).toBeUndefined();
    const masterItemId = itemRes.data?.adminCreateMasterMenuItem.id ?? '';
    expect(itemRes.data?.adminCreateMasterMenuItem.name).toBe('Artisan Truffle Fries');

    const overrideRes = await gql<{
      adminToggleBranchMenuItem: { id: string; isAvailable: boolean };
    }>(app, TOGGLE_BRANCH_ITEM, {
      token,
      variables: {
        branchId,
        masterMenuItemId: masterItemId,
        isAvailable: false,
      },
    });

    expect(overrideRes.errors).toBeUndefined();
    expect(overrideRes.data?.adminToggleBranchMenuItem.isAvailable).toBe(false);
  });

  it('aggregates real-time Overview KPIs, alerts, and live distribution', async () => {
    const kpiRes = await gql<{
      adminOverviewKpis: { activeRestaurantsCount: number; activeBoxesCount: number };
      adminNeedsAttention: { pendingComplaintsCount: number };
      adminLiveToday: { totalReservations: number };
    }>(app, OVERVIEW_KPIS, { token });

    expect(kpiRes.errors).toBeUndefined();
    expect(kpiRes.data?.adminOverviewKpis.activeRestaurantsCount).toBeGreaterThanOrEqual(1);
    expect(kpiRes.data?.adminOverviewKpis.activeBoxesCount).toBeGreaterThanOrEqual(12);
    expect(kpiRes.data?.adminNeedsAttention.pendingComplaintsCount).toBeGreaterThanOrEqual(0);
    expect(kpiRes.data?.adminLiveToday.totalReservations).toBeGreaterThanOrEqual(0);
  });
});

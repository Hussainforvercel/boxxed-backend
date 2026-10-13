/* eslint-disable max-lines */
import { randomUUID } from 'node:crypto';

import * as bcrypt from 'bcryptjs';

import {
  BranchStatus,
  DropStatus,
  OrderStatus,
  StaffRole,
  StaffStatus,
} from '../../src/generated/prisma/enums';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { REDIS_CLIENT } from '../../src/infra/redis/redis.constants';
import { createTestApp } from '../utils/create-test-app';
import { gql } from '../utils/graphql';

import type { INestApplication } from '@nestjs/common';
import type Redis from 'ioredis';

const VENDOR_LOGIN = `mutation VendorLogin($input: VendorLoginInput!) {
  vendorLogin(input: $input) {
    accessToken
    staff { id name email username role branchId restaurantId }
    restaurant { id name partnerNumber cuisine stationId }
  }
}`;

const VENDOR_ME = `query VendorMe {
  vendorMe { id name email username role branchId restaurantId }
}`;

const VENDOR_PROFILE = `query VendorProfile($restaurantId: String) {
  vendorRestaurantProfile(restaurantId: $restaurantId) {
    id name partnerId cuisine district address executiveChef managerName stationId status verificationPercent activeDropWindow gstRate
    bankDetails { bankName accountTitle accountNumber iban }
    branches { id name area address status activeBoxes pendingPickups }
  }
}`;

const VENDOR_UPDATE_PROFILE = `mutation UpdateProfile($input: UpdateVendorProfileInput!) {
  vendorUpdateProfile(input: $input) {
    id name executiveChef managerName address
  }
}`;

const VENDOR_TOGGLE_BUSY = `mutation ToggleBusy($branchId: String!) {
  vendorToggleBusyMode(branchId: $branchId) { id status }
}`;

const VENDOR_SERVICE_OVERVIEW = `query Overview($branchId: String) {
  vendorServiceOverview(branchId: $branchId) {
    todayNetSales todayOrdersCount activeBoxesCount awaitingPickupCount totalUnits claimedUnits unitsRemaining
  }
}`;

const VENDOR_CREATE_DROP = `mutation CreateDrop($input: CreateVendorBoxInput!, $branchId: String) {
  vendorCreateDrop(input: $input, branchId: $branchId) {
    id seriesCode title price totalQuantity status rackAllocation
  }
}`;

const VENDOR_QUICK_ADD_STOCK = `mutation AddStock($dropId: String!, $amount: Int!) {
  vendorQuickAddStock(dropId: $dropId, amount: $amount) {
    id totalQuantity status
  }
}`;

const VENDOR_TOGGLE_DROP = `mutation ToggleDrop($dropId: String!) {
  vendorToggleDropStatus(dropId: $dropId) { id status }
}`;

const VENDOR_CREATE_MENU_ITEM = `mutation CreateMenuItem($input: CreateVendorMenuItemInput!, $restaurantId: String) {
  vendorCreateMenuItem(input: $input, restaurantId: $restaurantId) {
    id code name basePrice finalPrice isTemporary isAvailable
  }
}`;

const VENDOR_TOGGLE_86 = `mutation Toggle86($menuItemId: String!, $branchId: String) {
  vendorToggleMenuItemAvailability(menuItemId: $menuItemId, branchId: $branchId) {
    id isAvailable
  }
}`;

const VENDOR_VERIFY_AND_HANDOVER = `mutation VerifyAndHandover($searchCode: String!, $otp: String, $branchId: String) {
  vendorVerifyAndHandover(searchCode: $searchCode, otp: $otp, branchId: $branchId) {
    success message order { id orderNumber status customerName rackLocation }
  }
}`;

const VENDOR_REPLY_REVIEW = `mutation ReplyReview($reviewId: String!, $reply: String!) {
  vendorReplyReview(reviewId: $reviewId, reply: $reply) { id reply }
}`;

describe('Vendor Restaurant Portal (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let vendorToken: string;
  let restaurantId: string;
  let branchId: string;
  let username: string;
  let customerId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const rand = Math.floor(1000 + Math.random() * 9000);
    username = `karachi.social.${rand}`;

    // Bootstrap test restaurant, branch, and staff with password
    const hashedPwd = await bcrypt.hash('partner_khi_2026', 10);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'Karachi Social',
        slug: `karachi-social-${rand}`,
        partnerNumber: `#KS-${rand}`,
        cuisine: 'Contemporary Pakistani & Charcoal Grills',
        avatarLetter: 'KS',
        contactName: 'Farhan Rizvi',
        contactEmail: `restaurant-${rand}@karachisocial.pk`,
        contactPhone: `+92300${rand}12`,
        district: 'DHA Phase 5, Karachi',
        address: 'Plot 14-C, Shahbaz Commercial, DHA Phase 5',
        executiveChef: 'Tariq Al-Mansoor',
        managerName: 'Farhan Rizvi',
        stationId: 'KHI-501',
        bankName: 'Habib Bank Limited (HBL)',
        bankAccountTitle: 'Karachi Social Hospitality Ventures',
        bankAccountNumber: '0042 1109 4892 4092',
        bankIban: 'PK36HABB0000421109489240',
        branches: {
          create: {
            name: 'Karachi Social (DHA Phase 5)',
            slug: `dha-phase-5-${rand}`,
            internalCode: `KS-DHA-${rand}`,
            locationArea: 'DHA Phase 5',
            address: 'Plot 14-C, Shahbaz Commercial, DHA Phase 5',
            latitude: 24.8607,
            longitude: 67.0011,
            phone: `+92300${rand}12`,
            email: `dha5-${rand}@karachisocial.pk`,
            status: BranchStatus.ACTIVE,
            schedules: {
              create: {
                dayOfWeek: 0,
                openTime: '12:00 PM',
                closeTime: '11:30 PM',
              },
            },
          },
        },
      },
      include: { branches: true },
    });

    restaurantId = restaurant.id;
    branchId = (restaurant.branches[0] as { id: string }).id;

    // Create staff member with username and password
    await prisma.branchStaff.create({
      data: {
        branchId,
        name: 'Tariq Al-Mansoor',
        email: `tariq-${rand}@karachisocial.pk`,
        username,
        passwordHash: hashedPwd,
        role: StaffRole.BRANCH_MANAGER,
        status: StaffStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    if (restaurantId) {
      await prisma.review.deleteMany({ where: { restaurantId } });
      await prisma.reservation.deleteMany({ where: { drop: { branch: { restaurantId } } } });
      await prisma.drop.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branchStaff.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branchMenuOverride.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.masterMenuItem.deleteMany({ where: { restaurantId } });
      await prisma.branchOperatingSchedule.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branch.deleteMany({ where: { restaurantId } });
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    }
    if (customerId) {
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
    const redis = app.get<Redis>(REDIS_CLIENT);
    await redis.quit().catch(() => redis.disconnect());
    await prisma.$disconnect();
    await app.close();
  });

  it('1. should authenticate vendor operator via username and password', async () => {
    const res = await gql<{
      vendorLogin: {
        accessToken: string;
        staff: { username: string; branchId: string };
        restaurant: { stationId: string };
      };
    }>(app, VENDOR_LOGIN, {
      variables: {
        input: {
          usernameOrEmail: username,
          password: 'partner_khi_2026',
        },
      },
    });

    expect(res.data?.vendorLogin.accessToken).toBeDefined();
    expect(res.data?.vendorLogin.staff.username).toBe(username);
    expect(res.data?.vendorLogin.restaurant.stationId).toBe('KHI-501');

    vendorToken = res.data?.vendorLogin.accessToken ?? '';
  });

  it('2. should retrieve current operator profile via vendorMe', async () => {
    const res = await gql<{ vendorMe: { username: string; branchId: string } }>(app, VENDOR_ME, {
      token: vendorToken,
    });

    expect(res.data?.vendorMe.username).toBe(username);
    expect(res.data?.vendorMe.branchId).toBe(branchId);
  });

  it('3. should retrieve restaurant profile with bank details and stations', async () => {
    const res = await gql<{
      vendorRestaurantProfile: {
        name: string;
        bankDetails: { bankName: string; accountNumber: string };
        branches: Array<{ name: string; status: string }>;
      };
    }>(app, VENDOR_PROFILE, {
      token: vendorToken,
    });

    expect(res.data?.vendorRestaurantProfile.name).toBe('Karachi Social');
    expect(res.data?.vendorRestaurantProfile.bankDetails.bankName).toContain('HBL');
    expect(res.data?.vendorRestaurantProfile.branches.length).toBeGreaterThanOrEqual(1);
  });

  it('4. should update restaurant trading profile', async () => {
    const res = await gql<{
      vendorUpdateProfile: {
        name: string;
        executiveChef: string;
      };
    }>(app, VENDOR_UPDATE_PROFILE, {
      token: vendorToken,
      variables: {
        input: {
          executiveChef: 'Chef Tariq Al-Mansoor (Master Grill)',
        },
      },
    });

    expect(res.data?.vendorUpdateProfile.executiveChef).toBe(
      'Chef Tariq Al-Mansoor (Master Grill)',
    );
  });

  it('5. should toggle branch station busy mode', async () => {
    const res = await gql<{
      vendorToggleBusyMode: { id: string; status: string };
    }>(app, VENDOR_TOGGLE_BUSY, {
      token: vendorToken,
      variables: { branchId },
    });

    expect(res.data?.vendorToggleBusyMode.status).toBe('BUSY');
  });

  it('6. should configure and create a live box drop', async () => {
    const res = await gql<{
      vendorCreateDrop: {
        id: string;
        seriesCode: string;
        title: string;
        price: number;
        status: string;
      };
    }>(app, VENDOR_CREATE_DROP, {
      token: vendorToken,
      variables: {
        branchId,
        input: {
          seriesCode: 'SERIES 01',
          title: 'Royal Dawaat Box',
          subtitle: 'Mutton Dum Biryani, Galawati Sliders',
          description: 'Mutton biryani, handmade chapli patties, charred malai tikka',
          price: 4850,
          originalValue: 6950,
          totalQuantity: 40,
          pickupWindow: '7:30 – 10:30 PM',
          windowCloseTime: '10:15 PM',
          status: 'ACTIVE',
          category: 'Feast',
          rackAllocation: 'Rack A1 – A4',
        },
      },
    });

    expect(res.data?.vendorCreateDrop.seriesCode).toBe('SERIES 01');
    expect(res.data?.vendorCreateDrop.price).toBe(4850);
    expect(res.data?.vendorCreateDrop.status).toBe('ACTIVE');

    const dropId = res.data?.vendorCreateDrop.id as string;

    // Quick add stock (+5 units)
    const stockRes = await gql<{
      vendorQuickAddStock: { totalQuantity: number };
    }>(app, VENDOR_QUICK_ADD_STOCK, {
      token: vendorToken,
      variables: { dropId, amount: 5 },
    });

    expect(stockRes.data?.vendorQuickAddStock.totalQuantity).toBe(45);

    // Toggle drop to DRAFT
    const toggleRes = await gql<{
      vendorToggleDropStatus: { status: string };
    }>(app, VENDOR_TOGGLE_DROP, {
      token: vendorToken,
      variables: { dropId },
    });

    expect(toggleRes.data?.vendorToggleDropStatus.status).toBe('DRAFT');
  });

  it('7. should register dish and toggle branch 86 availability switch', async () => {
    const itemRes = await gql<{
      vendorCreateMenuItem: {
        id: string;
        name: string;
        finalPrice: number;
        isAvailable: boolean;
      };
    }>(app, VENDOR_CREATE_MENU_ITEM, {
      token: vendorToken,
      variables: {
        input: {
          name: 'Saffron Pistachio Shahi Tukda',
          description: 'Mughlai dessert simmered in condensed milk',
          category: 'Desserts',
          basePrice: 850,
          gstRate: 0.15,
          isTemporary: true,
          expiryDays: 7,
          dietaryTags: ['Halal', 'Vegetarian'],
        },
      },
    });

    expect(itemRes.data?.vendorCreateMenuItem.name).toBe('Saffron Pistachio Shahi Tukda');
    expect(itemRes.data?.vendorCreateMenuItem.finalPrice).toBe(978); // 850 + 15% GST = 977.5 rounded to 978
    expect(itemRes.data?.vendorCreateMenuItem.isAvailable).toBe(true);

    const menuItemId = itemRes.data?.vendorCreateMenuItem.id as string;

    // Toggle 86 switch
    const toggleRes = await gql<{
      vendorToggleMenuItemAvailability: { isAvailable: boolean };
    }>(app, VENDOR_TOGGLE_86, {
      token: vendorToken,
      variables: { menuItemId, branchId },
    });

    expect(toggleRes.data?.vendorToggleMenuItemAvailability.isAvailable).toBe(false);
  });

  it('8. should fulfill order via 4-digit guest OTP fast pass', async () => {
    // Create customer, drop, and reservation
    const randCust = Math.floor(10000 + Math.random() * 90000);
    const customer = await prisma.user.create({
      data: {
        fullName: 'Bilal Ahmed',
        email: `bilal-${randCust}@guest.pk`,
        phoneE164: `+92300${randCust}99`,
      },
    });
    customerId = customer.id;

    const drop = await prisma.drop.create({
      data: {
        branchId,
        sku: `#BX-${randCust}`,
        title: 'Smoke & Spice BBQ',
        headlineItem: 'Charcoal Bihari Kabab',
        categoryTag: 'Craft BBQ',
        discountTier: '30_PERCENT_OFF',
        priceMinor: 340000,
        originalPriceMinor: 480000,
        totalQuantity: 20,
        remainingQuantity: 19,
        pickupStart: new Date(),
        pickupEnd: new Date(Date.now() + 3 * 3600 * 1000),
        status: DropStatus.ACTIVE_DROP,
      },
    });

    await prisma.reservation.create({
      data: {
        orderNumber: `BX-${randCust}`,
        userId: customer.id,
        dropId: drop.id,
        quantity: 1,
        priceMinor: 340000,
        referenceCode: `REF-${randCust}`,
        idempotencyKey: randomUUID(),
        pickupOtp: '4891',
        rackLocation: 'Rack #02',
        status: OrderStatus.READY_FOR_PICKUP,
        holdExpiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    // 1. Verify and Handover with matching OTP
    const verifyRes = await gql<{
      vendorVerifyAndHandover: {
        success: boolean;
        message: string;
        order: { orderNumber: string; status: string; customerName: string };
      };
    }>(app, VENDOR_VERIFY_AND_HANDOVER, {
      token: vendorToken,
      variables: {
        branchId,
        searchCode: `BX-${randCust}`,
        otp: '4891',
      },
    });

    expect(verifyRes.data?.vendorVerifyAndHandover.success).toBe(true);
    expect(verifyRes.data?.vendorVerifyAndHandover.order.status).toBe('COMPLETED');
    expect(verifyRes.data?.vendorVerifyAndHandover.order.customerName).toBe('Bilal Ahmed');
  });

  it('9. should compute live service overview KPIs', async () => {
    const res = await gql<{
      vendorServiceOverview: {
        todayNetSales: number;
        todayOrdersCount: number;
        activeBoxesCount: number;
      };
    }>(app, VENDOR_SERVICE_OVERVIEW, {
      token: vendorToken,
      variables: { branchId },
    });

    expect(res.data?.vendorServiceOverview.todayNetSales).toBeGreaterThanOrEqual(3400);
    expect(res.data?.vendorServiceOverview.todayOrdersCount).toBeGreaterThanOrEqual(1);
  });

  it('10. should review guest impressions and post official kitchen reply', async () => {
    const review = await prisma.review.create({
      data: {
        restaurantId,
        branchId,
        customerName: 'Ayesha Khan',
        rating: 5,
        boxTitle: 'Royal Dawaat Box',
        comment: 'Piping hot and extraordinary tenderness in the mutton!',
        tags: ['Piping Hot', 'Generous Portion'],
      },
    });

    const replyRes = await gql<{
      vendorReplyReview: { id: string; reply: string };
    }>(app, VENDOR_REPLY_REVIEW, {
      token: vendorToken,
      variables: {
        reviewId: review.id,
        reply:
          'Thank you Ayesha! Chef Tariq and the kitchen brigade are delighted you enjoyed tonight release.',
      },
    });

    expect(replyRes.data?.vendorReplyReview.reply).toContain('Chef Tariq');
  });
});

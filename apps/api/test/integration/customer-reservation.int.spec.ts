import * as bcrypt from 'bcryptjs';

import {
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

const DROPS_QUERY = `query Drops($branchId: String) {
  drops(branchId: $branchId) {
    id sku title priceMinor price originalPriceMinor originalPrice currency remainingQuantity totalQuantity status
    restaurant { id name partnerNumber }
    branch { id name internalCode }
  }
}`;

const CREATE_RESERVATION = `mutation CreateReservation($dropId: String!, $quantity: Int) {
  createReservation(dropId: $dropId, quantity: $quantity) {
    id orderNumber referenceCode pickupOtp rackLocation status quantity priceMinor price currency holdExpiresAt remainingQuantity customerName customerPhone
    drop { id sku remainingQuantity }
  }
}`;

const VENDOR_LOGIN = `mutation VendorLogin($input: VendorLoginInput!) {
  vendorLogin(input: $input) {
    accessToken
  }
}`;

const VENDOR_VERIFY_AND_HANDOVER = `mutation VerifyAndHandover($searchCode: String!, $otp: String, $branchId: String) {
  vendorVerifyAndHandover(searchCode: $searchCode, otp: $otp, branchId: $branchId) {
    success message order { id orderNumber status customerName rackLocation }
  }
}`;

const VENDOR_EARNINGS_SUMMARY = `query EarningsSummary {
  vendorEarningsSummary {
    grossSales platformFeeDeductions netPayable platformCommissionBasisPoints
  }
}`;

describe('Customer Reservation & Handover Lifecycle (E2E Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let restaurantId: string;
  let branchId: string;
  let dropId: string;
  let dropSku: string;
  let vendorToken: string;
  let customerId: string;
  let reservationId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    redis = app.get<Redis>(REDIS_CLIENT);

    const rand = Math.floor(1000 + Math.random() * 9000);

    // Bootstrap partner, branch, staff
    const hashedPwd = await bcrypt.hash('Partner123!@#', 10);
    const restaurant = await prisma.restaurant.create({
      data: {
        name: 'The Flour Pavilion',
        slug: `flour-pavilion-${rand}`,
        partnerNumber: `#FP-${rand}`,
        cuisine: 'Artisanal Bakery & Viennoiserie',
        avatarLetter: 'FP',
        contactName: 'Zainab Qazi',
        contactEmail: `manager-${rand}@flourpavilion.pk`,
        contactPhone: `+92300${rand}00`,
        commissionRateBasisPoints: 1500, // 15%
        branches: {
          create: {
            name: 'Clifton, Block 4',
            slug: `clifton-${rand}`,
            internalCode: `FP-CLI-${rand}`,
            locationArea: 'Clifton, Block 4',
            address: 'Plot 14-C, Shahbaz Commercial, DHA Karachi',
            latitude: 24.8214,
            longitude: 67.0315,
            phone: `+92300${rand}01`,
            email: `clifton-${rand}@flourpavilion.pk`,
          },
        },
      },
      include: { branches: true },
    });

    restaurantId = restaurant.id;
    branchId = restaurant.branches[0]!.id;

    await prisma.branchStaff.create({
      data: {
        branchId,
        name: 'Zainab Qazi',
        email: `manager-${rand}@flourpavilion.pk`,
        username: `manager_fp_${rand}`,
        passwordHash: hashedPwd,
        role: StaffRole.RESTAURANT_ADMIN,
        status: StaffStatus.ACTIVE,
      },
    });

    // Create live drop with 8 units @ PKR 650
    dropSku = `#BX-${rand}`;
    const drop = await prisma.drop.create({
      data: {
        branchId,
        sku: dropSku,
        title: 'Ember Mystery Box',
        headlineItem: 'Assorted Sourdough & Viennoiserie',
        categoryTag: 'Bakery',
        discountTier: '50% OFF',
        priceMinor: 65000,
        originalPriceMinor: 165000,
        currency: 'PKR',
        totalQuantity: 8,
        remainingQuantity: 8,
        pickupStart: new Date(),
        pickupEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
        status: DropStatus.ACTIVE_DROP,
      },
    });

    dropId = drop.id;

    // Create customer
    const customer = await prisma.user.create({
      data: {
        phoneE164: `+92300${rand}99`,
        fullName: 'Ayaan Tariq',
        phoneVerifiedAt: new Date(),
      },
    });
    customerId = customer.id;

    // Login vendor
    const loginRes = await gql<{ vendorLogin: { accessToken: string } }>(app, VENDOR_LOGIN, {
      variables: {
        input: {
          usernameOrEmail: `manager_fp_${rand}`,
          password: 'Partner123!@#',
        },
      },
    });
    vendorToken = loginRes.data!.vendorLogin.accessToken;
  });

  afterAll(async () => {
    if (restaurantId) {
      await prisma.review.deleteMany({ where: { restaurantId } });
      await prisma.reservation.deleteMany({ where: { drop: { branch: { restaurantId } } } });
      await prisma.drop.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branchStaff.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branchOperatingSchedule.deleteMany({ where: { branch: { restaurantId } } });
      await prisma.branch.deleteMany({ where: { restaurantId } });
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } });
    }
    if (customerId) {
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
    await redis.quit().catch(() => redis.disconnect());
    await prisma.$disconnect();
    await app.close();
  });

  it('1. should discover live drop on feed with PKR 650 pricing and 8 units', async () => {
    const res = await gql<{
      drops: Array<{
        sku: string;
        price: number;
        priceMinor: number;
        remainingQuantity: number;
        totalQuantity: number;
      }>;
    }>(app, DROPS_QUERY, {
      variables: { branchId },
    });

    expect(res.data?.drops).toBeDefined();
    const found = res.data!.drops.find((d) => d.sku === dropSku);
    expect(found).toBeDefined();
    expect(found!.price).toBe(650);
    expect(found!.priceMinor).toBe(65000);
    expect(found!.totalQuantity).toBe(8);
    expect(found!.remainingQuantity).toBe(8);
  });

  it('2. should hold drop, decrement stock from 8 to 7, and set 3-minute Redis lock', async () => {
    const res = await gql<{
      createReservation: {
        id: string;
        orderNumber: string;
        referenceCode: string;
        pickupOtp: string;
        rackLocation: string;
        status: string;
        price: number;
        remainingQuantity: number;
      };
    }>(app, CREATE_RESERVATION, {
      variables: { dropId: dropSku, quantity: 1 },
    });

    expect(res.data?.createReservation).toBeDefined();
    const reservation = res.data!.createReservation;
    reservationId = reservation.id;

    expect(reservation.referenceCode).toMatch(/^BX-/);
    expect(reservation.pickupOtp).toBe('4819');
    expect(reservation.status).toBe('READY_FOR_PICKUP');
    expect(reservation.remainingQuantity).toBe(7);
    expect(reservation.price).toBe(650);

    // Verify Redis lock
    const lockTtl = await redis.ttl(`reservation:lock:${reservationId}`);
    expect(lockTtl).toBeGreaterThan(0);
    expect(lockTtl).toBeLessThanOrEqual(180);

    // Verify DB stock decremented
    const dbDrop = await prisma.drop.findUnique({ where: { id: dropId } });
    expect(dbDrop!.remainingQuantity).toBe(7);
  });

  it('3. should complete counter handover with 4-digit pickup OTP', async () => {
    const res = await gql<{
      vendorVerifyAndHandover: {
        success: boolean;
        order: { status: string; orderNumber: string };
      };
    }>(app, VENDOR_VERIFY_AND_HANDOVER, {
      token: vendorToken,
      variables: {
        searchCode: '4819',
        otp: '4819',
        branchId,
      },
    });

    expect(res.data?.vendorVerifyAndHandover.success).toBe(true);
    expect(res.data?.vendorVerifyAndHandover.order.status).toBe('COMPLETED');
  });

  it('4. should reflect gross sales PKR 650.00 and 15% platform commission PKR 97.50', async () => {
    const res = await gql<{
      vendorEarningsSummary: {
        grossSales: number;
        platformFeeDeductions: number;
        netPayable: number;
        platformCommissionBasisPoints: number;
      };
    }>(app, VENDOR_EARNINGS_SUMMARY, {
      token: vendorToken,
    });

    expect(res.data?.vendorEarningsSummary.grossSales).toBe(650);
    expect(res.data?.vendorEarningsSummary.platformFeeDeductions).toBe(97.5);
    expect(res.data?.vendorEarningsSummary.netPayable).toBe(552.5);
    expect(res.data?.vendorEarningsSummary.platformCommissionBasisPoints).toBe(1500);
  });
});

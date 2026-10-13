import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { AuditActionType, PartnerStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';
import type {
  BranchScheduleDayInput,
  CreateInitialMasterItemInput,
  CreateRestaurantOnboardingInput,
} from './dto/create-restaurant-onboarding.input';
import type { RestaurantModel } from './models/restaurant.model';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class AdminRestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dynamically and atomically calculates the next partner number.
   * Starts at #100 if no partners exist, else increments highest allocated number.
   */
  async getNextPartnerNumber(tx: Prisma.TransactionClient): Promise<string> {
    const existingPartners = await tx.restaurant.findMany({
      select: { partnerNumber: true },
    });

    let highest = 99;
    for (const { partnerNumber } of existingPartners) {
      const match = partnerNumber.match(/#?(\d+)/);
      if (match?.[1]) {
        const val = Number.parseInt(match[1], 10);
        if (!Number.isNaN(val) && val > highest) {
          highest = val;
        }
      }
    }

    return `#${highest + 1}`;
  }

  /**
   * Generates a unique URL-friendly slug from a name.
   */
  async generateUniqueRestaurantSlug(name: string, tx: Prisma.TransactionClient): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug || 'restaurant';
    let count = 1;
    while (await tx.restaurant.findUnique({ where: { slug } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }
    return slug;
  }

  private async buildBranchMeta(
    name: string,
    locationArea: string,
    branchNameInput: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const branchName = branchNameInput || `${name} Main`;
    const branchSlug = branchName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const brandInitials =
      name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'BRD';

    const areaCode =
      locationArea
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 3) || 'LOC';

    let internalCode = `${brandInitials}-${areaCode}-01`;
    let seq = 1;
    while (await tx.branch.findUnique({ where: { internalCode } })) {
      seq++;
      internalCode = `${brandInitials}-${areaCode}-${String(seq).padStart(2, '0')}`;
    }

    return { branchName, branchSlug, brandInitials, internalCode };
  }

  private async insertRestaurant(
    tx: Prisma.TransactionClient,
    input: CreateRestaurantOnboardingInput,
    partnerNumber: string,
    slug: string,
  ) {
    const avatarLetter = (input.name.trim()[0] || 'R').toUpperCase().slice(0, 2);
    return tx.restaurant.create({
      data: {
        name: input.name,
        slug,
        avatarLetter,
        avatarBg: 'bg-[#111110] text-[#FAF6EE]',
        partnerNumber,
        cuisine: input.cuisine,
        description: input.description ?? null,
        status: PartnerStatus.ACTIVE,
        contactName: input.contactName,
        contactEmail: input.contactEmail.trim().toLowerCase(),
        contactPhone: input.contactPhone,
        altPhone: input.altPhone ?? null,
        commissionRateBasisPoints: input.commissionRateBasisPoints,
        monthlyFeeMinor: input.monthlyFeeMinor,
        onboardingFeeMinor: input.onboardingFeeMinor,
        onboardingFeeSettled: input.onboardingFeeSettled,
        billingCadence: input.billingCadence,
        gstRegistrationNumber: input.gstRegistrationNumber ?? null,
        gstRateBasisPoints: input.gstRateBasisPoints,
        ntnNumber: input.ntnNumber ?? null,
        hqLedgerNotes: input.hqLedgerNotes ?? null,
      },
    });
  }

  private async insertBranch(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    input: CreateRestaurantOnboardingInput,
    meta: { branchName: string; branchSlug: string; internalCode: string },
  ) {
    return tx.branch.create({
      data: {
        restaurantId,
        name: meta.branchName,
        slug: meta.branchSlug,
        internalCode: meta.internalCode,
        locationArea: input.locationArea,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        geofenceRadiusKm: input.geofenceRadiusKm,
        phone: input.branchPhone ?? input.contactPhone,
        email: (input.branchEmail ?? input.contactEmail).trim().toLowerCase(),
      },
    });
  }

  private async seedOperatingSchedules(
    tx: Prisma.TransactionClient,
    branchId: string,
    schedules?: BranchScheduleDayInput[],
  ): Promise<void> {
    const defaultSchedules = [
      { dayOfWeek: 0, openTime: '12:00 PM', closeTime: '11:00 PM', isClosed: false },
      { dayOfWeek: 1, openTime: '12:00 PM', closeTime: '11:00 PM', isClosed: false },
      { dayOfWeek: 2, openTime: '12:00 PM', closeTime: '11:00 PM', isClosed: false },
      { dayOfWeek: 3, openTime: '12:00 PM', closeTime: '11:00 PM', isClosed: false },
      { dayOfWeek: 4, openTime: '01:00 PM', closeTime: '11:30 PM', isClosed: false },
      { dayOfWeek: 5, openTime: '12:00 PM', closeTime: '11:30 PM', isClosed: false },
      { dayOfWeek: 6, openTime: '12:00 PM', closeTime: '11:00 PM', isClosed: false },
    ];

    const toInsert = schedules && schedules.length === 7 ? schedules : defaultSchedules;
    await tx.branchOperatingSchedule.createMany({
      data: toInsert.map((s) => ({
        branchId,
        dayOfWeek: s.dayOfWeek,
        openTime: s.openTime,
        closeTime: s.closeTime,
        isClosed: s.isClosed,
      })),
    });
  }

  private async seedMasterMenuItems(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    brandInitials: string,
    items?: CreateInitialMasterItemInput[],
  ): Promise<void> {
    if (!items || items.length === 0) return;
    let idx = 1;
    for (const item of items) {
      const sku = `ITM-${brandInitials}-${String(idx).padStart(3, '0')}`;
      idx++;
      await tx.masterMenuItem.create({
        data: {
          restaurantId,
          sku,
          name: item.name,
          specNarrative: item.specNarrative ?? null,
          category: item.category,
          basePriceMinor: item.basePriceMinor,
          gstRateBasisPoints: item.gstRateBasisPoints,
        },
      });
    }
  }

  private async recordAudit(
    tx: Prisma.TransactionClient,
    adminActor: AuthAdminUser,
    restaurant: { id: string; name: string },
    partnerNumber: string,
    branch: { id: string; name: string },
    internalCode: string,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.PARTNER_ONBOARDED,
        entityType: 'RESTAURANT',
        entityId: restaurant.id,
        summary: `Onboarded partner ${restaurant.name} (${partnerNumber}) with branch ${branch.name}`,
        payloadJson: {
          restaurantId: restaurant.id,
          partnerNumber,
          branchId: branch.id,
          internalCode,
        },
      },
    });
  }

  /**
   * Onboards a new restaurant brand and its initial physical branch atomically.
   */
  async createRestaurantWithBranch(
    input: CreateRestaurantOnboardingInput,
    adminActor: AuthAdminUser,
  ): Promise<RestaurantModel> {
    const restaurantId = await this.prisma.$transaction(async (tx) => {
      const partnerNumber = await this.getNextPartnerNumber(tx);
      const slug = await this.generateUniqueRestaurantSlug(input.name, tx);
      const meta = await this.buildBranchMeta(input.name, input.locationArea, input.branchName, tx);

      const restaurant = await this.insertRestaurant(tx, input, partnerNumber, slug);
      const branch = await this.insertBranch(tx, restaurant.id, input, meta);

      await this.seedOperatingSchedules(tx, branch.id, input.schedules);
      await this.seedMasterMenuItems(tx, restaurant.id, meta.brandInitials, input.masterMenuItems);
      await this.recordAudit(tx, adminActor, restaurant, partnerNumber, branch, meta.internalCode);

      return restaurant.id;
    });

    return this.getRestaurantById(restaurantId);
  }

  async listRestaurants(
    search?: string,
    status?: PartnerStatus,
    limit = 50,
    page = 1,
  ): Promise<RestaurantModel[]> {
    const skip = (page - 1) * limit;
    const where: Prisma.RestaurantWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { partnerNumber: { contains: q, mode: 'insensitive' } },
        { cuisine: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.restaurant.findMany({
      where,
      include: {
        branches: {
          include: { schedules: true },
        },
        masterMenuItems: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return rows.map((r) => ({
      ...r,
      branchesCount: r.branches.length,
    }));
  }

  async getRestaurantById(id: string): Promise<RestaurantModel> {
    const conditions: Prisma.RestaurantWhereInput[] = [{ slug: id }, { partnerNumber: id }];
    if (id.includes('-')) {
      conditions.push({ id });
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        OR: conditions,
      },
      include: {
        branches: {
          include: { schedules: true },
        },
        masterMenuItems: true,
      },
    });

    if (!restaurant) {
      throw new DomainError(ErrorCode.RESTAURANT_NOT_FOUND, `Restaurant '${id}' not found.`);
    }

    return {
      ...restaurant,
      branchesCount: restaurant.branches.length,
    };
  }
}

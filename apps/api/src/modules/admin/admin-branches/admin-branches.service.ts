import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import {
  AuditActionType,
  BranchStatus,
  DropStatus,
  StaffRole,
  StaffStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { REDIS_CLIENT } from '../../../infra/redis/redis.constants';

import type { AuthAdminUser } from '../admin-auth/auth-admin-user';
import type { UpdateBranchThrottleInput } from './dto/branch-inputs';
import type {
  BranchDetailModel,
  BranchOperatingScheduleModel,
  BranchStaffModel,
} from './models/branch.model';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class AdminBranchesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async attachBranchMetrics(
    branch: Prisma.BranchGetPayload<{
      include: {
        restaurant: { select: { id: true; name: true; partnerNumber: true; slug: true } };
        schedules: true;
      };
    }>,
  ): Promise<BranchDetailModel> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [activeDrops, todayReservations] = await Promise.all([
      this.prisma.drop.findMany({
        where: { branchId: branch.id, status: DropStatus.ACTIVE_DROP },
        select: { remainingQuantity: true },
      }),
      this.prisma.reservation.count({
        where: {
          drop: { branchId: branch.id },
          createdAt: { gte: todayStart },
        },
      }),
    ]);

    const liveBoxesCount = activeDrops.reduce((acc, d) => acc + d.remainingQuantity, 0);

    return {
      id: branch.id,
      restaurantId: branch.restaurantId,
      name: branch.name,
      slug: branch.slug,
      internalCode: branch.internalCode,
      locationArea: branch.locationArea,
      address: branch.address,
      latitude: branch.latitude.toNumber(),
      longitude: branch.longitude.toNumber(),
      geofenceRadiusKm: branch.geofenceRadiusKm.toNumber(),
      phone: branch.phone,
      email: branch.email,
      status: branch.status,
      orderIngestionEnabled: branch.orderIngestionEnabled,
      isThrottled: branch.isThrottled,
      prepBufferMinutes: branch.prepBufferMinutes,
      maxOrdersPerHour: branch.maxOrdersPerHour,
      liveBoxesCount,
      activeDropsCount: activeDrops.length,
      todayReservationsCount: todayReservations,
      restaurant: branch.restaurant,
      schedules: branch.schedules,
    };
  }

  async listBranches(
    restaurantId?: string,
    search?: string,
    status?: BranchStatus,
    page = 1,
    limit = 50,
  ): Promise<BranchDetailModel[]> {
    const skip = (page - 1) * limit;
    const where: Prisma.BranchWhereInput = {};

    if (restaurantId) where.restaurantId = restaurantId;
    if (status) where.status = status;
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { internalCode: { contains: q, mode: 'insensitive' } },
        { locationArea: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.branch.findMany({
      where,
      include: {
        restaurant: { select: { id: true, name: true, partnerNumber: true, slug: true } },
        schedules: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return Promise.all(rows.map((row) => this.attachBranchMetrics(row)));
  }

  async getBranchDetail(id: string): Promise<BranchDetailModel> {
    const conditions: Prisma.BranchWhereInput[] = [{ internalCode: id }, { slug: id }];
    if (id.includes('-')) {
      conditions.push({ id });
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        OR: conditions,
      },
      include: {
        restaurant: { select: { id: true, name: true, partnerNumber: true, slug: true } },
        schedules: true,
      },
    });

    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, `Branch '${id}' not found.`);
    }

    return this.attachBranchMetrics(branch);
  }

  async getBranchSchedule(branchId: string): Promise<BranchOperatingScheduleModel[]> {
    return this.prisma.branchOperatingSchedule.findMany({
      where: { branchId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async toggleOrderIngestion(
    branchId: string,
    enabled: boolean,
    adminActor: AuthAdminUser,
  ): Promise<BranchDetailModel> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, `Branch '${branchId}' not found.`);
    }

    await this.prisma.branch.update({
      where: { id: branchId },
      data: { orderIngestionEnabled: enabled },
    });

    await this.redis.set(`branch:ingestion:${branchId}`, enabled ? '1' : '0');

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.BRANCH_THROTTLED,
        entityType: 'BRANCH',
        entityId: branchId,
        summary: `Toggled order ingestion for ${branch.name} to ${enabled}`,
        payloadJson: { branchId, orderIngestionEnabled: enabled },
      },
    });

    return this.getBranchDetail(branchId);
  }

  async updateBranchThrottle(
    input: UpdateBranchThrottleInput,
    adminActor: AuthAdminUser,
  ): Promise<BranchDetailModel> {
    const branch = await this.prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, `Branch '${input.branchId}' not found.`);
    }

    const nextStatus =
      input.isThrottled && branch.status === BranchStatus.ACTIVE
        ? BranchStatus.BUSY_THROTTLED
        : !input.isThrottled && branch.status === BranchStatus.BUSY_THROTTLED
          ? BranchStatus.ACTIVE
          : branch.status;

    await this.prisma.branch.update({
      where: { id: input.branchId },
      data: {
        isThrottled: input.isThrottled,
        prepBufferMinutes: input.prepBufferMinutes,
        status: nextStatus,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.BRANCH_THROTTLED,
        entityType: 'BRANCH',
        entityId: input.branchId,
        summary: `Updated throttle on ${branch.name}: throttled=${input.isThrottled}, prep=${input.prepBufferMinutes}m`,
        payloadJson: {
          branchId: input.branchId,
          isThrottled: input.isThrottled,
          prepBufferMinutes: input.prepBufferMinutes,
        },
      },
    });

    return this.getBranchDetail(input.branchId);
  }

  async emergencyBranchShutdown(
    branchId: string,
    adminActor: AuthAdminUser,
  ): Promise<BranchDetailModel> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, `Branch '${branchId}' not found.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.branch.update({
        where: { id: branchId },
        data: {
          status: BranchStatus.CLOSED_EMERGENCY,
          orderIngestionEnabled: false,
          isThrottled: true,
        },
      });

      await tx.drop.updateMany({
        where: {
          branchId,
          status: { in: [DropStatus.ACTIVE_DROP, DropStatus.DRAFT_REVIEW] },
        },
        data: {
          status: DropStatus.CANCELLED,
          postmortemNotes: 'Automated cancellation due to emergency branch shutdown',
        },
      });

      await tx.auditLog.create({
        data: {
          adminUserId: adminActor.id,
          actorEmail: adminActor.email,
          action: AuditActionType.BRANCH_EMERGENCY_SHUTDOWN,
          entityType: 'BRANCH',
          entityId: branchId,
          summary: `Initiated emergency shutdown for branch ${branch.name}`,
          payloadJson: { branchId, internalCode: branch.internalCode },
        },
      });
    });

    await this.redis.set(`branch:ingestion:${branchId}`, '0');

    return this.getBranchDetail(branchId);
  }

  async inviteBranchStaff(
    branchId: string,
    name: string,
    email: string,
    role: StaffRole,
    adminActor: AuthAdminUser,
  ): Promise<BranchStaffModel> {
    const normalizedEmail = email.trim().toLowerCase();
    const staff = await this.prisma.branchStaff.upsert({
      where: {
        branchId_email: { branchId, email: normalizedEmail },
      },
      update: { name, role, status: StaffStatus.INVITATION_PENDING },
      create: {
        branchId,
        name,
        email: normalizedEmail,
        role,
        status: StaffStatus.INVITATION_PENDING,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        adminUserId: adminActor.id,
        actorEmail: adminActor.email,
        action: AuditActionType.STAFF_INVITED,
        entityType: 'BRANCH_STAFF',
        entityId: staff.id,
        summary: `Invited staff ${name} (${normalizedEmail}) as ${role} for branch`,
        payloadJson: { branchId, email: normalizedEmail, role },
      },
    });

    return staff;
  }
}

import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { BranchStatus, DropStatus, OrderStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { UpdateVendorProfileInput } from './dto/vendor-profile.input';
import type {
  VendorBranchStationModel,
  VendorRestaurantProfileModel,
} from './models/vendor-profile.model';
import type {
  BranchModel,
  BranchOperatingScheduleModel,
  DropModel,
} from '../../../generated/prisma/models';

type BranchWithDetails = BranchModel & {
  schedules: BranchOperatingScheduleModel[];
  drops: DropModel[];
};

@Injectable()
export class VendorProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async buildBranchModel(
    b: BranchWithDetails,
    idx: number,
  ): Promise<VendorBranchStationModel> {
    const pendingPickups = await this.prisma.reservation.count({
      where: {
        drop: { branchId: b.id },
        status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_KITCHEN] },
      },
    });

    const activeBoxes = b.drops.length;
    const schedule = b.schedules[0];
    const kitchenHours = schedule
      ? `${schedule.openTime} – ${schedule.closeTime}`
      : '12:00 PM – 11:30 PM';

    let statusText = 'ONLINE';
    if (b.status === BranchStatus.BUSY_THROTTLED || b.isThrottled) {
      statusText = 'BUSY';
    } else if (b.status === BranchStatus.INACTIVE || b.status === BranchStatus.CLOSED_EMERGENCY) {
      statusText = 'CLOSED';
    }

    return {
      id: b.id,
      name: b.name,
      area: b.locationArea,
      address: b.address,
      phone: b.phone,
      isPrimary: idx === 0,
      status: statusText,
      kitchenHours,
      activeBoxes,
      pendingPickups,
    };
  }

  async getProfile(restaurantId: string): Promise<VendorRestaurantProfileModel> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        branches: {
          where: { deletedAt: null },
          include: {
            schedules: true,
            drops: {
              where: { status: DropStatus.ACTIVE_DROP },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new DomainError(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant merchant not found.');
    }

    const branchModels = await Promise.all(
      restaurant.branches.map((b, idx) => this.buildBranchModel(b, idx)),
    );

    return {
      id: restaurant.id,
      name: restaurant.name,
      partnerId: restaurant.partnerNumber,
      cuisine: restaurant.cuisine,
      district: restaurant.district || 'Karachi South',
      address: restaurant.address || 'Karachi HQ',
      primaryPhone: restaurant.contactPhone,
      altPhone: restaurant.altPhone,
      email: restaurant.contactEmail,
      executiveChef: restaurant.executiveChef || 'Executive Culinary Lead',
      managerName: restaurant.managerName || restaurant.contactName,
      stationId: restaurant.stationId || 'KHI-501',
      status: restaurant.status,
      verificationPercent: restaurant.verificationPercent || 95,
      activeDropWindow: restaurant.activeDropWindow || '19:30 – 21:00 PKT',
      gstRate: restaurant.gstRateBasisPoints ? restaurant.gstRateBasisPoints / 10000 : 0.15,
      bankDetails: {
        bankName: restaurant.bankName || null,
        accountTitle: restaurant.bankAccountTitle || null,
        accountNumber: restaurant.bankAccountNumber || null,
        iban: restaurant.bankIban || null,
      },
      branches: branchModels,
    };
  }

  async updateProfile(
    restaurantId: string,
    input: UpdateVendorProfileInput,
  ): Promise<VendorRestaurantProfileModel> {
    const dataToUpdate: Record<string, unknown> = {};
    if (input.name) dataToUpdate.name = input.name;
    if (input.cuisine) dataToUpdate.cuisine = input.cuisine;
    if (input.primaryPhone) dataToUpdate.contactPhone = input.primaryPhone;
    if (input.address) dataToUpdate.address = input.address;
    if (input.executiveChef) dataToUpdate.executiveChef = input.executiveChef;
    if (input.managerName) dataToUpdate.managerName = input.managerName;

    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: dataToUpdate,
    });

    return this.getProfile(restaurantId);
  }

  async toggleBusyMode(branchId: string): Promise<VendorBranchStationModel> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { schedules: true, drops: { where: { status: DropStatus.ACTIVE_DROP } } },
    });

    if (!branch) {
      throw new DomainError(ErrorCode.BRANCH_NOT_FOUND, 'Branch station not found.');
    }

    const nextThrottled = !branch.isThrottled;
    const nextStatus = nextThrottled ? BranchStatus.BUSY_THROTTLED : BranchStatus.ACTIVE;

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        isThrottled: nextThrottled,
        status: nextStatus,
      },
    });

    const pendingPickups = await this.prisma.reservation.count({
      where: {
        drop: { branchId },
        status: { in: [OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_KITCHEN] },
      },
    });

    const schedule = branch.schedules[0];
    const kitchenHours = schedule
      ? `${schedule.openTime} – ${schedule.closeTime}`
      : '12:00 PM – 11:30 PM';

    return {
      id: updated.id,
      name: updated.name,
      area: updated.locationArea,
      address: updated.address,
      phone: updated.phone,
      isPrimary: false,
      status: nextThrottled ? 'BUSY' : 'ONLINE',
      kitchenHours,
      activeBoxes: branch.drops.length,
      pendingPickups,
    };
  }
}

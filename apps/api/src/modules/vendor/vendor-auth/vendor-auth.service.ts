import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { AppConfig } from '../../../config/app-config.service';
import { StaffStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { VendorLoginInput } from './dto/vendor-login.input';
import type {
  VendorAuthPayload,
  VendorBranchBriefModel,
  VendorRestaurantBriefModel,
  VendorStaffProfileModel,
} from './models/vendor-auth-payload.model';
import type { BranchModel, RestaurantModel } from '../../../generated/prisma/models';

@Injectable()
export class VendorAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  private formatBranch(branch: BranchModel): VendorBranchBriefModel {
    return {
      id: branch.id,
      name: branch.name,
      internalCode: branch.internalCode,
      locationArea: branch.locationArea,
    };
  }

  private formatRestaurant(restaurant: RestaurantModel): VendorRestaurantBriefModel {
    return {
      id: restaurant.id,
      name: restaurant.name,
      partnerNumber: restaurant.partnerNumber,
      cuisine: restaurant.cuisine,
      district: restaurant.district,
      stationId: restaurant.stationId,
    };
  }

  private async findAndVerifyStaff(usernameOrEmail: string, password: string) {
    const rawIdentifier = usernameOrEmail.trim();
    const normalizedLower = rawIdentifier.toLowerCase();

    const staff = await this.prisma.branchStaff.findFirst({
      where: {
        OR: [
          { username: { equals: rawIdentifier, mode: 'insensitive' } },
          { email: { equals: normalizedLower, mode: 'insensitive' } },
        ],
      },
      include: {
        branch: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!staff || !staff.passwordHash || staff.status !== StaffStatus.ACTIVE || !staff.isActive) {
      throw new DomainError(
        ErrorCode.VENDOR_UNAUTHORIZED,
        'Invalid merchant station credentials or station account inactive.',
      );
    }

    const isMatch = await bcrypt.compare(password, staff.passwordHash);
    if (!isMatch) {
      throw new DomainError(
        ErrorCode.VENDOR_UNAUTHORIZED,
        'Invalid merchant station credentials or station account inactive.',
      );
    }

    await this.prisma.branchStaff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    });

    return staff;
  }

  async login(input: VendorLoginInput): Promise<VendorAuthPayload> {
    const staff = await this.findAndVerifyStaff(input.usernameOrEmail, input.password);

    const payload = {
      sub: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      restaurantId: staff.branch.restaurantId,
      branchId: staff.branchId,
      type: 'vendor',
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.jwt.accessSecret,
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
      expiresIn: '12h', // Standard restaurant shift session
    });

    const branch = this.formatBranch(staff.branch);
    const restaurant = this.formatRestaurant(staff.branch.restaurant);

    return {
      accessToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        username: staff.username,
        role: staff.role,
        status: staff.status,
        isActive: staff.isActive,
        branchId: staff.branchId,
        restaurantId: staff.branch.restaurantId,
        lastLoginAt: staff.lastLoginAt,
        restaurant,
        branch,
      },
      restaurant,
      branch,
    };
  }

  async getProfile(staffId: string): Promise<VendorStaffProfileModel> {
    const staff = await this.prisma.branchStaff.findUnique({
      where: { id: staffId },
      include: {
        branch: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!staff || staff.status !== StaffStatus.ACTIVE || !staff.isActive) {
      throw new DomainError(ErrorCode.NOT_FOUND, 'Staff profile not found or inactive.');
    }

    const branch = this.formatBranch(staff.branch);
    const restaurant = this.formatRestaurant(staff.branch.restaurant);

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      username: staff.username,
      role: staff.role,
      status: staff.status,
      isActive: staff.isActive,
      branchId: staff.branchId,
      restaurantId: staff.branch.restaurantId,
      lastLoginAt: staff.lastLoginAt,
      restaurant,
      branch,
    };
  }
}

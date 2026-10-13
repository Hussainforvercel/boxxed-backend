import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { AppConfig } from '../../../config/app-config.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type { AdminLoginInput } from './dto/admin-login.input';
import type { AdminAuthPayload, AdminUserModel } from './models/admin-auth-payload.model';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  async login(input: AdminLoginInput): Promise<AdminAuthPayload> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin || !admin.isActive) {
      throw new DomainError(
        ErrorCode.ADMIN_UNAUTHORIZED,
        'Invalid administrative credentials or account inactive.',
      );
    }

    const isMatch = await bcrypt.compare(input.password, admin.passwordHash);
    if (!isMatch) {
      throw new DomainError(
        ErrorCode.ADMIN_UNAUTHORIZED,
        'Invalid administrative credentials or account inactive.',
      );
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.jwt.accessSecret,
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
      expiresIn: '8h', // Extended operational shift session
    });

    return {
      accessToken,
      adminUser: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        title: admin.title,
        hqLocation: admin.hqLocation,
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt,
      },
    };
  }

  async getAdminProfile(adminId: string): Promise<AdminUserModel> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.isActive) {
      throw new DomainError(ErrorCode.NOT_FOUND, 'Administrative user not found.');
    }

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      title: admin.title,
      hqLocation: admin.hqLocation,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
    };
  }
}

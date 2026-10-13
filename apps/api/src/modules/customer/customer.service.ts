import { randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { ErrorCode } from '@boxxed/shared';

import { CustomerDropModel } from './models/customer-drop.model';
import { CustomerReservationModel } from './models/customer-reservation.model';
import { DomainError } from '../../common/errors/domain-error';
import { DropStatus, OrderStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infra/redis/redis.constants';

import type { DropModel, ReservationModel, UserModel } from '../../generated/prisma/models';

type DropWithRelations = DropModel & {
  branch: {
    id: string;
    name: string;
    internalCode: string;
    locationArea: string;
    address: string;
    restaurant: {
      id: string;
      name: string;
      partnerNumber: string;
      cuisine: string;
      description?: string | null;
      district?: string | null;
      address?: string | null;
    };
  };
};

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  mapDropToModel(drop: DropWithRelations): CustomerDropModel {
    const formattedSku = drop.sku.startsWith('#') ? drop.sku : `#${drop.sku}`;
    return {
      id: drop.id,
      sku: formattedSku,
      title: drop.title,
      headlineItem: drop.headlineItem,
      categoryTag: drop.categoryTag,
      description: drop.description,
      imageUrl: drop.imageUrl,
      priceMinor: drop.priceMinor,
      price: drop.priceMinor / 100,
      originalPriceMinor: drop.originalPriceMinor,
      originalPrice: drop.originalPriceMinor / 100,
      currency: drop.currency,
      discountTier: drop.discountTier,
      totalQuantity: drop.totalQuantity,
      remainingQuantity: drop.remainingQuantity,
      pickupStart: drop.pickupStart,
      pickupEnd: drop.pickupEnd,
      pickupSlotDuration: drop.pickupSlotDuration,
      seriesCode: drop.seriesCode,
      status: drop.status,
      restaurant: {
        id: drop.branch.restaurant.id,
        name: drop.branch.restaurant.name,
        partnerNumber: drop.branch.restaurant.partnerNumber,
        cuisine: drop.branch.restaurant.cuisine,
        description: drop.branch.restaurant.description ?? null,
        district: drop.branch.restaurant.district ?? null,
        address: drop.branch.restaurant.address ?? null,
        timeZone: 'Asia/Karachi',
      },
      branch: {
        id: drop.branch.id,
        name: drop.branch.name,
        internalCode: drop.branch.internalCode,
        locationArea: drop.branch.locationArea,
        address: drop.branch.address,
      },
    };
  }

  async getDrops(branchId?: string, status?: DropStatus): Promise<CustomerDropModel[]> {
    const where: { branchId?: string; status?: DropStatus } = {};
    if (branchId) where.branchId = branchId;
    where.status = status || DropStatus.ACTIVE_DROP;

    const drops = await this.prisma.drop.findMany({
      where,
      include: {
        branch: {
          include: {
            restaurant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return drops.map((d) => this.mapDropToModel(d as unknown as DropWithRelations));
  }

  async getDropById(idOrSku: string): Promise<CustomerDropModel | null> {
    const clean = idOrSku.trim();
    const cleanWithHash = clean.startsWith('#') ? clean : `#${clean}`;
    const cleanWithoutHash = clean.replace(/^#/, '');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
    const drop = await this.prisma.drop.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: clean }] : []),
          { sku: clean },
          { sku: cleanWithHash },
          { sku: cleanWithoutHash },
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

    if (!drop) return null;
    return this.mapDropToModel(drop as unknown as DropWithRelations);
  }

  async createReservation(
    userId: string | null,
    dropIdOrSku: string,
    quantity = 1,
  ): Promise<CustomerReservationModel> {
    const clean = dropIdOrSku.trim();
    const cleanWithHash = clean.startsWith('#') ? clean : `#${clean}`;
    const cleanWithoutHash = clean.replace(/^#/, '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

    const drop = await this.prisma.drop.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: clean }] : []),
          { sku: clean },
          { sku: cleanWithHash },
          { sku: cleanWithoutHash },
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

    if (!drop) {
      throw new DomainError(ErrorCode.DROP_NOT_FOUND, `Drop '${dropIdOrSku}' not found.`);
    }

    if (drop.remainingQuantity < quantity) {
      throw new DomainError(ErrorCode.SOLD_OUT, `Drop is sold out or insufficient stock.`);
    }

    // Resolve or fallback to customer user
    let customerUser: UserModel | null = null;
    if (userId) {
      customerUser = await this.prisma.user.findUnique({ where: { id: userId } });
    }
    if (!customerUser) {
      customerUser = await this.prisma.user.findFirst({
        where: { phoneE164: '+923000000001' },
      });
    }
    if (!customerUser) {
      customerUser = await this.prisma.user.create({
        data: {
          phoneE164: '+923000000001',
          fullName: 'Ayaan Tariq',
          phoneVerifiedAt: new Date(),
        },
      });
    }

    let orderNumber = 'BX-9042';
    const existing = await this.prisma.reservation.findUnique({ where: { orderNumber } });
    if (existing) {
      orderNumber = `BX-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const pickupOtp = '4819';
    const rackLocation = 'Rack #01';
    const holdExpiresAt = new Date(Date.now() + 180 * 1000); // 3-minute hold
    const reservationId = randomUUID();

    // Atomic database update and reservation creation
    const { reservation, updatedDrop } = await this.prisma.$transaction(async (tx) => {
      const updatedDrop = await tx.drop.update({
        where: { id: drop.id },
        data: {
          remainingQuantity: {
            decrement: quantity,
          },
        },
        include: {
          branch: {
            include: {
              restaurant: true,
            },
          },
        },
      });

      const reservation = await tx.reservation.create({
        data: {
          id: reservationId,
          orderNumber,
          referenceCode: orderNumber,
          pickupOtp,
          rackLocation,
          userId: customerUser!.id,
          dropId: drop.id,
          quantity,
          priceMinor: drop.priceMinor,
          currency: drop.currency,
          status: OrderStatus.READY_FOR_PICKUP,
          holdExpiresAt,
          idempotencyKey: randomUUID(),
        },
        include: {
          user: true,
        },
      });

      return { reservation, updatedDrop };
    });

    // Redis locking: set 3-minute reservation lock key (TTL: 180 seconds)
    const redisDropHoldKey = `drop:hold:${drop.id}:${customerUser.id}`;
    const redisReservationLockKey = `reservation:lock:${reservation.id}`;
    await this.redis.set(redisDropHoldKey, reservation.id, 'EX', 180);
    await this.redis.set(redisReservationLockKey, customerUser.id, 'EX', 180);

    const dropModel = this.mapDropToModel(updatedDrop as unknown as DropWithRelations);

    return {
      id: reservation.id,
      orderNumber: reservation.orderNumber,
      referenceCode: reservation.referenceCode,
      pickupOtp,
      rackLocation,
      status: reservation.status,
      quantity: reservation.quantity,
      priceMinor: reservation.priceMinor,
      price: reservation.priceMinor / 100,
      currency: reservation.currency,
      holdExpiresAt: reservation.holdExpiresAt,
      remainingQuantity: updatedDrop.remainingQuantity,
      customerName: customerUser.fullName || 'Valued Guest',
      customerPhone: customerUser.phoneE164 || '+92 300 0000000',
      drop: dropModel,
    };
  }
}

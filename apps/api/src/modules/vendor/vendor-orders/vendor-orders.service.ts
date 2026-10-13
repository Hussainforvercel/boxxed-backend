import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { OrderStatus } from '../../../generated/prisma/enums';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type {
  VendorOrderItemModel,
  VendorOrderVerificationResultModel,
} from './models/vendor-order.model';
import type * as Prisma from '../../../generated/prisma/internal/prismaNamespace';
import type { DropModel, ReservationModel, UserModel } from '../../../generated/prisma/models';

type ReservationWithRelations = ReservationModel & {
  user?: UserModel | null;
  drop?: DropModel | null;
};

@Injectable()
export class VendorOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStatusToPrisma(status?: string): OrderStatus | undefined {
    if (!status || status === 'ALL') return undefined;
    switch (status) {
      case 'PREPARING':
        return OrderStatus.IN_KITCHEN;
      case 'AWAITING_PICKUP':
        return OrderStatus.READY_FOR_PICKUP;
      case 'COMPLETED':
        return OrderStatus.COMPLETED;
      case 'NO_SHOW':
        return OrderStatus.NO_SHOW;
      default:
        return undefined;
    }
  }

  private mapPrismaToFrontendStatus(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.IN_KITCHEN:
        return 'PREPARING';
      case OrderStatus.READY_FOR_PICKUP:
        return 'AWAITING_PICKUP';
      case OrderStatus.COMPLETED:
        return 'COMPLETED';
      case OrderStatus.NO_SHOW:
        return 'NO_SHOW';
      default:
        return 'AWAITING_PICKUP';
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private mapReservationToModel(r: ReservationWithRelations): VendorOrderItemModel {
    const totalAmount = Math.round((r.priceMinor * r.quantity) / 100);
    const pickupStart = r.drop?.pickupStart ? new Date(r.drop.pickupStart) : new Date();
    const pickupEnd = r.drop?.pickupEnd ? new Date(r.drop.pickupEnd) : new Date();

    const scheduledTime = `${this.formatTime(pickupStart)} – ${this.formatTime(pickupEnd)}`;
    const orderTime = this.formatTime(new Date(r.createdAt));
    const completedTime = r.collectedAt ? this.formatTime(new Date(r.collectedAt)) : null;

    return {
      id: r.id,
      orderNumber: r.orderNumber,
      customerName: r.user?.fullName || 'Valued Guest',
      customerPhone: r.user?.phoneE164 || '+92 300 0000000',
      boxTitle: r.drop?.title || 'Culinary Mystery Box',
      boxSeries: r.drop?.seriesCode || 'SERIES 01',
      quantity: r.quantity,
      totalAmount,
      otp: r.pickupOtp || '4891',
      rackLocation: r.rackLocation || 'Rack #01',
      status: this.mapPrismaToFrontendStatus(r.status),
      scheduledTime,
      orderTime,
      completedTime,
    };
  }

  async listOrders(
    branchId: string,
    status?: string,
    search?: string,
  ): Promise<VendorOrderItemModel[]> {
    const prismaStatus = this.mapStatusToPrisma(status);

    const whereClause: Prisma.ReservationWhereInput = {
      drop: { branchId },
    };

    if (prismaStatus) {
      whereClause.status = prismaStatus;
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { pickupOtp: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { phoneE164: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const reservations = await this.prisma.reservation.findMany({
      where: whereClause,
      include: {
        user: true,
        drop: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reservations.map((r) => this.mapReservationToModel(r));
  }

  async markOrderReady(orderId: string): Promise<VendorOrderItemModel> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: orderId },
      include: { user: true, drop: true },
    });

    if (!reservation) {
      throw new DomainError(ErrorCode.ORDER_NOT_FOUND, 'Reservation order not found.');
    }

    const updated = await this.prisma.reservation.update({
      where: { id: orderId },
      data: { status: OrderStatus.READY_FOR_PICKUP },
      include: { user: true, drop: true },
    });

    return this.mapReservationToModel(updated);
  }

  async completeHandover(orderId: string): Promise<VendorOrderItemModel> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: orderId },
      include: { user: true, drop: true },
    });

    if (!reservation) {
      throw new DomainError(ErrorCode.ORDER_NOT_FOUND, 'Reservation order not found.');
    }

    const updated = await this.prisma.reservation.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.COMPLETED,
        collectedAt: new Date(),
      },
      include: { user: true, drop: true },
    });

    return this.mapReservationToModel(updated);
  }

  async verifyAndHandover(
    branchId: string,
    searchCode: string,
    inputOtp?: string,
  ): Promise<VendorOrderVerificationResultModel> {
    const cleanSearch = searchCode.trim();

    // Search by orderNumber, phone, or OTP
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        drop: { branchId },
        OR: [
          { orderNumber: { equals: cleanSearch, mode: 'insensitive' } },
          { pickupOtp: { equals: cleanSearch, mode: 'insensitive' } },
          { user: { phoneE164: { contains: cleanSearch, mode: 'insensitive' } } },
        ],
      },
      include: { user: true, drop: true },
    });

    if (!reservation) {
      return {
        success: false,
        message: 'No matching order found for this ticket / phone number at this station.',
        order: null,
      };
    }

    const orderModel = this.mapReservationToModel(reservation);

    if (inputOtp && inputOtp.trim()) {
      const cleanOtp = inputOtp.trim();
      if (reservation.pickupOtp && reservation.pickupOtp !== cleanOtp) {
        return {
          success: false,
          message: `OTP mismatch! Entered ${cleanOtp}, expected 4-digit guest pass.`,
          order: orderModel,
        };
      }
    }

    // Complete handover
    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: OrderStatus.COMPLETED,
        collectedAt: new Date(),
      },
      include: { user: true, drop: true },
    });

    const completedModel = this.mapReservationToModel(updated);

    return {
      success: true,
      message: `Handover successful for ${completedModel.orderNumber} (${completedModel.customerName}) from ${completedModel.rackLocation}.`,
      order: completedModel,
    };
  }
}

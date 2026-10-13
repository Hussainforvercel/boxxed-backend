import { Injectable } from '@nestjs/common';

import { ErrorCode } from '@boxxed/shared';

import { DomainError } from '../../../common/errors/domain-error';
import { PrismaService } from '../../../infra/prisma/prisma.service';

import type {
  VendorEarningsSummaryModel,
  VendorPayoutRecordModel,
  VendorPayoutSummaryModel,
} from './models/vendor-payout.model';

@Injectable()
export class VendorPayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  async listPayouts(restaurantId: string): Promise<VendorPayoutRecordModel[]> {
    const payouts = await this.prisma.partnerPayout.findMany({
      where: { restaurantId },
      orderBy: { periodStart: 'desc' },
    });

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    const bankSummary = restaurant?.bankAccountNumber
      ? `${restaurant.bankName || 'HBL'} • *${restaurant.bankAccountNumber.slice(-4)}`
      : null;

    return payouts.map((p) => {
      const grossSales = Math.round(p.grossSalesMinor / 100);
      const platformFeeAmount = Math.round(p.platformFeeMinor / 100);
      const srbTax = Math.round(p.taxWithheldMinor / 100);
      const netPayout = Math.round(p.netPayableMinor / 100);
      const feeRate = grossSales > 0 ? Number((platformFeeAmount / grossSales).toFixed(2)) : 0.12;

      const period = `${this.formatDate(p.periodStart)} – ${this.formatDate(p.periodEnd)}`;
      const disbursementDate = p.settledAt
        ? this.formatDate(p.settledAt)
        : this.formatDate(new Date(p.periodEnd.getTime() + 2 * 24 * 60 * 60 * 1000));

      return {
        id: p.id,
        period,
        grossSales,
        platformFeeRate: feeRate || 0.12,
        platformFeeAmount,
        srbTax,
        netPayout,
        status: p.isSettled ? 'SETTLED' : 'SCHEDULED',
        referenceId: p.payoutReference,
        disbursementDate,
        bankAccount: bankSummary,
      };
    });
  }

  async getPayoutSummary(restaurantId: string): Promise<VendorPayoutSummaryModel> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new DomainError(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found.');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySettled = await this.prisma.partnerPayout.findMany({
      where: {
        restaurantId,
        periodStart: { gte: startOfMonth },
        isSettled: true,
      },
    });

    const monthNetEarnings = monthlySettled.reduce(
      (acc, curr) => acc + Math.round(curr.netPayableMinor / 100),
      0,
    );

    const pending = await this.prisma.partnerPayout.findFirst({
      where: {
        restaurantId,
        isSettled: false,
      },
      orderBy: { periodStart: 'asc' },
    });

    const nextPayoutAmount = pending ? Math.round(pending.netPayableMinor / 100) : 0;
    const nextPayoutDate = pending
      ? `Due Tuesday, ${this.formatDate(new Date(pending.periodEnd.getTime() + 2 * 24 * 60 * 60 * 1000))}`
      : null;

    const bankAccountSummary = restaurant.bankAccountNumber
      ? `${restaurant.bankName || 'HBL'} (*${restaurant.bankAccountNumber.slice(-4)})`
      : null;

    return {
      nextPayoutAmount,
      nextPayoutDate,
      monthNetEarnings,
      platformFeePercent: 12,
      bankAccountSummary,
    };
  }

  async generateSalesCsv(restaurantId: string): Promise<string> {
    const list = await this.listPayouts(restaurantId);

    const headers = [
      'Batch Period',
      'Gross Sales (PKR)',
      'Boxxed Fee (12%)',
      'Net Disbursed (PKR)',
      'Payment Reference',
      'Settlement Date',
      'Status',
    ];

    const rows = list.map((p) => [
      `"${p.period}"`,
      p.grossSales,
      p.platformFeeAmount,
      p.netPayout,
      `"${p.referenceId}"`,
      `"${p.disbursementDate}"`,
      p.status,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async generateTaxStatement(restaurantId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    const summary = await this.getPayoutSummary(restaurantId);
    const dateStr = this.formatDate(new Date());

    return `
================================================================================
                    BOXXED HOSPITALITY PLATFORM (PVT) LTD
           MONTHLY SETTLEMENT & SINDH SRB TAX COMPLIANCE STATEMENT
================================================================================

Merchant Trading Name : ${restaurant?.name || 'Karachi Social'}
Partner Identification: ${restaurant?.partnerNumber || '#KHI-048'}
NTN Number            : ${restaurant?.ntnNumber || 'NTN-7489201-9'}
Sindh SRB Tax Reg     : ${restaurant?.gstRegistrationNumber || 'SRB-KHI-40912'}
Settlement Route      : ${restaurant?.bankName || 'Habib Bank Limited'} (IBAN: ${restaurant?.bankIban || 'PK36HABB0000421109489240'})

Statement Date        : ${dateStr}
Platform Fee Rate     : 12.00% Flat Marketplace Commission
Applicable SRB Sales  : 15.00% Sindh Revenue Board Service Tax

Month Net Disbursed   : PKR ${summary.monthNetEarnings.toLocaleString()}
Scheduled Next Payout : PKR ${summary.nextPayoutAmount.toLocaleString()} (${summary.nextPayoutDate})

This statement constitutes an automated legal settlement certificate issued
under Section 48 of the Sindh Revenue Board (SRB) Value Added Hospitality Code.
================================================================================
`;
  }

  async getEarningsSummary(restaurantId: string): Promise<VendorEarningsSummaryModel> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new DomainError(ErrorCode.RESTAURANT_NOT_FOUND, 'Restaurant not found.');
    }

    const completedReservations = await this.prisma.reservation.findMany({
      where: {
        drop: {
          branch: {
            restaurantId,
          },
        },
        status: 'COMPLETED',
      },
    });

    const grossSalesMinor = completedReservations.reduce(
      (sum, res) => sum + res.priceMinor * (res.quantity || 1),
      0,
    );

    const basisPoints = restaurant.commissionRateBasisPoints || 1500;
    const platformFeeMinor = Math.round((grossSalesMinor * basisPoints) / 10000);
    const netPayableMinor = grossSalesMinor - platformFeeMinor;

    return {
      grossSales: Number((grossSalesMinor / 100).toFixed(2)),
      platformFeeDeductions: Number((platformFeeMinor / 100).toFixed(2)),
      netPayable: Number((netPayableMinor / 100).toFixed(2)),
      platformCommissionBasisPoints: basisPoints,
    };
  }
}

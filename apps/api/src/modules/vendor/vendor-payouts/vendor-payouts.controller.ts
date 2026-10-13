import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';

import { VendorPayoutsService } from './vendor-payouts.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentVendor } from '../vendor-auth/decorators/current-vendor.decorator';
import { VendorAuthGuard } from '../vendor-auth/guards/vendor-auth.guard';

import type { AuthVendorUser } from '../vendor-auth/auth-vendor-user';
import type { Response } from 'express';

@Controller('vendor/payouts')
export class VendorPayoutsController {
  constructor(private readonly payoutsService: VendorPayoutsService) {}

  @Public()
  @UseGuards(VendorAuthGuard)
  @Get('export-csv')
  async exportCsv(
    @CurrentVendor() user: AuthVendorUser,
    @Res() res: Response,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const targetId = restaurantId || user.restaurantId;
    const csvContent = await this.payoutsService.generateSalesCsv(targetId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="boxxed-sales-ledger.csv"');
    res.send(csvContent);
  }

  @Public()
  @UseGuards(VendorAuthGuard)
  @Get('tax-statement')
  async taxStatement(
    @CurrentVendor() user: AuthVendorUser,
    @Res() res: Response,
    @Query('restaurantId') restaurantId?: string,
  ) {
    const targetId = restaurantId || user.restaurantId;
    const statement = await this.payoutsService.generateTaxStatement(targetId);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="boxxed-tax-statement.txt"');
    res.send(statement);
  }
}

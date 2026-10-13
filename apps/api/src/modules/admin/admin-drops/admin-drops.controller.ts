import { Controller, Get, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { AdminDropsService } from './admin-drops.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminRole } from '../../../generated/prisma/enums';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';

@Controller('admin/drops')
export class AdminDropsController {
  constructor(private readonly dropsService: AdminDropsService) {}

  @Public()
  @UseGuards(AdminAuthGuard, AdminRolesGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.FINANCE_VIEWER)
  @Get('export-csv')
  async exportCsv(@Res() res: Response): Promise<void> {
    const csv = await this.dropsService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="drops-export.csv"');
    res.status(HttpStatus.OK).send(csv);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(@Query('search') search?: string) {
    return this.adminService.getUsers(search);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/plan')
  updatePlan(@Param('id') id: string, @Body() body: { plan: string; months?: number }) {
    return this.adminService.updateUserPlan(id, body.plan as any, body.months ?? 1);
  }

  @Patch('users/:id/limits')
  updateLimits(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateCustomLimits(id, body);
  }

  @Post('users/:id/reset-usage')
  resetUsage(@Param('id') id: string) {
    return this.adminService.resetUsage(id);
  }

  @Patch('users/:id/toggle-admin')
  toggleAdmin(@Param('id') id: string, @Body() body: { isAdmin: boolean }) {
    return this.adminService.toggleAdmin(id, body.isAdmin);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffService } from './staff.service';

@Controller('staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('attendance')
  getAttendance(@Req() req: any) {
    return this.staffService.getAttendance(req.user);
  }

  @Post('attendance/check-in')
  checkIn(@Req() req: any) {
    return this.staffService.checkIn(req.user);
  }

  @Post('attendance/check-out')
  checkOut(@Req() req: any) {
    return this.staffService.checkOut(req.user);
  }

  @Get('leaves')
  getLeaves(@Req() req: any) {
    return this.staffService.getLeaves(req.user);
  }

  @Post('leaves')
  requestLeave(@Req() req: any, @Body() dto: { start_date: string; end_date: string; reason: string }) {
    return this.staffService.requestLeave(req.user, dto);
  }

  @Get('tasks')
  getMyTasks(@Req() req: any) {
    return this.staffService.getMyTasks(req.user);
  }

  @Patch('tasks/:id')
  updateTaskStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.staffService.updateTaskStatus(req.user, id, status);
  }

  @Post('tasks/assign')
  assignTask(@Req() req: any, @Body() dto: { assigned_to: string; title: string; description?: string }) {
    return this.staffService.assignTask(req.user, dto);
  }

  @Get('test-bookings')
  getTestBookings(@Req() req: any) {
    return this.staffService.getTestBookings(req.user);
  }

  @Patch('test-bookings/:id')
  updateTestBookingStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.staffService.updateTestBookingStatus(req.user, id, status);
  }

  @Get('emergency-queue')
  getEmergencyQueue(@Req() req: any) {
    return this.staffService.getEmergencyQueue(req.user);
  }

  @Patch('emergency-queue/:id')
  updateEmergencyStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.staffService.updateEmergencyStatus(req.user, id, status);
  }
}

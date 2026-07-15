import { Body, Controller, Get, Param, Post, Patch, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './appointment.entity';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(req.user.id, dto);
  }

  @Get('mine')
  findMine(@Req() req: any) {
    return this.appointmentsService.findMine(req.user.id);
  }

  @Get('hospital-patients')
  findHospitalPatients(@Req() req: any) {
    if (req.user.role !== 'hospital_head') {
      throw new ForbiddenException('Only hospital heads can view the patient list');
    }
    return this.appointmentsService.findHospitalPatients(req.user.hospital_id);
  }

  @Get('doctor-queue')
  findDoctorQueue(@Req() req: any) {
    if (req.user.role !== 'doctor') {
      throw new ForbiddenException('Only doctors can view their queue');
    }
    return this.appointmentsService.findDoctorQueue(req.user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: AppointmentStatus; queuePosition?: number },
  ) {
    if (!['doctor', 'staff', 'hospital_head'].includes(req.user.role)) {
      throw new ForbiddenException('Not authorized to update appointment status');
    }
    return this.appointmentsService.updateStatus(id, body.status, body.queuePosition, req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, req.user.id);
  }

  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, req.user.id);
  }
}

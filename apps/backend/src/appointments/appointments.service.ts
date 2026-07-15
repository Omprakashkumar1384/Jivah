import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    private redisService: RedisService,
  ) {}

  private generateBookingNumber(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `JVH${timestamp}${random}`;
  }

  private async publishUpdate(appointment: Appointment) {
    const payload = JSON.stringify({
      appointmentId: appointment.id,
      hospitalId: appointment.hospital_id,
      patientId: appointment.patient_id,
      status: appointment.status,
      queuePosition: appointment.queue_position,
    });
    await this.redisService.publish('queue-updates', payload);
  }

  async create(patientId: string, dto: CreateAppointmentDto) {
    const appointment = this.appointmentRepo.create({
      booking_number: this.generateBookingNumber(),
      patient_id: patientId,
      hospital_id: dto.hospital_id,
      department_id: dto.department_id,
      doctor_id: dto.doctor_id,
      scheduled_at: dto.scheduled_at ? new Date(dto.scheduled_at) : undefined,
      status: AppointmentStatus.PENDING_PAYMENT,
    });

    const saved = await this.appointmentRepo.save(appointment);
    await this.publishUpdate(saved);
    return saved;
  }

  async findMine(patientId: string) {
    return this.appointmentRepo.find({
      where: { patient_id: patientId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, patientId: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patient_id !== patientId) {
      throw new ForbiddenException('You do not have access to this appointment');
    }

    return appointment;
  }

  async cancel(id: string, patientId: string) {
    const appointment = await this.findOne(id, patientId);
    appointment.status = AppointmentStatus.CANCELLED;
    const saved = await this.appointmentRepo.save(appointment);
    await this.publishUpdate(saved);
    return saved;
  }

  async findHospitalPatients(hospitalId: string) {
    return this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoin('users', 'patient', 'patient.id = appointment.patient_id')
      .select([
        'DISTINCT patient.id AS id',
        'patient.full_name AS full_name',
        'patient.phone AS phone',
        'patient.gender AS gender',
        'patient.dob AS dob',
      ])
      .addSelect('MAX(appointment.created_at)', 'last_visit')
      .where('appointment.hospital_id = :hospitalId', { hospitalId })
      .groupBy('patient.id, patient.full_name, patient.phone, patient.gender, patient.dob')
      .orderBy('last_visit', 'DESC')
      .getRawMany();
  }

  async findDoctorQueue(doctorId: string) {
    return this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoin('users', 'patient', 'patient.id = appointment.patient_id')
      .select([
        'appointment.id AS id',
        'appointment.booking_number AS booking_number',
        'appointment.status AS status',
        'appointment.scheduled_at AS scheduled_at',
        'appointment.created_at AS created_at',
        'patient.full_name AS patient_name',
        'patient.phone AS patient_phone',
      ])
      .where('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere("appointment.status != 'cancelled'")
      .orderBy('appointment.created_at', 'DESC')
      .getRawMany();
  }

  async updateStatus(id: string, status: AppointmentStatus, queuePosition: number | undefined, actorId: string) {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    appointment.status = status;
    if (queuePosition !== undefined) {
      appointment.queue_position = queuePosition;
    }

    const saved = await this.appointmentRepo.save(appointment);
    await this.publishUpdate(saved);
    return saved;
  }
}

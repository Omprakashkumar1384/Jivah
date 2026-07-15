import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppointmentStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  IN_QUEUE = 'in_queue',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  booking_number!: string;

  @Column()
  patient_id!: string;

  @Column()
  hospital_id!: string;

  @Column({ nullable: true })
  department_id!: string;

  @Column({ nullable: true })
  doctor_id!: string;

  @Column({ nullable: true })
  room_number!: string;

  @Column({ nullable: true })
  queue_position!: number;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING_PAYMENT })
  status!: AppointmentStatus;

  @Column({ type: 'numeric', nullable: true })
  consultation_fee!: number;

  @Column({ type: 'timestamptz', nullable: true })
  scheduled_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  PATIENT = 'patient',
  HOSPITAL_HEAD = 'hospital_head',
  DOCTOR = 'doctor',
  STAFF = 'staff',
  MEDICAL_STORE_OWNER = 'medical_store_owner',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PATIENT })
  role!: UserRole;

  @Column({ nullable: true })
  full_name!: string;

  @Column({ nullable: true })
  gender!: string;

  @Column({ type: 'date', nullable: true })
  dob!: string;

  @Column({ nullable: true })
  photo_url!: string;

  @Column({ nullable: true, select: false })
  password_hash!: string;

  @Column({ nullable: true })
  password_set_by_head_id!: string;

  @Column({ nullable: true })
  hospital_id!: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

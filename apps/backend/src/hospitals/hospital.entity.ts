import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('hospitals')
export class Hospital {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  type!: string; // 'hospital' | 'clinic'

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  state!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number;

  @Column({ type: 'numeric', default: 0 })
  rating!: number;

  @Column({ type: 'jsonb', default: [] })
  photos!: string[];

  @Column({ type: 'jsonb', default: [] })
  amenities!: string[];

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

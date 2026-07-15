import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsUUID()
  hospital_id!: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsUUID()
  doctor_id?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

import { IsNotEmpty, IsEmail, IsString, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateStaffDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  full_name!: string;

  @IsNotEmpty()
  @IsString()
  phone!: string;

  @IsNotEmpty()
  @IsIn(['doctor', 'staff', 'medical_store_owner', 'hospital_head'])
  role!: string;

  @IsOptional()
  @IsUUID()
  hospital_id?: string;

  @IsOptional()
  @IsString()
  password?: string; // agar nahi diya to system random generate karega
}

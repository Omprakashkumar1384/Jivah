import { IsOptional, IsString, IsIn } from 'class-validator';

export class SearchHospitalDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(['hospital', 'clinic'])
  type?: string;

  @IsOptional()
  @IsString()
  search?: string; // name se search karne ke liye

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

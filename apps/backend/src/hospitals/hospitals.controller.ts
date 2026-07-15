import { Controller, Get, Param, Query } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { SearchHospitalDto } from './dto/search-hospital.dto';

@Controller('hospitals')
export class HospitalsController {
  constructor(private hospitalsService: HospitalsService) {}

  @Get()
  findAll(@Query() query: SearchHospitalDto) {
    return this.hospitalsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hospitalsService.findOne(id);
  }
}

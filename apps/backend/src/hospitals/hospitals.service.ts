import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hospital } from './hospital.entity';
import { SearchHospitalDto } from './dto/search-hospital.dto';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectRepository(Hospital)
    private hospitalRepo: Repository<Hospital>,
  ) {}

  async findAll(query: SearchHospitalDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const qb = this.hospitalRepo
      .createQueryBuilder('hospital')
      .where('hospital.is_active = true');

    if (query.city) {
      qb.andWhere('hospital.city ILIKE :city', { city: `%${query.city}%` });
    }

    if (query.type) {
      qb.andWhere('hospital.type = :type', { type: query.type });
    }

    if (query.search) {
      qb.andWhere('hospital.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('hospital.rating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const hospital = await this.hospitalRepo.findOne({ where: { id } });
    if (!hospital) {
      throw new NotFoundException('Hospital not found');
    }
    return hospital;
  }
}

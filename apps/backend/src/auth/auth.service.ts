import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { RedisService } from '../redis/redis.service';
import { CreateStaffDto } from './dto/create-staff.dto';

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private signToken(user: User) {
    return this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      hospital_id: user.hospital_id,
    });
  }

  // ---------- OTP: used for (1) patient first login (2) forgot-password reset for anyone ----------

  async sendOtp(phone: string) {
    const otp = this.generateOtp();
    const key = `otp:${phone}`;

    await this.redisService.set(key, otp, 'EX', 300);
    console.log(`OTP for ${phone}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string) {
    const key = `otp:${phone}`;
    const storedOtp = await this.redisService.get(key);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redisService.del(key);

    let user = await this.userRepo.findOne({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      user = this.userRepo.create({
        phone,
        role: UserRole.PATIENT,
        full_name: '',
        is_active: true,
      });
      user = await this.userRepo.save(user);
      isNewUser = true;
    }

    const token = this.signToken(user);

    return {
      message: 'OTP verified successfully',
      token,
      isNewUser,
      needsPasswordSetup: !user.password_hash, // true: naya patient, ya password reset ho raha hai
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
      },
    };
  }

  // ---------- SET PASSWORD: called with the token from verify-otp ----------

  async setPassword(userId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    return { message: 'Password set successfully' };
  }

  // ---------- UNIFIED LOGIN: phone (patients) or email (staff) + password ----------

  async login(identifier: string, password: string) {
    const isEmail = identifier.includes('@');

    const qb = this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash');

    if (isEmail) {
      qb.where('user.email = :identifier', { identifier });
    } else {
      qb.where('user.phone = :identifier', { identifier });
    }

    const user = await qb.getOne();

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const token = this.signToken(user);

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        hospital_id: user.hospital_id,
      },
    };
  }

  // ---------- STAFF: CREATE ACCOUNT (by hospital head) ----------

  async createStaff(dto: CreateStaffDto, createdByHeadId: string, creatorHospitalId: string) {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const existingPhone = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existingPhone) {
      throw new ConflictException('A user with this phone number already exists');
    }

    const plainPassword = dto.password || generateRandomPassword();
    const password_hash = await bcrypt.hash(plainPassword, 10);

    const staff = this.userRepo.create({
      email: dto.email,
      phone: dto.phone,
      full_name: dto.full_name,
      role: dto.role as UserRole,
      hospital_id: creatorHospitalId,
      password_hash,
      password_set_by_head_id: createdByHeadId,
      is_active: true,
    });

    const saved = await this.userRepo.save(staff);

    return {
      message: 'Staff account created successfully',
      user: {
        id: saved.id,
        email: saved.email,
        full_name: saved.full_name,
        role: saved.role,
        hospital_id: saved.hospital_id,
      },
      temporaryPassword: plainPassword,
    };
  }
}

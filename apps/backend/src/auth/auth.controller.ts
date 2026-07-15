import { Body, Controller, Post, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { HospitalHeadGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------- OTP: patient first login + forgot-password (anyone) ----------

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  // ---------- Set/reset password (protected — uses token from verify-otp) ----------

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  setPassword(@Req() req: any, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(req.user.id, dto.password);
  }

  // ---------- Unified login: phone (patients) or email (staff) + password ----------

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.identifier, dto.password);
  }

  // ---------- Staff: created only by hospital head ----------

  @Post('create-staff')
  @UseGuards(JwtAuthGuard, HospitalHeadGuard)
  @HttpCode(HttpStatus.CREATED)
  createStaff(@Req() req: any, @Body() dto: CreateStaffDto) {
    return this.authService.createStaff(dto, req.user.id, req.user.hospital_id);
  }
}

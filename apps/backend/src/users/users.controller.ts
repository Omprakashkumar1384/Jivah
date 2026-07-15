import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RlsContextService } from '../common/rls-context.service';

@Controller('users')
export class UsersController {
  constructor(private rlsContext: RlsContextService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const user = req.user;

    return this.rlsContext.runWithContext(user, async (queryRunner) => {
      const result = await queryRunner.query(
        `SELECT id, phone, email, role, full_name FROM users WHERE id = $1`,
        [user.id],
      );
      return result[0];
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff')
  async getStaff(@Req() req: any) {
    const user = req.user;

    if (user.role !== 'hospital_head') {
      throw new ForbiddenException('Only hospital heads can view staff list');
    }

    return this.rlsContext.runWithContext(user, async (queryRunner) => {
      return queryRunner.query(
        `SELECT id, full_name, email, phone, role, is_active, created_at
         FROM users
         WHERE hospital_id = $1
           AND role IN ('doctor', 'staff', 'medical_store_owner')
         ORDER BY created_at DESC`,
        [user.hospital_id],
      );
    });
  }
}

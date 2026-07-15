import { Injectable, ForbiddenException } from '@nestjs/common';
import { RlsContextService } from '../common/rls-context.service';

@Injectable()
export class StaffService {
  constructor(private readonly rls: RlsContextService) {}

  // ---------- Attendance ----------
  async getAttendance(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      return qr.query(
        `SELECT id, check_in, check_out, date FROM attendance
         WHERE user_id = $1 ORDER BY date DESC LIMIT 30`,
        [user.id],
      );
    });
  }

  async checkIn(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `INSERT INTO attendance (user_id, hospital_id, check_in, date)
         VALUES ($1, $2, now(), CURRENT_DATE)
         RETURNING *`,
        [user.id, user.hospital_id],
      );
      return result[0];
    });
  }

  async checkOut(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `UPDATE attendance SET check_out = now()
         WHERE user_id = $1 AND date = CURRENT_DATE AND check_out IS NULL
         RETURNING *`,
        [user.id],
      );
      return result[0];
    });
  }

  // ---------- Leaves ----------
  async getLeaves(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      return qr.query(
        `SELECT id, start_date, end_date, reason, approved, created_at
         FROM leaves WHERE user_id = $1 ORDER BY created_at DESC`,
        [user.id],
      );
    });
  }

  async requestLeave(user: any, dto: { start_date: string; end_date: string; reason: string }) {
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `INSERT INTO leaves (user_id, hospital_id, start_date, end_date, reason)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.id, user.hospital_id, dto.start_date, dto.end_date, dto.reason],
      );
      return result[0];
    });
  }

  // ---------- Tasks (manual assignment by hospital head) ----------
  async getMyTasks(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      return qr.query(
        `SELECT id, title, description, status, created_at
         FROM staff_tasks WHERE assigned_to = $1 ORDER BY created_at DESC`,
        [user.id],
      );
    });
  }

  async updateTaskStatus(user: any, taskId: string, status: string) {
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `UPDATE staff_tasks SET status = $1, updated_at = now()
         WHERE id = $2 AND assigned_to = $3
         RETURNING *`,
        [status, taskId, user.id],
      );
      return result[0];
    });
  }

  async assignTask(user: any, dto: { assigned_to: string; title: string; description?: string }) {
    if (user.role !== 'hospital_head') throw new ForbiddenException();
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `INSERT INTO staff_tasks (hospital_id, assigned_to, assigned_by, title, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.hospital_id, dto.assigned_to, user.id, dto.title, dto.description || null],
      );
      return result[0];
    });
  }

  // ---------- Test bookings (hospital-wide, staff assists) ----------
  async getTestBookings(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      return qr.query(
        `SELECT tb.id, tb.status, tb.report_upload_deadline, tb.created_at,
                t.name AS test_name, t.price,
                u.full_name AS patient_name, u.phone AS patient_phone
         FROM test_bookings tb
         JOIN tests t ON t.id = tb.test_id
         JOIN users u ON u.id = tb.patient_id
         WHERE tb.hospital_id = $1
         ORDER BY tb.created_at DESC`,
        [user.hospital_id],
      );
    });
  }

  async updateTestBookingStatus(user: any, bookingId: string, status: string) {
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `UPDATE test_bookings SET status = $1
         WHERE id = $2 AND hospital_id = $3
         RETURNING *`,
        [status, bookingId, user.hospital_id],
      );
      return result[0];
    });
  }

  // ---------- Emergency queue (ambulance driver) ----------
  async getEmergencyQueue(user: any) {
    return this.rls.runWithContext(user, async (qr) => {
      return qr.query(
        `SELECT er.id, er.pickup_latitude, er.pickup_longitude, er.status, er.created_at,
                u.full_name AS patient_name, u.phone AS patient_phone
         FROM emergency_requests er
         JOIN users u ON u.id = er.patient_id
         WHERE er.driver_id = $1
         ORDER BY er.created_at DESC`,
        [user.id],
      );
    });
  }

  async updateEmergencyStatus(user: any, requestId: string, status: string) {
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `UPDATE emergency_requests SET status = $1, updated_at = now()
         WHERE id = $2 AND driver_id = $3
         RETURNING *`,
        [status, requestId, user.id],
      );
      return result[0];
    });
  }
}

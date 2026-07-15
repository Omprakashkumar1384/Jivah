import { Injectable, ForbiddenException } from '@nestjs/common';
import { RlsContextService } from '../common/rls-context.service';

@Injectable()
export class StoreService {
  constructor(private readonly rls: RlsContextService) {}

  async getInventory(user: any) {
    if (user.role !== 'medical_store_owner') throw new ForbiddenException();
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `SELECT si.id, si.medicine_name, si.price, si.stock_qty, si.updated_at
         FROM store_inventory si
         JOIN medical_stores ms ON ms.id = si.store_id
         WHERE ms.owner_id = $1
         ORDER BY si.medicine_name`,
        [user.id],
      );
      return result;
    });
  }

  async addInventoryItem(user: any, dto: { medicine_name: string; price: number; stock_qty: number }) {
    if (user.role !== 'medical_store_owner') throw new ForbiddenException();
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `INSERT INTO store_inventory (store_id, medicine_name, price, stock_qty)
         VALUES ((SELECT id FROM medical_stores WHERE owner_id = $1 LIMIT 1), $2, $3, $4)
         RETURNING *`,
        [user.id, dto.medicine_name, dto.price, dto.stock_qty],
      );
      return result[0];
    });
  }

  async getOrders(user: any) {
    if (user.role !== 'medical_store_owner') throw new ForbiddenException();
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `SELECT mo.id, mo.status, mo.total_amount, mo.delivery_address, mo.created_at,
                u.full_name AS patient_name, u.phone AS patient_phone
         FROM medicine_orders mo
         JOIN medical_stores ms ON ms.id = mo.store_id
         JOIN users u ON u.id = mo.patient_id
         WHERE ms.owner_id = $1
         ORDER BY mo.created_at DESC`,
        [user.id],
      );
      return result;
    });
  }

  async updateOrderStatus(user: any, orderId: string, status: string) {
    if (user.role !== 'medical_store_owner') throw new ForbiddenException();
    return this.rls.runWithContext(user, async (qr) => {
      const result = await qr.query(
        `UPDATE medicine_orders SET status = $1, updated_at = now()
         WHERE id = $2 AND store_id IN (SELECT id FROM medical_stores WHERE owner_id = $3)
         RETURNING *`,
        [status, orderId, user.id],
      );
      return result[0];
    });
  }
}

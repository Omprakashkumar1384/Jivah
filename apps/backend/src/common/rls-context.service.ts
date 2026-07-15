import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class RlsContextService {
  constructor(private dataSource: DataSource) {}

  async runWithContext<T>(
    user: { id: string; role: string; hospital_id?: string | null },
    callback: (queryRunner: any) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(
        `SELECT set_config('app.user_id', $1, true)`,
        [user.id],
      );
      await queryRunner.query(
        `SELECT set_config('app.role', $1, true)`,
        [user.role],
      );
      await queryRunner.query(
        `SELECT set_config('app.hospital_id', $1, true)`,
        [user.hospital_id || ''],
      );

      const result = await callback(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

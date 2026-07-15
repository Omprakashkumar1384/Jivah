import { Module, Global } from '@nestjs/common';
import { RlsContextService } from './rls-context.service';

@Global()
@Module({
  providers: [RlsContextService],
  exports: [RlsContextService],
})
export class CommonModule {}

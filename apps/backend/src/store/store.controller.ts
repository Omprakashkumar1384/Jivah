import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoreService } from './store.service';

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('inventory')
  getInventory(@Req() req: any) {
    return this.storeService.getInventory(req.user);
  }

  @Post('inventory')
  addInventoryItem(@Req() req: any, @Body() dto: { medicine_name: string; price: number; stock_qty: number }) {
    return this.storeService.addInventoryItem(req.user, dto);
  }

  @Get('orders')
  getOrders(@Req() req: any) {
    return this.storeService.getOrders(req.user);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.storeService.updateOrderStatus(req.user, id, status);
  }
}

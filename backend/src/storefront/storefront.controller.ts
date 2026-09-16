import { Body, Controller, Delete, Get, Header, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorefrontAddressDto } from './dto/storefront.dto';
import { StorefrontService } from './storefront.service';
import { OrdersService } from '../orders/orders.service';

@ApiTags('storefront')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService, private readonly orders: OrdersService) {}
  @Get('orders/:orderNumber') @Header('Cache-Control', 'private, no-store') order(@Req() req: any, @Param('orderNumber') number: string) { return this.orders.findOne(number, req.user); }
  @Post('orders/:orderNumber/cancel') cancel(@Req() req: any, @Param('orderNumber') number: string) { return this.orders.cancel(number, req.user); }
  @Post('orders/:orderNumber/repeat') repeat(@Req() req: any, @Param('orderNumber') number: string, @Headers('x-cart-session') session: string) { return this.orders.repeat(number, req.user, session); }
  @Get('dashboard') dashboard(@Req() req: any) { return this.storefront.dashboard(req.user.sub); }
  @Post('cart/bind') bindCart(@Req() req: any, @Headers('x-cart-session') sessionId?: string) { return this.storefront.bindCart(req.user.sub, sessionId || `user-${req.user.sub}`); }
  @Get('favorites') favorites(@Req() req: any) { return this.storefront.favorites(req.user.sub); }
  @Post('favorites/:productId') addFavorite(@Req() req: any, @Param('productId') productId: string) { return this.storefront.addFavorite(req.user.sub, productId); }
  @Delete('favorites/:productId') removeFavorite(@Req() req: any, @Param('productId') productId: string) { return this.storefront.removeFavorite(req.user.sub, productId); }
  @Get('addresses') addresses(@Req() req: any) { return this.storefront.addresses(req.user.sub); }
  @Post('addresses') createAddress(@Req() req: any, @Body() dto: StorefrontAddressDto) { return this.storefront.createAddress(req.user.sub, dto); }
  @Patch('addresses/:id') updateAddress(@Req() req: any, @Param('id') id: string, @Body() dto: StorefrontAddressDto) { return this.storefront.updateAddress(req.user.sub, id, dto); }
  @Delete('addresses/:id') deleteAddress(@Req() req: any, @Param('id') id: string) { return this.storefront.deleteAddress(req.user.sub, id); }
}

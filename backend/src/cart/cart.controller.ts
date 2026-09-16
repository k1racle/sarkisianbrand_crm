import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('cart')
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  private session(value?: string) { if (!value || !/^[a-zA-Z0-9_-]{16,128}$/.test(value)) throw new BadRequestException('Не найдена сессия корзины'); return value; }

  @Get()
  @ApiOperation({ summary: 'Получить корзину' })
  get(@Headers('x-cart-session') session: string, @Req() req: any) { return this.cart.get(this.session(session), req.user?.sub); }

  @Post('items')
  add(@Headers('x-cart-session') session: string | undefined, @Body() dto: AddCartItemDto, @Req() req: any) { return this.cart.add(this.session(session), dto, req.user?.sub); }

  @Patch('items/:itemId')
  update(@Headers('x-cart-session') session: string | undefined, @Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto, @Req() req: any) { return this.cart.update(this.session(session), itemId, dto, req.user?.sub); }

  @Delete('items/:itemId')
  remove(@Headers('x-cart-session') session: string | undefined, @Param('itemId') itemId: string, @Req() req: any) { return this.cart.remove(this.session(session), itemId, req.user?.sub); }
}

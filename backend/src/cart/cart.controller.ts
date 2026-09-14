import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  private session(value?: string) { return value || 'anonymous-session'; }

  @Get()
  @ApiOperation({ summary: 'Получить корзину' })
  get(@Headers('x-cart-session') session?: string) { return this.cart.get(this.session(session)); }

  @Post('items')
  add(@Headers('x-cart-session') session: string | undefined, @Body() dto: AddCartItemDto) { return this.cart.add(this.session(session), dto); }

  @Patch('items/:itemId')
  update(@Headers('x-cart-session') session: string | undefined, @Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) { return this.cart.update(this.session(session), itemId, dto); }

  @Delete('items/:itemId')
  remove(@Headers('x-cart-session') session: string | undefined, @Param('itemId') itemId: string) { return this.cart.remove(this.session(session), itemId); }
}

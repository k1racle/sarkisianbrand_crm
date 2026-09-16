import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { GiftCardIdDto, IssueGiftCardDto, ListGiftCardsDto, SaveGiftCardProductDto, UpdateGiftCardDto } from './gift-cards.dto';
import { GiftCardsService } from './gift-cards.service';

@ApiTags('gift-cards') @ApiBearerAuth()
@Controller('gift-cards/product') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CONTENT_MANAGER', 'MANAGER_SALES', 'SUPERVISOR')
export class GiftCardProductController {
  constructor(private readonly cards: GiftCardsService) {}
  @Get() get() { return this.cards.getProduct(); }
  @Put() save(@Body() dto: SaveGiftCardProductDto, @Req() req: any) { return this.cards.saveProduct(dto, req.user.sub); }
}

@ApiTags('gift-cards') @ApiBearerAuth()
@Controller('gift-cards') @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
export class GiftCardsController {
  constructor(private readonly cards: GiftCardsService) {}
  @Get() list(@Query() query: ListGiftCardsDto) { return this.cards.list(query); }
  @Post('generate') generate() { return this.cards.generate(); }
  @Post() issue(@Body() dto: IssueGiftCardDto, @Req() req: any) { return this.cards.issue(dto, req.user.sub); }
  @Patch(':id') update(@Param() params: GiftCardIdDto, @Body() dto: UpdateGiftCardDto, @Req() req: any) { return this.cards.update(params.id, dto, req.user.sub); }
  @Post(':id/reveal') reveal(@Param() params: GiftCardIdDto, @Req() req: any) { return this.cards.reveal(params.id, req.user.sub); }
}

import { BadRequestException, Controller, Get, Header, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GiftCardIdDto, ListGiftCardsDto } from './gift-cards.dto';

@ApiTags('gift-cards')
@ApiBearerAuth()
@Controller('gift-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_SALES', 'SUPERVISOR')
export class GiftCardsHistoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/history')
  @Header('Cache-Control', 'private, no-store')
  async history(@Param() params: GiftCardIdDto, @Query() query: ListGiftCardsDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    if (!Number.isInteger(page) || page < 1 || page > 100_000
      || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Некорректные параметры страницы истории');
    }

    // Card summary, count and page must describe the same read-only snapshot.
    return this.prisma.$transaction(async tx => {
      const card = await tx.giftCard.findUnique({
        where: { id: params.id },
        select: {
          id: true, maskedCode: true, faceValue: true, balance: true,
          reserved: true, expiresAt: true, isActive: true,
        },
      });
      if (!card) throw new NotFoundException('Подарочный сертификат не найден');

      const where = { cardId: params.id };
      const total = await tx.giftCardRedemption.count({ where });
      const rows = await tx.giftCardRedemption.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true, amount: true, status: true, createdAt: true,
          appliedAt: true, releasedAt: true,
          order: { select: { orderNumber: true } },
        },
      });

      // Explicit response projection also protects against future expanded DB selects.
      return {
        card: {
          id: card.id, maskedCode: card.maskedCode, faceValue: card.faceValue.toString(),
          balance: card.balance.toString(), reserved: card.reserved.toString(),
          expiresAt: card.expiresAt, isActive: card.isActive,
        },
        items: rows.map(row => ({
          id: row.id, amount: row.amount.toString(), status: row.status,
          createdAt: row.createdAt, appliedAt: row.appliedAt, releasedAt: row.releasedAt,
          orderNumber: row.order.orderNumber,
        })),
        total, page, limit,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}

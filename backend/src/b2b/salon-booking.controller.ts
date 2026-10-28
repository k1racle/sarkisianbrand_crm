import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PublicSalonBookingDto, PublicBookingCancelDto, PublicBookingManageSlotsDto, PublicBookingMoveDto, PublicBookingTokenDto, SalonSlotsDto } from './dto/salon-booking.dto';
import { SalonBookingService } from './salon-booking.service';

@Controller('salon-booking')
@UseGuards(ThrottlerGuard)
export class SalonBookingController {
  constructor(private readonly salon: SalonBookingService) {}

  @Get(':organizationId')
  profile(@Param('organizationId', ParseUUIDPipe) id: string) { return this.salon.publicProfile(id); }
  @Get(':organizationId/logo')
  async logo(@Param('organizationId',ParseUUIDPipe) id:string,@Query('v') version:string,@Res() response:Response) {
    const image=await this.salon.logo(id,version);
    response.setHeader('Content-Type',image.mime);response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Cache-Control','public, max-age=86400');response.send(image.buffer);
  }

  @Get(':organizationId/slots')
  slots(@Param('organizationId', ParseUUIDPipe) id: string, @Query() query: SalonSlotsDto) { return this.salon.slots(id, query); }

  @Post(':organizationId/bookings')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Param('organizationId', ParseUUIDPipe) id: string, @Body() dto: PublicSalonBookingDto) { return this.salon.publicCreate(id, dto); }

  // The capability stays in the POST body, never in URL/query or referrer logs.
  @Post(':organizationId/manage/view')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  view(@Param('organizationId', ParseUUIDPipe) id: string, @Body() dto: PublicBookingTokenDto) { return this.salon.publicManageView(id, dto.token); }

  @Post(':organizationId/manage/slots')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  manageSlots(@Param('organizationId', ParseUUIDPipe) id: string, @Body() dto: PublicBookingManageSlotsDto) { return this.salon.publicManageSlots(id, dto); }

  @Post(':organizationId/manage/cancel')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  cancel(@Param('organizationId', ParseUUIDPipe) id: string, @Body() dto: PublicBookingCancelDto) { return this.salon.publicManageCancel(id, dto); }

  @Post(':organizationId/manage/move')
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  move(@Param('organizationId', ParseUUIDPipe) id: string, @Body() dto: PublicBookingMoveDto) { return this.salon.publicManageMove(id, dto); }
}

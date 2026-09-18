import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PublicSalonBookingDto, SalonSlotsDto } from './dto/salon-booking.dto';
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Param('organizationId', ParseUUIDPipe) id: string, @Body() dto: PublicSalonBookingDto) { return this.salon.publicCreate(id, dto); }
}

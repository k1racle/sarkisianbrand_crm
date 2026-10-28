import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { BusinessRegistrationService } from './business-registration.service';
import { BusinessOwnerRegistrationDto } from './dto/business-registration.dto';

@Controller('business-registration')
@UseGuards(ThrottlerGuard)
export class BusinessRegistrationController {
  constructor(private readonly registration: BusinessRegistrationService) {}
  @Get('terms') terms() { return this.registration.terms(); }
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  register(@Body() dto: BusinessOwnerRegistrationDto, @Req() req: any) { return this.registration.register(dto, { ipAddress: req.ip, userAgent: req.headers['user-agent'] }); }
}

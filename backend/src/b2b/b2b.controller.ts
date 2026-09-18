import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessCompanySettingDto, SalonPresentationDto } from './dto/salon-presentation.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateB2BBookingDto, CreateB2BClientDto, CreateB2BOrderDto, CreateB2BProfileDto, CreateB2BServiceDto, CreateB2BSupportDto, UpdateB2BBookingDto, UpdateB2BClientDto, UpdateB2BServiceDto } from './dto/b2b.dto';
import { B2BService } from './b2b.service';
import { SalonBookingService } from './salon-booking.service';
import { SalonBookingSettingDto } from './dto/salon-booking.dto';
import { B2BBookingRangeDto } from './dto/b2b.dto';

@ApiTags('b2b')
@ApiBearerAuth()
@Controller('b2b')
@UseGuards(JwtAuthGuard)
export class B2BController {
  constructor(private readonly b2b: B2BService, private readonly salon: SalonBookingService) {}

  @Get('booking-settings') settings(@Req() request: any) { return this.salon.settings(request.user.sub); }
  @Patch('booking-settings') saveSettings(@Req() request: any, @Body() dto: SalonBookingSettingDto) { return this.salon.saveSettings(request.user.sub, dto); }
  @Get('salon-presentation') presentation(@Req() request:any) { return this.salon.presentation(request.user.sub); }
  @Patch('salon-presentation') savePresentation(@Req() request:any,@Body() dto:SalonPresentationDto) { return this.salon.savePresentation(request.user.sub,dto); }
  @Post('salon-logo') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:3*1024*1024}}))
  logo(@Req() request:any,@UploadedFile() file:any) { return this.salon.uploadLogo(request.user.sub,file); }
  @Delete('salon-logo') removeLogo(@Req() request:any) { return this.salon.removeLogo(request.user.sub); }

  @Post('profile')
  @ApiOperation({ summary: 'Подать заявку на B2B-профиль' })
  createProfile(@Req() request: any, @Body() dto: CreateB2BProfileDto) { return this.b2b.createProfile(request.user.sub, dto); }

  @Get('profile')
  profile(@Req() request: any) { return this.b2b.profile(request.user.sub); }
  @Patch('company-settings') companySettings(@Req() request:any,@Body() dto:BusinessCompanySettingDto) { return this.b2b.saveCompanySettings(request.user.sub,dto); }

  @Get('catalog')
  @ApiOperation({ summary: 'Каталог с B2B-ценами' })
  catalog(@Req() request: any) { return this.b2b.catalog(request.user.sub); }

  @Get('dashboard') dashboard(@Req() request: any) { return this.b2b.dashboard(request.user.sub); }
  @Get('clients') clients(@Req() request: any, @Query('search') search?: string) { return this.b2b.clients(request.user.sub, search); }
  @Post('clients') createClient(@Req() request: any, @Body() dto: CreateB2BClientDto) { return this.b2b.createClient(request.user.sub, dto); }
  @Patch('clients/:id') updateClient(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateB2BClientDto) { return this.b2b.updateClient(request.user.sub, id, dto); }
  @Get('services') services(@Req() request: any) { return this.b2b.services(request.user.sub); }
  @Post('services') createService(@Req() request: any, @Body() dto: CreateB2BServiceDto) { return this.b2b.createService(request.user.sub, dto); }
  @Patch('services/:id') updateService(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateB2BServiceDto) { return this.b2b.updateService(request.user.sub, id, dto); }
  @Get('bookings') bookings(@Req() request: any, @Query() query: B2BBookingRangeDto) { return this.b2b.bookings(request.user.sub, query.from, query.to); }
  @Post('bookings') createBooking(@Req() request: any, @Body() dto: CreateB2BBookingDto) { return this.b2b.createBooking(request.user.sub, dto); }
  @Patch('bookings/:id') updateBooking(@Req() request: any, @Param('id') id: string, @Body() dto: UpdateB2BBookingDto) { return this.b2b.updateBooking(request.user.sub, id, dto); }
  @Get('orders') orders(@Req() request: any) { return this.b2b.orders(request.user.sub); }
  @Post('orders') createOrder(@Req() request: any, @Body() dto: CreateB2BOrderDto) { return this.b2b.createOrder(request.user.sub, dto); }
  @Post('orders/:id/repeat') repeatOrder(@Req() request: any, @Param('id') id: string) { return this.b2b.repeatOrder(request.user.sub, id); }
  @Get('support') support(@Req() request: any) { return this.b2b.supportTickets(request.user.sub); }
  @Post('support') createSupport(@Req() request: any, @Body() dto: CreateB2BSupportDto) { return this.b2b.createSupportTicket(request.user.sub, dto); }
}

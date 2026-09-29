import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { internalWorkspaceRoles } from '../auth/workspace-role-catalog';
import { CreatePaymentPlanDto, PaymentCalendarQueryDto, SetPlannedPaymentDto, UpdatePaymentPlanDto } from './payment-calendar.dto';
import { PaymentCalendarService } from './payment-calendar.service';
const uuid=new ParseUUIDPipe({version:'4'});
@Controller('crm/payment-calendar') @UseGuards(JwtAuthGuard,RolesGuard) @Roles(...internalWorkspaceRoles) @Permissions('payment_calendar.read')
export class PaymentCalendarController {
  constructor(private readonly calendar:PaymentCalendarService){}
  @Get() @Header('Cache-Control','private, no-store') list(@Req() req:any,@Query() query:PaymentCalendarQueryDto){return this.calendar.list(req.user.sub,query);}
  @Get(':id') @Header('Cache-Control','private, no-store') detail(@Req() req:any,@Param('id',uuid) id:string){return this.calendar.detail(req.user.sub,id);}
  @Post() @Permissions('payment_calendar.read','payment_calendar.write') @Header('Cache-Control','private, no-store') create(@Req() req:any,@Body() dto:CreatePaymentPlanDto){return this.calendar.create(req.user.sub,dto);}
  @Patch(':id') @Permissions('payment_calendar.read','payment_calendar.write') @Header('Cache-Control','private, no-store') update(@Req() req:any,@Param('id',uuid) id:string,@Body() dto:UpdatePaymentPlanDto){return this.calendar.update(req.user.sub,id,dto);}
  @Post(':id/settle') @Permissions('payment_calendar.read','payment_calendar.settle') @Header('Cache-Control','private, no-store') settle(@Req() req:any,@Param('id',uuid) id:string,@Body() dto:SetPlannedPaymentDto){return this.calendar.settle(req.user.sub,id,dto);}
}

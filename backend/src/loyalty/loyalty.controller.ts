import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyOperationDto } from './dto/loyalty.dto';
@ApiTags('loyalty') @ApiBearerAuth() @Controller('loyalty') @UseGuards(JwtAuthGuard)
export class LoyaltyController { constructor(private readonly loyalty:LoyaltyService){} @Get('me') me(@Req() req:any){return this.loyalty.account(req.user.sub)} @Get('users/:userId') user(@Param('userId') id:string){return this.loyalty.byUser(id)} @Post('me/accrual') accrual(@Req() req:any,@Body() dto:LoyaltyOperationDto){return this.loyalty.operation(req.user.sub,dto,'ACCRUAL')} @Post('me/write-off') writeOff(@Req() req:any,@Body() dto:LoyaltyOperationDto){return this.loyalty.operation(req.user.sub,dto,'WRITE_OFF')} }

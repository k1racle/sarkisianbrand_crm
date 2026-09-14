import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateB2BProfileDto } from './dto/b2b.dto';
import { B2BService } from './b2b.service';

@ApiTags('b2b')
@ApiBearerAuth()
@Controller('b2b')
@UseGuards(JwtAuthGuard)
export class B2BController {
  constructor(private readonly b2b: B2BService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Подать заявку на B2B-профиль' })
  createProfile(@Req() request: any, @Body() dto: CreateB2BProfileDto) { return this.b2b.createProfile(request.user.sub, dto); }

  @Get('profile')
  profile(@Req() request: any) { return this.b2b.profile(request.user.sub); }

  @Get('catalog')
  @ApiOperation({ summary: 'Каталог с B2B-ценами' })
  catalog(@Req() request: any) { return this.b2b.catalog(request.user.sub); }
}

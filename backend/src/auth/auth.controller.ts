import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, CompletePasswordResetDto, LoginDto, RefreshTokenDto, RegisterDto, RequestProfileChangeDto, UpdateOwnProfileDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: any) { return this.auth.logout(req.user.sub, req.user.sid); }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Регистрация клиента' })
  register(@Body() dto: RegisterDto, @Req() request: any) { return this.auth.register(dto, this.context(request)); }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход' })
  login(@Body() dto: LoginDto, @Req() request: any) { return this.auth.login(dto, this.context(request)); }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() request: any) { return this.auth.me(request.user.sub); }

  @Get('access')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  access(@Req() request: any) { return this.auth.access(request.user.sub); }

  @Get('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  profile(@Req() request: any) { return this.auth.profile(request.user.sub); }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() request: any, @Body() dto: UpdateOwnProfileDto) { return this.auth.updateProfile(request.user.sub, dto); }

  @Post('profile/change-request')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  requestProfileChange(@Req() request: any, @Body() dto: RequestProfileChangeDto) { return this.auth.requestProfileChange(request.user.sub, dto); }

  @Post('profile/password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(@Req() request: any, @Body() dto: ChangePasswordDto) { return this.auth.changePassword(request.user.sub, dto); }

  @Post('profile/avatar')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  uploadAvatar(@Req() request: any, @UploadedFile() file: any) { return this.auth.saveAvatar(request.user.sub, file); }

  @Delete('profile/avatar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  removeAvatar(@Req() request: any) { return this.auth.removeAvatar(request.user.sub); }

  @Delete('profile/sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  revokeSession(@Req() request: any, @Param('id') id: string) { return this.auth.revokeSession(request.user.sub, id); }

  @Get('avatar/:userId')
  async avatar(@Param('userId') userId: string, @Res() response: Response) {
    const image = await this.auth.avatar(userId);
    response.setHeader('Content-Type', image.mime);
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.send(image.buffer);
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() request: any) { return this.auth.refresh(dto, this.context(request)); }

  @Post('password-reset/complete')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  completePasswordReset(@Body() dto: CompletePasswordResetDto) { return this.auth.completePasswordReset(dto); }

  private context(request: any) {
    return { userAgent: request.headers?.['user-agent'], ipAddress: request.ip || request.socket?.remoteAddress };
  }
}

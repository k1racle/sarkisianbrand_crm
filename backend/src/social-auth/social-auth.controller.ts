import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SocialAuthService } from './social-auth.service';

@ApiTags('social-auth')
@Controller('auth/social')
export class SocialAuthController {
  constructor(private readonly social: SocialAuthService) {}
  @Get(':provider/start') start(@Param('provider') provider: string, @Query('returnUrl') returnUrl?: string) { return this.social.start(provider, returnUrl); }
  @Get(':provider/callback')
  async callback(@Param('provider') provider: string, @Query() query: Record<string, string>, @Res() response: Response) {
    try {
      const result = await this.social.callback(provider, query);
      response.redirect(`${this.social.appUrl()}/auth/callback?ticket=${encodeURIComponent(result.ticket)}&return=${encodeURIComponent(result.returnUrl)}`);
    } catch (error: any) {
      response.redirect(`${this.social.appUrl()}/login?social_error=${encodeURIComponent(error?.message || 'Не удалось выполнить вход')}`);
    }
  }
  @Post('exchange') exchange(@Body('ticket') ticket: string, @Req() req: any) { return this.social.exchange(ticket, { userAgent: req.headers?.['user-agent'], ipAddress: req.ip || req.socket?.remoteAddress }); }
}

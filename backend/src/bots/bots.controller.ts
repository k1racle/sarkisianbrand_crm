import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BotsService } from './bots.service';

@ApiTags('bot-webhooks')
@Controller('bots/webhooks')
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Post(':provider/:audience')
  webhook(
    @Param('provider') provider: string,
    @Param('audience') audience: string,
    @Headers() headers: Record<string, any>,
    @Body() payload: any,
  ) {
    return this.bots.accept(provider, audience, headers, payload);
  }
}

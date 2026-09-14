import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @ApiOperation({ summary: 'XML-карта публичного каталога' })
  sitemap() { return this.seo.sitemap(); }

  @Get('robots')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots() { return this.seo.robots(); }
}

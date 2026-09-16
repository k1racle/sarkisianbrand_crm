import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=60, must-revalidate')
  @ApiOperation({ summary: 'XML-карта опубликованных страниц сайта' })
  sitemap() { return this.seo.sitemap(); }

  @Get('robots')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=60, must-revalidate')
  robots() { return this.seo.robots(); }
}

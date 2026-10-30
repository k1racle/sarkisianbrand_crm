import { Controller, Get, Header, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LmsCertificateService } from './lms-certificate.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });
@Controller('lms/certificates')
@UseGuards(JwtAuthGuard)
export class LmsCertificateController {
  constructor(private readonly certificates: LmsCertificateService) {}
  @Get('my') @Header('Cache-Control', 'private, no-store') list(@Req() req: any) { return this.certificates.list(req.user); }
  @Get('course/:courseId') @Header('Cache-Control', 'private, no-store') get(@Req() req: any, @Param('courseId', uuid()) courseId: string) { return this.certificates.get(req.user, courseId); }
  @Post('course/:courseId') @Header('Cache-Control', 'private, no-store') issue(@Req() req: any, @Param('courseId', uuid()) courseId: string) { return this.certificates.issue(req.user, courseId); }
  @Get(':id/file') async file(@Req() req: any, @Param('id', uuid()) id: string, @Res() res: Response) {
    const pdf = await this.certificates.pdf(req.user, id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': String(pdf.length), 'Content-Disposition': 'attachment; filename="certificate.pdf"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(pdf);
  }
}

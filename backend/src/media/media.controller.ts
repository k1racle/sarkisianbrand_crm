import { Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListMediaDto, MediaFilenameDto, MEDIA_INTERNAL_ROLES, MEDIA_MAX_BYTES } from './media.dto';
import { MediaService } from './media.service';

@ApiTags('media') @ApiBearerAuth()
@Controller('media') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...MEDIA_INTERNAL_ROLES)
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get() @Permissions('media.read') list(@Query() query: ListMediaDto) { return this.media.list(query); }
  @Post('upload') @Permissions('media.write') @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MEDIA_MAX_BYTES, files: 1, fields: 0 } }))
  upload(@UploadedFile() file: any, @Req() request: any) { return this.media.upload(file, request.user.sub); }
  @Post('import-existing') @Permissions('media.write') importExisting(@Req() request: any) { return this.media.importExisting(request.user.sub); }
}

// Only immutable generated filenames known to the DB. Listing/upload/import remain private.
@ApiTags('media') @Controller('media/files')
export class MediaFilesController {
  constructor(private readonly media: MediaService) {}
  @Get(':filename') async file(@Param() params: MediaFilenameDto, @Res() response: Response) {
    const image = await this.media.file(params.filename);
    response.setHeader('Content-Type', image.mime);
    response.setHeader('Content-Length', image.buffer.length);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    // Public raster assets must embed on the separately hosted storefront/admin.
    // Override Helmet's same-origin default only after validating this image.
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('Content-Disposition', 'inline');
    response.send(image.buffer);
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { LmsAdminController, LmsPublicController, LmsStudentController } from './lms.controller';
import { LmsService } from './lms.service';
import { LmsPurchaseService } from './lms-purchase.service';
import { LmsLiveModule } from '../lms-live/lms-live.module';
import { CourseAssetAdminController, CourseAssetMediaController, CourseAssetStudentController } from './course-assets.controller';
import { CourseAssetService } from './course-assets.service';
import { CourseCoverController } from './course-cover.controller';
import { MediaModule } from '../media/media.module';
import { LmsQuizAdminController, LmsQuizStudentController } from './lms-quiz.controller';
import { LmsQuizService } from './lms-quiz.service';
import { LmsCertificateController } from './lms-certificate.controller';
import { LmsCertificateService } from './lms-certificate.service';

@Module({ imports: [AuthModule, LmsLiveModule, MediaModule], controllers: [LmsAdminController,LmsPublicController,LmsStudentController,CourseAssetAdminController,CourseAssetStudentController,CourseAssetMediaController,CourseCoverController,LmsQuizAdminController,LmsQuizStudentController,LmsCertificateController], providers: [LmsService,LmsPurchaseService,CourseAssetService,LmsQuizService,LmsCertificateService,RolesGuard] })
export class LmsModule {}

import { Global, Module } from '@nestjs/common';
import { BackgroundJobsService } from './background-jobs.service';
import { AuthModule } from '../auth/auth.module';
import { JobPolicy } from './job-policy';

@Global()
@Module({ imports: [AuthModule], providers: [BackgroundJobsService, JobPolicy], exports: [BackgroundJobsService] })
export class BackgroundJobsModule {}

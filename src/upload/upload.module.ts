
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { AwsS3Service } from '../common/services/aws-s3.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [UploadController],
  providers: [AwsS3Service],
  exports: [AwsS3Service],
})
export class UploadModule {}
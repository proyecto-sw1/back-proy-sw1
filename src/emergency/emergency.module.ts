import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyService } from './emergency.service';
import { EmergencyController } from './emergency.controller';
import { EmergencyContact } from './entities/emergency-contact.entity';
import { EmergencyAlert } from './entities/emergency-alert.entity';
import { User } from 'src/users/entities/user.entity';
import { AwsS3Service } from 'src/common/services/aws-s3.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { EmergencyNotificationService } from 'src/common/services/emergency-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmergencyContact, EmergencyAlert, User]),
    NotificationsModule,
  ],
  controllers: [EmergencyController],
  providers: [EmergencyService, AwsS3Service, EmergencyNotificationService],
  exports: [EmergencyService, EmergencyNotificationService],
})
export class EmergencyModule {} 
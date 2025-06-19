import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicacionesService } from './publicaciones.service';
import { PublicacionesController } from './publicaciones.controller';
import { PublicacionEntity } from './entities/publicacion.entity';
import { User } from '../users/entities/user.entity';
import { IncidenteMapaEntity } from '../incidentes/entities/incidente.entity';
import { AuthModule } from '../auth/auth.module';
import { ModeracionIAService } from '../common/services/moderacion-ia.service';
import { UploadModule } from '../upload/upload.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicacionEntity, User, IncidenteMapaEntity]),
    AuthModule,
    UploadModule,
    NotificationsModule
  ],
  controllers: [PublicacionesController],
  providers: [PublicacionesService, ModeracionIAService],
  exports: [PublicacionesService, ModeracionIAService, TypeOrmModule]
})
export class PublicacionesModule {}
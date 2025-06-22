import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComentariosService } from './comentarios.service';
import {
  ComentariosController,
  PublicacionComentariosController,
} from './comentarios.controller';
import { ComentarioEntity } from './entities/comentario.entity';
import { User } from '../users/entities/user.entity';
import { PublicacionEntity } from '../publicaciones/entities/publicacion.entity';
import { AuthModule } from '../auth/auth.module';
import { ModeracionIAService } from '../common/services/moderacion-ia.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComentarioEntity, User, PublicacionEntity]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ComentariosController, PublicacionComentariosController],
  providers: [ComentariosService, ModeracionIAService],
  exports: [ComentariosService, ModeracionIAService, TypeOrmModule],
})
export class ComentariosModule {}

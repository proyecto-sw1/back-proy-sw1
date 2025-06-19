import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentesService } from './incidentes.service';
import { IncidentesController } from './incidentes.controller';
import { IncidenteMapaEntity } from './entities/incidente.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IncidenteMapaEntity, User]),
    AuthModule
  ],
  controllers: [IncidentesController],
  providers: [IncidentesService],
  exports: [IncidentesService, TypeOrmModule]
})
export class IncidentesModule {}
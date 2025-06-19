import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consulta } from './entities/consulta.entity';
import { User } from '../users/entities/user.entity';
import { ConsultasService } from './consultas.service';
import { ConsultasController } from './consultas.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consulta, User]),
    AuthModule // Para poder usar AuthGuard
  ],
  providers: [ConsultasService],
  controllers: [ConsultasController],
  exports: [ConsultasService]
})
export class ConsultasModule {}
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Consulta } from './entities/consulta.entity';
import { Repository } from 'typeorm';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ConsultasService {
  constructor(
    @InjectRepository(Consulta)
    private readonly consultaRepo: Repository<Consulta>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async crearConsulta(dto: CreateConsultaDto, usuarioId: number) {
    console.log('DTO recibido:', dto);
    console.log('Usuario ID:', usuarioId);

    // Buscar el usuario
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const nuevaConsulta = this.consultaRepo.create({
      ...dto,
      usuario,
    });

    const consultaGuardada = await this.consultaRepo.save(nuevaConsulta);
    
    // Retornar sin información sensible del usuario
    return {
      id_consulta: consultaGuardada.id_consulta,
      tipo_consulta: consultaGuardada.tipo_consulta,
      contenido: consultaGuardada.contenido,
      respuesta: consultaGuardada.respuesta,
      fecha_consulta: consultaGuardada.fecha_consulta,
      usuario: {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email
      }
    };
  }

  async obtenerHistorial(usuarioId: number) {
    const consultas = await this.consultaRepo.find({
      where: { usuario: { id: usuarioId } },
      order: { fecha_consulta: 'DESC' },
      relations: ['usuario'],
      select: {
        id_consulta: true,
        tipo_consulta: true,
        contenido: true,
        respuesta: true,
        fecha_consulta: true,
        usuario: {
          id: true,
          name: true,
          email: true
        }
      }
    });

    return {
      total: consultas.length,
      consultas
    };
  }

  async obtenerConsultaPorId(consultaId: number, usuarioId: number) {
    const consulta = await this.consultaRepo.findOne({
      where: { 
        id_consulta: consultaId,
        usuario: { id: usuarioId }
      },
      relations: ['usuario'],
      select: {
        id_consulta: true,
        tipo_consulta: true,
        contenido: true,
        respuesta: true,
        fecha_consulta: true,
        usuario: {
          id: true,
          name: true,
          email: true
        }
      }
    });

    if (!consulta) {
      throw new NotFoundException('Consulta no encontrada o no pertenece al usuario');
    }

    return consulta;
  }
}
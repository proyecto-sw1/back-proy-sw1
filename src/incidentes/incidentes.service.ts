
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateIncidenteDto } from './dto/create-incidente.dto';
import { UpdateIncidenteDto } from './dto/update-incidente.dto';
import { IncidenteResponseDto } from './dto/incidente-response.dto';
import { IncidenteMapaEntity } from './entities/incidente.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class IncidentesService {
  constructor(
    @InjectRepository(IncidenteMapaEntity)
    private readonly incidenteRepo: Repository<IncidenteMapaEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateIncidenteDto, usuarioId: number): Promise<IncidenteResponseDto> {
    console.log('🔵 create() - DTO recibido:', dto);
    console.log('🔵 create() - Usuario ID:', usuarioId);

    // Validar usuario
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Crear incidente
    const nuevoIncidente = this.incidenteRepo.create({
      tipo_incidente: dto.tipo_incidente.trim(),
      latitud_longitud: dto.latitud_longitud.trim(),
      usuario,
    });

    console.log('🔵 create() - Incidente creado en memoria:', {
      tipo_incidente: nuevoIncidente.tipo_incidente,
      latitud_longitud: nuevoIncidente.latitud_longitud,
    });

    const incidenteGuardado = await this.incidenteRepo.save(nuevoIncidente);
    console.log('🔵 create() - Incidente guardado en BD con ID:', incidenteGuardado.id_incidente);

    return this.mapearAResponse(incidenteGuardado);
  }

  async findAll(page: number = 1, limit: number = 20): Promise<{ incidentes: IncidenteResponseDto[]; total: number }> {
    console.log('🔍 findAll() - Obteniendo incidentes - página:', page, 'límite:', limit);

    // Limitar el límite máximo
    const maxLimit = Math.min(limit, 50);

    const [incidentes, total] = await this.incidenteRepo.findAndCount({
      relations: ['usuario', 'publicaciones'],
      order: { fecha_incidente: 'DESC' },
      skip: (page - 1) * maxLimit,
      take: maxLimit,
    });

    console.log('🔍 findAll() - Encontrados:', total, 'incidentes');

    return {
      incidentes: incidentes.map((incidente) => this.mapearAResponse(incidente)),
      total,
    };
  }

  async findOne(id: number): Promise<IncidenteResponseDto> {
    console.log('🔍 findOne() - Buscando incidente con ID:', id);

    const incidente = await this.incidenteRepo.findOne({
      where: { id_incidente: id },
      relations: ['usuario', 'publicaciones', 'publicaciones.usuario'],
    });

    if (!incidente) {
      throw new NotFoundException('Incidente no encontrado');
    }

    console.log('🔍 findOne() - Incidente encontrado:', incidente.tipo_incidente);

    return this.mapearAResponse(incidente, true); // true para incluir publicaciones
  }

  async findByUser(usuarioId: number): Promise<IncidenteResponseDto[]> {
    console.log('🔍 findByUser() - Buscando incidentes del usuario:', usuarioId);

    const incidentes = await this.incidenteRepo.find({
      where: { usuario: { id: usuarioId } },
      relations: ['usuario', 'publicaciones'],
      order: { fecha_incidente: 'DESC' },
    });

    console.log('🔍 findByUser() - Encontrados:', incidentes.length, 'incidentes del usuario');

    return incidentes.map((incidente) => this.mapearAResponse(incidente));
  }

  async findByArea(latMin: number, latMax: number, lngMin: number, lngMax: number): Promise<IncidenteResponseDto[]> {
    console.log('🔍 findByArea() - Buscando incidentes en área:', { latMin, latMax, lngMin, lngMax });

    // Buscar incidentes en el área especificada
    const incidentes = await this.incidenteRepo
      .createQueryBuilder('incidente')
      .leftJoinAndSelect('incidente.usuario', 'usuario')
      .leftJoinAndSelect('incidente.publicaciones', 'publicaciones')
      .where(
        `CAST(SUBSTRING_INDEX(incidente.latitud_longitud, ',', 1) AS DECIMAL(10,6)) BETWEEN :latMin AND :latMax`,
        { latMin, latMax }
      )
      .andWhere(
        `CAST(SUBSTRING_INDEX(incidente.latitud_longitud, ',', -1) AS DECIMAL(10,6)) BETWEEN :lngMin AND :lngMax`,
        { lngMin, lngMax }
      )
      .orderBy('incidente.fecha_incidente', 'DESC')
      .getMany();

    console.log('🔍 findByArea() - Encontrados:', incidentes.length, 'incidentes en el área');

    return incidentes.map((incidente) => this.mapearAResponse(incidente));
  }

  async update(id: number, dto: UpdateIncidenteDto, usuarioId: number): Promise<IncidenteResponseDto> {
    console.log('🔄 update() - Actualizando incidente:', id, 'con datos:', dto);

    const incidente = await this.incidenteRepo.findOne({
      where: { id_incidente: id },
      relations: ['usuario'],
    });

    if (!incidente) {
      throw new NotFoundException('Incidente no encontrado');
    }

    // Solo el autor puede editar su incidente
    if (incidente.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para editar este incidente');
    }

    // Actualizar campos si están presentes
    if (dto.tipo_incidente) {
      incidente.tipo_incidente = dto.tipo_incidente.trim();
    }
    if (dto.latitud_longitud) {
      incidente.latitud_longitud = dto.latitud_longitud.trim();
    }

    const incidenteActualizado = await this.incidenteRepo.save(incidente);
    console.log('🔄 update() - Incidente actualizado exitosamente');

    return this.mapearAResponse(incidenteActualizado);
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    console.log('🗑️ remove() - Eliminando incidente:', id);

    const incidente = await this.incidenteRepo.findOne({
      where: { id_incidente: id },
      relations: ['usuario', 'publicaciones'],
    });

    if (!incidente) {
      throw new NotFoundException('Incidente no encontrado');
    }

    // Solo el autor puede eliminar su incidente
    if (incidente.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para eliminar este incidente');
    }

    // Verificar si tiene publicaciones asociadas
    if (incidente.publicaciones && incidente.publicaciones.length > 0) {
      throw new ForbiddenException(
        'No se puede eliminar el incidente porque tiene publicaciones asociadas'
      );
    }

    await this.incidenteRepo.remove(incidente);
    console.log('🗑️ remove() - Incidente eliminado exitosamente');
  }

  private mapearAResponse(incidente: IncidenteMapaEntity, incluirPublicaciones: boolean = false): IncidenteResponseDto {
    const response: IncidenteResponseDto = {
      id_incidente: incidente.id_incidente,
      tipo_incidente: incidente.tipo_incidente,
      latitud_longitud: incidente.latitud_longitud,
      fecha_incidente: incidente.fecha_incidente,
      usuario: {
        id: incidente.usuario.id,
        name: incidente.usuario.name,
        email: incidente.usuario.email,
      },
      total_publicaciones: incidente.publicaciones?.length || 0,
    };

    // Incluir publicaciones si se solicita
    if (incluirPublicaciones && incidente.publicaciones) {
      response.publicaciones = incidente.publicaciones.map((pub) => ({
        id_publicacion: pub.id_publicacion,
        contenido_texto: pub.contenido_texto,
        ruta_media: pub.ruta_media,
        estado_revision: pub.estado_revision,
        fecha_publicacion: pub.fecha_publicacion,
        usuario: pub.usuario ? {
          id: pub.usuario.id,
          name: pub.usuario.name,
        } : null,
      }));
    }

    return response;
  }
}
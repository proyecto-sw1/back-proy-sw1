// src/publicaciones/publicaciones.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicacionEntity } from './entities/publicacion.entity';
import { User } from '../users/entities/user.entity';
import { IncidenteMapaEntity } from '../incidentes/entities/incidente.entity';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { PublicacionResponseDto } from './dto/publicacion-response.dto';
import { ModeracionIAService } from '../common/services/moderacion-ia.service';
import { AwsS3Service } from '../common/services/aws-s3.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectRepository(PublicacionEntity)
    private readonly publicacionRepo: Repository<PublicacionEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(IncidenteMapaEntity)
    private readonly incidenteRepo: Repository<IncidenteMapaEntity>,
    private readonly moderacionIAService: ModeracionIAService,
    private readonly awsS3Service: AwsS3Service,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Crear publicación - maneja tanto texto solo como texto + archivo
   */
  async create(
    dto: CreatePublicacionDto, 
    file: Express.Multer.File | null, 
    usuarioId: number
  ): Promise<PublicacionResponseDto> {
    console.log('🔵 create() - DTO recibido:', dto);
    console.log('🔵 create() - Usuario ID:', usuarioId);
    console.log('🔵 create() - Archivo:', file ? {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    } : 'No file');

    // Validar que haya al menos contenido de texto o archivo
    if (!dto.contenido_texto && !file) {
      throw new BadRequestException('Debe proporcionar contenido_texto o un archivo');
    }

    const { usuario, incidente } = await this.validateUserAndIncident(usuarioId, dto.id_incidente);

    // Subir archivo a S3 si existe
    let rutaS3 = null;
    if (file) {
      try {
        console.log('🔵 create() - Iniciando subida a S3...');
        rutaS3 = await this.awsS3Service.uploadFile(file, 'publicaciones');
        console.log('🔵 create() - Archivo subido a S3 exitosamente:', rutaS3);
      } catch (error) {
        console.error('❌ create() - Error subiendo archivo a S3:', error);
        throw new BadRequestException(`Error al subir el archivo: ${error.message}`);
      }
    }

    // Crear publicación con estado pendiente
    const nuevaPublicacion = this.publicacionRepo.create({
      contenido_texto: dto.contenido_texto,
      ruta_media: rutaS3 || dto.ruta_media, // Usar S3 si existe, sino la URL externa
      usuario,
      incidente,
      estado_revision: 'pendiente',
    });

    console.log('🔵 create() - Publicación creada en memoria:', {
      contenido_texto: nuevaPublicacion.contenido_texto,
      ruta_media: nuevaPublicacion.ruta_media,
      estado_revision: nuevaPublicacion.estado_revision
    });

    const publicacionGuardada = await this.publicacionRepo.save(nuevaPublicacion);
    console.log('🔵 create() - Publicación guardada en BD con ID:', publicacionGuardada.id_publicacion);

    // Procesar moderación IA de forma asíncrona
    this.procesarModeracionIA(
      publicacionGuardada.id_publicacion, 
      dto.contenido_texto, 
      nuevaPublicacion.ruta_media
    );

    return this.mapearAResponse(publicacionGuardada);
  }

  async findAll(page: number = 1, limit: number = 10) {
    // Limitar el límite máximo
    const maxLimit = Math.min(limit, 50);
    
    const [publicaciones, total] = await this.publicacionRepo.findAndCount({
      where: { estado_revision: 'aprobado' },
      relations: ['usuario', 'incidente', 'comentarios'],
      order: { fecha_publicacion: 'DESC' },
      skip: (page - 1) * maxLimit,
      take: maxLimit,
    });

    const totalPages = Math.ceil(total / maxLimit);

    return {
      publicaciones: publicaciones.map(pub => this.mapearAResponse(pub)),
      total,
      page,
      limit: maxLimit,
      totalPages
    };
  }

  async findOne(id: number): Promise<PublicacionResponseDto> {
    const publicacion = await this.publicacionRepo.findOne({
      where: { 
        id_publicacion: id, 
        estado_revision: 'aprobado' 
      },
      relations: ['usuario', 'incidente', 'comentarios'],
    });

    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada o no aprobada');
    }

    return this.mapearAResponse(publicacion);
  }

  async findByUser(usuarioId: number): Promise<PublicacionResponseDto[]> {
    const publicaciones = await this.publicacionRepo.find({
      where: { usuario: { id: usuarioId } },
      relations: ['usuario', 'incidente', 'comentarios'],
      order: { fecha_publicacion: 'DESC' },
    });

    return publicaciones.map(pub => this.mapearAResponse(pub));
  }

  async findByIncidente(incidenteId: number): Promise<PublicacionResponseDto[]> {
    const publicaciones = await this.publicacionRepo.find({
      where: { 
        incidente: { id_incidente: incidenteId },
        estado_revision: 'aprobado'
      },
      relations: ['usuario', 'incidente', 'comentarios'],
      order: { fecha_publicacion: 'DESC' },
    });

    return publicaciones.map(pub => this.mapearAResponse(pub));
  }

  /**
   * Validar usuario e incidente
   */
  private async validateUserAndIncident(usuarioId: number, incidenteId?: number) {
    console.log('🔍 validateUserAndIncident() - Validando usuario:', usuarioId, 'incidente:', incidenteId);
    
    // Validar usuario
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      console.log('❌ validateUserAndIncident() - Usuario no encontrado:', usuarioId);
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar incidente si se proporciona
    let incidente = null;
    if (incidenteId) {
      incidente = await this.incidenteRepo.findOne({ 
        where: { id_incidente: incidenteId } 
      });
      if (!incidente) {
        console.log('❌ validateUserAndIncident() - Incidente no encontrado:', incidenteId);
        throw new NotFoundException('Incidente no encontrado');
      }
    }

    console.log('✅ validateUserAndIncident() - Validación exitosa');
    return { usuario, incidente };
  }

  /**
   * Proceso asíncrono de moderación IA
   */
  private async procesarModeracionIA(publicacionId: number, contenidoTexto?: string, rutaMedia?: string): Promise<void> {
    try {
      console.log(`🤖 procesarModeracionIA() - Iniciando moderación IA para publicación ${publicacionId}`);
      
      const resultado = await this.moderacionIAService.revisarPublicacion(contenidoTexto, rutaMedia);
      
      // Actualizar estado en BD
      await this.publicacionRepo.update(publicacionId, {
        estado_revision: resultado
      });

      console.log(`🤖 procesarModeracionIA() - Publicación ${publicacionId} ${resultado} por IA`);
      
      // Emitir notificación WebSocket al autor
      const publicacion = await this.publicacionRepo.findOne({
        where: { id_publicacion: publicacionId },
        relations: ['usuario']
      });
      
      if (publicacion) {
        await this.notificationsGateway.notificarEstadoPublicacion(
          publicacionId,
          publicacion.usuario.id,
          resultado
        );
      }
      
    } catch (error) {
      console.error(`❌ procesarModeracionIA() - Error en moderación IA para publicación ${publicacionId}:`, error);
      
      // En caso de error, marcar como rechazado por seguridad
      await this.publicacionRepo.update(publicacionId, {
        estado_revision: 'rechazado'
      });

      // Si había archivo S3, eliminar por limpieza (opcional)
      if (rutaMedia && rutaMedia.includes('s3.amazonaws.com')) {
        try {
          await this.awsS3Service.deleteFile(rutaMedia);
          console.log(`🗑️ procesarModeracionIA() - Archivo S3 eliminado por rechazo: ${rutaMedia}`);
        } catch (deleteError) {
          console.error('❌ procesarModeracionIA() - Error eliminando archivo S3:', deleteError);
        }
      }
    }
  }

  private mapearAResponse(publicacion: PublicacionEntity): PublicacionResponseDto {
    return {
      id_publicacion: publicacion.id_publicacion,
      contenido_texto: publicacion.contenido_texto,
      ruta_media: publicacion.ruta_media,
      estado_revision: publicacion.estado_revision,
      fecha_publicacion: publicacion.fecha_publicacion,
      fecha_actualizacion: publicacion.fecha_actualizacion,
      usuario: {
        id: publicacion.usuario.id,
        name: publicacion.usuario.name,
        email: publicacion.usuario.email,
      },
      incidente: publicacion.incidente ? {
        id_incidente: publicacion.incidente.id_incidente,
        tipo_incidente: publicacion.incidente.tipo_incidente,
        latitud_longitud: publicacion.incidente.latitud_longitud,
      } : undefined,
      total_comentarios: publicacion.comentarios?.length || 0,
    };
  }
}
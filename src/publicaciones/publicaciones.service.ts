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
   * Crear publicación sin archivo (solo texto o URL externa)
   */
  async create(dto: CreatePublicacionDto, usuarioId: number): Promise<PublicacionResponseDto> {
    // Validar que haya contenido
    if (!dto.contenido_texto && !dto.ruta_media) {
      throw new BadRequestException('Debe proporcionar contenido_texto o ruta_media');
    }

    const { usuario, incidente } = await this.validateUserAndIncident(usuarioId, dto.id_incidente);

    // Crear publicación con estado pendiente
    const nuevaPublicacion = this.publicacionRepo.create({
      contenido_texto: dto.contenido_texto,
      ruta_media: dto.ruta_media,
      usuario,
      incidente,
      estado_revision: 'pendiente',
    });

    const publicacionGuardada = await this.publicacionRepo.save(nuevaPublicacion);

    // Procesar moderación IA de forma asíncrona
    this.procesarModeracionIA(publicacionGuardada.id_publicacion, dto.contenido_texto, dto.ruta_media);

    return this.mapearAResponse(publicacionGuardada);
  }

  /**
   * Crear publicación con archivo - Sube a S3 automáticamente
   */
  async createWithFile(
    dto: CreatePublicacionDto, 
    file: Express.Multer.File, 
    usuarioId: number
  ): Promise<PublicacionResponseDto> {
    // Validar que al menos haya texto o archivo
    if (!dto.contenido_texto && !file) {
      throw new BadRequestException('Debe proporcionar contenido_texto o un archivo');
    }

    const { usuario, incidente } = await this.validateUserAndIncident(usuarioId, dto.id_incidente);

    // Subir archivo a S3 si existe
    let rutaS3 = null;
    if (file) {
      try {
        rutaS3 = await this.awsS3Service.uploadFile(file, 'publicaciones');
        console.log(`Archivo subido a S3: ${rutaS3}`);
      } catch (error) {
        console.error('Error subiendo archivo a S3:', error);
        throw new BadRequestException('Error al subir el archivo');
      }
    }

    // Crear publicación con la ruta de S3
    const nuevaPublicacion = this.publicacionRepo.create({
      contenido_texto: dto.contenido_texto,
      ruta_media: rutaS3, // ← URL completa del bucket S3
      usuario,
      incidente,
      estado_revision: 'pendiente',
    });

    const publicacionGuardada = await this.publicacionRepo.save(nuevaPublicacion);

    // Procesar moderación IA de forma asíncrona
    this.procesarModeracionIA(publicacionGuardada.id_publicacion, dto.contenido_texto, rutaS3);

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
    // Validar usuario
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar incidente si se proporciona
    let incidente = null;
    if (incidenteId) {
      incidente = await this.incidenteRepo.findOne({ 
        where: { id_incidente: incidenteId } 
      });
      if (!incidente) {
        throw new NotFoundException('Incidente no encontrado');
      }
    }

    return { usuario, incidente };
  }

  /**
   * Proceso asíncrono de moderación IA
   */
  private async procesarModeracionIA(publicacionId: number, contenidoTexto?: string, rutaMedia?: string): Promise<void> {
    try {
      console.log(`Iniciando moderación IA para publicación ${publicacionId}`);
      
      const resultado = await this.moderacionIAService.revisarPublicacion(contenidoTexto, rutaMedia);
      
      // Actualizar estado en BD
      await this.publicacionRepo.update(publicacionId, {
        estado_revision: resultado
      });

      console.log(`Publicación ${publicacionId} ${resultado} por IA`);
      
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
      console.error(`Error en moderación IA para publicación ${publicacionId}:`, error);
      
      // En caso de error, marcar como rechazado por seguridad
      await this.publicacionRepo.update(publicacionId, {
        estado_revision: 'rechazado'
      });

      // Si había archivo S3, eliminar por limpieza (opcional)
      if (rutaMedia && rutaMedia.includes('s3.amazonaws.com')) {
        try {
          await this.awsS3Service.deleteFile(rutaMedia);
          console.log(`Archivo S3 eliminado por rechazo: ${rutaMedia}`);
        } catch (deleteError) {
          console.error('Error eliminando archivo S3:', deleteError);
        }
      }
    }
  }

  private mapearAResponse(publicacion: PublicacionEntity): PublicacionResponseDto {
    return {
      id_publicacion: publicacion.id_publicacion,
      contenido_texto: publicacion.contenido_texto,
      ruta_media: publicacion.ruta_media, // ← URL completa del S3 bucket
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
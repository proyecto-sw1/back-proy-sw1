// src/comentarios/comentarios.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComentarioEntity } from './entities/comentario.entity';
import { User } from '../users/entities/user.entity';
import { PublicacionEntity } from '../publicaciones/entities/publicacion.entity';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { ComentarioResponseDto } from './dto/comentario-response.dto';
import { ModeracionIAService } from '../common/services/moderacion-ia.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectRepository(ComentarioEntity)
    private readonly comentarioRepo: Repository<ComentarioEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PublicacionEntity)
    private readonly publicacionRepo: Repository<PublicacionEntity>,
    private readonly moderacionIAService: ModeracionIAService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(dto: CreateComentarioDto, usuarioId: number): Promise<ComentarioResponseDto> {
    // Validar usuario
    const usuario = await this.userRepo.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let publicacion: PublicacionEntity;
    let comentarioPadre: ComentarioEntity = null;

    // Determinar si es comentario a publicación o respuesta a comentario
    if (dto.id_comentario_padre) {
      // Es respuesta a otro comentario
      comentarioPadre = await this.comentarioRepo.findOne({
        where: { 
          id_comentario: dto.id_comentario_padre,
          estado_revision: 'aprobado' // Solo se puede responder a comentarios aprobados
        },
        relations: ['publicacion', 'publicacion.usuario']
      });

      if (!comentarioPadre) {
        throw new NotFoundException('Comentario padre no encontrado o no disponible');
      }

      publicacion = comentarioPadre.publicacion;

      // Verificar que no esté respondiendo a su propio comentario
      if (comentarioPadre.usuario.id === usuarioId) {
        throw new BadRequestException('No puedes responder a tu propio comentario');
      }

    } else if (dto.id_publicacion) {
      // Es comentario directo a publicación
      publicacion = await this.publicacionRepo.findOne({
        where: { 
          id_publicacion: dto.id_publicacion,
          estado_revision: 'aprobado'
        },
        relations: ['usuario']
      });

      if (!publicacion) {
        throw new NotFoundException('Publicación no encontrada o no disponible para comentarios');
      }

      // Verificar que no esté comentando su propia publicación
      if (publicacion.usuario.id === usuarioId) {
        throw new BadRequestException('No puedes comentar tu propia publicación');
      }

    } else {
      throw new BadRequestException('Debe proporcionar id_publicacion o id_comentario_padre');
    }

    // Crear comentario con estado pendiente
    const nuevoComentario = this.comentarioRepo.create({
      contenido_texto: dto.contenido_texto.trim(),
      usuario,
      publicacion,
      comentario_padre: comentarioPadre,
      estado_revision: 'pendiente',
    });

    const comentarioGuardado = await this.comentarioRepo.save(nuevoComentario);

    // Enviar notificación inmediata al destinatario
    if (comentarioPadre) {
      // Es respuesta a comentario - notificar al autor del comentario padre
      await this.notificationsGateway.notificarNuevaRespuesta(
        comentarioPadre.id_comentario,
        comentarioPadre.usuario.id,
        this.mapearAResponse(comentarioGuardado)
      );
    } else {
      // Es comentario a publicación - notificar al autor de la publicación
      await this.notificationsGateway.notificarNuevoComentario(
        publicacion.id_publicacion,
        publicacion.usuario.id,
        this.mapearAResponse(comentarioGuardado)
      );
    }

    // Procesar moderación IA de forma asíncrona
    this.procesarModeracionIA(comentarioGuardado.id_comentario, dto.contenido_texto);

    return this.mapearAResponse(comentarioGuardado);
  }

  async findByPublicacion(publicacionId: number, page: number = 1, limit: number = 20): Promise<{ comentarios: ComentarioResponseDto[], total: number }> {
    // Verificar que la publicación existe y está aprobada
    const publicacion = await this.publicacionRepo.findOne({
      where: { 
        id_publicacion: publicacionId,
        estado_revision: 'aprobado'
      }
    });

    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada o no disponible');
    }

    // Limitar el límite máximo
    const maxLimit = Math.min(limit, 50);

    // Solo obtener comentarios principales (no respuestas)
    const [comentarios, total] = await this.comentarioRepo.findAndCount({
      where: { 
        publicacion: { id_publicacion: publicacionId },
        estado_revision: 'aprobado',
        comentario_padre: null // Solo comentarios principales
      },
      relations: ['usuario', 'publicacion', 'publicacion.usuario', 'respuestas', 'respuestas.usuario'],
      order: { fecha_comentario: 'ASC' },
      skip: (page - 1) * maxLimit,
      take: maxLimit,
    });

    return {
      comentarios: comentarios.map(comentario => this.mapearAResponse(comentario, true)), // true para incluir respuestas
      total
    };
  }

  async findByUser(usuarioId: number): Promise<ComentarioResponseDto[]> {
    const comentarios = await this.comentarioRepo.find({
      where: { usuario: { id: usuarioId } },
      relations: ['usuario', 'publicacion', 'publicacion.usuario'],
      order: { fecha_comentario: 'DESC' },
    });

    return comentarios.map(comentario => this.mapearAResponse(comentario));
  }

  async findOne(id: number, usuarioId?: number): Promise<ComentarioResponseDto> {
    const comentario = await this.comentarioRepo.findOne({
      where: { id_comentario: id },
      relations: ['usuario', 'publicacion', 'publicacion.usuario'],
    });

    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // Si no es el autor del comentario, solo mostrar si está aprobado
    if (comentario.usuario.id !== usuarioId && comentario.estado_revision !== 'aprobado') {
      throw new NotFoundException('Comentario no encontrado');
    }

    return this.mapearAResponse(comentario);
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    const comentario = await this.comentarioRepo.findOne({
      where: { id_comentario: id },
      relations: ['usuario'],
    });

    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // Solo el autor puede eliminar su comentario
    if (comentario.usuario.id !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para eliminar este comentario');
    }

    await this.comentarioRepo.remove(comentario);
  }

  /**
   * Proceso asíncrono de moderación IA para comentarios
   */
  private async procesarModeracionIA(comentarioId: number, contenidoTexto: string): Promise<void> {
    try {
      console.log(`Iniciando moderación IA para comentario ${comentarioId}`);
      
      const resultado = await this.moderacionIAService.revisarTexto(contenidoTexto);
      
      // Actualizar estado en BD
      await this.comentarioRepo.update(comentarioId, {
        estado_revision: resultado
      });

      console.log(`Comentario ${comentarioId} ${resultado} por IA`);
      
      // Emitir notificación WebSocket al autor
      const comentario = await this.comentarioRepo.findOne({
        where: { id_comentario: comentarioId },
        relations: ['usuario']
      });
      
      if (comentario) {
        await this.notificationsGateway.notificarEstadoComentario(
          comentarioId,
          comentario.usuario.id,
          resultado
        );
      }
      
    } catch (error) {
      console.error(`Error en moderación IA para comentario ${comentarioId}:`, error);
      
      // En caso de error, marcar como rechazado por seguridad
      await this.comentarioRepo.update(comentarioId, {
        estado_revision: 'rechazado'
      });
    }
  }

  private mapearAResponse(comentario: ComentarioEntity, incluirRespuestas: boolean = false): ComentarioResponseDto {
    const response: ComentarioResponseDto = {
      id_comentario: comentario.id_comentario,
      contenido_texto: comentario.contenido_texto,
      estado_revision: comentario.estado_revision,
      fecha_comentario: comentario.fecha_comentario,
      fecha_actualizacion: comentario.fecha_actualizacion,
      es_respuesta: !!comentario.comentario_padre,
      total_respuestas: comentario.respuestas?.filter(r => r.estado_revision === 'aprobado').length || 0,
      usuario: {
        id: comentario.usuario.id,
        name: comentario.usuario.name,
        email: comentario.usuario.email,
      },
      publicacion: {
        id_publicacion: comentario.publicacion.id_publicacion,
        contenido_texto: comentario.publicacion.contenido_texto,
        usuario: {
          id: comentario.publicacion.usuario.id,
          name: comentario.publicacion.usuario.name,
        }
      }
    };

    // Agregar información del comentario padre si existe
    if (comentario.comentario_padre) {
      response.comentario_padre = {
        id_comentario: comentario.comentario_padre.id_comentario,
        contenido_texto: comentario.comentario_padre.contenido_texto,
        usuario: {
          id: comentario.comentario_padre.usuario.id,
          name: comentario.comentario_padre.usuario.name,
        }
      };
    }

    // Incluir respuestas aprobadas si se solicita
    if (incluirRespuestas && comentario.respuestas) {
      response.respuestas = comentario.respuestas
        .filter(respuesta => respuesta.estado_revision === 'aprobado')
        .map(respuesta => this.mapearAResponse(respuesta, false)); // No anidar más niveles
    }

    return response;
  }
}
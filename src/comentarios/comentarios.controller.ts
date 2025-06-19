// src/comentarios/comentarios.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ComentariosService } from './comentarios.service';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { ComentarioResponseDto } from './dto/comentario-response.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';

@ApiTags('comentarios')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('comentarios')
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo comentario en una publicación' })
  @ApiResponse({
    status: 201,
    description: 'Comentario creado exitosamente (pendiente de moderación)',
    type: ComentarioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o no se puede comentar la publicación',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario o publicación no encontrados',
  })
  async create(
    @Body() createComentarioDto: CreateComentarioDto,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<ComentarioResponseDto> {
    return this.comentariosService.create(createComentarioDto, user.id);
  }

  @Get('mis-comentarios')
  @ApiOperation({ summary: 'Obtener comentarios del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de comentarios del usuario (todos los estados)',
    type: [ComentarioResponseDto],
  })
  async findMyComments(
    @ActiveUser() user: UserActiveInterface,
  ): Promise<ComentarioResponseDto[]> {
    return this.comentariosService.findByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener comentario específico' })
  @ApiResponse({
    status: 200,
    description: 'Detalles del comentario',
    type: ComentarioResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Comentario no encontrado o no disponible',
  })
  async findOne(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<ComentarioResponseDto> {
    return this.comentariosService.findOne(+id, user.id);
  }

  @Get(':id/respuestas')
  @ApiOperation({ summary: 'Obtener respuestas de un comentario específico' })
  @ApiResponse({
    status: 200,
    description: 'Lista de respuestas aprobadas del comentario',
    type: [ComentarioResponseDto],
  })
  async getRespuestas(
    @Param('id') comentarioId: string,
  ): Promise<ComentarioResponseDto[]> {
    const comentario = await this.comentariosService.findOne(+comentarioId);
    return comentario.respuestas || [];
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar comentario propio' })
  @ApiResponse({
    status: 200,
    description: 'Comentario eliminado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para eliminar este comentario',
  })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  async remove(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<{ message: string }> {
    await this.comentariosService.remove(+id, user.id);
    return { message: 'Comentario eliminado exitosamente' };
  }
}

// ================================================================
// NUEVO CONTROLLER ESPECÍFICO PARA PUBLICACIONES
// ================================================================

@ApiTags('publicaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('publicaciones')
export class PublicacionComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Get(':id/comentarios')
  @ApiOperation({ summary: 'Obtener comentarios aprobados de una publicación' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de comentarios aprobados de la publicación',
    schema: {
      type: 'object',
      properties: {
        comentarios: {
          type: 'array',
          items: { $ref: '#/components/schemas/ComentarioResponseDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Publicación no encontrada' })
  async getComentarios(
    @Param('id') publicacionId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.comentariosService.findByPublicacion(
      +publicacionId,
      +page,
      +limit,
    );
  }
}

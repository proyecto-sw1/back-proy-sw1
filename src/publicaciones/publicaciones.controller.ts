// src/publicaciones/publicaciones.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  BadRequestException 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery, 
  ApiConsumes, 
  ApiBody 
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublicacionesService } from './publicaciones.service';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { PublicacionResponseDto } from './dto/publicacion-response.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';

@ApiTags('publicaciones')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva publicación (solo texto o con URL externa)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Publicación creada exitosamente (pendiente de moderación)',
    type: PublicacionResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario o incidente no encontrado' })
  async create(
    @Body() createPublicacionDto: CreatePublicacionDto,
    @ActiveUser() user: UserActiveInterface
  ): Promise<PublicacionResponseDto> {
    return this.publicacionesService.create(createPublicacionDto, user.id);
  }

  @Post('con-archivo')
  @ApiOperation({ summary: 'Crear publicación con archivo multimedia (subido a S3)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        contenido_texto: { 
          type: 'string', 
          description: 'Texto de la publicación (opcional si hay archivo)' 
        },
        id_incidente: { 
          type: 'number', 
          description: 'ID del incidente asociado (opcional)' 
        },
        file: { 
          type: 'string', 
          format: 'binary', 
          description: 'Archivo multimedia (imagen o video)' 
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Publicación con archivo creada exitosamente',
    type: PublicacionResponseDto 
  })
  @UseInterceptors(FileInterceptor('file'))
  async createWithFile(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser() user: UserActiveInterface
  ): Promise<PublicacionResponseDto> {
    // Validar que al menos haya texto o archivo
    if (!body.contenido_texto && !file) {
      throw new BadRequestException('Debe proporcionar contenido_texto o un archivo');
    }

    const createPublicacionDto: CreatePublicacionDto = {
      contenido_texto: body.contenido_texto || undefined,
      id_incidente: body.id_incidente ? parseInt(body.id_incidente) : undefined,
    };

    return this.publicacionesService.createWithFile(createPublicacionDto, file, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener feed de publicaciones aprobadas' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página', example: 10 })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de publicaciones aprobadas',
    schema: {
      type: 'object',
      properties: {
        publicaciones: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicacionResponseDto' }
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' }
      }
    }
  })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.publicacionesService.findAll(+page, +limit);
  }

  @Get('mis-publicaciones')
  @ApiOperation({ summary: 'Obtener publicaciones del usuario autenticado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de publicaciones del usuario (todos los estados)',
    type: [PublicacionResponseDto]
  })
  async findMyPublications(@ActiveUser() user: UserActiveInterface): Promise<PublicacionResponseDto[]> {
    return this.publicacionesService.findByUser(user.id);
  }

  @Get('incidente/:incidenteId')
  @ApiOperation({ summary: 'Obtener publicaciones de un incidente específico' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de publicaciones del incidente',
    type: [PublicacionResponseDto]
  })
  async findByIncidente(@Param('incidenteId') incidenteId: string): Promise<PublicacionResponseDto[]> {
    return this.publicacionesService.findByIncidente(+incidenteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener publicación específica' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detalles de la publicación',
    type: PublicacionResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Publicación no encontrada o no aprobada' })
  async findOne(@Param('id') id: string): Promise<PublicacionResponseDto> {
    return this.publicacionesService.findOne(+id);
  }
}
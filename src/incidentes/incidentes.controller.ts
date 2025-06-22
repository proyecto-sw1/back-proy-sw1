// src/incidentes/incidentes.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { IncidentesService } from './incidentes.service';
import { CreateIncidenteDto } from './dto/create-incidente.dto';
import { UpdateIncidenteDto } from './dto/update-incidente.dto';
import { IncidenteResponseDto } from './dto/incidente-response.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';

@ApiTags('incidentes')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('incidentes')
export class IncidentesController {
  constructor(private readonly incidentesService: IncidentesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo incidente',
    description: 'Permite a un usuario reportar un nuevo incidente en el mapa con coordenadas específicas y descripción detallada'
  })
  @ApiResponse({
    status: 201,
    description: 'Incidente creado exitosamente',
    type: IncidenteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos - verifique el formato de coordenadas y que la descripción tenga al menos 10 caracteres',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  async create(
    @Body() createIncidenteDto: CreateIncidenteDto,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<IncidenteResponseDto> {
    console.log(`📍 Creando incidente:`, createIncidenteDto);
    return this.incidentesService.create(createIncidenteDto, user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Obtener lista de incidentes',
    description: 'Obtiene todos los incidentes reportados con paginación'
  })
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
    description: 'Lista de incidentes',
    schema: {
      type: 'object',
      properties: {
        incidentes: {
          type: 'array',
          items: { $ref: '#/components/schemas/IncidenteResponseDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.incidentesService.findAll(+page, +limit);
  }

  @Get('mis-incidentes')
  @ApiOperation({ 
    summary: 'Obtener incidentes del usuario autenticado',
    description: 'Lista todos los incidentes reportados por el usuario actual'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de incidentes del usuario',
    type: [IncidenteResponseDto],
  })
  async findMyIncidentes(
    @ActiveUser() user: UserActiveInterface,
  ): Promise<IncidenteResponseDto[]> {
    return this.incidentesService.findByUser(user.id);
  }

  @Get('tipo/:tipo')
  @ApiOperation({ 
    summary: 'Obtener incidentes por tipo',
    description: 'Busca todos los incidentes de un tipo específico'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de incidentes del tipo especificado',
    type: [IncidenteResponseDto],
  })
  async findByTipo(
    @Param('tipo') tipo: string,
  ): Promise<IncidenteResponseDto[]> {
    return this.incidentesService.findByTipo(tipo);
  }

  @Get('buscar')
  @ApiOperation({ 
    summary: 'Buscar incidentes por texto',
    description: 'Busca incidentes por términos en la descripción o tipo de incidente'
  })
  @ApiQuery({
    name: 'q',
    description: 'Término de búsqueda',
    example: 'accidente'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de incidentes que coinciden con la búsqueda',
    type: [IncidenteResponseDto],
  })
  async searchIncidentes(
    @Query('q') searchTerm: string,
  ): Promise<IncidenteResponseDto[]> {
    if (!searchTerm || searchTerm.trim().length < 3) {
      return [];
    }
    return this.incidentesService.searchByDescription(searchTerm.trim());
  }

  @Get('area')
  @ApiOperation({ 
    summary: 'Obtener incidentes en un área específica',
    description: 'Busca incidentes dentro de un área geográfica definida por coordenadas'
  })
  @ApiQuery({ name: 'latMin', description: 'Latitud mínima', example: -16.55 })
  @ApiQuery({ name: 'latMax', description: 'Latitud máxima', example: -16.45 })
  @ApiQuery({ name: 'lngMin', description: 'Longitud mínima', example: -68.15 })
  @ApiQuery({ name: 'lngMax', description: 'Longitud máxima', example: -68.05 })
  @ApiResponse({
    status: 200,
    description: 'Lista de incidentes en el área especificada',
    type: [IncidenteResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de coordenadas inválidos',
  })
  async findByArea(
    @Query('latMin') latMin: string,
    @Query('latMax') latMax: string,
    @Query('lngMin') lngMin: string,
    @Query('lngMax') lngMax: string,
  ): Promise<IncidenteResponseDto[]> {
    const lat1 = parseFloat(latMin);
    const lat2 = parseFloat(latMax);
    const lng1 = parseFloat(lngMin);
    const lng2 = parseFloat(lngMax);

    if (isNaN(lat1) || isNaN(lat2) || isNaN(lng1) || isNaN(lng2)) {
      throw new Error('Coordenadas inválidas');
    }

    return this.incidentesService.findByArea(lat1, lat2, lng1, lng2);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener incidente específico',
    description: 'Obtiene los detalles de un incidente incluyendo sus publicaciones asociadas'
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles del incidente',
    type: IncidenteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Incidente no encontrado',
  })
  async findOne(@Param('id') id: string): Promise<IncidenteResponseDto> {
    return this.incidentesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Actualizar incidente propio',
    description: 'Permite al autor del incidente actualizar el tipo, descripción o las coordenadas'
  })
  @ApiResponse({
    status: 200,
    description: 'Incidente actualizado exitosamente',
    type: IncidenteResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para editar este incidente',
  })
  @ApiResponse({
    status: 404,
    description: 'Incidente no encontrado',
  })
  async update(
    @Param('id') id: string,
    @Body() updateIncidenteDto: UpdateIncidenteDto,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<IncidenteResponseDto> {
    return this.incidentesService.update(+id, updateIncidenteDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar incidente propio',
    description: 'Permite al autor eliminar su incidente (solo si no tiene publicaciones asociadas)'
  })
  @ApiResponse({
    status: 200,
    description: 'Incidente eliminado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para eliminar este incidente o tiene publicaciones asociadas',
  })
  @ApiResponse({
    status: 404,
    description: 'Incidente no encontrado',
  })
  async remove(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface,
  ): Promise<{ message: string }> {
    await this.incidentesService.remove(+id, user.id);
    return { message: 'Incidente eliminado exitosamente' };
  }
}
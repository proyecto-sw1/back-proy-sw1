import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';

@ApiTags('consultas')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('consultas')
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  @Post()
  async crearConsulta(
    @Body() createConsultaDto: CreateConsultaDto,
    @ActiveUser() user: UserActiveInterface
  ) {
    return this.consultasService.crearConsulta(createConsultaDto, user.id);
  }

  @Get('historial')
  async obtenerHistorial(@ActiveUser() user: UserActiveInterface) {
    return this.consultasService.obtenerHistorial(user.id);
  }

  @Get('historial/:id')
  async obtenerConsulta(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveInterface
  ) {
    return this.consultasService.obtenerConsultaPorId(+id, user.id);
  }
}
// src/consultas/dto/create-consulta.dto.ts
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateConsultaDto {
  @IsIn(['texto', 'voz'])
  tipo_consulta: 'texto' | 'voz';

  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsString()
  @IsNotEmpty()
  respuesta: string;
}

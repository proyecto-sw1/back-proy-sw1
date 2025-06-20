import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateComentarioDto {
  @ApiProperty({
    description: 'Contenido del comentario',
    example: '¿Alguien sabe si ya se solucionó este problema?',
    maxLength: 500
  })
  @IsString()
  @IsNotEmpty({ message: 'El contenido del comentario es requerido' })
  @MaxLength(500, { message: 'El comentario no puede exceder 500 caracteres' })
  contenido_texto: string;

  // Estos campos se setean automáticamente desde la URL, pero los mantenemos para flexibilidad
  @ApiProperty({
    description: 'ID de la publicación (se toma de la URL)',
    required: false
  })
  @IsNumber()
  @IsOptional()
  id_publicacion?: number;

  @ApiProperty({
    description: 'ID del comentario padre (para respuestas)',
    required: false,
    example: 1
  })
  @IsNumber()
  @IsOptional()
  id_comentario_padre?: number;
}